import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { atlasPlace, atlasRoute, atlasRoutes, placeKeyOf } from '../../data/atlas/atlas';
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
  test('shows the five editor routes with station, mode and stop count', () => {
    renderAt(paths.routes);
    const cards = screen.getAllByRole('article');
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
    const line = (await screen.findByText(/On a route/)).closest('p') as HTMLElement;
    expect(within(line).getByRole('link')).toHaveAttribute('href', paths.route('telok-ayer'));
  });
});
