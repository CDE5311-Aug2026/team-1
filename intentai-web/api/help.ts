// Vercel function: POST /api/help (Help Center questions and feedback). Logic lives in server/help.
import { handleHelp } from '../server/help/handler.js';
import { redisFromEnv } from '../server/usage/store.js';

export function POST(request: Request): Promise<Response> {
  return handleHelp(request, { apiKey: process.env.ANTHROPIC_API_KEY, redis: redisFromEnv(process.env) });
}
