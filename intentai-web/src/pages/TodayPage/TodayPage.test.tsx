import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetPersistentStores } from '../../data/persistentStore';
import { profileV3Store } from '../../data/profile/profile';
import { explorePersonalStore } from '../../data/stores';
import { tourismOf } from '../../data/tourism';
import { placesInArea, placesInRegion, URA_AREAS } from '../../data/ura/ura';
import { huntModeStore } from '../../data/v2Stores';
import { curatedPlace, PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import { pickedForYou } from './picked';
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
    places: ids.map((placeKey) => ({
      placeKey: placeKey as `curated:${string}`,
      saved: false,
      visited: true,
      visitedOn: '2026-10-31',
      updatedAt: '2026-10-31T00:00:00.000Z',
    })),
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
  // the top level: nothing to go back to, so the ↩ key is off
  expect(within(screen.getByRole('toolbar', { name: 'Map tools' })).getByRole('button', { name: /^Back to/ })).toBeDisabled();
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
  // the key row stays under the notebook while the pages turn: ↩ goes back to the map, ↵ turns the page
  const keys = screen.getByRole('toolbar', { name: 'Map tools' });
  expect(within(keys).getByRole('button', { name: 'Back to the map' })).toBeInTheDocument();
  expect(within(keys).getByRole('button', { name: 'Next page' })).toBeInTheDocument();
  await user.click(within(pagesNav).getByRole('button', { name: 'Previous page' }));
  await waitFor(() => expect(pagesNav).toHaveTextContent(/^1\/\d+Field note$/));
  // the map stays as the place's 3D view; the key row stays; the deck stays
  expect(screen.getByRole('toolbar', { name: 'Map tools' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Nearby places' })).toBeInTheDocument();
  expect(screen.getByTestId('where')).toHaveTextContent('open=');
  // the place's sky: time of day and weather
  await user.click(screen.getByRole('button', { name: 'Time of day: Now' }));
  await user.click(screen.getByRole('radio', { name: 'Night' }));
  expect(screen.getByRole('button', { name: 'Time of day: Night' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Weather: Clear' }));
  await user.click(screen.getByRole('radio', { name: 'Rain' }));
  expect(screen.getByRole('button', { name: 'Weather: Rain' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Back to the map' }));
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

test('an open place is a page of its own: the tab bar steps away and comes back when it closes', () => {
  const id = placesInArea('ot')[0].id;
  const open = renderHome(`/?lvl=places&r=central&a=ot&p=${id}&open=${id}`);
  expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
  // the page says so through its shell, not through a mark on the document
  expect(document.documentElement).not.toHaveAttribute('data-place-open');
  open.unmount();
  renderHome(`/?lvl=places&r=central&a=ot&p=${id}`);
  expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
});

test('the event card opens the holiday page; the bell opens notices', async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByRole('button', { name: /Deepavali long weekend/ }));
  expect(screen.getByText('holiday page')).toBeInTheDocument();
});

test('the map credits name URA and the open data licence, and OneMap for the street map', async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByText('Map data · OneMap'));
  expect(screen.getByRole('link', { name: 'OneMap © Singapore Land Authority' })).toHaveAttribute('href', 'https://www.onemap.gov.sg/');
  expect(
    screen.getByText(
      /Master Plan 2019 Planning Area Boundary \(No Sea\), Urban Redevelopment Authority, via data\.gov\.sg \(Singapore Open Data Licence v1\.0\)/,
    ),
  ).toBeInTheDocument();
});

test('map tools: Search finds a place and opens it; the back key goes up', async () => {
  const user = userEvent.setup();
  renderHome();
  // the map stretches: its tab folds the picture card away, and back
  await user.click(screen.getByRole('button', { name: 'Bigger map' }));
  expect(screen.getByRole('button', { name: 'Smaller map' })).toHaveAttribute('aria-expanded', 'true');
  await user.click(screen.getByRole('button', { name: 'Smaller map' }));
  expect(screen.getByRole('button', { name: 'Bigger map' })).toHaveAttribute('aria-expanded', 'false');
  await user.click(screen.getByRole('button', { name: 'Search the map' }));
  await user.type(screen.getByRole('searchbox', { name: 'Search a place or planning area' }), 'Maxwell');
  await user.click(screen.getByRole('button', { name: /^Maxwell Food Centre/ }));
  expect(screen.getByRole('dialog', { name: 'Maxwell Food Centre' })).toBeInTheDocument();
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  await user.click(screen.getByRole('button', { name: 'Back to the map' }));
  // ↩, the one back key, goes up a level
  await user.click(within(screen.getByRole('toolbar', { name: 'Map tools' })).getByRole('button', { name: /^Back to/ }));
  expect(screen.getByTestId('where')).not.toHaveTextContent('lvl=places');
});

test("map tools: Editor's Pick switches the deck to the picks; a walk's stops; its 2D route opens Google Maps", async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByRole('button', { name: "Editor's Pick" }));
  expect(screen.getByRole('button', { name: "Editor's Pick" })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=picks');
  const picks = within(deck("Editor's Pick"))
    .getAllByRole('group')
    .map((g) => g.getAttribute('aria-label'));
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

test('Locate shows what is near you: places and Picks within 2 km, nearest first, with no position in the URL', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 1.2806, longitude: 103.8448, accuracy: 20 } } as GeolocationPosition),
    },
  });
  renderHome();
  await user.click(screen.getByRole('button', { name: 'My location' }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=near');
  expect(screen.getByTestId('where')).not.toHaveTextContent(/1\.28|103\.8/);
  const near = deck('Near you · 2 km');
  await waitFor(() => expect(within(near).getByRole('group', { name: 'Chinatown · The story walk' })).toBeInTheDocument());
  expect(within(near).getByRole('group', { name: 'Thian Hock Keng Temple' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'You are here' })).toBeInTheDocument();
  // a walk opens its stops
  await user.click(within(near).getByRole('group', { name: 'Chinatown · The story walk' }));
  expect(screen.getByTestId('where')).toHaveTextContent('n=chinatown-story-walk');
  await user.click(screen.getByRole('button', { name: 'Start Chinatown · The story walk' }));
  expect(screen.getByTestId('where')).toHaveTextContent('k=chinatown-story-walk');
});

afterEach(() => vi.unstubAllGlobals());

test('cards carry the full numbers: areas unlocked and checked in by kind', () => {
  renderHome('/?lvl=areas&r=west&a=cl');
  expect(within(card('Clementi')).getByText(/0 of 11 places checked in/)).toBeInTheDocument();
});

// ---- Redesign v2 (boards 05/11): category chips on the kept map, together vs solo, Challenges, Picked for you ----

const catOf = (id: string) => tourismOf(curatedPlace(id) ?? {});
const chip = (name: string) => within(screen.getByRole('group', { name: 'Categories' })).getByRole('button', { name });

test('the category chips filter the deck to that category’s places (the URL keeps ?cat=)', async () => {
  const user = userEvent.setup();
  const mixed = URA_AREAS.find((a) => {
    const cats = placesInArea(a.id).map((p) => tourismOf(p));
    return cats.includes('wel') && cats.some((c) => c !== 'wel');
  })!;
  renderHome(`/?lvl=places&r=${mixed.region}&a=${mixed.id}`);
  expect(within(deck('Nearby places')).getAllByRole('group')).toHaveLength(placesInArea(mixed.id).length);
  await user.click(chip('Wellness'));
  expect(screen.getByTestId('where')).toHaveTextContent('cat=wel');
  expect(chip('Wellness')).toHaveAttribute('aria-pressed', 'true');
  const shown = within(deck('Nearby places')).getAllByRole('group');
  const wel = placesInArea(mixed.id).filter((p) => tourismOf(p) === 'wel');
  expect(shown).toHaveLength(wel.length);
  expect(shown.map((g) => g.getAttribute('aria-label')).sort()).toEqual(wel.map((p) => p.name).sort());
  // the drill-down is untouched: still the same level and area
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  expect(screen.getByTestId('where')).toHaveTextContent(`a=${mixed.id}`);
});

test('with a category picked, the other categories’ pins fade; each pin carries its category; All brings them back', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 1.2806, longitude: 103.8448, accuracy: 20 } } as GeolocationPosition),
    },
  });
  renderHome();
  await user.click(screen.getByRole('button', { name: 'My location' }));
  await waitFor(() => expect(document.querySelectorAll('[data-pin]').length).toBeGreaterThan(0));
  const all = [...document.querySelectorAll<HTMLElement>('[data-pin]')];
  for (const pin of all) expect(pin.dataset.category).toBe(catOf(pin.dataset.pin!));
  expect(document.querySelectorAll('[data-pin][data-dim]')).toHaveLength(0);
  // pick a category that some of these pins have and some do not
  const cats = new Set(all.map((p) => p.dataset.category));
  expect(cats.size).toBeGreaterThan(1);
  const picked = (['wel', 'lei', 'cru', 'att'] as const).find((c) => cats.has(c))!;
  await user.click(chip({ att: 'Attractions', wel: 'Wellness', lei: 'Leisure', cru: 'Cruise' }[picked]));
  expect(screen.getByTestId('where')).toHaveTextContent(`cat=${picked}`);
  const pins = [...document.querySelectorAll<HTMLElement>('[data-pin]')];
  for (const pin of pins) expect(pin.hasAttribute('data-dim')).toBe(pin.dataset.category !== picked);
  expect(pins.some((p) => p.hasAttribute('data-dim'))).toBe(true);
  expect(pins.some((p) => !p.hasAttribute('data-dim'))).toBe(true);
  await user.click(chip('All'));
  expect(screen.getByTestId('where')).not.toHaveTextContent('cat=');
  expect(document.querySelectorAll('[data-pin][data-dim]')).toHaveLength(0);
});

test('a picked category is counted on the region badges and the region cards', async () => {
  renderHome('/?cat=wel');
  const n = placesInRegion('central').filter((p) => tourismOf(p) === 'wel').length;
  expect(within(card('Central')).getByText(new RegExp(`${n} Wellness`))).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: new RegExp(`^Region 1: Central, .*, ${n} Wellness$`) })).toBeInTheDocument();
});

describe('v2 sections', () => {
  beforeEach(() => {
    // Locate (above) keeps your position for the tab
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-07T10:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  test('together: the region leaderboard (example players, labelled) and the joined line on challenges', () => {
    huntModeStore.set({ mode: 'together', region: 'east' });
    renderHome();
    const board = screen.getByRole('region', { name: 'East · this weekend' });
    expect(within(board).getByText('Example')).toBeInTheDocument();
    expect(within(board).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'A1Arjun K.96 min fastest',
      'H2Hui Wen102 +6',
      'F3Farid109 +13',
    ]);
    expect(within(board).getByText(/no time yet\. Join a challenge\./)).toBeInTheDocument();
    const civic = screen.getByRole('article', { name: 'Civic District' });
    expect(within(civic).getByText(/7–8 Nov · 8 stops · 214 joined/)).toBeInTheDocument();
    expect(within(civic).getByText('Example')).toBeInTheDocument();
  });

  test('solo: no leaderboard, challenges without the social line', () => {
    huntModeStore.set({ mode: 'solo' });
    renderHome();
    expect(screen.queryByRole('region', { name: /this weekend/ })).toBeNull();
    const civic = screen.getByRole('article', { name: 'Civic District' });
    expect(within(civic).getByText('7–8 Nov · 8 stops')).toBeInTheDocument();
    expect(screen.queryByText('Example')).toBeNull();
    expect(screen.getByRole('link', { name: '2 open: all challenges in Hunt' })).toHaveAttribute('href', '/hunt');
  });

  test('a challenge card links to its page; Join is kept on this phone', async () => {
    const user = userEvent.setup();
    renderHome();
    const civic = screen.getByRole('article', { name: 'Civic District' });
    expect(within(civic).getByRole('link', { name: 'Civic District' })).toHaveAttribute('href', '/hunt/challenge/wk45-civic');
    await user.click(within(civic).getByRole('button', { name: 'Join Civic District' }));
    expect(within(civic).getByRole('button', { name: 'Joined Civic District' })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem('intentai:v1:challenge-joined')!)).toHaveProperty('wk45-civic');
  });

  test('the chips filter the challenges too', async () => {
    const user = userEvent.setup();
    renderHome();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.click(chip('Cruise'));
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText('No open challenges in this category right now.')).toBeInTheDocument();
  });

  test('Picked for you: dealt in turns by your order (#1 leads); a chip keeps one category; no distance without a position', async () => {
    const user = userEvent.setup();
    profileV3Store.set((p) => ({ ...p, tourismRanking: ['lei', 'wel'] }));
    renderHome();
    const grid = screen.getByRole('list', { name: 'Places picked for you' });
    const items = within(grid).getAllByRole('listitem');
    expect(items).toHaveLength(8);
    expect(items.map((li) => li.dataset.category).slice(0, 4)).toEqual(['lei', 'wel', 'att', 'cru']);
    expect(items[4].dataset.category).toBe('lei');
    expect(within(items[0]).getByText('Leisure')).toBeInTheDocument();
    expect(within(grid).queryByText(/^\d+(\.\d)? (m|km)$/)).toBeNull();
    // the place's own name, and a link to its page
    const first = pickedForYou(PUBLISHED_PLACES, ['lei', 'wel', 'att', 'cru'], 'all', null)[0].place;
    expect(within(items[0]).getByRole('link', { name: first.name })).toHaveAttribute('href', `/nearby/place/${encodeURIComponent(first.id)}`);
    await user.click(chip('Wellness'));
    expect(within(grid).getAllByRole('listitem').every((li) => li.dataset.category === 'wel')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Show more places' }));
    expect(within(grid).getAllByRole('listitem')).toHaveLength(16);
  });

  test('Picked for you: with your position (Locate), the distance shows and the nearest comes first', () => {
    sessionStorage.setItem('intentai:home-here', JSON.stringify({ lat: 1.2806, lng: 103.8448 }));
    renderHome();
    const items = within(screen.getByRole('list', { name: 'Places picked for you' })).getAllByRole('listitem');
    const expected = pickedForYou(PUBLISHED_PLACES, ['att', 'wel', 'lei', 'cru'], 'all', { lat: 1.2806, lng: 103.8448 });
    expect(within(items[0]).getByRole('link', { name: expected[0].place.name })).toBeInTheDocument();
    expect(within(items[0]).getByText(/^\d+ m$|^\d+\.\d km$/)).toBeInTheDocument();
  });
});
