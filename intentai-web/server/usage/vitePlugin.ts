import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';
import { handleStats, handleTrack, type HandlerConfig } from './handlers.js';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { handleCaption } from '../caption/handler.js';
import { handleHelp } from '../help/handler.js';
import { handleRecognize } from '../recognize/handler.js';
import { fileStore, redisFromEnv, type RedisLike } from './store.js';

/** Help feedback on this machine: one JSON line per note (only rpush is used locally). */
function fileList(path: string): RedisLike {
  return {
    async rpush(_key, ...values) {
      await mkdir(dirname(path), { recursive: true });
      await appendFile(path, values.map((v) => v + '\n').join(''));
    },
    ltrim: async () => undefined,
    lrange: async () => [],
    del: async () => undefined,
  };
}

export const LOCAL_ADMIN_PASSWORD = 'intentai-local';

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(`http://localhost${req.url ?? '/'}`, {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  });
}

async function send(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

/**
 * Serves /api/track and /api/stats from the dev and preview servers with the same handlers Vercel
 * runs, storing events in a local file. Lets the whole feature work without a Vercel account.
 */
export function usageApiPlugin(env: Record<string, string | undefined>): Plugin {
  const cfg: HandlerConfig = {
    store: fileStore(env.USAGE_FILE || '.data/usage.jsonl'),
    password: env.ADMIN_PASSWORD || LOCAL_ADMIN_PASSWORD,
  };
  const help = {
    apiKey: env.ANTHROPIC_API_KEY,
    redis: redisFromEnv(env) ?? fileList(env.FEEDBACK_FILE || '.data/feedback.jsonl'),
  };
  // Photo-check limits count in Redis when set, else in this server's memory.
  const recognize = { counter: redisFromEnv(env) };
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const path = (req.url ?? '').split('?')[0];
    const handler: ((request: Request) => Promise<Response>) | null =
      path === '/api/track'
        ? (r) => handleTrack(r, cfg)
        : path === '/api/stats'
          ? (r) => handleStats(r, cfg)
          : path === '/api/help'
            ? (r) => handleHelp(r, help)
            : path === '/api/caption' && req.method === 'POST'
              ? (r) => handleCaption(r, env.ANTHROPIC_API_KEY)
            : path === '/api/recognize' && req.method === 'POST'
              ? (r) => handleRecognize(r, env.ANTHROPIC_API_KEY, recognize)
              : null;
    if (!handler) return next();
    toRequest(req)
      .then(handler)
      .then((response) => send(res, response))
      .catch(next);
  };
  // The local default password is only safe on this machine; say so when the server is on the network.
  const warnIfExposed = (host: string | boolean | undefined) => {
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !env.ADMIN_PASSWORD) {
      console.warn(`[usage] /admin uses the local password "${LOCAL_ADMIN_PASSWORD}" on the network. Set ADMIN_PASSWORD in .env.local.`);
    }
  };
  return {
    name: 'intentai-usage-api',
    configureServer(server) {
      warnIfExposed(server.config.server.host);
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      warnIfExposed(server.config.preview.host);
      server.middlewares.use(middleware);
    },
  };
}
