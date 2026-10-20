import { describe, expect, test } from 'vitest';
import { PUBLISHED_PLACES, curatedPlace } from './catalogue';
import { distanceM, formatDistance, inSingapore } from './geo';
import { HALF, cluster, fitView, toLatLng, toScreen, toXY } from './map/projection';
import { byDistance, filterPlaces, matchesQuery, originPhrase, reasonFor, toItem } from './ranking';
import outlines from '../../data/explore/outlines.json';
import type { Ring } from './geo';

const maxwell = curatedPlace('curated:sg-maxwell-food-centre')!;
const merlion = curatedPlace('curated:sg-merlion-park')!;

describe('filtering', () => {
  test('category, radius and query narrow the curated set', () => {
    const food = filterPlaces(PUBLISHED_PLACES, { country: 'SG', category: 'food' });
    expect(food.length).toBeGreaterThan(5);
    expect(food.every((p) => p.category === 'food')).toBe(true);
    const near = filterPlaces(PUBLISHED_PLACES, { country: 'SG', category: 'all', center: maxwell.coordinates, radiusM: 1000 });
    expect(near.every((p) => distanceM(maxwell.coordinates, p.coordinates) <= 1000)).toBe(true);
    expect(near.map((p) => p.id)).toContain(maxwell.id);
    expect(near.length).toBeLessThan(PUBLISHED_PLACES.length);
  });

  test('search matches English names, kinds and the dataset’s Chinese names', () => {
    expect(matchesQuery(maxwell, 'hawker')).toBe(true);
    expect(matchesQuery(merlion, 'MERLION park')).toBe(true);
    const withZh = PUBLISHED_PLACES.find((p) => p.nameZh)!;
    expect(matchesQuery(withZh, withZh.nameZh!)).toBe(true);
    expect(matchesQuery(maxwell, 'zzzz')).toBe(false);
  });
});

describe('ordering and wording', () => {
  test('nearest first with a stable tie-breaker', () => {
    const origin = { kind: 'area' as const, point: maxwell.coordinates, label: 'Chinatown' };
    const items = [merlion, maxwell].map((p) => toItem(p, origin));
    expect(byDistance(items)[0].key).toBe(maxwell.id);
    const tie = [toItem(merlion), toItem(maxwell)];
    expect(byDistance(tie).map((i) => i.key)).toEqual([maxwell.id, merlion.id].sort());
  });

  test('distances say where they are measured from, never "from you" without a fix', () => {
    expect(originPhrase('area')).toBe('from selected area');
    expect(originPhrase('map')).toBe('from map centre');
    expect(originPhrase('approx')).toBe('from your approximate location');
    expect(formatDistance(420)).toBe('Approx. 400 m');
    expect(formatDistance(1234)).toBe('Approx. 1.2 km');
    expect(formatDistance(Number.NaN)).toBe('Not available');
  });

  test('recommendation reasons describe real signals only', () => {
    expect(reasonFor(maxwell)).toBe('Food centre researched by our team');
    expect(reasonFor(merlion)).toBe('In our Singapore collection');
    for (const p of PUBLISHED_PLACES) expect(reasonFor(p)).not.toMatch(/best|locals recommend|safe/i);
  });
});

describe('map frame (EARTH ONLINE projection)', () => {
  test('lat/lng ↔ metres round-trip, and every place is inside the 56 km square', () => {
    const p = { lat: 1.2868, lng: 103.8545 };
    const back = toLatLng(toXY(p));
    expect(back.lat).toBeCloseTo(p.lat, 9);
    expect(back.lng).toBeCloseTo(p.lng, 9);
    for (const place of PUBLISHED_PLACES) {
      const { x, y } = toXY(place.coordinates);
      expect(Math.abs(x)).toBeLessThan(HALF);
      expect(Math.abs(y)).toBeLessThan(HALF);
    }
  });

  test('clusters merge overlapping pins deterministically and keep far pins apart', () => {
    const items = [
      { key: 'b', x: 10, y: 10 },
      { key: 'a', x: 12, y: 11 },
      { key: 'c', x: 200, y: 200 },
    ];
    const one = cluster(items, (i) => i, 26);
    const two = cluster([...items].reverse(), (i) => i, 26);
    expect(one).toEqual(two);
    expect(one.map((c) => c.items.length).sort()).toEqual([1, 2]);
    expect(one.find((c) => c.items.length === 1)!.id).toBe('c');
  });

  test('fitView shows all the points', () => {
    const pts = PUBLISHED_PLACES.map((p) => toXY(p.coordinates));
    const v = { ...fitView(pts, 350, 300), width: 350, height: 300 };
    for (const p of pts) {
      const s = toScreen(p, v);
      expect(s.x).toBeGreaterThanOrEqual(-1);
      expect(s.x).toBeLessThanOrEqual(351);
      expect(s.y).toBeGreaterThanOrEqual(-1);
      expect(s.y).toBeLessThanOrEqual(301);
    }
  });

  test('Singapore check uses the outline, not a box', () => {
    const rings = (outlines as unknown as { countries: { SG: Ring[] } }).countries.SG;
    expect(inSingapore({ lat: 1.3521, lng: 103.8198 }, rings)).toBe(true);
    expect(inSingapore({ lat: 1.55, lng: 103.75 }, rings)).toBe(false); // Johor, inside SG's bounding box latitude range
  });
});
