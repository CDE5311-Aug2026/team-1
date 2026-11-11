// Spend limits for POST /api/recognize. Each call is a paid Claude vision request, so the endpoint caps calls per
// visitor and per day for the whole app. Counts must be shared by every function instance (Redis), or the caps would
// multiply with the number of warm instances: with no counter, or when it fails, no photo is checked ('unavailable').
// The dev server (one process) passes memoryCounter().
import type { CounterLike } from '../usage/store.js';

export interface RecognizeLimits {
  /** Photo checks one visitor may make per window. */
  perVisitor: number;
  windowSeconds: number;
  /** Photo checks the whole app may make per UTC day. */
  perDay: number;
}

/**
 * A hunt has at most a dozen stops and a retake or two each. Players at one venue or on one carrier can share an
 * address, so the per-visitor cap leaves room for a small group; the daily cap is the real backstop on spend.
 */
export const DEFAULT_LIMITS: RecognizeLimits = { perVisitor: 60, windowSeconds: 600, perDay: 1500 };

/** An in-memory counter with expiry: only for a single process (the dev server, tests), never a Vercel function. */
export function memoryCounter(now: () => number = Date.now): CounterLike {
  const counts = new Map<string, { n: number; until: number }>();
  return {
    async incr(key) {
      const t = now();
      const hit = counts.get(key);
      if (!hit || hit.until <= t) {
        counts.set(key, { n: 1, until: Number.POSITIVE_INFINITY });
        if (counts.size > 10_000) for (const [k, v] of counts) if (v.until <= t) counts.delete(k);
        return 1;
      }
      hit.n += 1;
      return hit.n;
    },
    async expire(key, seconds) {
      const hit = counts.get(key);
      if (hit) hit.until = now() + seconds * 1000;
      return 1;
    },
  };
}

/**
 * Counts one call against a key; true while the key is within its limit. Each key names its own window (the window's
 * number is part of it), so the expiry only tidies up: if it is lost (the connection drops between INCR and EXPIRE)
 * the next window simply uses a new key, and nobody is locked out.
 */
async function take(counter: CounterLike, key: string, limit: number, seconds: number): Promise<boolean> {
  const n = await counter.incr(key);
  if (n === 1) {
    try {
      await counter.expire(key, seconds);
    } catch {
      /* only tidiness: the key belongs to one window */
    }
  }
  return n <= limit;
}

/** An IPv6 address's /64 (one connection can rotate through it), in full form; anything else unchanged. */
function prefixOf(ip: string): string {
  if (!ip.includes(':')) return ip;
  const [head, tail = ''] = ip.split('::');
  const a = head ? head.split(':') : [];
  const b = tail ? tail.split(':') : [];
  const groups = ip.includes('::') ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b] : a;
  return groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

/**
 * The visitor's address as Vercel reports it: x-vercel-forwarded-for / x-real-ip are set by Vercel itself, and
 * x-forwarded-for's first entry is too (Vercel overwrites it). An IPv6 address counts by its /64. Locally there is no
 * proxy, so every caller shares one key, which is fine on a dev machine.
 */
export function visitorOf(request: Request): string {
  const h = request.headers;
  const first = (v: string | null) => v?.split(',')[0]?.trim() || '';
  const ip = first(h.get('x-vercel-forwarded-for')) || first(h.get('x-real-ip')) || first(h.get('x-forwarded-for'));
  return ip ? prefixOf(ip.slice(0, 64)) : 'local';
}

export type LimitVerdict = 'ok' | 'visitor' | 'day' | 'unavailable';

export async function checkLimits(
  request: Request,
  counter: CounterLike | null,
  limits: RecognizeLimits = DEFAULT_LIMITS,
  now: () => number = Date.now,
): Promise<LimitVerdict> {
  const t = now();
  const day = new Date(t).toISOString().slice(0, 10);
  const window = Math.floor(t / (limits.windowSeconds * 1000));
  const run = async (c: CounterLike): Promise<LimitVerdict> => {
    if (!(await take(c, `findsg:recognize:v:${visitorOf(request)}:${window}`, limits.perVisitor, limits.windowSeconds))) return 'visitor';
    if (!(await take(c, `findsg:recognize:d:${day}`, limits.perDay, 26 * 3600))) return 'day';
    return 'ok';
  };
  // No shared count, or Redis down: refuse rather than count per instance (fail closed).
  if (!counter) return 'unavailable';
  try {
    return await run(counter);
  } catch {
    return 'unavailable';
  }
}
