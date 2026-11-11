// Vercel function: POST /api/recognize (a hunt check-in photo). Logic lives in server/recognize so it can be tested on its own.
import { handleRecognize } from "../server/recognize/handler.js";

export function POST(request: Request): Promise<Response> {
  return handleRecognize(request, process.env.ANTHROPIC_API_KEY);
}
