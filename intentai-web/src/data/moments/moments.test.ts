import { describe, expect, test } from 'vitest';
import type { ExplorePersonalData } from '../../features/nearby/domain';
import { DEFAULT_EXPLORE_PERSONAL } from '../../features/nearby/domain';
import { SUBJECTS } from '../cards';
import type { Insight, Lookup, Tip } from '../domain';
import {
  badgesOf,
  buildStamps,
  collectedItems,
  matchesFilter,
  rankOf,
  stampVisits,
  snapTray,
  topicOfCard,
} from './moments';
import { isRecapRecord } from './recapStore';

const visit = (placeKey: string, visitedOn: string) => ({ placeKey, saved: false, visited: true, visitedOn, updatedAt: `${visitedOn}T00:00:00.000Z` });
const personal = (...places: ReturnType<typeof visit>[]): ExplorePersonalData => ({ ...DEFAULT_EXPLORE_PERSONAL, places: places as ExplorePersonalData['places'] });
const chinatown = SUBJECTS.find((s) => s.id === 'sg-chinatown')!;
const tip = (over: Partial<Tip> = {}): Tip => ({ id: 't1', cardId: 'chicken-rice', questionId: 'q1', text: 'Go early.', by: 'Mei', createdAt: 1, cited: 0, ...over });

describe('stamps', () => {
  test('no check-in: every area is an outline, however many cards are opened', () => {
    const stamps = buildStamps(personal(), ['chicken-rice', 'sri-mariamman', 'thian-hock-keng']);
    expect(stamps).toHaveLength(SUBJECTS.length);
    expect(stamps.every((s) => !s.collected)).toBe(true);
  });

  test('a check-in at a place in the area collects its stamp; ink = opened ÷ cards of the area', () => {
    const stamps = buildStamps(personal(visit('curated:sg-thian-hock-keng-temple', '2026-11-02')), ['chicken-rice', 'laksa']);
    const ct = stamps[0];
    expect(ct.subject.id).toBe('sg-chinatown');
    expect(ct.collected).toBe(true);
    expect(ct.checkedInOn).toBe('2026-11-02');
    expect(ct.openedIds).toEqual(['chicken-rice']);
    expect(ct.ink).toBeCloseTo(1 / chinatown.cards.length);
    expect(ct.next?.article.id).toBe(chinatown.cards.find((c) => c.article.id !== 'chicken-rice')!.article.id);
  });

  test('a place outside every card area gives no stamp; collected stamps come first, newest first', () => {
    const stamps = buildStamps(
      personal(visit('curated:sg-sultan-mosque', '2026-10-01'), visit('curated:sg-thian-hock-keng-temple', '2026-11-02'), visit('curated:does-not-exist', '2026-11-03')),
      [],
    );
    expect(stamps.filter((s) => s.collected).map((s) => s.subject.id)).toEqual(['sg-chinatown', 'sg-kampong-glam']);
    expect(stamps[2].collected).toBe(false);
  });

  test('a place unchecked again loses its stamp', () => {
    const p = personal({ ...visit('curated:sg-thian-hock-keng-temple', '2026-11-02'), visited: false });
    expect(buildStamps(p, []).some((s) => s.collected)).toBe(false);
  });

  test('a check-in in an area without cards still gives a stamp, with no ink and no outline for empty areas', () => {
    const p = personal(visit('curated:sg-marina-bay-sands', '2026-10-29'));
    const stamps = buildStamps(p, []);
    expect(stamps[0]).toMatchObject({ collected: true, checkedInOn: '2026-10-29', ink: 0, places: ['curated:sg-marina-bay-sands'] });
    expect(stamps[0].subject).toMatchObject({ id: 'sg-marina-bay', short: 'Marina Bay', cards: [] });
    // outlines are only for areas that have cards to collect
    expect(stamps.filter((s) => !s.collected).every((s) => s.subject.cards.length > 0)).toBe(true);
    expect(stamps).toHaveLength(SUBJECTS.length + 1);
  });

  test('any catalogue place in an area counts, and the stamp lists the real check-ins, newest first', () => {
    const p = personal(visit('curated:sg-boat-quay', '2026-10-20'), visit('curated:sg-thian-hock-keng-temple', '2026-10-28'));
    const ct = buildStamps(p, [])[0];
    expect(ct.subject.id).toBe('sg-chinatown');
    expect(ct.checkedInOn).toBe('2026-10-20');
    expect(stampVisits(ct, p).map((v) => [v.name, v.on])).toEqual([
      ['Thian Hock Keng Temple', '2026-10-28'],
      ['Boat Quay', '2026-10-20'],
    ]);
  });
});

describe('rank', () => {
  test.each([
    [0, 0, 'Visitor', '3 more cards to Explorer'],
    [2, 0, 'Visitor', '1 more card to Explorer'],
    [3, 0, 'Explorer', '5 more cards to Insider'],
    [7, 0, 'Explorer', '1 more card to Insider'],
    [8, 0, 'Insider', '6 more cards to Local'],
    [14, 0, 'Insider', 'A local tip on any card makes you Local'],
    [14, 1, 'Local', 'You have the top rank'],
  ])('%i cards, %i tips → %s', (cards, tips, label, line) => {
    const rank = rankOf(cards, tips);
    expect(rank.step.label).toBe(label);
    expect(rank.line).toBe(line);
  });

  test('progress is the share of the current band', () => {
    expect(rankOf(5, 0).progress).toBeCloseTo(2 / 5);
    expect(rankOf(14, 1).progress).toBe(1);
  });
});

describe('badges', () => {
  test('a new user has none, each with its progress', () => {
    const badges = badgesOf(buildStamps(personal(), []), [], 0);
    expect(badges.map((b) => b.label)).toEqual(['First stamp', 'Local tip', 'Two districts', 'Festival fan', 'Full set', 'Historian']);
    expect(badges.every((b) => !b.earned && b.have === 0)).toBe(true);
  });

  test('earned from stamps, tips and opened cards', () => {
    const stamps = buildStamps(personal(visit('curated:sg-thian-hock-keng-temple', '2026-11-02'), visit('curated:sg-sultan-mosque', '2026-11-01')), []);
    const opened = chinatown.cards.map((c) => c.article.id).concat('vesak-day', 'temasek-singapura');
    const byId = Object.fromEntries(badgesOf(stamps, opened, 1).map((b) => [b.id, b]));
    expect(byId['first-stamp'].earned).toBe(true);
    expect(byId['two-districts'].earned).toBe(true);
    expect(byId['local-tip'].earned).toBe(true);
    expect(byId['full-set']).toMatchObject({ earned: true, have: chinatown.cards.length, need: chinatown.cards.length });
    expect(byId['festival-fan'].earned).toBe(true); // Ang Mo Kio's only festival card (Vesak Day)
    expect(byId.historian.earned).toBe(true);
  });

  test('Full set shows the place closest to done', () => {
    const byId = Object.fromEntries(badgesOf(buildStamps(personal(), []), ['chicken-rice', 'sri-mariamman'], 0).map((b) => [b.id, b]));
    expect(byId['full-set']).toMatchObject({ earned: false, have: 2, need: chinatown.cards.length });
  });
});

describe('collected', () => {
  const insight: Insight = { id: 'i1', question: 'What can I eat in Chinatown?', kind: 'card', title: 'Chicken rice', summary: 'x', cardId: 'chicken-rice', savedAt: 5 };
  const lookups: Lookup[] = [{ id: 'chope', word: 'chope', meaning: 'Reserve a seat.', source: 'Confirmed by a local' }];

  test('opened cards (newest first), tips, insights, then phrases with their source', () => {
    const items = collectedItems({ opened: ['chicken-rice', 'unknown-id', 'thian-hock-keng'], tips: [tip()], insights: [insight], lookups, todaysThree: ['chope', 'paiseh'] });
    expect(items.map((i) => i.key)).toEqual(['card:thian-hock-keng', 'card:chicken-rice', 'tip:t1', 'insight:i1', 'lookup:chope', 'phrase:paiseh']);
    const card = items[0];
    expect(card.kind === 'card' && card.area).toBe('Chinatown');
    const phrase = items[5];
    expect(phrase.kind === 'phrase' && phrase.source).toBe('From Today’s three');
  });

  test('filters: topics take cards and their tips; Ask takes insights; Phrases takes phrases', () => {
    const items = collectedItems({ opened: ['chicken-rice', 'thian-hock-keng', 'temasek-singapura'], tips: [tip()], insights: [insight], lookups, todaysThree: [] });
    const keys = (f: Parameters<typeof matchesFilter>[1]) => items.filter((i) => matchesFilter(i, f)).map((i) => i.key);
    expect(keys('food')).toEqual(['card:chicken-rice', 'tip:t1']);
    expect(keys('monument')).toEqual(['card:thian-hock-keng']);
    expect(keys('history')).toEqual(['card:temasek-singapura']);
    expect(keys('ask')).toEqual(['insight:i1']);
    expect(keys('phrases')).toEqual(['lookup:chope']);
    expect(keys('all')).toHaveLength(items.length);
  });
});

describe('recap', () => {
  test('recap records are validated', () => {
    expect(isRecapRecord({ results: { a: 'knew' } })).toBe(true);
    expect(isRecapRecord({ results: { a: 'maybe' } })).toBe(false);
    expect(isRecapRecord({ results: {}, last: { knew: 1, total: 2, at: 3 } })).toBe(true);
    expect(isRecapRecord([])).toBe(false);
  });
});

test('snap tray: only the app’s own card photos, area cards first, no repeats', () => {
  const tray = snapTray();
  expect(tray.length).toBeGreaterThan(5);
  expect(new Set(tray.map((c) => c.article.id)).size).toBe(tray.length);
  expect(tray[0].article.id).toBe(chinatown.cards[0].article.id);
  expect(topicOfCard(tray[0])).toBe('food');
});

test('saved Community conversations are collected under Community, newest first', () => {
  const c = (threadId: string, savedAt: number) => ({ threadId, title: threadId, body: '', topic: 'Food', replies: [], savedAt });
  const items = collectedItems({ opened: [], tips: [], insights: [], lookups: [], todaysThree: [], conversations: [c('a', 1), c('b', 2)] });
  expect(items.filter((i) => matchesFilter(i, 'community')).map((i) => i.key)).toEqual(['conversation:b', 'conversation:a']);
  expect(items.filter((i) => matchesFilter(i, 'ask'))).toHaveLength(0);
});
