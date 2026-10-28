import { beforeEach, expect, test } from 'vitest';
import {
  FACETS,
  HOME_PLACES,
  PINNED_COUNT,
  formatHomeDistance,
  homePlace,
  isPlaceProgress,
  openedCount,
  visiblePins,
} from './homePlaces';
import { deleteAllData, placeProgressStore } from './stores';
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

test('every place with a photo has credit and alt; Berlin has none yet', () => {
  for (const p of HOME_PLACES) {
    if (p.photo) {
      expect(p.credit).not.toBe('');
      expect(p.photoAlt).not.toBe('');
    }
  }
  expect(HOME_PLACES[0].photo).toBeUndefined();
  expect(HOME_PLACES.slice(1).every((p) => p.photo)).toBe(true);
});

test('isPlaceProgress and openedCount', () => {
  expect(isPlaceProgress({ chinatown: ['x'] })).toBe(false);
  const ok = { chinatown: ['food', 'food', 'history'] };
  expect(isPlaceProgress(ok)).toBe(true);
  expect(openedCount(ok as never, 'chinatown')).toBe(2);
  expect(openedCount({}, 'chinatown')).toBe(0);
});

test('placeProgressStore ignores invalid storage and is cleared by deleteAllData', () => {
  localStorage.setItem('intentai:v1:placeProgress', '{"chinatown":["x"]}');
  resetPersistentStores();
  expect(placeProgressStore.get()).toEqual({});
  placeProgressStore.set({ chinatown: ['food'] });
  expect(placeProgressStore.get()).toEqual({ chinatown: ['food'] });
  deleteAllData();
  expect(placeProgressStore.get()).toEqual({});
});
