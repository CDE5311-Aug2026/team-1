// Vercel function: POST /api/caption. Logic lives in server/caption so it can be tested on its own.
import { handleCaption } from "../server/caption/handler.js";

export function POST(request: Request): Promise<Response> {
  return handleCaption(request, process.env.ANTHROPIC_API_KEY);
}
