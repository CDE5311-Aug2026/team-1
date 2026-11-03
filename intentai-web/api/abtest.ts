// Vercel function: /api/abtest (the A/B test desk at /test). Logic lives in server/abtest.
import { handleAbTest } from '../server/abtest/handler.js';
import { redisFromEnv } from '../server/usage/store.js';

const config = () => ({ redis: redisFromEnv(process.env), password: process.env.ADMIN_PASSWORD });

export const GET = (request: Request): Promise<Response> => handleAbTest(request, config());
export const POST = (request: Request): Promise<Response> => handleAbTest(request, config());
export const DELETE = (request: Request): Promise<Response> => handleAbTest(request, config());
