import { beforeEach, expect, test } from 'vitest';
import {
  BERLIN_THUMB,
  FACETS,
  HOME_PLACES,
  PINNED_COUNT,
  formatHomeDistance,
  homePlace,
  searchHomePlaces,
  visiblePins,
} from './homePlaces';
import placesJson from './explore/places.sg.json';
import areasJson from './explore/areas.json';
import { resetPersistentStores } from './persistentStore';

beforeEach(() => {
  localStorage.clear();
  resetPersistentStores();
});

test('five places in card order', () => {
  expect(HOME_PLACES.map((p) => p.id)).toEqual([
    'berlin-wall-fragments',
    'chinatown',
    'curated:sg-national-university-of-singapore',
    'curated:sg-haw-par-villa',
    'curated:sg-holland-village',
  ]);
  expect(FACETS).toEqual(['food', 'monument', 'festival', 'history']);
  expect(PINNED_COUNT).toBe(4);
});

test('the two story places carry fixed labels', () => {
  const berlin = HOME_PLACES[0];
  expect(berlin.name).toBe('Berlin Wall Fragments');
  expect(berlin.area).toBe('NUS University Town');
  expect(berlin.distance).toBe('200 m');
  const chinatown = homePlace('chinatown')!;
  expect(chinatown.area).toBe('Chinatown & Tanjong Pagar');
  expect(chinatown.distance).toBe('8.4 km');
  expect(chinatown.point).toEqual({ lat: 1.28361, lng: 103.84417 });
});

test('cards and pins flags', () => {
  expect(HOME_PLACES.filter((p) => p.hasCards).map((p) => p.id)).toEqual(['berlin-wall-fragments', 'chinatown']);
  expect(HOME_PLACES.filter((p) => !p.pinAlways).map((p) => p.id)).toEqual(['chinatown']);
});

test('visiblePins adds the selected place only when it is not always pinned', () => {
  const a = visiblePins('berlin-wall-fragments');
  expect(a).toHaveLength(4);
  expect(a.map((p) => p.id)).not.toContain('chinatown');
  const b = visiblePins('chinatown');
  expect(b).toHaveLength(5);
  expect(b.map((p) => p.id)).toContain('chinatown');
});

test('formatHomeDistance rounds to 50 m below 1 km, else one decimal km', () => {
  expect(formatHomeDistance(749)).toBe('750 m');
  expect(formatHomeDistance(20)).toBe('50 m');
  expect(formatHomeDistance(2512)).toBe('2.5 km');
  expect(formatHomeDistance(8400)).toBe('8.4 km');
});

test('places 3 to 5 have computed distance labels', () => {
  for (const p of HOME_PLACES.slice(2)) {
    expect(p.distance).toMatch(/^\d+ m$|^\d+\.\d km$/);
    expect(p.distance.startsWith('Approx.')).toBe(false);
  }
});

test('every place has a photo with credit and alt', () => {
  for (const p of HOME_PLACES) {
    expect(p.photo).toBeTruthy();
    expect(p.credit).not.toBe('');
    expect(p.photoAlt).not.toBe('');
  }
  expect(HOME_PLACES[0].photo).toBeDefined();
});

test('BERLIN_THUMB is a non-empty url string', () => {
  expect(typeof BERLIN_THUMB).toBe('string');
  expect(BERLIN_THUMB.length).toBeGreaterThan(0);
});

test('literal places 3 to 5 match the Nearby catalogue', () => {
  const areas = (areasJson as { areas: { id: string; name: string }[] }).areas;
  const places = placesJson as { id: string; name: string; areaId: string; coordinates: { lat: number; lng: number } }[];
  for (const p of HOME_PLACES.slice(2)) {
    const raw = places.find((r) => r.id === p.id)!;
    expect(p.name).toBe(raw.name);
    expect(p.point).toEqual({ lat: raw.coordinates.lat, lng: raw.coordinates.lng });
    expect(p.area).toBe(areas.find((a) => a.id === raw.areaId)!.name);
  }
});

const ids = (r: ReturnType<typeof searchHomePlaces>) => [r.withCards.map((p) => p.id), r.others.map((p) => p.id)];

test('search: empty query lists the two card places, then the three Cards-soon places', () => {
  expect(ids(searchHomePlaces('  '))).toEqual([
    ['berlin-wall-fragments', 'chinatown'],
    ['curated:sg-national-university-of-singapore', 'curated:sg-haw-par-villa', 'curated:sg-holland-village'],
  ]);
});

test('search: the Cards-soon places answer to their short names', () => {
  const nus = 'curated:sg-national-university-of-singapore';
  expect(ids(searchHomePlaces('UTown'))).toEqual([[], [nus]]);
  expect(ids(searchHomePlaces('utown'))).toEqual([[], [nus]]);
  expect(ids(searchHomePlaces('NUS'))[1]).toEqual([nus]);
  expect(ids(searchHomePlaces('tiger balm'))).toEqual([[], ['curated:sg-haw-par-villa']]);
  expect(ids(searchHomePlaces('holland road'))).toEqual([[], ['curated:sg-holland-village']]);
});

test('search: case-insensitive on name, area and aliases', () => {
  expect(ids(searchHomePlaces('tembusu'))).toEqual([['berlin-wall-fragments'], []]);
  expect(ids(searchHomePlaces('BERLIN'))).toEqual([['berlin-wall-fragments'], []]);
  expect(ids(searchHomePlaces('pagoda street'))).toEqual([['chinatown'], []]);
  expect(ids(searchHomePlaces('tanjong'))).toEqual([['chinatown'], []]);
  expect(ids(searchHomePlaces('haw par'))).toEqual([[], ['curated:sg-haw-par-villa']]);
  // "Queenstown & Holland" is the area of all three Cards-soon places.
  expect(ids(searchHomePlaces('queenstown'))[1]).toHaveLength(3);
  expect(ids(searchHomePlaces('University Town'))).toEqual([['berlin-wall-fragments'], []]);
  expect(ids(searchHomePlaces('zzz'))).toEqual([[], []]);
});
