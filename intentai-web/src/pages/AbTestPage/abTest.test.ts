import { expect, test } from 'vitest';
import { HYPOTHESES, judge, median, openCount, optionsFor, preference, QUICK, tasksDone, toCsv, toggleOption, versionAt, type AbResponse, type Session } from './abTest';

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
  expect(toggleOption(['The map', 'Place pages'], 'Moments journal')).toEqual(['Place pages', 'Moments journal']);
  expect(toggleOption(['The map'], 'None')).toEqual(['None']);
  expect(toggleOption(['Nowhere'], 'Check-ins')).toEqual(['Check-ins']);
  expect(toggleOption(['The map'], 'The map')).toEqual([]);
  expect(toggleOption(['The map'], 'Place pages', 1)).toEqual(['Place pages']);
});

test('even participants start on B', () => {
  expect(versionAt({ first: 'B', step: 'tasks1' })).toBe('B');
  expect(versionAt({ first: 'B', step: 'rate2' })).toBe('A');
});

test('open questions are counted per step', () => {
  const s: Session = { ...row(1, {}), step: 'tasks1', tasks: { A: { t1: 'alone', t2: 'helped' } } };
  expect(openCount(s)).toBe(2);
  expect(openCount({ ...s, step: 'compare' })).toBe(5);
});

test('task and CSV summaries', () => {
  const rows = [
    row(1, { fun: 1, comment: 'Liked "A", mostly' }, { tasks: { A: { t1: 'alone', t2: 'not' } }, quick: { A: { q1: ['The map', 'Place pages'] } } }),
    row(2, {}, { tasks: { A: { t1: 'alone' } } }),
  ];
  expect(tasksDone(rows, 'A')).toMatchObject({ alone: 2, tried: 3, by: { t1: { alone: 2, tried: 2 } } });
  const csv = toCsv(rows).split('\n');
  expect(csv).toHaveLength(3);
  expect(csv[1]).toContain('The map; Place pages');
  expect(csv[1]).toContain('"Liked ""A"", mostly"');
});

test('version A is never asked about story hunts', () => {
  expect(optionsFor(QUICK[0], 'A')).not.toContain('Story hunts');
  expect(optionsFor(QUICK[0], 'B')).toContain('Story hunts');
});

test('H1 needs a majority for B; H3 only needs B to be no worse', () => {
  const [h1, , h3] = HYPOTHESES;
  const forB = [1, 2, 3].map((n) => row(n, { fun: 5, start: 3 }, { tasks: { A: { t1: 'alone' }, B: { t1: 'alone' } } }));
  expect(judge(h1, forB, 3).verdict).toBe('Supported');
  expect(judge(h1, forB, 8).verdict).toBe('Inconclusive');
  expect(judge(h3, forB, 3).verdict).toBe('Supported');
  const worseB = forB.map((r) => ({ ...r, tasks: { A: { t1: 'alone' }, B: { t1: 'helped' } } }));
  expect(judge(h3, worseB, 3).verdict).toBe('Not supported');
  const forA = [1, 2, 3].map((n) => row(n, { fun: 1 }));
  expect(judge(h1, forA, 3).verdict).toBe('Not supported');
});
