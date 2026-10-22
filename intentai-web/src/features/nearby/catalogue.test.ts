import { describe, expect, test } from 'vitest';
import { loadCatalogue, validateCatalogue } from '../../../scripts/validate-explore.mjs';
import { COLLECTIONS, PUBLISHED_PLACES, collectionProgress, collectionTitle, collectionsContaining, curatedPlace, members, placeByEarthKey } from './catalogue';
import { DEFAULT_EXPLORE_PERSONAL, type ExploreCollection, type ExplorePersonalData } from './domain';
import { appleMapsUrl, directionsUrl, view3dTarget, view3dUrl } from './links';


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
    expect(collectionTitle(sg)).toBe('Singapore collection · 100 places');
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

describe('practical details', () => {
  const src = { title: 'Page', url: 'https://example.sg/p', publisher: 'Example', checkedAt: '2026-10-22' };
  test('every value needs its page; postcodes, phones, links only for reviews, and a short summary in our words', () => {
    const data = loadCatalogue();
    const [p] = data.places;
    data.places = [
      {
        ...p,
        details: {
          address: { text: '1 Example Rd, Singapore 12345', postcode: '12345', source: src },
          phone: { text: '6123 4567', source: src },
          hours: { text: 'Daily 10:00–18:00', source: { ...src, url: '' } },
          reviews: [{ title: 'x', url: 'https://www.google.com/maps/place/x', publisher: 'Google' }],
          reviewSummary: { text: 'People say “amazing”.', sources: [] },
          rating: 5,
        },
      },
      ...data.places.slice(1),
    ];
    const errors = validateCatalogue(data).errors.join('\n');
    for (const m of [/postcode must be 6 digits/, /phone must look like/, /details.hours needs a source page/, /no Google Maps review links/, /must not quote reviews/, /needs the pages it comes from/, /unknown details field rating/])
      expect(errors).toMatch(m);
  });

  test('the catalogue has checked details for most places, each with an https or http page', () => {
    const withDetails = loadCatalogue().places.filter((p: { details?: unknown }) => p.details);
    expect(withDetails.length).toBeGreaterThan(100);
  });

  test('Apple Maps opens at the place with its name; nothing about the user', () => {
    const url = new URL(appleMapsUrl(curatedPlace('curated:sg-merlion-park')!));
    expect(url.origin).toBe('https://maps.apple.com');
    expect(url.searchParams.get('q')).toBe('Merlion Park');
    expect(url.searchParams.get('ll')).toMatch(/^1\.\d{6},103\.\d{6}$/);
    expect([...url.searchParams.keys()].sort()).toEqual(['ll', 'q']);
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

  test('3D opens the landmark card, or pins the point for places without a model; all in the hash', () => {
    expect(view3dUrl(view3dTarget(merlion))).toBe(`/earth-online/sg/lite.html#at=${merlion.coordinates.lat.toFixed(5)}%2C${merlion.coordinates.lng.toFixed(5)}&card=merlion&pin=0`);
    const ubin = curatedPlace('curated:sg-pulau-ubin')!;
    expect(ubin.earthKey).toBeUndefined();
    expect(view3dUrl(view3dTarget(ubin))).toMatch(/^\/earth-online\/sg\/lite\.html#at=1\.\d+%2C103\.\d+$/);
    // nothing in the query string: the address sent to the server is the bare page
    expect(new URL(view3dUrl({ at: { lat: 1.3, lng: 103.8 }, pin: true }), 'https://example.test').search).toBe('');
    expect(view3dUrl({ at: { lat: 1.3, lng: 103.8 }, pin: false }, { still: true })).toBe('/earth-online/sg/lite.html#at=1.30000%2C103.80000&pin=0&still=1');
  });

  test('a 3D card key finds its published place', () => {
    expect(placeByEarthKey('merlion')?.id).toBe('curated:sg-merlion-park');
    expect(placeByEarthKey('not-a-landmark')).toBeUndefined();
    expect(placeByEarthKey(null)).toBeUndefined();
  });
});
