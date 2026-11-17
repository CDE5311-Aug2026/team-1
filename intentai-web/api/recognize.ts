// Vercel function: POST /api/recognize (a hunt check-in photo). Logic lives in server/recognize so it can be tested on its own.
// Its time limit (maxDuration) is set in vercel.json.
import { handleRecognize } from "../server/recognize/handler.js";
import { redisFromEnv } from "../server/usage/store.js";

const counter = redisFromEnv(process.env);

export function POST(request: Request): Promise<Response> {
  return handleRecognize(request, process.env.ANTHROPIC_API_KEY, { counter });
}
