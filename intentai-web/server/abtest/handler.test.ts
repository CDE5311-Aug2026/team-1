import { describe, expect, test } from 'vitest';
import { cleanResponse, handleAbTest, latest, memoryList } from './handler.js';

const cfg = () => ({ redis: memoryList(), password: 'pw', failDelayMs: 0 });
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://x/api/abtest', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const get = (password = 'pw') => new Request('http://x/api/abtest', { headers: { 'x-admin-password': password } });
const del = (query = '', password = 'pw') => new Request('http://x/api/abtest' + query, { method: 'DELETE', headers: { 'x-admin-password': password } });

describe('handleAbTest', () => {
  test('start balances UI and route order: P01 A·X, P02 B·X, P03 A·Y, P04 B·Y', async () => {
    const c = cfg();
    const got = [];
    for (let i = 0; i < 4; i++) got.push(await (await handleAbTest(post({ type: 'start' }), c)).json());
    expect(got.map((p) => `${p.code} ${p.first}·${p.route}`)).toEqual(['P01 A·X', 'P02 B·X', 'P03 A·Y', 'P04 B·Y']);
    expect(got[0]).toMatchObject({ pilot: false, form: 2 });
  });

  test('pilot sessions count apart and never use up a participant number', async () => {
    const c = cfg();
    const pilot = await (await handleAbTest(post({ type: 'start', pilot: true }), c)).json();
    const real = await (await handleAbTest(post({ type: 'start' }), c)).json();
    expect([pilot.code, pilot.pilot, real.code]).toEqual(['T01', true, 'P01']);
  });

  test('saves answers and returns the newest state per participant', async () => {
    const c = cfg();
    const p = await (await handleAbTest(post({ type: 'start' }), c)).json();
    const saved = await handleAbTest(post({ type: 'save', response: { ...p, status: 'done', tasks: { A: { t1: 'independent', t2: 'bogus', t3c1: 'yes', t3c2: 'maybe' } }, compare: { ease: 2, improve: 'Wording', evil: '<x>' } } }), c);
    expect(saved.status).toBe(204);
    const { responses } = await (await handleAbTest(get(), c)).json();
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ code: 'P01', status: 'done', tasks: { A: { t1: 'independent', t3c1: 'yes' } }, compare: { ease: 2, improve: 'Wording' } });
    expect(responses[0].tasks.A.t2).toBeUndefined();
    expect(responses[0].tasks.A.t3c2).toBeUndefined();
    expect(responses[0].compare.evil).toBeUndefined();
  });

  test('refuses other sites, non-JSON and bad answers', async () => {
    const c = cfg();
    expect((await handleAbTest(post({ type: 'start' }, { 'sec-fetch-site': 'cross-site' }), c)).status).toBe(403);
    expect((await handleAbTest(new Request('http://x/api/abtest', { method: 'POST', body: 'x' }), c)).status).toBe(415);
    expect((await handleAbTest(post({ type: 'save', response: { code: 'X1', n: 1, first: 'A' } }), c)).status).toBe(400);
  });

  test('results and removal need the password; removed codes are not reused', async () => {
    const c = cfg();
    await handleAbTest(post({ type: 'start' }), c);
    expect((await handleAbTest(get('nope'), c)).status).toBe(401);
    expect((await handleAbTest(del('?code=P01', 'nope'), c)).status).toBe(401);
    expect((await handleAbTest(del('?code=P01'), c)).status).toBe(204);
    expect((await (await handleAbTest(get(), c)).json()).responses).toEqual([]);
    expect((await (await handleAbTest(post({ type: 'start' }), c)).json()).code).toBe('P02');
  });

  test('says when storage is not connected', async () => {
    const res = await handleAbTest(post({ type: 'start' }), { redis: null, password: 'pw' });
    expect(res.status).toBe(503);
  });
});

test('cleanResponse keeps scores 1–5, N/A and up to two choices', () => {
  const r = cleanResponse({
    code: 'P03', n: 3, first: 'A', route: 'Y',
    ratings: { A: { i1: 5, i2: 'na', i3: 9 } },
    quick: { B: { q1: ['Setup', 'Unsure'], q3: ['a', 'b', 'c'], q2: 4 } },
  });
  expect(r?.ratings.A).toEqual({ i1: 5, i2: 'na' });
  expect(r?.quick.B).toEqual({ q1: ['Setup', 'Unsure'], q2: 4 });
});

test('latest lets the newest entry win', () => {
  const base = { n: 1, first: 'A' as const, route: 'X' as const, status: 'started' as const, startedAt: 0, tasks: {}, ratings: {}, quick: {}, compare: {} };
  expect(latest([{ ...base, code: 'P01', updatedAt: 1 }, { ...base, code: 'P01', updatedAt: 2, status: 'done' }])[0].status).toBe('done');
  expect(latest([{ ...base, code: 'P01', updatedAt: 1 }, { code: 'P01', removed: true, updatedAt: 2 }])).toEqual([]);
});
