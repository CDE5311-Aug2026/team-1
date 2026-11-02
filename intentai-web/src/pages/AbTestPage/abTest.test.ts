import { expect, test } from 'vitest';
import { median, openCount, preference, tasksDone, textAmount, toCsv, toggleOption, versionAt, type AbResponse, type Session } from './abTest';

const row = (n: number, compare: AbResponse['compare'], extra: Partial<AbResponse> = {}): AbResponse => ({
  code: 'P' + String(n).padStart(2, '0'), n, first: n % 2 ? 'A' : 'B', status: 'done', startedAt: 0, updatedAt: 0,
  tasks: {}, ratings: {}, quick: {}, compare, ...extra,
});

test('a side needs more than half of the valid answers, and enough of them', () => {
  const rows = [1, 2, 3, 4, 5].map((n) => row(n, { ease: n <= 3 ? 1 : 5 }));
  expect(preference('ease', rows, 8).verdict).toBe('Inconclusive (5 of 8)');
  expect(preference('ease', rows, 5)).toMatchObject({ a: 3, b: 2, side: 'A', verdict: 'Majority favours A' });
  const split = [row(1, { ease: 1 }), row(2, { ease: 5 }), row(3, { ease: 3 }), row(4, { ease: 'na' })];
  expect(preference('ease', split, 3)).toMatchObject({ valid: 3, na: 1, side: null, short: 'Split' });
});

test('median skips N/A', () => {
  expect(median([1, 'na', 4, 3, undefined])).toBe(3);
  expect(median([2, 4])).toBe(3);
  expect(median(['na'])).toBeNull();
});

test('multiple choice keeps two, and None-style answers stand alone', () => {
  expect(toggleOption(['Setup', 'Finding places'], 'Viewing progress')).toEqual(['Finding places', 'Viewing progress']);
  expect(toggleOption(['Setup'], 'None')).toEqual(['None']);
  expect(toggleOption(['None'], 'Setup')).toEqual(['Setup']);
  expect(toggleOption(['Setup'], 'Setup')).toEqual([]);
  expect(toggleOption(['Wording'], 'Navigation', 1)).toEqual(['Navigation']);
});

test('even participants start on B', () => {
  expect(versionAt({ first: 'B', step: 'tasks1' })).toBe('B');
  expect(versionAt({ first: 'B', step: 'rate2' })).toBe('A');
});

test('open questions are counted per step', () => {
  const s: Session = { ...row(1, {}), step: 'tasks1', tasks: { A: { t1: 'alone', t2: 'helped' } } };
  expect(openCount(s)).toBe(2);
  expect(openCount({ ...s, step: 'compare' })).toBe(9);
});

test('task, text and CSV summaries', () => {
  const rows = [
    row(1, { ease: 1, comment: 'Liked "A", mostly' }, { tasks: { A: { t1: 'alone', t2: 'not' } }, quick: { A: { q4: 4, q1: ['Setup', 'Unsure'] } } }),
    row(2, {}, { tasks: { A: { t1: 'alone' } }, quick: { A: { q4: 3 } } }),
  ];
  expect(tasksDone(rows, 'A')).toMatchObject({ alone: 2, tried: 3, by: { t1: { alone: 2, tried: 2 } } });
  expect(textAmount(rows, 'A')).toEqual([0, 1, 1]);
  const csv = toCsv(rows).split('\n');
  expect(csv).toHaveLength(3);
  expect(csv[1]).toContain('Setup; Unsure');
  expect(csv[1]).toContain('"Liked ""A"", mostly"');
});
