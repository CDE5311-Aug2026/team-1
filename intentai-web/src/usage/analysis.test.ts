import { expect, test } from 'vitest';
import { analyze, quantile, sessionPaths } from './analysis';
import type { UsageEvent } from './event';
import { fromExport, mergeEvents, toExport } from './localLog';

const page = (user: string, sid: string, name: string, at: number, ms: number, cont?: true): UsageEvent => ({
  uid: `u-${user}`,
  sid,
  kind: 'page',
  name,
  at,
  ms,
  user,
  ...(cont ? { cont } : {}),
});
const tap = (user: string, sid: string, name: string, at: number): UsageEvent => ({ uid: `u-${user}`, sid, kind: 'tap', name, at, ms: 0, user });

// P01: Today 20 s → Nearby 60 s (resumed after a hide +10 s) → Nearby place 3 s (ends)
// P02: Today 4 s (ends)            P03: Today 30 s → Nearby 2 s (ends)
const events: UsageEvent[] = [
  page('P01', 's1', 'Today', 0, 20_000),
  tap('P01', 's1', 'Today › Near you', 19_000),
  page('P01', 's1', 'Nearby', 20_000, 60_000),
  tap('P01', 's1', 'Nearby › Check in', 30_000),
  tap('P01', 's1', 'Nearby › Check in', 30_500),
  tap('P01', 's1', 'Nearby › Check in', 31_000),
  page('P01', 's1', 'Nearby', 90_000, 10_000, true),
  page('P01', 's1', 'Nearby place', 100_000, 3_000),
  page('P02', 's2', 'Today', 0, 4_000),
  page('P03', 's3', 'Today', 0, 30_000),
  page('P03', 's3', 'Nearby', 30_000, 2_000),
  { uid: 'u-P03', sid: 's3', kind: 'activity', name: 'Nearby › 3D view', at: 30_500, ms: 1_000, user: 'P03' },
];

test('quantiles interpolate between the middle values', () => {
  expect(quantile([1, 2, 3, 4], 0.5)).toBe(3); // 2.5 rounded
  expect(quantile([10], 0.75)).toBe(10);
  expect(quantile([], 0.5)).toBe(0);
});

test('a span resumed after a hide joins its visit; presses land on the visit they happened in', () => {
  const p1 = sessionPaths(events).find((p) => p.person === 'P01')!;
  expect(p1.visits.map((v) => [v.name, v.ms, v.taps])).toEqual([
    ['Today', 20_000, 1],
    ['Nearby', 70_000, 3],
    ['Nearby place', 3_000, 0],
  ]);
});

test('pages: time held, entries, exits, quick visits, presses and repeated presses', () => {
  const a = analyze(events, ['Today', 'Nearby', 'Nearby place', 'Moments']);
  expect(a.people).toBe(3);
  expect(a.sessions).toBe(3);
  const nearby = a.pages.find((p) => p.name === 'Nearby')!;
  expect(nearby).toMatchObject({ visits: 2, people: 2, totalMs: 72_000, exits: 1, taps: 3, rapidTaps: 1, quickRate: 0.5 });
  expect(a.pages[0].name).toBe('Nearby'); // holds the most time
  const today = a.pages.find((p) => p.name === 'Today')!;
  expect(today).toMatchObject({ visits: 3, entries: 3, exits: 1, medianMs: 20_000 });
  expect(a.flows).toEqual([
    { from: 'Today', to: 'Nearby', count: 2 },
    { from: 'Nearby', to: 'Nearby place', count: 1 },
  ]);
  expect(a.unusedPages).toEqual(['Moments']);
  expect(a.functions).toEqual([{ name: 'Nearby › 3D view', kind: 'activity', uses: 1, people: 1, totalMs: 1_000, medianMs: 1_000 }]);
  expect(a.tapsByButton[0]).toMatchObject({ page: 'Nearby', label: 'Check in', count: 3, people: 1 });
  expect(a.persons.map((p) => p.person)).toEqual(['P01', 'P03', 'P02']);
});

test('warning signs need a few visits first', () => {
  const many = [0, 1, 2, 3].flatMap((i) => [page(`Q${i}`, `q${i}`, 'Ask', 0, 2_000)]);
  const a = analyze(many);
  expect(a.flags.map((f) => f.text)).toEqual(['100% of visits end the session here.', '100% of visits last under 5 s.']);
  expect(analyze(events).flags.filter((f) => f.page === 'Nearby')).toEqual([]); // only 2 visits
});

test('exported files read back, and the same file twice counts once', () => {
  const file = JSON.parse(JSON.stringify(toExport(events)));
  expect(fromExport(file)).toHaveLength(events.length);
  expect(fromExport({ format: 'other' })).toBeNull();
  expect(fromExport([{ nonsense: true }, events[0]])).toHaveLength(1);
  expect(mergeEvents(fromExport(file)!, fromExport(file)!)).toHaveLength(events.length);
});
