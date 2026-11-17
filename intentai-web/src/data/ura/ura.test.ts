import { expect, test } from 'vitest';
import { PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import offshoreIds from './offshore.json';
import { URA_AREAS, URA_REGIONS, URA_SOURCE, areaOfPlace, areaProgress, areasOf, isOffshore, placesInArea, placesInRegion, regionProgress } from './ura';

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

test('every published place, new imports included, has a planning area in a known region', () => {
  const regions = new Set(URA_REGIONS.map((r) => r.id));
  for (const p of PUBLISHED_PLACES) {
    const area = areaOfPlace(p.id);
    expect(area, p.id).toBeDefined();
    expect(regions.has(area!.region), p.id).toBe(true);
  }
});

test('offshore places resolve to the nearest planning area and are marked offshore', () => {
  for (const id of ['curated:sg-pulau-ubin', 'curated:sg-sisters-islands-marine-park', 'curated:sg-raffles-lighthouse', 'curated:sg-universal-studios-singapore']) {
    expect(isOffshore(id), id).toBe(true);
    expect(areaOfPlace(id)?.name, id).toMatch(/Islands$/);
  }
  expect(areaOfPlace('curated:sg-pulau-ubin')?.region).toBe('north-east');
  // Coney Island is linked to the mainland: in Punggol, not offshore.
  expect(isOffshore('curated:sg-coney-island-park')).toBe(false);
  expect(areaOfPlace('curated:sg-coney-island-park')?.name).toBe('Punggol');
  expect(isOffshore('curated:sg-merlion-park')).toBe(false);
  expect(isOffshore('curated:sg-unknown-place')).toBe(false);
  for (const id of offshoreIds) {
    expect(PUBLISHED_PLACES.some((p) => p.id === id), id).toBe(true);
    expect(areaOfPlace(id)?.name, id).toMatch(/Islands$/);
  }
});

test('region counts add up to the published catalogue and stay sane', () => {
  const counts = URA_REGIONS.map((r) => placesInRegion(r.id).length);
  expect(counts.reduce((a, b) => a + b, 0)).toBe(PUBLISHED_PLACES.length);
  for (const n of counts) expect(n).toBeGreaterThan(10);
  // Central (the city centre) holds most places, but not all of them
  expect(placesInRegion('central').length).toBeGreaterThan(PUBLISHED_PLACES.length / 2);
  expect(placesInRegion('central').length).toBeLessThan(PUBLISHED_PLACES.length);
});

test('an area with no places yet is never done', () => {
  const empty = URA_AREAS.find((a) => placesInArea(a.id).length === 0)!;
  expect(areaProgress(empty.id, new Set())).toEqual({ visited: 0, total: 0, status: 'none' });
});
