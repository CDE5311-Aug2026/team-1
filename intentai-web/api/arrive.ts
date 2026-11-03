// Vercel function: POST /api/arrive. Logic lives in server/arrive so it can be tested on its own.
import { handleArrive } from "../server/arrive/handler.js";

export function POST(request: Request): Promise<Response> {
  return handleArrive(request, process.env.ANTHROPIC_API_KEY);
}
