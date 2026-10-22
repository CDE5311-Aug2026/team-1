import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';
import { handleStats, handleTrack, type HandlerConfig } from './handlers.js';
import { fileStore } from './store.js';

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
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const path = (req.url ?? '').split('?')[0];
    const handler = path === '/api/track' ? handleTrack : path === '/api/stats' ? handleStats : null;
    if (!handler) return next();
    toRequest(req)
      .then((request) => handler(request, cfg))
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
