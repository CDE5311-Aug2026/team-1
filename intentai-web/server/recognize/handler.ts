// POST /api/recognize: does a hunt check-in photo show the detail the stop asks for? Claude looks at the photo.
// The app sends one downscaled JPEG (base64) and the stop's own words for the detail. Nothing is stored. Without
// ANTHROPIC_API_KEY the endpoint answers 503 and the game asks for another try later (never lets the stop pass).
import Anthropic from "@anthropic-ai/sdk";
import type { CounterLike } from "../usage/store.js";
import { DEFAULT_LIMITS, checkLimits, type RecognizeLimits } from "./limit.js";

export interface RecognizeRequest {
  /** What the stop asks you to photograph, in the story's words. */
  feature: string;
  /** The real place, to help the model judge the scene. */
  place: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  /** Base64, no data: prefix. */
  data: string;
}

export interface RecognizeResult {
  decision: "match" | "no-match" | "unsure";
  confidence: number;
  /** One short sentence the player sees. */
  reason: string;
}

/** About 3 MB of base64: a 1280 px JPEG is far below it, and Vercel's body limit is 4.5 MB. */
const MAX_DATA = 3_000_000;

const SCHEMA = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["match", "no-match", "unsure"] },
    confidence: { type: "number", description: "0 to 1: how sure you are of the decision." },
    reason: { type: "string", description: "One short sentence for the player, in plain English." },
  },
  required: ["decision", "confidence", "reason"],
  additionalProperties: false,
} as const;

const SYSTEM =
  "You check photos for a street treasure-hunt game in Singapore. The player was asked to photograph one visible " +
  "detail of a real building or place. Decide whether the photo plausibly shows that detail at that kind of place. " +
  "Answer match when the detail is clearly visible, no-match when it is clearly not (a different subject, a screen, a " +
  "blank or dark photo), and unsure otherwise. Be fair to ordinary phone photos taken from the street. The reason " +
  "must not reveal the answer to the puzzle; if it is a no-match, say briefly what to frame instead.";

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : "");

/** Validates what the browser sent. */
export function readRequest(body: unknown): RecognizeRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const feature = clip(b.feature, 400).trim();
  const place = clip(b.place, 160).trim();
  const mediaType = b.mediaType === "image/png" || b.mediaType === "image/webp" ? b.mediaType : b.mediaType === "image/jpeg" ? "image/jpeg" : null;
  const data = typeof b.data === "string" ? b.data : "";
  if (!feature || !mediaType || !data || data.length > MAX_DATA || !/^[A-Za-z0-9+/=]+$/.test(data)) return null;
  return { feature, place, mediaType, data };
}

/** SDK wait per attempt and retries: with Vercel's maxDuration (vercel.json, 60 s) they must fit 25 s x 2 + upload. */
export const UPSTREAM_TIMEOUT_MS = 25_000;
export const UPSTREAM_RETRIES = 1;

export interface RecognizeOptions {
  /** The shared count (Redis on Vercel; memoryCounter() on the single-process dev server). None: no photo is checked. */
  counter?: CounterLike | null;
  limits?: RecognizeLimits;
}

export async function handleRecognize(request: Request, apiKey: string | undefined, opts: RecognizeOptions = {}): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  if (request.method !== "POST") return json({ error: "method" }, 405);
  // Only the app's own pages: browsers send Sec-Fetch-Site on every fetch, so a missing header is refused too. A script
  // can still forge it, so the shared limits below are what bound the spend.
  if (request.headers.get("sec-fetch-site") !== "same-origin") return json({ error: "forbidden" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "send_json" }, 415);
  if (!apiKey) return json({ error: "not_configured" }, 503);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_DATA + 4_000) return json({ error: "too_large" }, 413);
  const text = await request.text();
  if (text.length > MAX_DATA + 4_000) return json({ error: "too_large" }, 413);
  let parsed: RecognizeRequest | null = null;
  try {
    parsed = readRequest(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed) return json({ error: "bad_request" }, 400);

  // Counted only once the request is valid, so a malformed post doesn't use up a visitor's checks.
  const verdict = await checkLimits(request, opts.counter ?? null, opts.limits ?? DEFAULT_LIMITS);
  if (verdict === "unavailable") return json({ error: "not_configured" }, 503);
  if (verdict !== "ok") return json({ error: verdict === "day" ? "daily_limit" : "busy" }, 429);

  const client = new Anthropic({ apiKey, timeout: UPSTREAM_TIMEOUT_MS, maxRetries: UPSTREAM_RETRIES });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: parsed.mediaType, data: parsed.data } },
            { type: "text", text: `Place: ${parsed.place || "a street in Singapore"}\nThe detail to photograph: ${parsed.feature}` },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return json({ error: "refused" }, 422);
    // Cut off before the JSON was finished: say so rather than failing on a half-written answer.
    if (response.stop_reason === "max_tokens") return json({ error: "incomplete" }, 502);
    const out = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const data = JSON.parse(out) as Partial<RecognizeResult>;
    const decision = data.decision === "match" || data.decision === "no-match" ? data.decision : "unsure";
    const confidence = typeof data.confidence === "number" && Number.isFinite(data.confidence) ? Math.max(0, Math.min(1, data.confidence)) : 0;
    return json({ decision, confidence, reason: clip(data.reason, 200) } satisfies RecognizeResult);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: "upstream" }, 502);
    return json({ error: "failed" }, 500);
  }
}
