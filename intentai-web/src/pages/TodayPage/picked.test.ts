import { expect, test } from 'vitest';
import { PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import type { CuratedPlace } from '../../features/nearby/domain';
import { distanceM } from '../../features/nearby/geo';
import { pickedForYou } from './picked';

const here = { lat: 1.2806, lng: 103.8448 };

test('dealt in turns by your order, #1 leading each round; within one, catalogue order without a position', () => {
  const list = pickedForYou(PUBLISHED_PLACES, ['wel', 'cru', 'att', 'lei'], 'all', null);
  const cats = list.map((p) => p.category);
  expect(cats.slice(0, 4)).toEqual(['wel', 'cru', 'att', 'lei']);
  expect(cats[4]).toBe('wel');
  expect(new Set(cats.slice(0, 8)).size).toBe(4);
  expect(list).toHaveLength(PUBLISHED_PLACES.filter((p) => p.tourism && p.operatingStatus !== 'planned').length);
  const wel = list.filter((p) => p.category === 'wel').map((p) => p.place.id);
  expect(wel).toEqual(PUBLISHED_PLACES.filter((p) => p.tourism?.category === 'wel').map((p) => p.id));
  expect(list.every((p) => p.m === undefined)).toBe(true);
});

test('with a position: nearest first inside each category, and the distance comes with it', () => {
  const list = pickedForYou(PUBLISHED_PLACES, ['att', 'wel', 'lei', 'cru'], 'all', here);
  const att = list.filter((p) => p.category === 'att');
  expect(att.map((p) => p.m)).toEqual([...att.map((p) => p.m!)].sort((a, b) => a - b));
  expect(att[0].m).toBeCloseTo(distanceM(here, att[0].place.coordinates));
  expect(list[0].category).toBe('att');
});

test('a chip keeps only its category; planned places are never picked', () => {
  expect(pickedForYou(PUBLISHED_PLACES, ['att'], 'lei', null).every((p) => p.category === 'lei')).toBe(true);
  const planned = { ...PUBLISHED_PLACES[0], operatingStatus: 'planned' } as CuratedPlace;
  expect(pickedForYou([planned, PUBLISHED_PLACES[1]], ['att'], 'all', null).map((p) => p.place.id)).toEqual([PUBLISHED_PLACES[1].id]);
});
