import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { atlasPlace, atlasRoute, atlasRoutes, placeKeyOf } from '../../data/atlas/atlas';
import { teamRoute, teamRoutes } from '../../data/routes/teamRoutes';
import { explorePersonalStore } from '../../data/stores';
import { curatedPlace } from '../../features/nearby/catalogue';
import { stateOf } from '../../features/nearby/personal';
import { paths, patterns } from '../../routes';
import ExplorePage from './ExplorePage';
import PlaceDetailPage from './PlaceDetailPage';
import RouteDetailPage from './RouteDetailPage';
import RoutePlanPage from './RoutePlanPage';
import RoutesPage from './RoutesPage';

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path={paths.nearby} element={<ExplorePage />} />
        <Route path={paths.routes} element={<RoutesPage />} />
        <Route path={patterns.routePlan} element={<RoutePlanPage />} />
        <Route path={patterns.route} element={<RouteDetailPage />} />
        <Route path={patterns.nearbyPlace} element={<PlaceDetailPage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

/** The route's stops (the ordered list after "Stops in order"), not the warnings inside them. */
const stopItems = () => {
  const ol = screen.getByRole('heading', { name: 'Stops in order' }).nextElementSibling as HTMLElement;
  return within(ol).getAllByRole('listitem').filter((li) => li.parentElement === ol);
};

describe('Routes list', () => {
  test('shows the story walks, then the five editor routes with station, mode and stop count', () => {
    renderAt(paths.routes);
    const walks = within(screen.getByRole('region', { name: 'Story walks' })).getAllByRole('article');
    expect(walks.map((c) => within(c).getByRole('link').getAttribute('href'))).toEqual(teamRoutes.map((r) => paths.route(r.id)));
    expect(within(walks[0]).getByText(/Telok Ayer MRT/)).toHaveTextContent(/5 stops/);
    const cards = within(screen.getByRole('region', { name: 'Editor’s routes' })).getAllByRole('article');
    expect(cards).toHaveLength(5);
    const hrefs = cards.map((c) => within(c).getByRole('link').getAttribute('href'));
    expect(hrefs).toEqual(atlasRoutes.map((r) => paths.route(r.id)));
    expect(within(cards[0]).getByText(/Clementi MRT/)).toHaveTextContent(/4 stops/);
  });

  test('generating from a station opens a shareable route with stops and the places left out', async () => {
    const user = userEvent.setup();
    renderAt(paths.routes);
    await user.click(screen.getByRole('button', { name: 'Make my route' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a station first.');

    // search narrows the stations and picks the first match
    await user.type(screen.getByRole('searchbox', { name: 'Find a station' }), 'clementi');
    expect(screen.getByRole('combobox', { name: 'Station' })).toHaveValue('clementi');
    await user.click(screen.getByRole('button', { name: 'Walking + transit' }));
    await user.click(screen.getByRole('button', { name: 'Make my route' }));

    const where = screen.getByTestId('where').textContent ?? '';
    expect(where).toMatch(/^\/nearby\/routes\/plan\?station=clementi&budget=3&mode=transit&date=\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('From Clementi · 3 h');
    expect(stopItems().length).toBeGreaterThan(0);
    expect(within(stopItems()[0]).getByRole('heading', { name: /^Stop 1:/ })).toBeInTheDocument();

    // the collection-only rail bridge is listed with its reason
    const fold = screen.getByText(/places? near Clementi left out/).closest('details') as HTMLElement;
    const bridge = atlasPlace('sunset-way-rail-bridge')!.name_en;
    expect(within(fold).getByText(bridge).closest('li')).toHaveTextContent('Kept for the collection only; not used in automatic routes');
  });

  test('a theme and walking limit the route; Change options keeps them', async () => {
    renderAt(`${paths.routePlan('station=clementi&budget=2&mode=walking&theme=food&date=2026-11-03')}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('From Clementi · Food · 2 h');
    for (const li of stopItems()) expect(li).toHaveTextContent(/Food ·/);
    // Chin Huat is closed on Tuesdays (3 Nov 2026 is a Tuesday)
    expect(screen.getByText(/places? near Clementi left out/).closest('details')).toHaveTextContent(/Regular closing day/);
    expect(screen.getByRole('link', { name: 'Change options' })).toHaveAttribute('href', expect.stringContaining('/nearby/routes?station=clementi&budget=2&mode=walking&theme=food'));
  });

  test('an unknown station is not a route', () => {
    renderAt(paths.routePlan('station=nowhere'));
    expect(screen.getByRole('heading', { name: 'Route not found' })).toBeInTheDocument();
  });
});

describe('Route detail', () => {
  test('numbered stops in order, the dashed order line, directions and the atlas details of stops not in the catalogue', async () => {
    const user = userEvent.setup();
    const route = atlasRoute('telok-ayer')!;
    renderAt(paths.route('telok-ayer'));
    expect(screen.getByText(/From Telok Ayer MRT/)).toBeInTheDocument();
    const items = stopItems();
    expect(items).toHaveLength(route.place_ids.length);
    route.place_ids.forEach((id, i) => {
      const curated = curatedPlace(placeKeyOf(id));
      const name = curated?.name ?? atlasPlace(id)!.name_en;
      expect(within(items[i]).getByRole('heading', { name: `Stop ${i + 1}: ${name}` })).toBeInTheDocument();
      if (curated) expect(within(items[i]).getByRole('link', { name })).toHaveAttribute('href', paths.nearbyPlace(curated.id));
    });
    expect(screen.getByTestId('map-path')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Stop 1: .*, (Culture|Landmark|Food|Nature)/ })).toHaveTextContent('1');
    expect(screen.getByText(/not road routing/)).toBeInTheDocument();
    const maps = screen.getByRole('link', { name: /Open walking directions in Google Maps/ });
    expect(maps.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=Telok\+Ayer\+MRT\+Station/);
    expect(maps).toHaveAttribute('target', '_blank');

    // the atlas notes of a stop open in a sheet (dialog) with the fun fact and its source
    await user.click(within(items[0]).getByRole('button', { name: /Atlas notes|Details/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Fun fact' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /^Source:/ })).toHaveAttribute('href', atlasPlace(route.place_ids[0])!.fun_fact_source);
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('check-in progress counts the stops in the catalogue and completes the route', async () => {
    const user = userEvent.setup();
    const route = atlasRoute('telok-ayer')!;
    const checkable = route.place_ids.map((id) => curatedPlace(placeKeyOf(id))).filter((p) => !!p);
    expect(checkable.length).toBeGreaterThan(0);
    renderAt(paths.route('telok-ayer'));
    expect(screen.getByText(`0 of ${checkable.length} checked in`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Check in: ${checkable[0]!.name}` }));
    expect(stateOf(explorePersonalStore.get(), checkable[0]!.id)?.visited).toBe(true);
    expect(screen.getByText(`1 of ${checkable.length} checked in`)).toBeInTheDocument();
    for (const p of checkable.slice(1)) await user.click(screen.getByRole('button', { name: `Check in: ${p!.name}` }));
    expect(screen.getByText(`${checkable.length} of ${checkable.length} checked in`)).toBeInTheDocument();
    expect(screen.getByText('Route complete. Every stop checked in!')).toHaveAttribute('role', 'status');
  });

  test('a story walk: catalogue stops, estimates marked, its sources and its place story', async () => {
    const user = userEvent.setup();
    const route = teamRoute('chinatown-story-walk')!;
    renderAt(paths.route(route.id));
    const items = stopItems();
    expect(items).toHaveLength(route.stops.length);
    route.stops.forEach((s, i) => {
      const name = curatedPlace(s.key)!.name;
      expect(within(items[i]).getByRole('link', { name })).toHaveAttribute('href', paths.nearbyPlace(s.key));
    });
    // Lim Chee Guan is not an atlas place: the team's estimate, the catalogue's sourced hours, no atlas notes
    const last = items[items.length - 1];
    expect(last).toHaveTextContent('≈ 15 min (estimate)');
    expect(last).toHaveTextContent('Mon–Sun 9:00 am – 9:00 pm');
    expect(within(last).queryByRole('button', { name: 'Atlas notes' })).not.toBeInTheDocument();
    // Thian Hock Keng is: the atlas's visit time, the catalogue's checked hours
    expect(items[0]).toHaveTextContent('35 min');
    expect(items[0]).toHaveTextContent('Daily 07:30–17:00');
    expect(screen.getByText(/min of visits/)).toHaveTextContent(/^≈/);
    await user.click(screen.getByText('Sources for the times and days'));
    for (const s of route.sources) expect(screen.getAllByRole('link', { name: new RegExp(s.title.replace(/[()|]/g, '.')) }).some((a) => a.getAttribute('href') === s.url)).toBe(true);
  });

  test('a story walk warns of its stops’ closing days on the chosen date', () => {
    // 1 Nov 2026 is a Sunday: The Spread (its own site) and NUS Museum (atlas) are closed
    renderAt(`${paths.route('kent-ridge-wall-walk')}?date=2026-11-01`);
    const items = stopItems();
    expect(within(items[0]).getByRole('list', { name: 'Before you go to The Spread' })).toHaveTextContent('Sun 1 Nov: regular closing day');
    expect(within(items[1]).getByRole('list', { name: /Before you go to NUS Museum/ })).toHaveTextContent(/Sun 1 Nov/);
    expect(within(items[2]).queryByRole('list', { name: /Before you go/ })).not.toBeInTheDocument();
  });

  test('an unknown route', () => {
    renderAt(paths.route('nope'));
    expect(screen.getByRole('heading', { name: 'Route not found' })).toBeInTheDocument();
  });
});

describe('entry points', () => {
  test('Explore links to Routes; a place on a route links to it', () => {
    renderAt(paths.nearby);
    expect(screen.getByRole('link', { name: 'Routes' })).toHaveAttribute('href', paths.routes);
  });

  test('a Nearby place page says which routes stop there', async () => {
    renderAt(paths.nearbyPlace('curated:sg-thian-hock-keng-temple'));
    const line = (await screen.findByText(/On routes/)).closest('p') as HTMLElement;
    expect(within(line).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([paths.route('chinatown-story-walk'), paths.route('telok-ayer')]);
  });
});
