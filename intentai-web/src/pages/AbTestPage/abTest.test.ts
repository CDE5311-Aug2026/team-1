import { expect, test } from 'vitest';
import {
  FORM,
  comprehension,
  counted,
  firstOf,
  interest,
  median,
  openCount,
  preference,
  routeFor,
  routeOf,
  target,
  taskResult,
  taskScript,
  TASKS,
  T4_CLUE,
  ROUTES,
  toCsv,
  toggleOption,
  usability,
  versionAt,
  type AbResponse,
  type Session,
} from './abTest';
import { clueTitle, remoteRecord } from './prepare';
// @ts-expect-error the game modules are untyped JS
import { ROUTES as BOOKS } from '../../findsg/app/data.js';

const row = (n: number, compare: AbResponse['compare'], extra: Partial<AbResponse> = {}): AbResponse => ({
  code: 'P' + String(n).padStart(2, '0'), n, first: firstOf(n), route: routeOf(n), form: FORM, status: 'done', startedAt: 0, updatedAt: 0,
  tasks: {}, ratings: {}, quick: {}, compare, ...extra,
});

test('UI and route order balance over every four participants', () => {
  expect([1, 2, 3, 4, 5].map((n) => firstOf(n) + routeOf(n))).toEqual(['AX', 'BX', 'AY', 'BY', 'AX']);
  expect(routeFor(row(1, {}), 'A')).toBe('X');
  expect(routeFor(row(1, {}), 'B')).toBe('Y');
  expect(taskScript(TASKS[2], 'Y')).toContain('Letters to the Shore');
  // The script names each route's book exactly as the shelf shows it.
  for (const r of Object.values(ROUTES)) expect(r.book).toBe(BOOKS[r.id].title);
});

test('a side needs more than half of the valid answers, and enough of them', () => {
  const rows = [1, 2, 3, 4, 5].map((n) => row(n, { ease: n <= 3 ? 1 : 5 }));
  expect(preference('ease', rows, 8).verdict).toBe('Inconclusive (5 of 8)');
  expect(preference('ease', rows, 5)).toMatchObject({ a: 3, b: 2, side: 'A', verdict: 'Majority favours A' });
});

test('median skips N/A; the 80% target rounds up', () => {
  expect(median([1, 'na', 4, 3, undefined])).toBe(3);
  expect(median([2, 4])).toBe(3);
  expect([target(10), target(9), target(1)]).toEqual([8, 8, 1]);
});

test('multiple choice keeps two, and None-style answers stand alone', () => {
  expect(toggleOption(['Setup', 'Finding places'], 'Viewing progress')).toEqual(['Finding places', 'Viewing progress']);
  expect(toggleOption(['Setup'], 'None')).toEqual(['None']);
  expect(toggleOption(['Nothing more'], 'Cost')).toEqual(['Cost']);
  expect(toggleOption(['Setup'], 'Unsure')).toEqual(['Unsure']);
  expect(toggleOption(['Wording'], 'Navigation', 1)).toEqual(['Navigation']);
});

test('even participants start on B', () => {
  expect(versionAt({ first: 'B', step: 'tasks1' })).toBe('B');
  expect(versionAt({ first: 'B', step: 'rate2' })).toBe('A');
});

test('open questions are counted per step; end-state checks are optional', () => {
  const s: Session = { ...row(1, {}), step: 'tasks1', tasks: { A: { t1: 'independent', t2: 'assisted' } } };
  expect(openCount(s)).toBe(2);
  expect(openCount({ ...s, step: 'rate1' })).toBe(15);
  expect(openCount({ ...s, step: 'quick1' })).toBe(12);
  expect(openCount({ ...s, step: 'compare' })).toBe(9);
});

test('H1/H2: everyone offered counts; independent needs every end-state check; a missing record is inconclusive', () => {
  const ok = { t3: 'independent', t3c1: 'yes', t3c2: 'yes' };
  const rows = [
    ...[1, 2, 3, 4].map((n) => row(n, {}, { tasks: { A: ok } })),
    row(5, {}, { tasks: { A: { t3: 'technical' } } }),
  ];
  // 4 of 5 offered, need 4: met, but the technical one has no checks recorded.
  expect(taskResult(rows, 'A', 't3', 3)).toMatchObject({ offered: 5, met: 4, need: 4, unchecked: 1, label: 'Inconclusive' });
  const recorded = rows.map((r, i) => (i === 4 ? { ...r, tasks: { A: { t3: 'technical', t3c1: 'no', t3c2: 'no' } } } : r));
  expect(taskResult(recorded, 'A', 't3', 3).label).toBe('Target met');
  const notRemote = recorded.map((r) => ({ ...r, tasks: { A: { ...r.tasks.A, t3c1: 'no' } } }));
  expect(taskResult(notRemote, 'A', 't3', 3)).toMatchObject({ met: 0, label: 'Below target' });
  expect(taskResult(recorded, 'A', 't3', 8).label).toBe('Inconclusive');
});

test('H3 counts both comprehension checks right, with first exposure apart', () => {
  const right = { q11: ['Remote play progress'], q12: ['The place is real; the characters are fictional'] };
  const rows = [row(1, {}, { quick: { A: right } }), row(2, {}, { quick: { A: { ...right, q12: ['The place is fictional'] } } }), row(3, {}, { quick: { A: right } })];
  expect(comprehension(rows, 'A', 3)).toMatchObject({ shown: 3, both: 2, q11: 3, q12: 2, need: 3, label: 'Below target' });
  expect(comprehension(rows, 'A', 1, true)).toMatchObject({ shown: 2, both: 2 });
});

test('H4 reports ratings 8–10 separately; H5 uses paired UI2 − UI1 differences', () => {
  const rows = [1, 2, 3].map((n) =>
    row(n, { ease: 5, clarity: 4 }, { ratings: { A: { i1: 2, i2: 3, i3: 3, i4: 3, i8: 4, i9: 5, i10: 'na' }, B: { i1: 4, i2: 4, i3: 4, i4: 4, i8: 3, i9: 3, i10: 3 } } }),
  );
  const a = interest(rows, 'A', 3);
  expect(a.map((x) => x.label)).toEqual(['Target met', 'Target met', 'Inconclusive']);
  expect(a[2]).toMatchObject({ na: 3, n: 0 });
  const h5 = usability(rows, 3);
  expect(h5.items[0]).toMatchObject({ paired: 3, median: 2, higherB: 3 });
  expect(h5.label).toBe('Target met');
  expect(usability(rows, 8).label).toBe('Inconclusive');
});

test('results leave out pilots and the earlier form unless asked', () => {
  const rows = [row(1, {}), { ...row(1, {}), code: 'T01', pilot: true }, { ...row(2, {}), form: undefined }];
  expect(counted(rows).map((r) => r.code)).toEqual(['P01']);
  expect(counted(rows, true).map((r) => r.code)).toEqual(['P01', 'T01']);
});

test('CSV keeps every answer, quoted where needed', () => {
  const rows = [row(1, { ease: 1, comment: 'Liked "A", mostly' }, { tasks: { A: { t3: 'independent', t3c1: 'yes' } }, quick: { A: { q1: ['Setup', 'Unsure'] } } })];
  const csv = toCsv(rows).split('\n');
  expect(csv).toHaveLength(2);
  expect(csv[0]).toContain('A_t3c1');
  expect(csv[1]).toContain('Setup; Unsure');
  expect(csv[1]).toContain('"Liked ""A"", mostly"');
});

test('the T4 profile is a completed remote record, and the script names its clue exactly', () => {
  const record = remoteRecord('2026-11-02T00:00:00.000Z');
  expect(record).toMatchObject({ routeId: T4_CLUE.route, mode: 'preview', completed: ['balestier-01'] });
  expect(clueTitle()).toBe(T4_CLUE.title);
});
