// Vercel function: GET and DELETE /api/stats (admin password required). Logic lives in server/usage.
import { handleStats } from '../server/usage/handlers.js';
import { storeFromEnv } from '../server/usage/store.js';

const config = () => ({ store: storeFromEnv(process.env), password: process.env.ADMIN_PASSWORD });

export function GET(request: Request): Promise<Response> {
  return handleStats(request, config());
}

export function DELETE(request: Request): Promise<Response> {
  return handleStats(request, config());
}
