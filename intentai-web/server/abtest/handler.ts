// /api/abtest: the A/B test desk (/test) saves each participant's answers here.
//   POST {type: "start"}           -> the new participant (P01, P02…; order 1 A·X, 2 B·X, 3 A·Y, 4 B·Y, repeating)
//   POST {type: "start", pilot: true} -> a pilot session (T01, T02…), kept apart from the main results
//   POST {type: "save", response}  -> 204: the latest state of one participant (saved after every step)
//   GET                            -> {responses}: one entry per participant, newest state (admin password)
//   DELETE ?code=P03               -> removes one participant; DELETE with no code clears all (admin password)
// Answers are kept as an append-only Redis list; the newest entry per code wins, and a removal is an entry too.
import { createHash, timingSafeEqual } from 'node:crypto';
import { FORM, firstOf, routeOf, type AbResponse } from '../../src/pages/AbTestPage/abTest.js';
import type { RedisLike } from '../usage/store.js';

export const ABTEST_KEY = 'intentai:abtest';
const MAX_ENTRIES = 20_000;
const MAX_BODY = 32_000;

export interface AbConfig {
  redis: RedisLike | null;
  password: string | undefined;
  failDelayMs?: number;
}

type Entry = AbResponse | { code: string; removed: true; updatedAt: number };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const text = (status: number, body: string) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
const digest = (v: string) => createHash('sha256').update(v).digest();
const samePassword = (given: string, expected: string) => timingSafeEqual(digest(given), digest(expected));
const NOT_CONNECTED = 'Storage not connected. Connect a Redis database to the Vercel project.';

const CODE = /^[PT]\d{2,3}$/;
const OUTCOME = ['independent', 'assisted', 'incomplete', 'skipped', 'technical'];
const PREF_KEYS = ['ease', 'interest', 'enjoy', 'clarity', 'useful', 'comfort', 'overall'];
const VERSIONS = ['A', 'B'];
const isScore = (v: unknown) => v === 'na' || (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5);
const shortText = (v: unknown, max = 60) => typeof v === 'string' && v.length <= max;

/** Keeps only the fields and value shapes the desk sends; anything else is dropped. */
export function cleanResponse(raw: unknown): AbResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.code !== 'string' || !CODE.test(r.code) || (r.first !== 'A' && r.first !== 'B') || (r.route !== 'X' && r.route !== 'Y')) return null;
  const n = Number(r.n);
  if (!Number.isInteger(n) || n < 1 || n > 999) return null;
  const perVersion = <T>(value: unknown, keep: (k: string, v: unknown) => T | undefined) => {
    const out: Record<string, Record<string, T>> = {};
    if (!value || typeof value !== 'object') return out;
    for (const ver of VERSIONS) {
      const src = (value as Record<string, unknown>)[ver];
      if (!src || typeof src !== 'object') continue;
      const part: Record<string, T> = {};
      for (const [k, v] of Object.entries(src as Record<string, unknown>).slice(0, 30)) {
        if (!/^[a-z0-9]{1,6}$/.test(k)) continue;
        const kept = keep(k, v);
        if (kept !== undefined) part[k] = kept;
      }
      out[ver] = part;
    }
    return out;
  };
  // t1…t4 hold an outcome; t3c1-style keys hold the facilitator's end-state check.
  const tasks = perVersion<string>(r.tasks, (k, v) =>
    /c\d$/.test(k) ? (v === 'yes' || v === 'no' ? v : undefined) : typeof v === 'string' && OUTCOME.includes(v) ? v : undefined,
  );
  const ratings = perVersion<number | 'na'>(r.ratings, (_, v) => (isScore(v) ? (v as number | 'na') : undefined));
  const quick = perVersion<number | 'na' | string[]>(r.quick, (_, v) =>
    isScore(v) ? (v as number | 'na') : Array.isArray(v) && v.length <= 2 && v.every((x) => shortText(x)) ? (v as string[]) : undefined,
  );
  const compare: AbResponse['compare'] = {};
  const c = r.compare && typeof r.compare === 'object' ? (r.compare as Record<string, unknown>) : {};
  for (const k of PREF_KEYS) if (isScore(c[k])) compare[k] = c[k] as number | 'na';
  if (shortText(c.useAgain)) compare.useAgain = c.useAgain as string;
  if (shortText(c.improve)) compare.improve = c.improve as string;
  if (shortText(c.comment, 1000)) compare.comment = c.comment as string;
  const now = Date.now();
  return {
    code: r.code, n, first: r.first, route: r.route, pilot: r.code.startsWith('T'), form: FORM, status: r.status === 'done' ? 'done' : 'started',
    startedAt: Number.isFinite(r.startedAt) ? Number(r.startedAt) : now, updatedAt: now,
    tasks, ratings, quick, compare,
  };
}

/** The newest state of each participant, oldest first; removed participants are left out. */
export function latest(entries: Entry[]): AbResponse[] {
  const by = new Map<string, Entry>();
  for (const e of entries) {
    const prev = by.get(e.code);
    if (!prev || e.updatedAt >= prev.updatedAt) by.set(e.code, e);
  }
  return [...by.values()].filter((e): e is AbResponse => !('removed' in e)).sort((a, b) => a.n - b.n);
}

async function read(redis: RedisLike): Promise<Entry[]> {
  const items = await redis.lrange(ABTEST_KEY, 0, -1);
  return items.flatMap((item) => {
    try {
      return [(typeof item === 'string' ? JSON.parse(item) : item) as Entry];
    } catch {
      return [];
    }
  });
}
async function append(redis: RedisLike, entry: Entry) {
  await redis.rpush(ABTEST_KEY, JSON.stringify(entry));
  await redis.ltrim(ABTEST_KEY, -MAX_ENTRIES, -1);
}

export async function handleAbTest(req: Request, cfg: AbConfig): Promise<Response> {
  if (req.method === 'POST') {
    const site = req.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin') return text(403, 'Forbidden');
    if (!req.headers.get('content-type')?.startsWith('application/json')) return text(415, 'Send JSON');
    if (!cfg.redis) return text(503, NOT_CONNECTED);
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength > MAX_BODY) return text(413, 'Too large');
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return text(400, 'Bad JSON');
    }
    if (body?.type === 'start') {
      // Removed codes still count, so a number is never handed out twice.
      // The new participant is saved straight away, so a second phone starting at the same time gets the next number.
      // Pilots count apart (T01, T02…), so a dry run never uses up a participant number.
      const prefix = body.pilot === true ? 'T' : 'P';
      const n =
        (await read(cfg.redis)).filter((e) => e.code.startsWith(prefix)).reduce((m, e) => Math.max(m, 'n' in e ? e.n : Number(e.code.slice(1)) || 0), 0) + 1;
      const started = cleanResponse({ code: prefix + String(n).padStart(2, '0'), n, first: firstOf(n), route: routeOf(n) });
      if (!started) return text(500, 'Could not start');
      await append(cfg.redis, started);
      return json(200, started);
    }
    if (body?.type === 'save') {
      const response = cleanResponse(body.response);
      if (!response) return text(400, 'Invalid answers');
      await append(cfg.redis, response);
      return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
    }
    return text(400, 'Unknown request');
  }
  if (req.method !== 'GET' && req.method !== 'DELETE') return text(405, 'Method not allowed');
  if (!cfg.password) return text(503, 'No admin password configured. Set ADMIN_PASSWORD.');
  if (!samePassword(req.headers.get('x-admin-password') ?? '', cfg.password)) {
    await new Promise((resolve) => setTimeout(resolve, cfg.failDelayMs ?? 400));
    return text(401, 'Wrong password');
  }
  if (!cfg.redis) return text(503, NOT_CONNECTED);
  if (req.method === 'DELETE') {
    const code = new URL(req.url).searchParams.get('code');
    if (code === null) await cfg.redis.del(ABTEST_KEY);
    else if (CODE.test(code)) await append(cfg.redis, { code, removed: true, updatedAt: Date.now() });
    else return text(400, 'Bad code');
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  }
  return json(200, { responses: latest(await read(cfg.redis)) });
}

/** A list kept in memory, for the local dev server when no Redis is set. */
export function memoryList(): RedisLike {
  let items: string[] = [];
  return {
    rpush: async (_k, ...values) => void items.push(...values),
    ltrim: async (_k, start) => void (items = items.slice(start < 0 ? Math.max(0, items.length + start) : start)),
    lrange: async () => [...items],
    del: async () => void (items = []),
  };
}
