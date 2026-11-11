// Spend limits for POST /api/recognize. Each call is a paid Claude vision request, so the endpoint caps calls per
// visitor and per day for the whole app. Counts live in Redis when the project has one (shared by every function
// instance); otherwise, or when Redis fails, each instance keeps its own count in memory (weaker, but never unlimited).
import type { CounterLike } from '../usage/store.js';

export interface RecognizeLimits {
  /** Photo checks one visitor may make per window. */
  perVisitor: number;
  windowSeconds: number;
  /** Photo checks the whole app may make per UTC day. */
  perDay: number;
}

/** A hunt has at most a dozen stops and a retake or two each; these leave room for that and stop a script. */
export const DEFAULT_LIMITS: RecognizeLimits = { perVisitor: 30, windowSeconds: 600, perDay: 1500 };

/** An in-memory counter with expiry, for when there is no Redis. */
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

/** Counts one call against a key; true while the key is within its limit. The first call starts the window. */
async function take(counter: CounterLike, key: string, limit: number, seconds: number): Promise<boolean> {
  const n = await counter.incr(key);
  if (n === 1) await counter.expire(key, seconds);
  return n <= limit;
}

/**
 * The visitor's address as Vercel reports it (Vercel sets x-forwarded-for itself; a client can't choose it there).
 * Locally there is no proxy, so every caller shares one key, which is fine on a dev machine.
 */
export function visitorOf(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (forwarded || request.headers.get('x-real-ip') || 'local').slice(0, 64);
}

export type LimitVerdict = 'ok' | 'visitor' | 'day';

export async function checkLimits(
  request: Request,
  counters: { shared: CounterLike | null; local: CounterLike },
  limits: RecognizeLimits = DEFAULT_LIMITS,
  now: () => number = Date.now,
): Promise<LimitVerdict> {
  const day = new Date(now()).toISOString().slice(0, 10);
  const run = async (c: CounterLike): Promise<LimitVerdict> => {
    if (!(await take(c, `findsg:recognize:v:${visitorOf(request)}`, limits.perVisitor, limits.windowSeconds))) return 'visitor';
    if (!(await take(c, `findsg:recognize:d:${day}`, limits.perDay, 26 * 3600))) return 'day';
    return 'ok';
  };
  if (counters.shared) {
    try {
      return await run(counters.shared);
    } catch {
      // Redis down: fall through to this instance's own count rather than letting calls through uncounted.
    }
  }
  return run(counters.local);
}
