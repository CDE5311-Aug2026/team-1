import { expect, test } from 'vitest';
import { handleRecognize, readRequest, UPSTREAM_RETRIES, UPSTREAM_TIMEOUT_MS } from './handler.js';
import { checkLimits, memoryCounter, visitorOf } from './limit.js';
import vercel from '../../vercel.json' with { type: 'json' };

const body = { feature: 'The arch above the tall window', place: 'The old press, 101 Jalan Sultan', mediaType: 'image/jpeg', data: 'aGVsbG8=' };

const post = (b: string, headers: Record<string, string> = {}) =>
  new Request('http://x/api/recognize', { method: 'POST', body: b, headers: { 'content-type': 'application/json', ...headers } });

test('reads a check-in photo request and refuses anything else', () => {
  expect(readRequest(body)).toEqual(body);
  expect(readRequest({ ...body, feature: '' })).toBeNull();
  expect(readRequest({ ...body, mediaType: 'image/gif' })).toBeNull();
  expect(readRequest({ ...body, data: 'not base64!' })).toBeNull();
  expect(readRequest(null)).toBeNull();
});

test('without a key the service says it is not configured (the game then asks to try again, never passes)', async () => {
  const res = await handleRecognize(post(JSON.stringify(body)), undefined);
  expect(res.status).toBe(503);
});

test('a bad body is a 400', async () => {
  const res = await handleRecognize(post('{"feature":""}'), 'key');
  expect(res.status).toBe(400);
});

test("only the app's own pages may call it: cross-site 403, GET 405, non-JSON 415", async () => {
  const ok = JSON.stringify(body);
  expect((await handleRecognize(post(ok, { 'sec-fetch-site': 'cross-site' }), 'key')).status).toBe(403);
  expect((await handleRecognize(post(ok, { 'sec-fetch-site': 'same-site' }), 'key')).status).toBe(403);
  expect((await handleRecognize(new Request('http://x/api/recognize'), 'key')).status).toBe(405);
  expect((await handleRecognize(new Request('http://x/api/recognize', { method: 'POST', body: ok }), 'key')).status).toBe(415);
});

test('a visitor over the limit gets 429 before any paid call is made', async () => {
  const limits = { perVisitor: 0, windowSeconds: 60, perDay: 100 };
  const res = await handleRecognize(post(JSON.stringify(body), { 'sec-fetch-site': 'same-origin' }), 'key', { localCounter: memoryCounter(), limits });
  expect(res.status).toBe(429);
  expect(await res.json()).toEqual({ error: 'busy' });
});

test('limits: per visitor in a window, per day for the whole app; the window ends', async () => {
  let t = Date.parse('2026-11-11T10:00:00Z');
  const now = () => t;
  const local = memoryCounter(now);
  const limits = { perVisitor: 2, windowSeconds: 60, perDay: 3 };
  const from = (ip: string) => new Request('http://x', { headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } });
  const check = (ip: string) => checkLimits(from(ip), { shared: null, local }, limits, now);
  expect(await check('1.1.1.1')).toBe('ok');
  expect(await check('1.1.1.1')).toBe('ok');
  expect(await check('1.1.1.1')).toBe('visitor');
  expect(await check('2.2.2.2')).toBe('ok');
  expect(await check('3.3.3.3')).toBe('day');
  t += 61_000;
  expect(await check('1.1.1.1')).toBe('day');
  expect(visitorOf(from('9.9.9.9'))).toBe('9.9.9.9');
});

test("when Redis fails the instance's own count still applies", async () => {
  const broken = { incr: async () => { throw new Error('down'); }, expire: async () => 1 };
  const local = memoryCounter();
  const limits = { perVisitor: 1, windowSeconds: 60, perDay: 10 };
  const req = new Request('http://x');
  expect(await checkLimits(req, { shared: broken, local }, limits)).toBe('ok');
  expect(await checkLimits(req, { shared: broken, local }, limits)).toBe('visitor');
});

test("Vercel gives the function time for the SDK's attempts", () => {
  const max = (vercel as { functions?: Record<string, { maxDuration?: number }> }).functions?.['api/recognize.ts']?.maxDuration ?? 0;
  expect(max * 1000).toBeGreaterThan(UPSTREAM_TIMEOUT_MS * (UPSTREAM_RETRIES + 1));
});

test('a lost expiry (connection dropped after INCR) never locks a visitor out: the next window is a new key', async () => {
  let t = Date.parse('2026-11-11T10:00:00Z');
  const now = () => t;
  const counts = new Map<string, number>();
  const noExpiry = { incr: async (k: string) => { counts.set(k, (counts.get(k) ?? 0) + 1); return counts.get(k)!; }, expire: async () => { throw new Error('dropped'); } };
  const limits = { perVisitor: 1, windowSeconds: 60, perDay: 100 };
  const req = new Request('http://x', { headers: { 'x-real-ip': '5.5.5.5' } });
  expect(await checkLimits(req, { shared: noExpiry, local: memoryCounter(now) }, limits, now)).toBe('ok');
  expect(await checkLimits(req, { shared: noExpiry, local: memoryCounter(now) }, limits, now)).toBe('visitor');
  t += 60_000;
  expect(await checkLimits(req, { shared: noExpiry, local: memoryCounter(now) }, limits, now)).toBe('ok');
});

test('visitors: Vercel headers first; an IPv6 address counts by its /64', () => {
  const at = (headers: Record<string, string>) => visitorOf(new Request('http://x', { headers }));
  expect(at({ 'x-vercel-forwarded-for': '7.7.7.7', 'x-forwarded-for': '1.1.1.1' })).toBe('7.7.7.7');
  expect(at({ 'x-forwarded-for': '2001:db8:0:1:aaaa::1' })).toBe(at({ 'x-forwarded-for': '2001:0db8:0000:0001:ffff:ffff:ffff:ffff' }));
  expect(at({ 'x-forwarded-for': '2001:db8::1' })).toBe('2001:db8:0:0::/64');
  expect(at({})).toBe('local');
});

test('a same-origin request reaches the limits; an oversized declared body is refused before it is read', async () => {
  const limits = { perVisitor: 0, windowSeconds: 60, perDay: 100 };
  const ok = JSON.stringify(body);
  expect((await handleRecognize(post(ok, { 'sec-fetch-site': 'same-origin' }), 'key', { localCounter: memoryCounter(), limits })).status).toBe(429);
  expect((await handleRecognize(post(ok), 'key', { localCounter: memoryCounter(), limits })).status).toBe(429);
  expect((await handleRecognize(post(ok, { 'content-length': '9000000' }), 'key', { localCounter: memoryCounter(), limits })).status).toBe(413);
});
