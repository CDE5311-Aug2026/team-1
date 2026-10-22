import { createHash, timingSafeEqual } from 'node:crypto';
import { LIMITS, parseBatch } from '../../src/usage/event.js';
import type { UsageStore } from './store.js';

// Web-standard handlers shared by the Vercel functions (api/) and the local Vite plugin.

export interface HandlerConfig {
  store: UsageStore | null;
  password: string | undefined;
  /** Pause before answering a wrong password, to slow down guessing. Default 400 ms. */
  failDelayMs?: number;
}

const text = (status: number, body: string) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
const empty = (status: number) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });
const NOT_CONNECTED = 'Storage not connected. Connect a Redis database (Redis Cloud or Upstash) to the Vercel project.';

const digest = (value: string) => createHash('sha256').update(value).digest();
/** Constant-time compare: hashing first gives both sides the same length. */
const samePassword = (given: string, expected: string) => timingSafeEqual(digest(given), digest(expected));

/** POST /api/track: public, so it only takes same-site JSON, validated and capped. */
export async function handleTrack(req: Request, cfg: HandlerConfig): Promise<Response> {
  if (req.method !== 'POST') return text(405, 'Method not allowed');
  // Browsers send Sec-Fetch-Site; anything but our own pages (or no browser at all) is refused.
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return text(403, 'Forbidden');
  if (!req.headers.get('content-type')?.startsWith('application/json')) return text(415, 'Send JSON');
  if (!cfg.store) return text(503, NOT_CONNECTED);
  if (Number(req.headers.get('content-length') ?? 0) > LIMITS.maxBody) return text(413, 'Too large');
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > LIMITS.maxBody) return text(413, 'Too large');
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return text(400, 'Bad JSON');
  }
  const events = parseBatch(body);
  if (!events) return text(400, 'Invalid events');
  await cfg.store.append(events);
  return empty(204);
}

/** GET /api/stats returns every event; DELETE /api/stats clears them. Both need the admin password. */
export async function handleStats(req: Request, cfg: HandlerConfig): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'DELETE') return text(405, 'Method not allowed');
  if (!cfg.password) return text(503, 'No admin password configured. Set ADMIN_PASSWORD.');
  if (!samePassword(req.headers.get('x-admin-password') ?? '', cfg.password)) {
    await new Promise((resolve) => setTimeout(resolve, cfg.failDelayMs ?? 400));
    return text(401, 'Wrong password');
  }
  if (!cfg.store) return text(503, NOT_CONNECTED);
  if (req.method === 'DELETE') {
    await cfg.store.clear();
    return empty(204);
  }
  return new Response(JSON.stringify({ events: await cfg.store.all() }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
