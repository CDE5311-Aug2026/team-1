// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest';
import { POST } from '../../api/track.js';
import { DELETE, GET } from '../../api/stats.js';

afterEach(() => vi.unstubAllEnvs());

// The Vercel entry points read process.env; without Redis they must say so, not crash.
test('Vercel functions answer 503 until storage and a password are configured', async () => {
  vi.stubEnv('KV_REST_API_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('ADMIN_PASSWORD', '');
  const body = JSON.stringify({ events: [{ uid: 'u', sid: 's', kind: 'page', name: 'Today', ms: 900, at: 1 }] });
  expect((await POST(new Request('http://x/api/track', { method: 'POST', body, headers: { 'content-type': 'application/json' } }))).status).toBe(503);
  expect((await GET(new Request('http://x/api/stats', { headers: { 'x-admin-password': 'p' } }))).status).toBe(503);
  expect((await DELETE(new Request('http://x/api/stats', { method: 'DELETE' }))).status).toBe(503);
});
