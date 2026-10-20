import { describe, expect, test } from 'vitest';
import { loadCatalogue, validateCatalogue } from '../../../scripts/validate-explore.mjs';
import { COLLECTIONS, PUBLISHED_PLACES, collectionProgress, collectionTitle, collectionsContaining, curatedPlace, members } from './catalogue';
import { DEFAULT_EXPLORE_PERSONAL, type ExploreCollection, type ExplorePersonalData } from './domain';
import { directionsUrl, view3dUrl } from './links';


describe('the published catalogue', () => {
  test('passes the catalogue validator', () => {
    const result = validateCatalogue(loadCatalogue());
    expect(result.errors).toEqual([]);
    expect(result.counts.published).toBe(PUBLISHED_PLACES.length);
  });

  test('is Singapore only, with EARTH ONLINE dataset entries and sourced facts', () => {
    expect(PUBLISHED_PLACES.every((p) => p.country === 'SG')).toBe(true);
    expect(PUBLISHED_PLACES.some((p) => p.provenance === 'earth-online')).toBe(true);
    for (const p of PUBLISHED_PLACES) for (const f of p.facts) expect(f.sources.length).toBeGreaterThan(0);
  });

  test('the collection has 100 distinct published members but stays an honest draft', () => {
    const [sg] = COLLECTIONS;
    expect(new Set(sg.memberIds).size).toBe(100);
    expect(members(sg)).toHaveLength(100);
    expect(sg.status).toBe('starter');
    expect(collectionTitle(sg)).toBe('Singapore collection (draft) · 100 places');
  });
});

describe('the validator refuses false claims', () => {
  const base = () => loadCatalogue();

  test('a "published" collection needs exactly 100 distinct, signed-off members', () => {
    const data = base();
    data.collections = [{ ...data.collections[0], status: 'published', memberIds: data.collections[0].memberIds.slice(0, 10) }];
    expect(validateCatalogue(data).errors.join('\n')).toMatch(/claims published but has 10 published members/);
    const data2 = base();
    data2.collections = [{ ...data2.collections[0], status: 'published' }];
    expect(validateCatalogue(data2).errors.join('\n')).toMatch(/await team editor sign-off/);
  });

  test('duplicates, drafts, home-page sources, placeholders and non-Singapore points are caught', () => {
    const data = base();
    const [first, second] = data.places;
    data.places = [
      { ...first, coordinates: { ...first.coordinates, lat: 3.139, lng: 101.687 } }, // Kuala Lumpur
      { ...second, summary: 'TODO write the summary for this place please' },
      { ...second, id: 'curated:sg-copy', facts: [{ id: 'f1', text: 'word '.repeat(50), sources: [{ title: 'Home', url: 'https://www.roots.gov.sg/', publisher: 'NHB', checkedAt: '2026-10-20' }] }] },
      ...data.places.slice(2),
    ];
    data.collections = [{ ...data.collections[0], memberIds: [...data.collections[0].memberIds.slice(0, 99), data.collections[0].memberIds[0]] }];
    data.stats = { publishedPlaces: data.places.length };
    const errors = validateCatalogue(data).errors.join('\n');
    expect(errors).toMatch(/not in Singapore/);
    expect(errors).toMatch(/placeholder text/);
    expect(errors).toMatch(/a home page is not a source/);
    expect(errors).toMatch(/same name/);
    expect(errors).toMatch(/duplicate member/);
  });
});

describe('collection progress', () => {
  const c = COLLECTIONS[0];
  const [m1, m2] = members(c);
  const nonMember = PUBLISHED_PLACES.find((p) => !c.memberIds.includes(p.id))!;
  const at = '2026-10-20T00:00:00.000Z';
  const data: ExplorePersonalData = {
    ...DEFAULT_EXPLORE_PERSONAL,
    places: [
      { placeKey: m1.id, saved: false, visited: true, visitedOn: '2026-10-01', updatedAt: at },
      { placeKey: m2.id, saved: true, visited: false, updatedAt: at },
      { placeKey: nonMember.id, saved: false, visited: true, updatedAt: at },
      { placeKey: 'curated:sg-retired-or-unknown', saved: false, visited: true, updatedAt: at },
    ],
  };

  test('counts visited published members over published members only', () => {
    expect(collectionProgress(c, data)).toEqual({ visited: 1, total: 100, percent: 1 });
  });

  test('unpublished members never count, and 100% needs every member', () => {
    const partial: ExploreCollection = { ...c, memberIds: [m1.id, m2.id, 'curated:sg-not-published'] };
    expect(collectionProgress(partial, data)).toEqual({ visited: 1, total: 2, percent: 50 });
    const all = { ...DEFAULT_EXPLORE_PERSONAL, places: members(c).map((p) => ({ placeKey: p.id, saved: false, visited: true, updatedAt: at })) };
    expect(collectionProgress(c, all).percent).toBe(100);
    const allButOne = { ...all, places: all.places.slice(1) };
    expect(collectionProgress(c, allButOne).percent).toBe(99);
  });

  test('membership lookup', () => {
    expect(collectionsContaining(m1.id).map((x) => x.id)).toEqual([c.id]);
    expect(collectionsContaining(nonMember.id)).toEqual([]);
  });
});

describe('external links carry no user position', () => {
  const merlion = curatedPlace('curated:sg-merlion-park')!;

  test('directions go to the destination only', () => {
    const url = new URL(directionsUrl(merlion));
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe(`${merlion.coordinates.lat.toFixed(6)},${merlion.coordinates.lng.toFixed(6)}`);
    expect(url.searchParams.has('origin')).toBe(false);
  });

  test('3D opens the landmark card, or the point for places without a model', () => {
    expect(view3dUrl(merlion)).toBe('/earth-online/sg/index.html?card=merlion');
    const ubin = curatedPlace('curated:sg-pulau-ubin')!;
    expect(ubin.earthKey).toBeUndefined();
    expect(view3dUrl(ubin)).toMatch(/^\/earth-online\/sg\/index\.html\?at=1\.\d+%2C103\.\d+$/);
  });
});
