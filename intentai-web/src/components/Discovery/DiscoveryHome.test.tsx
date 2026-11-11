import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetPersistentStores } from '../../data/persistentStore';
import { profileV3Store, tourismOrder } from '../../data/profile/profile';
import { tourismOf, type TourismCategory } from '../../data/tourism';
import { URA_AREAS, placesInArea } from '../../data/ura/ura';
import { curatedPlace } from '../../features/nearby/catalogue';
import DiscoveryHome, { homePlacesIn } from './DiscoveryHome';
import { MapCard3D } from './MapCard3D';

function Where() {
  const { search } = useLocation();
  return <p data-testid="where">{search}</p>;
}

/** Home's map as TodayPage mounts it, the category (?cat=) read from the URL as useCategoryParam does. */
function Home() {
  const { search } = useLocation();
  const cat = (new URLSearchParams(search).get('cat') ?? 'all') as TourismCategory | 'all';
  return <DiscoveryHome category={cat} />;
}

function renderHome(entry = '/') {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

const where = () => new URLSearchParams(screen.getByTestId('where').textContent ?? '');
const MAP = { timeout: 4000 };
const catOf = (id: string) => tourismOf(curatedPlace(id) ?? {});

beforeAll(async () => {
  await import('./MapCard3D');
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetPersistentStores();
});

afterEach(() => vi.unstubAllGlobals());

describe('the category (?cat=) stays through every move on the map', () => {
  test('a region, then an area, then back up: Wellness stays picked', async () => {
    const user = userEvent.setup();
    renderHome('/?cat=wel');
    await user.click(await screen.findByRole('button', { name: /^Region 5: West,/ }, MAP));
    expect(where().get('lvl')).toBe('areas');
    expect(where().get('r')).toBe('west');
    expect(where().get('cat')).toBe('wel');
    await user.click(await screen.findByRole('button', { name: /^Area \d+: Clementi,/ }, MAP));
    expect(where().get('lvl')).toBe('places');
    expect(where().get('cat')).toBe('wel');
    await user.click(screen.getByRole('button', { name: 'Back to West areas' }));
    expect(where().get('lvl')).toBe('areas');
    expect(where().get('cat')).toBe('wel');
    await user.click(screen.getByRole('button', { name: 'Back to regions' }));
    expect(where().get('lvl')).toBeNull();
    expect(where().get('cat')).toBe('wel');
  });

  test("Editor's Pick and back keep it too", async () => {
    const user = userEvent.setup();
    renderHome('/?cat=att');
    await user.click(screen.getByRole('button', { name: "Editor's Pick" }));
    await waitFor(() => expect(where().get('lvl')).toBe('picks'));
    expect(where().get('cat')).toBe('att');
    await user.click(screen.getByRole('button', { name: "Editor's Pick" }));
    expect(where().get('lvl')).toBeNull();
    expect(where().get('cat')).toBe('att');
  });
});

describe("an area's places are ranked by your category order (tourismOrder), as Picked for you ranks them", () => {
  // an area whose places come in more than one category, the first of them not Wellness
  const mixed = URA_AREAS.find((a) => {
    const cats = placesInArea(a.id).map((p) => tourismOf(p));
    return cats.includes('wel') && cats[0] !== 'wel';
  })!;

  test('homePlacesIn puts your #1 category first, the rest after, each in its own order', () => {
    const order = tourismOrder({ ...profileV3Store.get(), tourismRanking: ['wel'] });
    const list = homePlacesIn(mixed.id, order);
    const ranks = list.map((p) => order.indexOf(catOf(p.id)!));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(catOf(list[0].id)).toBe('wel');
    // no order: the catalogue's own
    expect(homePlacesIn(mixed.id).map((p) => p.id)).toEqual(homePlacesIn(mixed.id, []).map((p) => p.id));
  });

  test('the row over the map and Enter follow the ranking saved in onboarding', async () => {
    profileV3Store.set((p) => ({ ...p, tourismRanking: ['wel', 'att'] }));
    renderHome(`/?lvl=places&r=${mixed.region}&a=${mixed.id}`);
    const pills = within(screen.getByRole('list', { name: `${mixed.name} places` })).getAllByRole('button');
    const cats = pills.map((b) => (/, (Attractions|Wellness|Leisure|Cruise)(,|$)/.exec(b.getAttribute('aria-label')!) ?? [])[1]);
    const firstOther = cats.findIndex((c) => c !== 'Wellness');
    expect(firstOther).toBeGreaterThan(0);
    expect(cats.slice(firstOther)).not.toContain('Wellness');
    // the first (current) pill is what ↵ opens
    expect(pills[0]).toHaveAttribute('aria-current', 'true');
    const first = pills[0].getAttribute('aria-label')!.split(', ')[0];
    expect(screen.getByRole('button', { name: `Open ${first}` })).toBeInTheDocument();
  });
});

describe('Near you keeps your position out of the URL', () => {
  test('no n= (the nearest place) and the area you were browsing, not the one you are in', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        // Chinatown (Outram, Central): far from Clementi
        getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 1.2806, longitude: 103.8448, accuracy: 20 } } as GeolocationPosition),
      },
    });
    renderHome('/?lvl=areas&r=west&a=cl');
    await user.click(screen.getByRole('button', { name: 'My location' }));
    await waitFor(() => expect(where().get('lvl')).toBe('near'));
    expect(where().get('r')).toBe('west');
    expect(where().get('a')).toBe('cl');
    expect(where().has('n')).toBe(false);
    expect(screen.getByTestId('where').textContent).not.toMatch(/1\.28|103\.8/);
    // where you are is kept for this tab only
    expect(sessionStorage.getItem('intentai:home-here')).toContain('1.2806');
    // a pick near you opens its stops, still with nothing about where you are
    const row = await screen.findByRole('list', { name: 'Near you · 2 km' });
    await user.click(within(row).getByRole('button', { name: /^Chinatown · The story walk,/ }));
    expect(where().get('lvl')).toBe('pick');
    expect(where().has('n')).toBe(false);
  });
});

describe("a walk's numbered stops carry their category as a corner glyph, and keep their number when faded", () => {
  const stops = ['curated:sg-thian-hock-keng-temple', 'curated:sg-ayer-rajah-food-centre', 'curated:sg-balmoral-bakery']
    .map((id) => curatedPlace(id))
    .filter((p) => !!p)
    .map((p) => ({ id: p!.id, name: p!.name, point: { lat: p!.coordinates.lat, lng: p!.coordinates.lng }, tourism: tourismOf(p!) }));

  test('each numbered pin: its number, and its category glyph on the corner', () => {
    expect(stops.length).toBeGreaterThan(1);
    render(
      <MapCard3D
        level="pick"
        region="central"
        areaId="dt"
        areaOrder={[]}
        places={stops}
        visited={new Set()}
        label="map"
        numbered
        onPickRegion={() => {}}
        onPickArea={() => {}}
        onPickPlace={() => {}}
      />,
    );
    stops.forEach((s, i) => {
      const pin = screen.getByRole('button', { name: new RegExp(`^Stop ${i + 1}: `) });
      expect(pin).toHaveTextContent(String(i + 1));
      expect(pin.querySelector('[data-corner]')?.getAttribute('data-corner')).toBe(s.tourism);
      expect(pin.querySelector('[data-corner] svg')).not.toBeNull();
    });
  });

  test('another category picked: the faded stops keep their numbers (and corner glyphs)', () => {
    const picked = stops[0].tourism!;
    render(
      <MapCard3D
        level="pick"
        region="central"
        areaId="dt"
        areaOrder={[]}
        places={stops}
        visited={new Set()}
        label="map"
        numbered
        category={picked}
        onPickRegion={() => {}}
        onPickArea={() => {}}
        onPickPlace={() => {}}
      />,
    );
    const dim = [...document.querySelectorAll<HTMLElement>('[data-pin][data-dim]')];
    for (const pin of dim) {
      const i = stops.findIndex((s) => s.id === pin.dataset.pin);
      expect(pin).toHaveTextContent(String(i + 1));
      expect(pin.querySelector('[data-corner]')).not.toBeNull();
    }
  });
});

describe('where the map starts', () => {
  test("a hunter's map starts on the region they picked in onboarding; on your own, on home base's", async () => {
    const { huntModeStore } = await import('../../data/v2Stores');
    huntModeStore.set({ mode: 'together', region: 'east' });
    const { unmount } = renderHome('/?lvl=areas');
    expect(screen.getByRole('heading', { level: 2, name: 'East · planning areas' })).toBeInTheDocument();
    unmount();
    // explore on your own: the region picked earlier does not steer the map
    huntModeStore.set({ mode: 'solo', region: 'east' });
    renderHome('/?lvl=areas');
    expect(screen.queryByRole('heading', { level: 2, name: 'East · planning areas' })).toBeNull();
  });
});
