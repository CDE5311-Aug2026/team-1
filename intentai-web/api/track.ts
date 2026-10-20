// Vercel function: POST /api/track. Logic lives in server/usage so the local dev server shares it.
import { handleTrack } from '../server/usage/handlers.js';
import { storeFromEnv } from '../server/usage/store.js';

export function POST(request: Request): Promise<Response> {
  return handleTrack(request, { store: storeFromEnv(process.env), password: process.env.ADMIN_PASSWORD });
}
