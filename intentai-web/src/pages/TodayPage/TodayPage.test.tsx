import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { animalFor } from '../../components/Avatar/Avatar';
import { resetPersistentStores } from '../../data/persistentStore';
import { profileV3Store } from '../../data/profile/profile';
import { explorePersonalStore } from '../../data/stores';
import { tourismOf } from '../../data/tourism';
import { placesInArea, placesInRegion, URA_AREAS } from '../../data/ura/ura';
import { huntModeStore } from '../../data/v2Stores';
import { curatedPlace, PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import { pickedForYou } from './picked';
import { FOOD_PLACES } from './HomeSections';
import TodayPage from './TodayPage';

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

/** The place page (M-page) stands in: its name and the ✕ that goes back where you came from. */
function PlacePage() {
  const { placeKey } = useParams();
  const navigate = useNavigate();
  return (
    <div>
      <p>place page {placeKey}</p>
      <button type="button" onClick={() => navigate(-1)}>
        Close
      </button>
    </div>
  );
}

function renderHome(entry = '/') {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/holidays/deepavali" element={<p>holiday page</p>} />
        <Route path="/my-space/notices" element={<p>notices page</p>} />
        <Route path="/nearby/place/:placeKey" element={<PlacePage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

// v2 (owner, 8 Nov 2026): no card deck. Regions and areas are the map's badges; places, picks and stops a row of
// pills over the map's lower edge (a list named for the level).
const region = (n: number, name: string) => screen.getByRole('button', { name: new RegExp(`^Region ${n}: ${name},`) });
const row = (label: string | RegExp) => screen.getByRole('list', { name: label });
/** The map's status line (role=status), said when a level has nothing to list. */
const mapStatus = () => {
  const el = screen.getByTestId('map-notice');
  expect(el).toHaveAttribute('role', 'status');
  return el;
};
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

// The map (its badges and pins) is a lazy chunk: load it once up front, so a slow first import under a full run does
// not eat a test's time; the map's buttons are still awaited (findBy) as they draw after Home.
const MAP = { timeout: 4000 };
beforeAll(async () => {
  await import('../../components/Discovery/MapCard3D');
});

beforeEach(() => {
  localStorage.clear();
  resetPersistentStores();
});

test('Home opens on the five URA regions, Central first (the home base is in Queenstown)', async () => {
  renderHome();
  expect(screen.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeInTheDocument();
  // v2 (owner, 8 Nov): no card deck; the regions are the map's numbered badges
  const regions = await screen.findAllByRole('button', { name: /^Region \d/ }, MAP);
  expect(regions.map((r) => r.getAttribute('aria-label')!.split(',')[0])).toEqual([
    'Region 1: Central',
    'Region 2: East',
    'Region 3: North',
    'Region 4: North-East',
    'Region 5: West',
  ]);
  const central = region(1, 'Central');
  expect(central).toHaveAttribute('aria-pressed', 'true');
  expect(central).toHaveAccessibleName(new RegExp(`^Region 1: Central, not visited yet, 0 of ${placesInRegion('central').length} places checked in`));
  expect(central).toHaveAttribute('data-status', 'none');
  // the level's name stays for screen readers
  expect(screen.getByRole('heading', { level: 2, name: 'Regions' })).toBeInTheDocument();
  // the top level: nothing to go back to, so the ↩ key is off
  expect(within(screen.getByRole('toolbar', { name: 'Map tools' })).getByRole('button', { name: /^Back to/ })).toBeDisabled();
  expect(screen.getByRole('application', { name: /planning areas/ })).toBeInTheDocument();
});

test('tapping a region badge opens its planning areas; Back returns to the regions, that region still picked', async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(await screen.findByRole('button', { name: /^Region 5: West,/ }, MAP));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=areas');
  expect(screen.getByTestId('where')).toHaveTextContent('r=west');
  expect(screen.getByLabelText('Where you are')).toHaveTextContent('Singapore › West');
  const areas = await screen.findAllByRole('button', { name: /^Area \d+:/ }, MAP);
  expect(areas).toHaveLength(12);
  // Most places first; areas with none yet go last.
  expect(areas[0]).toHaveAccessibleName(/^Area 1: Clementi,/);
  await user.click(screen.getByRole('button', { name: 'Back to regions' }));
  expect(await screen.findAllByRole('button', { name: /^Region \d/ }, MAP)).toHaveLength(5);
  expect(region(5, 'West')).toHaveAttribute('aria-pressed', 'true');
});

test('an area opens its places; a place opens its own page (the M-page the cards open), its ✕ brings the map back on it', async () => {
  const user = userEvent.setup();
  renderHome('/?lvl=areas&r=west&a=cl');
  await user.click(await screen.findByRole('button', { name: /^Area 1: Clementi,/ }, MAP));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  expect(screen.getByLabelText('Where you are')).toHaveTextContent('Singapore › West › Clementi');
  const places = within(row('Clementi places')).getAllByRole('button');
  expect(places).toHaveLength(placesInArea('cl').length);
  const name = places[1].getAttribute('aria-label')!.split(', ')[0];
  const id = placesInArea('cl').find((p) => p.name === name)!.id;
  await user.click(places[1]);
  // no sheet over the map any more (owner, 10 Nov 2026): the place page itself
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByTestId('where')).toHaveTextContent(`/nearby/place/${encodeURIComponent(id)}`);
  expect(screen.getByText(`place page ${id}`)).toBeInTheDocument();
  // one tap back: the map, on the same area and the place just seen
  await user.click(screen.getByRole('button', { name: 'Close' }));
  await screen.findByLabelText('Where you are');
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  expect(screen.getByTestId('where')).not.toHaveTextContent('open=');
  expect(screen.getByLabelText('Where you are')).toHaveTextContent('Singapore › West › Clementi');
  expect(within(row('Clementi places')).getByRole('button', { name: new RegExp(`^${name},`) })).toHaveAttribute('aria-current', 'true');
});

test('the level and place come back from the URL (Back from a place page)', () => {
  renderHome('/?lvl=places&r=west&a=cl&p=curated%3Asg-clementi-woods');
  expect(within(row('Clementi places')).getByRole('button', { name: /^Clementi Woods Park,/ })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('button', { name: 'Back to West areas' })).toBeInTheDocument();
  // ↵ opens the place the URL picked
  expect(screen.getByRole('button', { name: 'Open Clementi Woods Park' })).toBeInTheDocument();
});

test('progress on the map badges: some check-ins = exploring; all of an area = unlocked with a tick', async () => {
  const area = URA_AREAS.find((a) => a.region === 'west' && placesInArea(a.id).length === 1)!;
  const [only] = placesInArea(area.id);
  checkIn([only.id, placesInArea('cl')[0].id]);
  renderHome(`/?lvl=areas&r=west&a=${area.id}`);
  const done = await screen.findByRole('button', { name: new RegExp(`^Area \\d+: ${area.name}, unlocked, 1 of 1 place checked in`) }, MAP);
  expect(done).toHaveAttribute('data-status', 'done');
  expect(done.querySelector('[data-tick]')).not.toBeNull();
  const cl = screen.getByRole('button', { name: /^Area 1: Clementi, exploring, 1 of 11 places checked in/ });
  expect(cl).toHaveAttribute('data-status', 'exploring');
  expect(cl.querySelector('[data-tick]')).toBeNull();
});

test('an area with no places yet says so (a polite status) and stays where it is', async () => {
  const user = userEvent.setup();
  const empty = URA_AREAS.find((a) => a.region === 'west' && placesInArea(a.id).length === 0)!;
  renderHome(`/?lvl=areas&r=west&a=cl`);
  expect(mapStatus()).toBeEmptyDOMElement();
  await user.click(await screen.findByRole('button', { name: new RegExp(`^Area \\d+: ${empty.name}, no places yet`) }, MAP));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=areas');
  expect(screen.getByTestId('where')).toHaveTextContent(`a=${empty.id}`);
  expect(mapStatus()).toHaveTextContent(`${empty.name} has no places yet. Pick another area.`);
  // ↵ stays put too
  await user.click(screen.getByRole('button', { name: `Enter ${empty.name}` }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=areas');
});

test('an old ?open= link opens the place page; Back lands on the map at that place, with the tab bar', async () => {
  const user = userEvent.setup();
  const id = placesInArea('ot')[0].id;
  renderHome(`/?lvl=places&r=central&a=ot&p=${id}&open=${id}`);
  await screen.findByText(`place page ${id}`);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  await screen.findByLabelText('Where you are');
  expect(screen.getByTestId('where')).not.toHaveTextContent('open=');
  expect(screen.getByTestId('where')).toHaveTextContent(`p=${encodeURIComponent(id)}`);
  expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
});

test('v2: Home has no holiday/date card (owner, 8 Nov)', () => {
  renderHome();
  expect(screen.queryByRole('button', { name: /Deepavali long weekend/ })).not.toBeInTheDocument();
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
  expect(screen.getByTestId('where')).toHaveTextContent('/nearby/place/');
  expect(screen.getByText(/^place page .*maxwell/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Close' }));
  await screen.findByLabelText('Where you are');
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  // ↩, the one back key, goes up a level
  await user.click(within(screen.getByRole('toolbar', { name: 'Map tools' })).getByRole('button', { name: /^Back to/ }));
  expect(screen.getByTestId('where')).not.toHaveTextContent('lvl=places');
});

test("map tools: Editor's Pick shows the picks as a row over the map; a walk's numbered stops; its 2D route opens Google Maps", async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByRole('button', { name: "Editor's Pick" }));
  expect(screen.getByRole('button', { name: "Editor's Pick" })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=picks');
  const picks = await waitFor(() => within(row("Editor's Pick")).getAllByRole('button'));
  const names = picks.map((b) => b.getAttribute('aria-label')!);
  expect(names.some((n) => n.startsWith('Chinatown · The story walk, Walk · '))).toBe(true);
  expect(names.some((n) => n.startsWith('Hawker centres to know, List · '))).toBe(true);
  // the map shows the selected pick's stops, numbered for a walk
  expect(await screen.findAllByRole('button', { name: /^Stop 1: / }, MAP)).toHaveLength(1);
  await user.click(within(row("Editor's Pick")).getByRole('button', { name: /^Chinatown · The story walk,/ }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=pick&');
  expect(screen.getByTestId('where')).toHaveTextContent('k=chinatown-story-walk');
  const stops = within(row('Chinatown · The story walk: stops')).getAllByRole('button');
  expect(stops[0]).toHaveAccessibleName(/^Thian Hock Keng Temple, Stop 1,/);
  expect(screen.getByRole('button', { name: /^Stop 1: Thian Hock Keng Temple/ })).toHaveAttribute('aria-pressed', 'true');
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

test("a list from Editor's Pick crosses the island; a stop on the row or a pin on the map opens its place page", async () => {
  const user = userEvent.setup();
  renderHome('/?lvl=pick&k=list:sg-hawker-centres');
  expect(screen.queryByRole('button', { name: '2D route' })).toBeNull();
  const first = await waitFor(() => within(row(/^Hawker centres to know: places$/)).getAllByRole('button')[0]);
  const name = first.getAttribute('aria-label')!.split(', ')[0];
  await user.click(first);
  expect(screen.getByTestId('where')).toHaveTextContent('/nearby/place/');
  await user.click(screen.getByRole('button', { name: 'Close' }));
  // back on the pick's stops, at the one just opened
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('lvl=pick&'));
  expect(within(row(/^Hawker centres to know: places$/)).getByRole('button', { name: new RegExp(`^${name},`) })).toHaveAttribute('aria-current', 'true');
  // a list's pins are not numbered: tap the second one on the map
  const pins = await screen.findAllByRole('button', { name: /, (Attractions|Wellness|Leisure|Cruise)/ }, MAP);
  const pin = pins.find((p) => p.hasAttribute('data-pin') && !p.getAttribute('aria-label')!.startsWith(name))!;
  await user.click(pin);
  expect(screen.getByTestId('where')).toHaveTextContent('/nearby/place/');
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
  await waitFor(() => expect(within(row('Near you · 2 km')).getByRole('button', { name: /^Chinatown · The story walk, \d.* away, Editor's Pick/ })).toBeInTheDocument());
  const near = within(row('Near you · 2 km')).getAllByRole('button');
  expect(near.some((b) => /^Thian Hock Keng Temple, \d.* away/.test(b.getAttribute('aria-label')!))).toBe(true);
  // nearest first: the distances never go down along the row
  const metres = near.map((b) => {
    const m = /, ([\d.]+) (m|km) away/.exec(b.getAttribute('aria-label')!)!;
    return Number(m[1]) * (m[2] === 'km' ? 1000 : 1);
  });
  expect(metres).toEqual([...metres].sort((a, b) => a - b));
  expect(metres.every((m) => m <= 2000)).toBe(true);
  expect(screen.getByRole('img', { name: 'You are here' })).toBeInTheDocument();
  // a walk opens its stops, at the one nearest you
  await user.click(within(row('Near you · 2 km')).getByRole('button', { name: /^Chinatown · The story walk,/ }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=pick&');
  expect(screen.getByTestId('where')).toHaveTextContent('k=chinatown-story-walk');
  expect(screen.getByTestId('where')).not.toHaveTextContent(/1\.28|103\.8/);
});

afterEach(() => vi.unstubAllGlobals());

test('the badges carry the full numbers: checked in of all, and each category’s count (All)', async () => {
  renderHome('/?lvl=areas&r=west&a=cl');
  const cl = await screen.findByRole('button', { name: /^Area 1: Clementi,/ }, MAP);
  expect(cl).toHaveAccessibleName(/0 of 11 places checked in/);
  const counts = (['att', 'wel', 'lei', 'cru'] as const)
    .map((c) => [c, placesInArea('cl').filter((p) => p.operatingStatus !== 'planned' && tourismOf(p) === c).length] as const)
    .filter(([, n]) => n > 0);
  const label = { att: 'Attractions', wel: 'Wellness', lei: 'Leisure', cru: 'Cruise' };
  expect(cl.getAttribute('aria-label')).toMatch(new RegExp(`${counts.map(([c, n]) => `, ${n} ${label[c]}`).join('')}$`));
  // the mini chips show the same, in the fixed order
  expect([...cl.querySelectorAll('[data-cat]')].map((e) => `${e.getAttribute('data-cat')}${e.textContent}`)).toEqual(counts.map(([c, n]) => `${c}${n}`));
});

// ---- Redesign v2 (boards 05/11): category chips on the kept map, together vs solo, Challenges, Picked for you ----

const catOf = (id: string) => tourismOf(curatedPlace(id) ?? {});
const chip = (name: string) => within(screen.getByRole('group', { name: 'Filter the cards below' })).getByRole('button', { name });

test('the category chips filter the row of places to that category’s (the URL keeps ?cat=); a category with none here says so', async () => {
  const user = userEvent.setup();
  const all = ['att', 'wel', 'lei', 'cru'] as const;
  const mixed = URA_AREAS.find((a) => {
    const cats = placesInArea(a.id).map((p) => tourismOf(p));
    return cats.includes('wel') && cats.some((c) => c !== 'wel') && all.some((c) => !cats.includes(c));
  })!;
  renderHome(`/?lvl=places&r=${mixed.region}&a=${mixed.id}`);
  expect(within(row(`${mixed.name} places`)).getAllByRole('button')).toHaveLength(placesInArea(mixed.id).length);
  await user.click(chip('Wellness'));
  expect(screen.getByTestId('where')).toHaveTextContent('cat=wel');
  expect(chip('Wellness')).toHaveAttribute('aria-pressed', 'true');
  const shown = within(row(`${mixed.name} places`)).getAllByRole('button');
  const wel = placesInArea(mixed.id).filter((p) => tourismOf(p) === 'wel');
  expect(shown).toHaveLength(wel.length);
  expect(shown.map((b) => b.getAttribute('aria-label')!.split(', ')[0]).sort()).toEqual(wel.map((p) => p.name).sort());
  expect(shown.every((b) => b.getAttribute('aria-label')!.includes(', Wellness'))).toBe(true);
  // the drill-down is untouched: still the same level and area
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  expect(screen.getByTestId('where')).toHaveTextContent(`a=${mixed.id}`);
  // a category with nothing in this area: no row, a polite status, the level stays
  const missing = all.find((c) => !placesInArea(mixed.id).some((p) => tourismOf(p) === c))!;
  const label = { att: 'Attractions', wel: 'Wellness', lei: 'Leisure', cru: 'Cruise' }[missing];
  await user.click(chip(label));
  expect(screen.queryByRole('list', { name: `${mixed.name} places` })).toBeNull();
  expect(mapStatus()).toHaveTextContent(`No ${label} places here. Pick All to see every place.`);
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  await user.click(chip('All'));
  expect(mapStatus()).toBeEmptyDOMElement();
  expect(within(row(`${mixed.name} places`)).getAllByRole('button')).toHaveLength(placesInArea(mixed.id).length);
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

test('a picked category is counted on the region badges (one count, not the four)', async () => {
  renderHome('/?cat=wel');
  const n = placesInRegion('central').filter((p) => p.operatingStatus !== 'planned' && tourismOf(p) === 'wel').length;
  const central = await screen.findByRole('button', { name: new RegExp(`^Region 1: Central, .*, ${n} Wellness$`) }, MAP);
  expect(central).toHaveTextContent(new RegExp(`${n}$`));
  expect(central.querySelectorAll('[data-cat]')).toHaveLength(0);
});

describe('v2 sections', () => {
  beforeEach(() => {
    // Locate (above) keeps your position for the tab
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-07T10:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  test('together: the region leaderboard (example players, labelled) and challenges without sample counts', () => {
    huntModeStore.set({ mode: 'together', region: 'central' });
    renderHome();
    const board = screen.getByRole('region', { name: 'Leaderboard · Central · this weekend' });
    // no "Example" pill in the head (owner, 9 Nov 2026); a quiet note says the players are samples
    expect(within(board).queryByText('Example')).toBeNull();
    expect(within(board).getByText('Sample players until real times come in')).toBeInTheDocument();
    expect(within(board).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1Arjun K.96 min fastest',
      '2Hui Wen102 +6',
      '3Farid109 +13',
    ]);
    // each player (and You) wears a decorative animal icon from their name; the names stay as text
    const icons = [...board.querySelectorAll('svg[data-animal]')];
    expect(icons).toHaveLength(4);
    expect(icons.every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(icons.map((s) => s.getAttribute('data-animal'))).toEqual(
      ['Arjun K.', 'Hui Wen', 'Farid', 'You'].map(animalFor),
    );
    expect(within(board).getByText(/no time yet\./)).toBeInTheDocument();
    // "Open a challenge" is a link again: to the region's challenge volume
    expect(within(board).getByRole('link', { name: 'Open a challenge' }).getAttribute('href')).toMatch(/^\/hunt#story\//);
    const civic = screen.getByRole('article', { name: 'Civic District' });
    expect(within(civic).getByText('7–8 Nov · 8 stops')).toBeInTheDocument();
    expect(within(civic).queryByText(/joined/)).toBeNull();
    expect(within(civic).queryByText('Example')).toBeNull();
  });

  test('the board is the region’s: a region with no open challenge says so, under the example fastest three', () => {
    huntModeStore.set({ mode: 'together', region: 'east' });
    renderHome();
    const board = screen.getByRole('region', { name: 'Leaderboard · East · this weekend' });
    expect(within(board).getByText(/No challenge is open in East right now\./)).toBeInTheDocument();
    expect(within(board).getByRole('link', { name: 'See all challenges in Hunt' })).toHaveAttribute('href', '/hunt');
    // the fastest three always show (owner, 8 Nov 2026), labelled as examples, each opening Hunt's speed board
    const podium = within(board).getByRole('list', { name: 'Fastest (example players)' });
    const entries = within(podium).getAllByRole('link');
    expect(entries).toHaveLength(3);
    for (const e of entries) expect(e).toHaveAttribute('href', '/hunt?board=speed');
    // no "Example" pill in the head (owner, 9 Nov 2026); a quiet note says the players are samples
    expect(within(board).queryByText('Example')).toBeNull();
    expect(within(board).getByText('Sample players until real times come in')).toBeInTheDocument();
    expect(within(board).queryByText(/^You$/)).toBeNull();
    // the empty card still says it is the leaderboard
    expect(within(board).getByRole('heading', { level: 2 })).toHaveTextContent(/^Leaderboard · East · this weekend$/);
  });

  test('your line counts the story’s own check-ins (Hunt), read from its save without the game, and again on return', async () => {
    huntModeStore.set({ mode: 'together', region: 'central' });
    // wk45 Civic District (central): two stops checked in through Hunt, 96 minutes apart; a preview stamp under the
    // wrong mode does not count
    const save = (stops: Record<string, unknown>) => localStorage.setItem('findsg-onsite-v1:civic-f1:manual', JSON.stringify({ stops }));
    save({
      'civic-f1-01': { checkin: { mode: 'manual', confirmedAt: '2026-11-07T01:00:00.000Z' } },
      'civic-f1-03': { checkin: { mode: 'preview', confirmedAt: '2026-11-07T01:30:00.000Z' } },
    });
    renderHome();
    const board = screen.getByRole('region', { name: 'Leaderboard · Central · this weekend' });
    expect(within(board).getByText(/clock running in Civic District\./)).toBeInTheDocument();
    save({
      'civic-f1-01': { checkin: { mode: 'manual', confirmedAt: '2026-11-07T01:00:00.000Z' } },
      'civic-f1-02': { checkin: { mode: 'manual', confirmedAt: '2026-11-07T02:36:00.000Z' } },
    });
    window.dispatchEvent(new Event('focus'));
    expect(await within(board).findByText(/1 h 36 min in Civic District so far\./)).toBeInTheDocument();
  });

  test('a challenge whose days have passed leaves the board: the region’s next one takes it', async () => {
    vi.setSystemTime(new Date('2026-11-09T10:00:00'));
    huntModeStore.set({ mode: 'together', region: 'central' });
    renderHome();
    const board = screen.getByRole('region', { name: 'Leaderboard · Central · this weekend' });
    expect(within(board).getByText(/no time yet\./)).toBeInTheDocument();
    // "Open a challenge" is a link again: to the region's challenge volume
    expect(within(board).getByRole('link', { name: 'Open a challenge' }).getAttribute('href')).toMatch(/^\/hunt#story\//);
    localStorage.setItem('findsg-onsite-v1:kampong-gelam:manual', JSON.stringify({ stops: { 'kampong-gelam-01': { checkin: { mode: 'manual', confirmedAt: '2026-11-09T01:00:00.000Z' } } } }));
    window.dispatchEvent(new Event('focus'));
    expect(await within(board).findByText(/clock running in Kampong Gelam\./)).toBeInTheDocument();
  });

  // owner, 10 Nov 2026: "the map must stay at the very top"; the filter goes under the leaderboard and the map
  const before = (a: Element, b: Element) => expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  test('order, together: the map first, then the leaderboard, Places to eat, the chips, Challenges, Picked for you', () => {
    huntModeStore.set({ mode: 'together', region: 'central' });
    renderHome();
    const map = screen.getByRole('application', { name: /planning areas/ });
    const board = screen.getByRole('region', { name: 'Leaderboard · Central · this weekend' });
    const eat = screen.getByRole('button', { name: /Places to eat/ });
    const chips = chip('All');
    const challenges = screen.getByRole('heading', { level: 2, name: 'Challenges' });
    const picked = screen.getByRole('heading', { level: 2, name: 'Picked for you' });
    // nothing but the page bar above the map
    for (const el of [board, eat, chips, challenges, picked]) before(map, el);
    before(board, eat);
    before(eat, chips);
    before(chips, challenges);
    before(challenges, picked);
  });

  test('order, solo: no leaderboard; Places to eat and the chips come straight under the map', () => {
    huntModeStore.set({ mode: 'solo' });
    renderHome();
    expect(screen.queryByRole('region', { name: /^Leaderboard/ })).toBeNull();
    const map = screen.getByRole('application', { name: /planning areas/ });
    const eat = screen.getByRole('button', { name: /Places to eat/ });
    before(map, eat);
    before(eat, chip('All'));
    before(chip('All'), screen.getByRole('heading', { level: 2, name: 'Challenges' }));
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

  test('a challenge card says Open and goes to its volume (the challenge page is retired); nothing is kept', () => {
    renderHome();
    const civic = screen.getByRole('article', { name: 'Civic District' });
    expect(within(civic).getByRole('link', { name: 'Civic District' })).toHaveAttribute('href', '/hunt#story/civic-f1');
    const open = within(civic).getByRole('link', { name: 'Open Civic District' });
    expect(open).toHaveTextContent('Open');
    expect(open).toHaveAttribute('href', '/hunt#story/civic-f1');
    expect(within(civic).queryByRole('button', { name: /Join/ })).toBeNull();
    const kampong = screen.getByRole('article', { name: /Kampong/ });
    expect(within(kampong).getByRole('link', { name: /^Open / })).toHaveAttribute('href', '/hunt#story/kampong-gelam');
    expect(localStorage.getItem('intentai:v1:challenge-joined')).toBeNull();
  });

  test('the chips filter the challenges too', async () => {
    const user = userEvent.setup();
    renderHome();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.click(chip('Cruise'));
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText('No open challenges in this category right now.')).toBeInTheDocument();
  });

  test('Eat (UT01-1): Places to eat and the Eat chip show only the catalogue’s food places, straight under the chips', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole('button', { name: /Places to eat/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('cat=eat');
    expect(chip('Eat')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('All')).toHaveAttribute('aria-pressed', 'false');
    // no challenges between the chips and the food cards
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    const grid = screen.getByRole('list', { name: 'Places to eat' });
    const food = new Set(FOOD_PLACES.map((p) => p.name));
    const names = within(grid).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toHaveLength(8);
    for (const n of names) expect(food.has(n!)).toBe(true);
    // Eat again goes back to All
    await user.click(chip('Eat'));
    expect(screen.getByTestId('where')).not.toHaveTextContent('cat=');
  });

  test('each challenge card says its level (UT01-2)', () => {
    renderHome();
    for (const card of screen.getAllByRole('article')) expect(within(card).getByRole('img', { name: /^Level [123] of 3, / })).toBeInTheDocument();
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

  test('Picked for you: a licensed photo when there is one, else the map around the place, never an empty tint', () => {
    renderHome('/?cat=cru');
    const grid = screen.getByRole('list', { name: 'Places picked for you' });
    // Marina Bay Cruise Centre has a Commons photo since 9 Nov 2026 (it had none before)
    const cruise = within(grid).getByRole('link', { name: 'Open Marina Bay Cruise Centre Singapore' });
    expect(cruise.querySelector('img')?.getAttribute('src')).toContain('nearby/photos/sg-marina-bay-cruise-centre.webp');
    const media = within(grid).getAllByRole('link', { name: /^Open / });
    for (const card of media.filter((c) => !c.querySelector('img'))) {
      const ground = card.querySelector<HTMLElement>('[aria-hidden="true"]');
      expect(ground?.style.backgroundImage).toMatch(/sg-ground/);
      expect(ground?.style.backgroundSize).toMatch(/%/);
    }
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
