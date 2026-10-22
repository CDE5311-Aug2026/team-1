import { Redis } from '@upstash/redis';
import { createClient } from 'redis';
import { appendFile, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { UsageEvent } from '../../src/usage/event.js';

/** Where usage events live: a file locally, Redis on Vercel (Redis Cloud over TCP, or Upstash over REST). */
export interface UsageStore {
  readonly kind: 'memory' | 'file' | 'redis';
  append(events: UsageEvent[]): Promise<void>;
  all(): Promise<UsageEvent[]>;
  clear(): Promise<void>;
}

export function memoryStore(): UsageStore {
  let events: UsageEvent[] = [];
  return {
    kind: 'memory',
    append: async (batch) => void events.push(...batch),
    all: async () => [...events],
    clear: async () => void (events = []),
  };
}

/** JSON lines, one event per line. */
export function fileStore(path: string): UsageStore {
  return {
    kind: 'file',
    async append(batch) {
      await mkdir(dirname(path), { recursive: true });
      await appendFile(path, batch.map((event) => JSON.stringify(event) + '\n').join(''));
    },
    async all() {
      const text = await readFile(path, 'utf8').catch(() => '');
      // A torn last line (server killed mid-write) is skipped, not fatal.
      return text.split('\n').flatMap((line) => {
        try {
          return line.trim() === '' ? [] : [JSON.parse(line) as UsageEvent];
        } catch {
          return [];
        }
      });
    },
    clear: () => rm(path, { force: true }),
  };
}

/** The slice of the Upstash client the store uses, so tests can pass a fake. */
export interface RedisLike {
  rpush(key: string, ...values: string[]): Promise<unknown>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  lrange(key: string, start: number, stop: number): Promise<unknown[]>;
  del(key: string): Promise<unknown>;
}

const KEY = 'intentai:usage';
/** Oldest events are dropped past this many, so a flood of public posts can't grow the list forever. */
export const MAX_EVENTS = 200_000;

export function redisStore(client: RedisLike): UsageStore {
  return {
    kind: 'redis',
    async append(batch) {
      await client.rpush(KEY, ...batch.map((event) => JSON.stringify(event)));
      await client.ltrim(KEY, -MAX_EVENTS, -1);
    },
    async all() {
      const items = await client.lrange(KEY, 0, -1);
      // Upstash may hand back parsed JSON even with deserialization off; accept both.
      return items.map((item) => (typeof item === 'string' ? JSON.parse(item) : item) as UsageEvent);
    },
    async clear() {
      await client.del(KEY);
    },
  };
}

/**
 * A Redis server over TCP (REDIS_URL, e.g. Vercel's Redis Cloud integration). One connection per function instance,
 * opened on first use and kept for the next requests while the instance is warm; a failed connect is retried next time.
 */
export function tcpRedis(url: string, connect: (url: string) => Promise<TcpClient> = connectTcp): RedisLike {
  let client: Promise<TcpClient> | null = null;
  const get = () => {
    client ??= connect(url).catch((error: unknown) => {
      client = null;
      throw error;
    });
    return client;
  };
  return {
    rpush: async (key, ...values) => (await get()).rPush(key, values),
    ltrim: async (key, start, stop) => (await get()).lTrim(key, start, stop),
    lrange: async (key, start, stop) => (await get()).lRange(key, start, stop),
    del: async (key) => (await get()).del(key),
  };
}

/** The slice of node-redis the TCP store uses. */
export interface TcpClient {
  rPush(key: string, values: string[]): Promise<unknown>;
  lTrim(key: string, start: number, stop: number): Promise<unknown>;
  lRange(key: string, start: number, stop: number): Promise<unknown[]>;
  del(key: string): Promise<unknown>;
}

async function connectTcp(url: string): Promise<TcpClient> {
  const c = createClient({ url, socket: { connectTimeout: 5000, reconnectStrategy: false } });
  c.on('error', () => undefined); // a dropped connection fails the request in hand; the next one reconnects
  await c.connect();
  return c as unknown as TcpClient;
}

/**
 * Upstash over REST when its env pair is set (Vercel KV / Upstash integration), else a Redis server from REDIS_URL
 * (Redis Cloud integration); otherwise null (not connected).
 */
export function storeFromEnv(env: Record<string, string | undefined>): UsageStore | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisStore(new Redis({ url, token, automaticDeserialization: false }));
  if (env.REDIS_URL && /^rediss?:\/\//.test(env.REDIS_URL)) return redisStore(tcpRedis(env.REDIS_URL));
  return null;
}
