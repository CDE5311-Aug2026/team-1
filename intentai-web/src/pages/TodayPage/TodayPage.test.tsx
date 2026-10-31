import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { resetPersistentStores } from '../../data/persistentStore';
import { explorePersonalStore } from '../../data/stores';
import { placesInArea, placesInRegion, URA_AREAS } from '../../data/ura/ura';
import TodayPage from './TodayPage';

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderHome(entry = '/') {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/holidays/deepavali" element={<p>holiday page</p>} />
        <Route path="/my-space/notices" element={<p>notices page</p>} />
        <Route path="/nearby/place/:placeKey" element={<p>place page</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

const card = (name: string) => screen.getByRole('group', { name });
const deck = (label: string) => screen.getByRole('region', { name: label });
const checkIn = (ids: string[]) =>
  explorePersonalStore.set((d) => ({
    ...d,
    places: ids.map((placeKey) => ({ placeKey: placeKey as `curated:${string}`, saved: false, visited: true, visitedOn: '2026-10-31', updatedAt: '2026-10-31T00:00:00.000Z' })),
  }));

beforeEach(() => {
  localStorage.clear();
  resetPersistentStores();
});

test('Home opens on the five URA regions, Central first (the home base is in Queenstown)', () => {
  renderHome();
  expect(screen.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeInTheDocument();
  const regions = within(deck('Regions')).getAllByRole('group');
  expect(regions.map((r) => r.getAttribute('aria-label'))).toEqual(['Central', 'East', 'North', 'North-East', 'West']);
  expect(card('Central')).toHaveAttribute('aria-current', 'true');
  expect(within(card('Central')).getByText(`0 of ${placesInRegion('central').length} places checked in`)).toBeInTheDocument();
  expect(within(card('Central')).getByRole('img', { name: 'not visited yet' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Back to/ })).toBeNull();
  expect(screen.getByRole('application', { name: /planning areas/ })).toBeInTheDocument();
});

test('tapping a region selects it; its action opens its planning areas; Back returns to the regions', async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(card('West'));
  expect(card('West')).toHaveAttribute('aria-current', 'true');
  expect(screen.getByTestId('where')).toHaveTextContent('r=west');
  await user.click(screen.getByRole('button', { name: 'Explore West' }));
  expect(screen.getByLabelText('Where you are')).toHaveTextContent('Singapore › West');
  const areas = within(deck('West planning areas')).getAllByRole('group');
  expect(areas).toHaveLength(12);
  // Most places first; areas with none yet go last.
  expect(areas[0]).toHaveAttribute('aria-label', 'Clementi');
  await user.click(screen.getByRole('button', { name: 'Back to regions' }));
  expect(within(deck('Regions')).getAllByRole('group')).toHaveLength(5);
  expect(card('West')).toHaveAttribute('aria-current', 'true');
});

test('an area opens its places; Open shows its story card above the deck, closing it brings the map back', async () => {
  const user = userEvent.setup();
  renderHome('/?lvl=areas&r=west&a=cl');
  await user.click(screen.getByRole('button', { name: 'See 11 places' }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  expect(screen.getByLabelText('Where you are')).toHaveTextContent('Singapore › West › Clementi');
  const places = within(screen.getByRole('region', { name: 'Nearby places' })).getAllByRole('group');
  expect(places).toHaveLength(placesInArea('cl').length);
  const name = places[0].getAttribute('aria-label')!;
  await user.click(within(places[0]).getByRole('button', { name: /in Nearby$/ }));
  const sheet = screen.getByRole('dialog', { name });
  expect(within(sheet).getByTestId('place-story-card')).toBeInTheDocument();
  expect(within(sheet).getByRole('button', { name: /Check in/ })).toBeInTheDocument();
  // the status card: checked in or not, and the area's progress
  expect(within(sheet).getByRole('img', { name: 'Not checked in yet' })).toBeInTheDocument();
  expect(within(sheet).getByRole('progressbar', { name: /^Clementi: 0 of \d+ places checked in$/ })).toBeInTheDocument();
  // the notebook's pages turn: the field note first, Next page goes on, Previous comes back
  const pagesNav = within(sheet).getByRole('navigation', { name: 'Pages' });
  expect(pagesNav).toHaveTextContent(/^1\/\d+Field note$/);
  expect(within(pagesNav).getByRole('button', { name: 'Previous page' })).toBeDisabled();
  await user.click(within(pagesNav).getByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(pagesNav).toHaveTextContent(/^2\//));
  await user.click(within(pagesNav).getByRole('button', { name: 'Previous page' }));
  await waitFor(() => expect(pagesNav).toHaveTextContent(/^1\/\d+Field note$/));
  // the map stays as the place's 3D view; its tools fold away; the deck stays
  expect(screen.queryByRole('toolbar', { name: 'Map tools' })).toBeNull();
  expect(screen.getByRole('region', { name: 'Nearby places' })).toBeInTheDocument();
  expect(screen.getByTestId('where')).toHaveTextContent('open=');
  // the place's sky: time of day and weather
  await user.click(screen.getByRole('button', { name: 'Time of day: Now' }));
  await user.click(screen.getByRole('radio', { name: 'Night' }));
  expect(screen.getByRole('button', { name: 'Time of day: Night' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Weather: Clear' }));
  await user.click(screen.getByRole('radio', { name: 'Rain' }));
  expect(screen.getByRole('button', { name: 'Weather: Rain' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: `Close ${name}` }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByLabelText('Where you are')).toHaveTextContent('Singapore › West › Clementi');
  expect(screen.getByRole('toolbar', { name: 'Map tools' })).toBeInTheDocument();
});

test('the level and card come back from the URL (Back from a place page)', () => {
  renderHome('/?lvl=places&r=west&a=cl&p=curated%3Asg-clementi-woods');
  expect(card('Clementi Woods Park')).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('button', { name: 'Back to West areas' })).toBeInTheDocument();
});

test('progress: some check-ins = exploring; all of an area = unlocked with a tick', () => {
  const area = URA_AREAS.find((a) => a.region === 'west' && placesInArea(a.id).length === 1)!;
  const [only] = placesInArea(area.id);
  checkIn([only.id, placesInArea('cl')[0].id]);
  renderHome(`/?lvl=areas&r=west&a=${area.id}`);
  expect(within(card(area.name)).getByRole('img', { name: 'all checked in' })).toBeInTheDocument();
  expect(within(card(area.name)).getByRole('progressbar', { name: `${area.name} unlocked` })).toHaveAttribute('aria-valuenow', '100');
  expect(within(card('Clementi')).getByRole('img', { name: 'exploring' })).toBeInTheDocument();
  expect(within(card('Clementi')).getByText('1 of 11 places checked in')).toBeInTheDocument();
});

test('an area with no places yet says so and stays where it is', async () => {
  const user = userEvent.setup();
  const empty = URA_AREAS.find((a) => a.region === 'west' && placesInArea(a.id).length === 0)!;
  renderHome(`/?lvl=areas&r=west&a=${empty.id}`);
  expect(within(card(empty.name)).getByText('No places yet')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Nothing to see yet' }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=areas');
});

test('the event card opens the holiday page; the bell opens notices', async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByRole('button', { name: /Deepavali long weekend starts today/ }));
  expect(screen.getByText('holiday page')).toBeInTheDocument();
});

test('the map credits name URA and the open data licence', async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByText('Map data'));
  expect(screen.getByText(/Master Plan 2019 Planning Area Boundary \(No Sea\), Urban Redevelopment Authority, via data\.gov\.sg \(Singapore Open Data Licence v1\.0\)/)).toBeInTheDocument();
});

test('map tools: Custom finds a place and opens it; Undo goes back', async () => {
  const user = userEvent.setup();
  renderHome();
  // the map stretches: its tab folds the picture card away, and back
  await user.click(screen.getByRole('button', { name: 'Bigger map' }));
  expect(screen.getByRole('button', { name: 'Smaller map' })).toHaveAttribute('aria-expanded', 'true');
  await user.click(screen.getByRole('button', { name: 'Smaller map' }));
  expect(screen.getByRole('button', { name: 'Bigger map' })).toHaveAttribute('aria-expanded', 'false');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  await user.type(screen.getByRole('searchbox', { name: 'Search a place or planning area' }), 'Maxwell');
  await user.click(screen.getByRole('button', { name: /^Maxwell Food Centre/ }));
  expect(screen.getByRole('dialog', { name: 'Maxwell Food Centre' })).toBeInTheDocument();
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  await user.click(screen.getByRole('button', { name: 'Close Maxwell Food Centre' }));
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByTestId('where')).not.toHaveTextContent('lvl=places');
});

test("map tools: Editor's Pick switches the deck to the picks; a walk's stops; its 2D route opens Google Maps", async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByRole('button', { name: "Editor's Pick" }));
  expect(screen.getByRole('button', { name: "Editor's Pick" })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=picks');
  const picks = within(deck("Editor's Pick")).getAllByRole('group').map((g) => g.getAttribute('aria-label'));
  expect(picks).toContain('Chinatown · The story walk');
  expect(picks).toContain('Hawker centres to know');
  await user.click(screen.getByRole('button', { name: 'Start Chinatown · The story walk' }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=pick&');
  expect(screen.getByTestId('where')).toHaveTextContent('k=chinatown-story-walk');
  expect(within(deck('Nearby places')).getAllByRole('group')[0]).toHaveAttribute('aria-label', 'Thian Hock Keng Temple');
  await user.click(screen.getByRole('button', { name: '2D route' }));
  expect(screen.getByTestId('where')).toHaveTextContent('route=1');
  expect(screen.getByRole('link', { name: /^Go with Google Maps/ }).getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&/);
  // the 2D map is Google Maps' own directions through the stops, in order
  expect(screen.getByTitle(/^Google Maps: Chinatown · The story walk, stops 1 to \d+ in order$/).getAttribute('src')).toMatch(
    /^https:\/\/maps\.google\.com\/maps\?saddr=1\.\d+%2C103\.\d+&daddr=.+dirflg=w.*output=embed$/,
  );
  await user.click(screen.getByRole('button', { name: '3D map' }));
  expect(screen.getByTestId('where')).not.toHaveTextContent('route=1');
  await user.click(screen.getByRole('button', { name: "Back to Editor's Pick" }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=picks');
  await user.click(screen.getByRole('button', { name: "Editor's Pick" }));
  expect(screen.getByTestId('where')).not.toHaveTextContent('lvl=pick');
});

test("a list from Editor's Pick crosses the island; a stop opens its intro", async () => {
  const user = userEvent.setup();
  renderHome('/?lvl=pick&k=list:sg-hawker-centres');
  expect(screen.queryByRole('button', { name: '2D route' })).toBeNull();
  const first = within(deck('Nearby places')).getAllByRole('group')[0].getAttribute('aria-label')!;
  await user.click(screen.getByRole('button', { name: `Open ${first} in Nearby` }));
  expect(screen.getByRole('dialog', { name: first })).toBeInTheDocument();
});

test('cards carry the full numbers: areas unlocked and checked in by kind', () => {
  renderHome('/?lvl=areas&r=west&a=cl');
  expect(within(card('Clementi')).getByText(/0 of 11 places checked in/)).toBeInTheDocument();
});
