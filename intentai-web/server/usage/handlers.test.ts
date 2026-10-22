// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import type { UsageEvent } from '../../src/usage/event.js';
import { handleStats, handleTrack, type HandlerConfig } from './handlers.js';
import { MAX_EVENTS, fileStore, memoryStore, redisStore, storeFromEnv, tcpRedis, type RedisLike, type TcpClient } from './store.js';

const EVENT: UsageEvent = { uid: 'u1', sid: 's1', kind: 'page', name: 'Today', ms: 1200, at: 1 };
const PASSWORD = 'secret';
// No failure delay in tests.
const cfgDefaults = { failDelayMs: 0 };

const track = (body: string, cfg: HandlerConfig, headers: Record<string, string> = {}) =>
  handleTrack(
    new Request('http://x/api/track', { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers } }),
    cfg,
  );
const stats = (cfg: HandlerConfig, method = 'GET', password: string | null = PASSWORD) =>
  handleStats(new Request('http://x/api/stats', { method, headers: password === null ? {} : { 'x-admin-password': password } }), cfg);

describe('track', () => {
  test('stores a valid batch (204)', async () => {
    const store = memoryStore();
    const res = await track(JSON.stringify({ events: [EVENT] }), { ...cfgDefaults, store, password: PASSWORD });
    expect(res.status).toBe(204);
    expect(await store.all()).toEqual([EVENT]);
  });

  test('rejects junk JSON, invalid events and oversized bodies, storing nothing', async () => {
    const store = memoryStore();
    const cfg = { ...cfgDefaults, store, password: PASSWORD };
    expect((await track('{not json', cfg)).status).toBe(400);
    expect((await track(JSON.stringify({ events: [{ ...EVENT, ms: 5 }] }), cfg)).status).toBe(400);
    // 16 KB of multi-byte characters: the limit counts bytes, not characters.
    expect((await track(JSON.stringify({ pad: '›'.repeat(6000), events: [EVENT] }), cfg)).status).toBe(413);
    expect(await store.all()).toEqual([]);
  });

  test('wrong method gets 405', async () => {
    const res = await handleTrack(new Request('http://x/api/track'), { ...cfgDefaults, store: memoryStore(), password: PASSWORD });
    expect(res.status).toBe(405);
  });

  test('refuses cross-site posts and non-JSON bodies', async () => {
    const store = memoryStore();
    const body = JSON.stringify({ events: [EVENT] });
    expect((await track(body, { ...cfgDefaults, store, password: PASSWORD }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect((await track(body, { ...cfgDefaults, store, password: PASSWORD }, { 'content-type': 'text/plain' })).status).toBe(415);
    expect((await track(body, { ...cfgDefaults, store, password: PASSWORD }, { 'sec-fetch-site': 'same-origin' })).status).toBe(204);
    expect(await store.all()).toHaveLength(1);
  });

  test('a declared oversized body is refused before reading it', async () => {
    const res = await track(JSON.stringify({ events: [EVENT] }), { ...cfgDefaults, store: memoryStore(), password: PASSWORD }, { 'content-length': '999999' });
    expect(res.status).toBe(413);
  });

  test('answers 503 when storage is not connected', async () => {
    const res = await track(JSON.stringify({ events: [EVENT] }), { ...cfgDefaults, store: null, password: PASSWORD });
    expect(res.status).toBe(503);
    expect(await res.text()).toMatch(/storage not connected/i);
  });
});

describe('stats', () => {
  test('needs the right password', async () => {
    const cfg = { ...cfgDefaults, store: memoryStore(), password: PASSWORD };
    expect((await stats(cfg, 'GET', null)).status).toBe(401);
    expect((await stats(cfg, 'GET', 'nope')).status).toBe(401);
  });

  test('returns every event, never cached', async () => {
    const store = memoryStore();
    await store.append([EVENT]);
    const res = await stats({ ...cfgDefaults, store, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ events: [EVENT] });
  });

  test('answers 503 without a configured password or storage, but only to the right password', async () => {
    expect((await stats({ ...cfgDefaults, store: memoryStore(), password: undefined })).status).toBe(503);
    expect((await stats({ ...cfgDefaults, store: null, password: PASSWORD })).status).toBe(503);
    // Without the password, nobody learns whether storage is connected.
    expect((await stats({ ...cfgDefaults, store: null, password: PASSWORD }, 'GET', 'nope')).status).toBe(401);
  });

  test('DELETE clears; other methods get 405', async () => {
    const store = memoryStore();
    await store.append([EVENT]);
    expect((await stats({ ...cfgDefaults, store, password: PASSWORD }, 'DELETE')).status).toBe(204);
    expect(await store.all()).toEqual([]);
    expect((await stats({ ...cfgDefaults, store, password: PASSWORD }, 'PUT')).status).toBe(405);
  });
});

describe('stores', () => {
  let dir = '';
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  test('fileStore skips a torn line instead of failing every read', async () => {
    dir = mkdtempSync(join(tmpdir(), 'usage-'));
    const path = join(dir, 'usage.jsonl');
    writeFileSync(path, `${JSON.stringify(EVENT)}\n{"uid":"u1","si`);
    expect(await fileStore(path).all()).toEqual([EVENT]);
  });

  test('fileStore round-trips and creates its folder', async () => {
    dir = mkdtempSync(join(tmpdir(), 'usage-'));
    const store = fileStore(join(dir, 'nested', 'usage.jsonl'));
    expect(await store.all()).toEqual([]);
    await store.append([EVENT, { ...EVENT, name: 'Ask' }]);
    expect((await fileStore(join(dir, 'nested', 'usage.jsonl')).all()).map((e) => e.name)).toEqual(['Today', 'Ask']);
    await store.clear();
    expect(await store.all()).toEqual([]);
  });

  test('redisStore reads strings or already-parsed objects', async () => {
    const list: unknown[] = [];
    let trimmedTo = 0;
    const client: RedisLike = {
      rpush: async (_key, ...values) => list.push(...values),
      ltrim: async (_key, start) => void (trimmedTo = start),
      lrange: async () => [...list, { ...EVENT, name: 'Parsed' }],
      del: async () => (list.length = 0),
    };
    const store = redisStore(client);
    await store.append([EVENT]);
    expect((await store.all()).map((e) => e.name)).toEqual(['Today', 'Parsed']);
    // The list is capped so a flood of posts can't grow it forever.
    expect(trimmedTo).toBe(-MAX_EVENTS);
  });

  test('a Redis server from REDIS_URL: one connection, reused; a failed connect is retried', async () => {
    const lists = new Map<string, string[]>();
    const fake: TcpClient = {
      rPush: async (k, v) => lists.set(k, [...(lists.get(k) ?? []), ...v]),
      lTrim: async (k, a, b) => lists.set(k, (lists.get(k) ?? []).slice(a < 0 ? Math.max(0, (lists.get(k) ?? []).length + a) : a, b === -1 ? undefined : b + 1)),
      lRange: async (k) => lists.get(k) ?? [],
      del: async (k) => lists.delete(k),
    };
    let calls = 0;
    const connect = async () => {
      calls++;
      if (calls === 1) throw new Error('down');
      return fake;
    };
    const store = redisStore(tcpRedis('redis://x', connect));
    const e = { uid: 'u', sid: 's', kind: 'page' as const, name: 'Today', ms: 1000, at: 1 };
    await expect(store.append([e])).rejects.toThrow('down');
    await store.append([e]);
    await store.append([e]);
    expect(await store.all()).toHaveLength(2);
    expect(calls).toBe(2);
  });

  test('storeFromEnv picks Redis for either env pair, or REDIS_URL, else null', () => {
    expect(storeFromEnv({ REDIS_URL: 'redis://default:x@redis.example:6379' })?.kind).toBe('redis');
    expect(storeFromEnv({ REDIS_URL: 'https://not-redis' })).toBeNull();
    expect(storeFromEnv({})).toBeNull();
    expect(storeFromEnv({ KV_REST_API_URL: 'https://a.upstash.io', KV_REST_API_TOKEN: 't' })?.kind).toBe('redis');
    expect(storeFromEnv({ UPSTASH_REDIS_REST_URL: 'https://a.upstash.io', UPSTASH_REDIS_REST_TOKEN: 't' })?.kind).toBe('redis');
  });
});
