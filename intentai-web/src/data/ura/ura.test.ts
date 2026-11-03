import { expect, test } from 'vitest';
import { PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import { URA_AREAS, URA_REGIONS, URA_SOURCE, areaOfPlace, areaProgress, areasOf, placesInArea, regionProgress } from './ura';

test('URA Master Plan 2019: 5 regions, 55 planning areas, each with an outline and a source', () => {
  expect(URA_REGIONS.map((r) => r.name)).toEqual(['Central', 'East', 'North', 'North-East', 'West']);
  expect(URA_AREAS).toHaveLength(55);
  expect(URA_REGIONS.reduce((n, r) => n + areasOf(r.id).length, 0)).toBe(55);
  for (const a of URA_AREAS) expect(a.rings.length, a.name).toBeGreaterThan(0);
  expect(URA_SOURCE.publisher).toMatch(/Urban Redevelopment Authority/);
  expect(URA_SOURCE.licence).toBe('Singapore Open Data Licence v1.0');
});

test('URA levels: Bukit Timah and Queenstown are Central planning areas', () => {
  expect(URA_AREAS.find((a) => a.name === 'Bukit Timah')?.region).toBe('central');
  expect(URA_AREAS.find((a) => a.name === 'Queenstown')?.region).toBe('central');
});

test('every published place sits in one planning area', () => {
  for (const p of PUBLISHED_PLACES) expect(areaOfPlace(p.id), p.id).toBeDefined();
  expect(areaOfPlace('curated:sg-merlion-park')?.name).toBe('Downtown Core');
  expect(areaOfPlace('curated:sg-berlin-wall-fragments-utown')?.name).toBe('Queenstown');
});

test('an area is unlocked only when every place in it is checked in', () => {
  const area = URA_AREAS.find((a) => placesInArea(a.id).length >= 2)!;
  const [first, ...rest] = placesInArea(area.id).map((p) => p.id);
  expect(areaProgress(area.id, new Set())).toMatchObject({ visited: 0, status: 'none' });
  expect(areaProgress(area.id, new Set([first]))).toMatchObject({ visited: 1, status: 'exploring' });
  expect(areaProgress(area.id, new Set([first, ...rest]))).toMatchObject({ status: 'done' });
  // A region adds up its areas.
  expect(regionProgress(area.region, new Set([first])).visited).toBe(1);
});

test('an area with no places yet is never done', () => {
  const empty = URA_AREAS.find((a) => placesInArea(a.id).length === 0)!;
  expect(areaProgress(empty.id, new Set())).toEqual({ visited: 0, total: 0, status: 'none' });
});
