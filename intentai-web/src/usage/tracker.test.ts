import { beforeEach, expect, test } from 'vitest';
import { deleteAllData, ensureUsageId, usageIdStore } from '../data/stores';
import type { UsageEvent } from './event';
import { createTracker, type TrackerDeps } from './tracker';

const MIN = 60_000;

function setup() {
  let clock = 1_000_000;
  let ids = 0;
  const sent: UsageEvent[][] = [];
  const listeners = new Map<string, () => void>();
  const doc = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (type: string, fn: () => void) => listeners.set(type, fn),
  };
  const deps: TrackerDeps = {
    now: () => clock,
    send: (events) => sent.push(events),
    uid: () => 'me',
    newId: () => `s${++ids}`,
    doc: doc as unknown as TrackerDeps['doc'],
    win: { addEventListener: (type: string, fn: () => void) => listeners.set(type, fn) } as unknown as TrackerDeps['win'],
  };
  const tracker = createTracker(deps);
  return {
    tracker,
    sent,
    events: () => sent.flat(),
    advance: (ms: number) => (clock += ms),
    hide: () => {
      doc.visibilityState = 'hidden';
      listeners.get('visibilitychange')!();
    },
    show: () => {
      doc.visibilityState = 'visible';
      listeners.get('visibilitychange')!();
    },
    pagehide: () => listeners.get('pagehide')!(),
    pageshow: () => listeners.get('pageshow')!(),
  };
}

test('records visible time for a span and flushes when a page span stops', () => {
  const t = setup();
  const stop = t.tracker.start('page', 'Today');
  t.advance(5000);
  stop();
  expect(t.sent).toEqual([[{ uid: 'me', sid: 's1', kind: 'page', name: 'Today', ms: 5000, at: 1_000_000 }]]);
});

test('drops spans under 300 ms', () => {
  const t = setup();
  const stop = t.tracker.start('page', 'Today');
  t.advance(299);
  stop();
  t.tracker.flush();
  expect(t.events()).toEqual([]);
});

test('hidden time is not counted and a long gap starts a new session', () => {
  const t = setup();
  const stop = t.tracker.start('page', 'Ask');
  t.advance(4000);
  t.hide();
  t.advance(60 * MIN);
  t.show();
  t.advance(2000);
  stop();
  expect(t.events().map(({ sid, ms }) => ({ sid, ms }))).toEqual([
    { sid: 's1', ms: 4000 },
    { sid: 's2', ms: 2000 },
  ]);
});

test('a short hide keeps the session', () => {
  const t = setup();
  const stop = t.tracker.start('page', 'Ask');
  t.advance(1000);
  t.hide();
  t.advance(5 * MIN);
  t.show();
  t.advance(1000);
  stop();
  expect(t.events().map((e) => e.sid)).toEqual(['s1', 's1']);
});

test('flushes on hide, and pagehide after hide does not double count', () => {
  const t = setup();
  t.tracker.start('page', 'Moments');
  t.advance(3000);
  t.hide();
  expect(t.sent).toHaveLength(1);
  t.pagehide();
  expect(t.events()).toHaveLength(1);
  expect(t.events()[0]).toMatchObject({ name: 'Moments', ms: 3000 });
});

test('pagehide alone also flushes open spans', () => {
  const t = setup();
  t.tracker.start('page', 'Moments');
  t.advance(3000);
  t.pagehide();
  expect(t.events()).toEqual([expect.objectContaining({ name: 'Moments', ms: 3000 })]);
});

test('page and section spans run in parallel', () => {
  const t = setup();
  const stopPage = t.tracker.start('page', 'Today');
  t.advance(1000);
  const stopSection = t.tracker.start('section', 'Today › Foods');
  t.advance(2000);
  stopSection();
  stopPage();
  expect(t.events().map(({ kind, ms }) => ({ kind, ms }))).toEqual([
    { kind: 'section', ms: 2000 },
    { kind: 'page', ms: 3000 },
  ]);
});

test('a new span after 30 idle minutes starts a new session', () => {
  const t = setup();
  const stop = t.tracker.start('page', 'Today');
  t.advance(1000);
  stop();
  t.advance(31 * MIN);
  const stop2 = t.tracker.start('page', 'Ask');
  t.advance(1000);
  stop2();
  expect(t.events().map((e) => e.sid)).toEqual(['s1', 's2']);
});

test('flushes at 50 queued events', () => {
  const t = setup();
  for (let i = 0; i < 50; i++) {
    const stop = t.tracker.start('activity', 'Ask › context');
    t.advance(400);
    stop();
  }
  expect(t.sent).toHaveLength(1);
  expect(t.sent[0]).toHaveLength(50);
});

test('stopping twice records once', () => {
  const t = setup();
  const stop = t.tracker.start('page', 'Today');
  t.advance(1000);
  stop();
  stop();
  expect(t.events()).toHaveLength(1);
});

beforeEach(() => usageIdStore.set(''));

test('the anonymous id is created once and reset by Delete all my data', () => {
  const id = ensureUsageId();
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  expect(ensureUsageId()).toBe(id);
  deleteAllData();
  expect(usageIdStore.get()).toBe('');
});

test('caps very long spans and names so the server never rejects the batch', () => {
  const t = setup();
  const stop = t.tracker.start('page', 'x'.repeat(80));
  t.advance(3 * 60 * MIN);
  stop();
  expect(t.events()[0]).toMatchObject({ ms: 7_200_000, name: 'x'.repeat(64) });
});

test('resumed spans are marked as continuing the same visit', () => {
  const t = setup();
  const stop = t.tracker.start('page', 'Today');
  t.advance(1000);
  t.hide();
  t.advance(1000);
  t.show();
  t.advance(1000);
  stop();
  expect(t.events().map((e) => e.cont)).toEqual([undefined, true]);
});

test('pageshow after a pagehide-only exit resumes timing (back/forward cache)', () => {
  const t = setup();
  const stop = t.tracker.start('page', 'Moments');
  t.advance(1000);
  t.pagehide();
  t.advance(5000);
  t.pageshow();
  t.advance(2000);
  stop();
  expect(t.events().map((e) => e.ms)).toEqual([1000, 2000]);
});

test('a span keeps the id it started with, even if Delete all my data resets it meanwhile', () => {
  let id = 'old';
  let clock = 0;
  const sent: UsageEvent[] = [];
  const tracker = createTracker({
    now: () => clock,
    send: (events) => sent.push(...events),
    uid: () => id,
    newId: () => 's',
    doc: { visibilityState: 'visible', addEventListener: () => {} } as unknown as TrackerDeps['doc'],
    win: { addEventListener: () => {} } as unknown as TrackerDeps['win'],
  });
  const stop = tracker.start('page', 'Notices');
  clock += 1000;
  id = 'new';
  stop();
  expect(sent[0].uid).toBe('old');
});
