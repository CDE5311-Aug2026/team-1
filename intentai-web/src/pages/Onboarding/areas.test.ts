import { expect, test } from 'vitest';
import { AREAS, NEAR_AREA_M, OVERVIEW_AREAS, formatDistance, labelFor } from './areas';
import { HOME_BASE_BOUNDS } from '../../data/domain';

const M_PER_DEG_LAT = 111_194.93; // R = 6 371 008.8 m, as geo.ts

test('17 areas, 9 of them in the overview, all inside the validator bounds', () => {
  expect(AREAS).toHaveLength(17);
  expect(new Set(AREAS.map((a) => a.name)).size).toBe(17);
  expect(OVERVIEW_AREAS.map((a) => a.name).sort()).toEqual(
    ['Bugis', 'Chinatown', 'Clementi', 'Holland Village', 'Marina Bay', 'NUS UTown', 'Novena', 'Orchard', 'Queenstown'].sort(),
  );
  const b = HOME_BASE_BOUNDS;
  for (const a of AREAS) {
    expect(a.lat).toBeGreaterThanOrEqual(b.latMin);
    expect(a.lat).toBeLessThanOrEqual(b.latMax);
    expect(a.lng).toBeGreaterThanOrEqual(b.lngMin);
    expect(a.lng).toBeLessThanOrEqual(b.lngMax);
  }
});

test('formatDistance rounds under 1 km to 50 m, never below 50, then uses km', () => {
  expect(formatDistance(49)).toBe('50 m');
  expect(formatDistance(0)).toBe('50 m');
  expect(formatDistance(430)).toBe('450 m');
  expect(formatDistance(999)).toBe('1000 m');
  expect(formatDistance(1000)).toBe('1.0 km');
  expect(formatDistance(2349)).toBe('2.3 km');
});

test('labelFor names the nearest area within 860 m and says Near otherwise', () => {
  const toa = AREAS.find((a) => a.name === 'Toa Payoh')!;
  expect(labelFor(toa)).toBe('Toa Payoh');
  // exactly 860 m is not "within" (canvas uses a strict <)
  expect(labelFor({ lat: toa.lat + NEAR_AREA_M / M_PER_DEG_LAT, lng: toa.lng })).toBe('Near Toa Payoh');
  expect(labelFor({ lat: toa.lat + 859 / M_PER_DEG_LAT, lng: toa.lng })).toBe('Toa Payoh');
  expect(labelFor({ lat: toa.lat + 861 / M_PER_DEG_LAT, lng: toa.lng })).toBe('Near Toa Payoh');
  expect(labelFor({ lat: 1.3, lng: 103.9 })).toBe('Near Bugis');
  expect(labelFor({ lat: 1.3036, lng: 103.8318 })).toBe('Orchard');
});
