import { expect, test } from 'vitest';
import { LIMITS, parseBatch, type UsageEvent } from './event';

const event = (over: Partial<UsageEvent> = {}): UsageEvent => ({
  uid: 'u1',
  sid: 's1',
  kind: 'page',
  name: 'Today',
  ms: 1500,
  at: 1_700_000_000_000,
  ...over,
});

test('accepts a valid batch and rounds ms', () => {
  expect(parseBatch({ events: [event({ ms: 1500.6 })] })).toEqual([event({ ms: 1501 })]);
});

test('rejects unknown kinds, long names, out-of-range times, big batches and non-objects', () => {
  expect(parseBatch({ events: [event({ kind: 'click' as never })] })).toBeNull();
  expect(parseBatch({ events: [event({ name: 'x'.repeat(LIMITS.maxName + 1) })] })).toBeNull();
  expect(parseBatch({ events: [event({ name: '' })] })).toBeNull();
  expect(parseBatch({ events: [event({ ms: 299 })] })).toBeNull();
  expect(parseBatch({ events: [event({ ms: 7_200_001 })] })).toBeNull();
  expect(parseBatch({ events: [event({ uid: '' })] })).toBeNull();
  expect(parseBatch({ events: Array.from({ length: 51 }, () => event()) })).toBeNull();
  expect(parseBatch({ events: [] })).toBeNull();
  expect(parseBatch('nope')).toBeNull();
  expect(parseBatch(null)).toBeNull();
  expect(parseBatch({ events: [{ ...event(), extra: 'typed text' }] })).toEqual([event()]);
});

test('names must start with a letter and ids are plain tokens, so nothing reaches a spreadsheet as a formula', () => {
  expect(parseBatch({ events: [event({ name: '=HYPERLINK("x")' })] })).toBeNull();
  expect(parseBatch({ events: [event({ name: '+1' })] })).toBeNull();
  expect(parseBatch({ events: [event({ uid: '@evil' })] })).toBeNull();
  expect(parseBatch({ events: [event({ sid: 'a b' })] })).toBeNull();
  expect(parseBatch({ events: [event({ name: "Moments › today's three card" })] })).not.toBeNull();
  expect(parseBatch({ events: [event({ name: 'Community question › add context' })] })).not.toBeNull();
});

test('a resumed span keeps its cont flag; anything else is dropped', () => {
  expect(parseBatch({ events: [{ ...event(), cont: true }] })).toEqual([{ ...event(), cont: true }]);
  expect(parseBatch({ events: [{ ...event(), cont: 'yes' }] })).toBeNull();
});
