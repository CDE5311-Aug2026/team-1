import { describe, expect, test } from 'vitest';
import { searchMap } from '../../components/Discovery/mapSearch';
import { BOOKS } from '../../pages/HuntPage/notebook/Bookshelf';
import { ALL_PLACES, curatedPlace, PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import { HUNT_CHALLENGES } from '../hunt/stories';
import { allEntries, countByCategory, groupByCategory, searchAll } from '.';
import { challengesAt, dateRange, HUNT_VOLUMES, stopCount, volumeHref } from './hunt';

describe('search index', () => {
  test('holds the published places, every challenge and every volume, and no people', () => {
    const all = allEntries();
    const places = all.filter((e) => e.kind === 'place');
    expect(places.length).toBe(PUBLISHED_PLACES.filter((p) => p.tourism && p.operatingStatus !== 'planned').length);
    expect(all.filter((e) => e.kind === 'challenge')).toHaveLength(HUNT_CHALLENGES.length);
    expect(all.filter((e) => e.kind === 'volume')).toHaveLength(HUNT_VOLUMES.length);
    expect(new Set(all.map((e) => e.kind))).toEqual(new Set(['place', 'challenge', 'volume']));
    // no drafts (planned places are never listed as if open)
    const drafts = new Set(ALL_PLACES.filter((p) => p.editorialStatus !== 'published').map((p) => `place:${p.id}`));
    expect(all.some((e) => drafts.has(e.key))).toBe(false);
  });

  test('keeps Home map search hits in its order, then adds Tourism 2040 label matches', () => {
    const mine = searchAll('hawker').filter((e) => e.kind === 'place');
    const theirs = searchMap('hawker').places.map((h) => `place:${h.place.id}`);
    expect(mine.slice(0, theirs.length).map((e) => e.key)).toEqual(theirs);
    // "wellness" is a Tourism 2040 label: Home's search does not know it, this index does
    const wellness = searchAll('wellness');
    const wel = PUBLISHED_PLACES.filter((p) => p.tourism?.category === 'wel').length;
    expect(searchMap('wellness').placeCount).toBeLessThan(wel);
    expect(wellness.filter((e) => e.category === 'wel')).toHaveLength(wel);
  });

  test('finds challenges and volumes by title and area, linked to the challenge page and the Hunt archive', () => {
    const missing = searchAll('missing years');
    expect(missing.find((e) => e.kind === 'volume')).toMatchObject({ title: 'The Missing Years', href: '/hunt#story/civic-f1' });
    expect(missing.find((e) => e.kind === 'challenge')).toMatchObject({ href: '/hunt/challenge/wk45-civic' });
    expect(searchAll('golden dome')[0]).toMatchObject({ kind: 'volume', href: '/hunt#short' });
  });

  test('a one-letter query finds nothing; counts and groups follow the categories', () => {
    expect(searchAll('a')).toEqual([]);
    const hits = searchAll('park');
    const counts = countByCategory(hits);
    expect(counts.all).toBe(hits.length);
    expect(counts.att + counts.wel + counts.lei + counts.cru).toBe(hits.length);
    const groups = groupByCategory(hits, ['wel', 'att', 'lei', 'cru']);
    expect(groups[0].category).toBe('wel');
    expect(groups.every((g) => g.entries.length > 0)).toBe(true);
  });
});

describe('Hunt entries', () => {
  test('the volume list is the Hunt archive shelf', () => {
    expect(HUNT_VOLUMES.map((v) => [v.id, v.roman, v.title, v.place])).toEqual(BOOKS.map((b) => [b.id, b.roman, b.title, b.place]));
  });

  test('stop counts come from the surveyed pins; links and dates', () => {
    expect(stopCount('civic-f1')).toBe(8);
    expect(stopCount('short')).toBe(2);
    expect(volumeHref('telok-ayer')).toBe('/hunt#story/telok-ayer');
    expect(dateRange('2026-11-07', '2026-11-08')).toBe('7–8 Nov');
    expect(dateRange('2026-11-30', '2026-12-01')).toBe('30 Nov – 1 Dec');
  });

  test('a challenge links a place only where a surveyed stop stands at it', () => {
    const victoria = curatedPlace('curated:sg-victoria-theatre-and-concert-hall')!;
    expect(challengesAt(victoria, PUBLISHED_PLACES)).toEqual([expect.objectContaining({ stop: 6, stops: 8, challenge: expect.objectContaining({ id: 'wk45-civic' }) })]);
    // 60 m from the obelisk pin, but not named there: no link
    expect(challengesAt(curatedPlace('curated:sg-anderson-bridge')!, PUBLISHED_PLACES)).toEqual([]);
    expect(challengesAt(curatedPlace('curated:sg-jewel-changi-airport')!, PUBLISHED_PLACES)).toEqual([]);
  });
});
