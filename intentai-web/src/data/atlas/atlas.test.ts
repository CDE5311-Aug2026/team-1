import { describe, expect, test, vi } from 'vitest';

// A slice of the English file as the translators will deliver it.
vi.mock('./atlas.en.json', () => ({
  places: { 'thian-hock-keng': { summary: 'The oldest Hokkien temple.', collections: ['Temples'] } },
  routes: { 'telok-ayer': { title: 'Telok Ayer · One street of faiths' } },
  stations: { 'telok-ayer': { theme: 'Landing place of migrants' } },
  collections: { 米其林: 'MICHELIN' },
}));

const atlas = await import('./atlas');

describe('atlas accessor', () => {
  test('English when the translation has it, else the Chinese, with the language', () => {
    expect(atlas.atlasTextLang('thian-hock-keng', 'summary')).toEqual({ text: 'The oldest Hokkien temple.', lang: 'en' });
    const zh = atlas.atlasTextLang('thian-hock-keng', 'hours');
    expect(zh?.lang).toBe('zh-Hans');
    expect(zh?.text).toBe(atlas.atlasPlace('thian-hock-keng')?.hours);
    expect(atlas.atlasText('thian-hock-keng', 'review_summary')).toBe(atlas.atlasPlace('thian-hock-keng')?.review?.summary);
    expect(atlas.atlasText('no-such-place', 'summary')).toBeUndefined();
  });

  test('routes and stations fall back the same way', () => {
    expect(atlas.routeTextLang('telok-ayer', 'title')).toEqual({ text: 'Telok Ayer · One street of faiths', lang: 'en' });
    expect(atlas.routeTextLang('telok-ayer', 'note').lang).toBe('zh-Hans');
    expect(atlas.routeText('katong', 'title')).toBe(atlas.atlasRoute('katong')?.title);
    expect(atlas.stationThemeLang('telok-ayer').text).toBe('Landing place of migrants');
    expect(atlas.stationThemeLang('clementi').lang).toBe('zh-Hans');
  });

  test('collections: the place list, else the dictionary, else Chinese', () => {
    expect(atlas.atlasCollections('thian-hock-keng')).toEqual([{ text: 'Temples', lang: 'en' }]);
    const michelin = atlas.ATLAS_PLACES.find((p) => p.collections.includes('米其林'));
    expect(atlas.atlasCollections(michelin!.id).find((c) => c.text === 'MICHELIN')?.lang).toBe('en');
  });

  test('five routes, stations with places only, keys both ways', () => {
    expect(atlas.atlasRoutes).toHaveLength(5);
    expect(atlas.atlasStations.length).toBeGreaterThan(50);
    expect(atlas.atlasStations.every((s) => s.place_ids.length > 0)).toBe(true);
    expect(atlas.placeKeyOf('thian-hock-keng')).toBe('curated:sg-thian-hock-keng-temple');
    expect(atlas.atlasIdOfPlaceKey('curated:sg-thian-hock-keng-temple')).toBe('thian-hock-keng');
    expect(atlas.placeKeyOf('not-mapped')).toBe('curated:sg-not-mapped');
    expect(atlas.routesWithPlace('curated:sg-thian-hock-keng-temple').map((r) => r.id)).toEqual(['telok-ayer']);
    expect(atlas.routesWithPlace('curated:sg-unknown')).toEqual([]);
    // every route stop is an atlas place
    for (const r of atlas.atlasRoutes) for (const id of r.place_ids) expect(atlas.atlasPlace(id), id).toBeDefined();
    for (const r of atlas.atlasRoutes) expect(atlas.stationByName(r.station), r.station).toBeDefined();
  });
});
