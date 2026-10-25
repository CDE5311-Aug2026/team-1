import { expect, test } from 'vitest';
import { formatDuration, summarize, toCsv } from './aggregate';
import type { UsageEvent } from './event';

const e = (uid: string, sid: string, kind: UsageEvent['kind'], name: string, ms: number, at: number): UsageEvent => ({
  uid,
  sid,
  kind,
  name,
  ms,
  at,
});

const EVENTS: UsageEvent[] = [
  e('alice', 'a1', 'page', 'Welcome', 4000, 100),
  e('alice', 'a1', 'page', 'Today', 10_000, 200),
  e('alice', 'a1', 'section', 'Today › Foods', 6000, 210),
  e('alice', 'a2', 'page', 'Ask', 20_000, 9000),
  e('alice', 'a2', 'activity', 'Ask › typing', 5000, 9100),
  e('bob', 'b1', 'page', 'Today', 30_000, 500),
  { ...e('bob', 'b1', 'page', 'Today', 2000, 900), cont: true },
];

test('summary rows count people, visits, totals and averages', () => {
  const { rows } = summarize(EVENTS);
  expect(rows.find((r) => r.kind === 'page' && r.name === 'Today')).toEqual({
    kind: 'page',
    name: 'Today',
    people: 2,
    // Bob's two back-to-back Today spans are one visit (he switched apps and came back).
    visits: 2,
    totalMs: 42_000,
    avgPerVisitMs: 21_000,
    avgPerPersonMs: 21_000,
  });
  expect(rows.find((r) => r.name === 'Ask › typing')).toMatchObject({ kind: 'activity', people: 1, visits: 1, totalMs: 5000 });
});

test('landing counts the first page of each session', () => {
  expect(summarize(EVENTS).landing).toEqual([
    { name: 'Ask', sessions: 1 },
    { name: 'Today', sessions: 1 },
    { name: 'Welcome', sessions: 1 },
  ]);
});

test('people list sessions newest first with pages in order; total counts page time only', () => {
  const alice = summarize(EVENTS).people.find((p) => p.uid === 'alice')!;
  expect(alice).toEqual({
    uid: 'alice',
    sessions: 2,
    totalMs: 34_000,
    firstSeen: 100,
    pathsBySession: [
      { sid: 'a2', pages: ['Ask'] },
      { sid: 'a1', pages: ['Welcome', 'Today'] },
    ],
    msByName: {
      page: { Welcome: 4000, Today: 10_000, Ask: 20_000 },
      section: { 'Today › Foods': 6000 },
      activity: { 'Ask › typing': 5000 },
      tap: {},
    },
  });
});

test('each person has their total time per page, section and activity', () => {
  const { people } = summarize(EVENTS);
  const alice = people.find((p) => p.uid === 'alice')!;
  const bob = people.find((p) => p.uid === 'bob')!;
  expect(alice.msByName.page).toEqual({ Welcome: 4000, Today: 10_000, Ask: 20_000 });
  expect(alice.msByName.section).toEqual({ 'Today › Foods': 6000 });
  expect(alice.msByName.activity).toEqual({ 'Ask › typing': 5000 });
  // Resumed spans add to the same page.
  expect(bob.msByName.page).toEqual({ Today: 32_000 });
  expect(bob.msByName.section).toEqual({});
});

test('formats durations', () => {
  expect(formatDuration(0)).toBe('0:00');
  expect(formatDuration(65_000)).toBe('1:05');
  expect(formatDuration(3_725_000)).toBe('1:02:05');
});

test('CSV has a header and quotes awkward names', () => {
  const csv = toCsv([e('u', 's', 'activity', 'A, "B"', 400, 1)]);
  expect(csv).toBe('uid,sid,kind,name,ms,at\nu,s,activity,"A, ""B""",400,1');
});

test('coming back after switching apps is the same visit, not a new one', () => {
  const resumed = [
    e('cara', 'c1', 'page', 'Today', 3000, 0),
    e('cara', 'c1', 'section', 'Today › Foods', 3000, 0),
    // Hidden, then back: the tracker resumes both spans as new events.
    { ...e('cara', 'c1', 'page', 'Today', 2000, 60_000), cont: true as const },
    { ...e('cara', 'c1', 'section', 'Today › Foods', 2000, 60_000), cont: true as const },
    e('cara', 'c1', 'page', 'Ask', 1000, 70_000),
    e('cara', 'c1', 'page', 'Today', 1000, 80_000),
  ];
  const { rows, people } = summarize(resumed);
  expect(rows.find((r) => r.kind === 'page' && r.name === 'Today')).toMatchObject({ visits: 2, totalMs: 6000 });
  expect(rows.find((r) => r.kind === 'section')).toMatchObject({ visits: 1, totalMs: 5000 });
  expect(people[0].pathsBySession[0].pages).toEqual(['Today', 'Ask', 'Today']);
});

test('CSV cells that look like formulas are neutralised and carriage returns are quoted', () => {
  const csv = toCsv([e('u', 's', 'page', '-x', 400, 1), e('u', 's', 'page', 'a\rb', 400, 2)]);
  expect(csv.split('\n')[1]).toBe("u,s,page,'-x,400,1");
  expect(csv).toContain('"a\rb"');
});

test('two activities open together resume without becoming new visits', () => {
  const both = [
    e('dee', 'd1', 'activity', 'Ask › typing', 1000, 0),
    e('dee', 'd1', 'activity', 'Ask › context', 1000, 0),
    { ...e('dee', 'd1', 'activity', 'Ask › typing', 1000, 60_000), cont: true as const },
    { ...e('dee', 'd1', 'activity', 'Ask › context', 1000, 60_000), cont: true as const },
  ];
  const { rows } = summarize(both);
  expect(rows.map((r) => r.visits)).toEqual([1, 1]);
});
