import { expect, test } from 'vitest';
import { ALL_HOME_PLACES } from '../../data/homePlaces';
import { editorPicks } from '../../data/picks';
import { distanceM } from '../../features/nearby/geo';
import { NEAR_M, nearYou, shortDistance } from './nearYou';

const CHINATOWN = { lat: 1.2806, lng: 103.8448 }; // by Thian Hock Keng
const picks = editorPicks('2026-11-01');

test('near you: the places within 2 km and the Picks with a stop that close, nearest first', () => {
  const r = nearYou(CHINATOWN, ALL_HOME_PLACES, picks);
  expect(r.within).toBe(true);
  expect(r.items.length).toBeGreaterThan(5);
  expect(r.items.every((i) => i.m <= NEAR_M)).toBe(true);
  expect(r.items.map((i) => i.m)).toEqual([...r.items.map((i) => i.m)].sort((a, b) => a - b));
  const names = r.items.map((i) => (i.kind === 'place' ? i.place.name : i.pick.title));
  expect(names).toContain('Thian Hock Keng Temple');
  expect(names).toContain('Chinatown · The story walk');
  // the map pins are the places only, all within 2 km
  expect(r.places.every((p) => distanceM(CHINATOWN, p.point) <= NEAR_M)).toBe(true);
  const picked = r.items.flatMap((i) => (i.kind === 'pick' ? [i.pick] : []));
  expect(picked.filter((k) => k.kind === 'walk').length).toBeLessThanOrEqual(3);
  expect(picked.filter((k) => k.kind === 'list').length).toBeLessThanOrEqual(2);
});

test('nothing within 2 km: the nearest few places, never an empty deck', () => {
  const r = nearYou({ lat: 1.2, lng: 103.62 }, ALL_HOME_PLACES, picks); // out at sea off Tuas
  expect(r.within).toBe(false);
  expect(r.items.length).toBe(6);
  expect(r.items.every((i) => i.kind === 'place')).toBe(true);
});

test('distances read short', () => {
  expect(shortDistance(12)).toBe('50 m');
  expect(shortDistance(437)).toBe('450 m');
  expect(shortDistance(1430)).toBe('1.4 km');
});
