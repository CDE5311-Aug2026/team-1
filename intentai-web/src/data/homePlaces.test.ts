import { beforeEach, expect, test } from 'vitest';
import {
  ALL_HOME_PLACES,
  BERLIN_THUMB,
  FACETS,
  HOME_PLACES,
  PINNED_COUNT,
  formatHomeDistance,
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

test('four places in card order (story cards removed 31 Oct)', () => {
  expect(HOME_PLACES.map((p) => p.id)).toEqual([
    'curated:sg-berlin-wall-fragments-utown',
    'curated:sg-national-university-of-singapore',
    'curated:sg-haw-par-villa',
    'curated:sg-holland-village',
  ]);
  expect(FACETS).toEqual(['food', 'monument', 'festival', 'history']);
  expect(PINNED_COUNT).toBe(4);
});

test('the Berlin Wall keeps Team 1\'s photo', () => {
  const berlin = HOME_PLACES[0];
  expect(berlin.name).toBe('Berlin Wall Fragments');
  expect(berlin.credit).toBe('Photo supplied by the IntentAI team');
  expect(berlin.distance).toMatch(/ m$/);
});

test('no Home place has story cards; the four are always pinned', () => {
  expect(ALL_HOME_PLACES.filter((p) => p.hasCards)).toEqual([]);
  expect(HOME_PLACES.every((p) => p.pinAlways)).toBe(true);
});

test('visiblePins adds the selected place only when it is not always pinned', () => {
  expect(visiblePins('curated:sg-berlin-wall-fragments-utown')).toHaveLength(4);
  const other = ALL_HOME_PLACES[HOME_PLACES.length].id;
  const b = visiblePins(other);
  expect(b).toHaveLength(5);
  expect(b.map((p) => p.id)).toContain(other);
});

test('formatHomeDistance rounds to 50 m below 1 km, else one decimal km', () => {
  expect(formatHomeDistance(749)).toBe('750 m');
  expect(formatHomeDistance(20)).toBe('50 m');
  expect(formatHomeDistance(2512)).toBe('2.5 km');
  expect(formatHomeDistance(8400)).toBe('8.4 km');
});

test('every Home place has a computed distance label', () => {
  for (const p of HOME_PLACES) {
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

test('the literal Home places match the Nearby catalogue', () => {
  const areas = (areasJson as { areas: { id: string; name: string }[] }).areas;
  const places = placesJson as { id: string; name: string; areaId: string; coordinates: { lat: number; lng: number } }[];
  for (const p of HOME_PLACES) {
    const raw = places.find((r) => r.id === p.id)!;
    expect(p.name).toBe(raw.name);
    expect(p.point).toEqual({ lat: raw.coordinates.lat, lng: raw.coordinates.lng });
    expect(p.area).toBe(areas.find((a) => a.id === raw.areaId)!.name);
  }
});

const ids = (r: ReturnType<typeof searchHomePlaces>) => [r.withCards.map((p) => p.id), r.others.map((p) => p.id)];

test('search: an empty query lists the four Home places', () => {
  expect(ids(searchHomePlaces('  '))).toEqual([
    [],
    ['curated:sg-berlin-wall-fragments-utown', 'curated:sg-national-university-of-singapore', 'curated:sg-haw-par-villa', 'curated:sg-holland-village'],
  ]);
});

test('search: the Cards-soon places answer to their short names', () => {
  const nus = 'curated:sg-national-university-of-singapore';
  expect(ids(searchHomePlaces('UTown'))[1]).toContain(nus);
  expect(ids(searchHomePlaces('utown'))[1]).toContain(nus);
  expect(ids(searchHomePlaces('NUS'))[1]).toContain(nus);
  expect(ids(searchHomePlaces('tiger balm'))).toEqual([[], ['curated:sg-haw-par-villa']]);
  // typing searches every real place, not only the five on Home
  expect(ids(searchHomePlaces('marina bay sands'))[1]).toContain('curated:sg-marina-bay-sands');
  expect(ids(searchHomePlaces('holland road'))).toEqual([[], ['curated:sg-holland-village']]);
});

test('search: case-insensitive on name, area and aliases', () => {
  expect(ids(searchHomePlaces('tembusu'))).toEqual([[], ['curated:sg-berlin-wall-fragments-utown']]);
  expect(ids(searchHomePlaces('BERLIN'))[1]).toContain('curated:sg-berlin-wall-fragments-utown');
  expect(ids(searchHomePlaces('pagoda street'))[1]).toContain('curated:sg-pagoda-street-trengganu-street');
  expect(ids(searchHomePlaces('haw par'))).toEqual([[], ['curated:sg-haw-par-villa']]);
  expect(ids(searchHomePlaces('queenstown'))[1].length).toBeGreaterThanOrEqual(3);
  expect(ids(searchHomePlaces('zzz'))).toEqual([[], []]);
});

test('the Berlin Wall shows once on Home', () => {
  expect(ALL_HOME_PLACES.filter((p) => /Berlin Wall/.test(p.name)).map((p) => p.id)).toEqual(['curated:sg-berlin-wall-fragments-utown']);
});
