import {beforeEach, expect, test} from 'vitest';
// @ts-expect-error the game modules are untyped JS
import {caseRecord, clearFinish, dayOf, tookOf} from './case-record.js';

const stops = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
const game = {
  routeId: 'r', mode: 'manual', completed: ['a', 'b', 'c'],
  stops: {
    a: {checkin: {confirmedAt: '2026-11-03T02:00:00.000Z', method: 'manual-self-report'}},
    b: {checkin: {confirmedAt: '2026-11-03T02:20:00.000Z', method: 'decode-card'}},
    c: {checkin: {confirmedAt: '2026-11-03T02:30:00.000Z', method: 'manual-self-report'}},
  },
};
beforeEach(() => localStorage.clear());

test('a closed case keeps the moment it was first shown, and counts the decoded stops', () => {
  const r = caseRecord(game, stops, new Date('2026-11-03T02:47:00.000Z'));
  expect(r).toMatchObject({found: 3, total: 3, decoded: 1, took: 47 * 60000});
  // shown again later: the same finish
  expect(caseRecord(game, stops, new Date('2026-11-05T00:00:00.000Z')).took).toBe(47 * 60000);
  clearFinish('r', 'manual');
  expect(caseRecord(game, stops, new Date('2026-11-03T03:00:00.000Z')).took).toBe(60 * 60000);
});

test('times read like a ledger', () => {
  expect(tookOf(47 * 60000)).toBe('47 min');
  expect(tookOf(65 * 60000)).toBe('1 h 05');
  expect(tookOf(3 * 86400000)).toBe('3 days');
  expect(dayOf(Date.parse('2026-11-03T12:00:00'))).toBe('3 Nov');
});
