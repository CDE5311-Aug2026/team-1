// POST /api/arrive: does this photo show the stop the player says they are at? Claude looks at one photo (downscaled
// on the phone) against the stop's name, address and what can be seen there, and answers here / not-here / unsure with
// one short reason. The photo is not stored. Without ANTHROPIC_API_KEY the endpoint answers 503 and the game checks
// the player in on their word (src/findsg/app/game/ArrivalCamera.jsx).
import Anthropic from "@anthropic-ai/sdk";

export interface ArriveRequest {
  image: { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };
  place: { name: string; address: string; look: string };
}

const SCHEMA = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["here", "not-here", "unsure"] },
    confidence: { type: "number", description: "0 to 1: how sure the decision is." },
    reason: {
      type: "string",
      description: "One short sentence to the player (second person), naming what in the photo decided it.",
    },
  },
  required: ["decision", "confidence", "reason"],
  additionalProperties: false,
} as const;

const SYSTEM =
  "You check arrivals for FindSG, a walking story game in Singapore. The player says they are standing at a named " +
  "place and sends one photo taken there. Answer 'here' when the photo plausibly shows that place or the street right " +
  "around it: matching facade, architecture, signage, street furniture or setting. Answer 'not-here' when it clearly " +
  "shows somewhere else, an indoor room unrelated to the place, a screen or a printout, or nothing of a place at all. " +
  "Answer 'unsure' when the photo is too dark, blurred or close-up to tell. Judge only the place: never describe or " +
  "identify people. Be fair to ordinary phone photos taken from the street.";

const MAX_BASE64 = 2_800_000; // about 2 MB of image
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : "");

/** Validates and trims what the phone sent. */
export function readRequest(body: unknown): ArriveRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const img = b.image as Record<string, unknown> | undefined;
  const place = b.place as Record<string, unknown> | undefined;
  if (!img || !place) return null;
  const mediaType = img.mediaType === "image/png" || img.mediaType === "image/webp" ? img.mediaType : img.mediaType === "image/jpeg" ? "image/jpeg" : null;
  const data = typeof img.data === "string" ? img.data : "";
  if (!mediaType || !data || data.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(data)) return null;
  const name = clip(place.name, 120).trim();
  if (!name) return null;
  return { image: { mediaType, data }, place: { name, address: clip(place.address, 200).trim(), look: clip(place.look, 300).trim() } };
}

export async function handleArrive(request: Request, apiKey: string | undefined): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  if (!apiKey) return json({ error: "not_configured" }, 503);
  const text = await request.text();
  if (text.length > MAX_BASE64 + 4_000) return json({ error: "too_large" }, 413);
  let parsed: ArriveRequest | null = null;
  try {
    parsed = readRequest(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed) return json({ error: "bad_request" }, 400);

  const { image, place } = parsed;
  const client = new Anthropic({ apiKey, timeout: 25_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
            {
              type: "text",
              text:
                `The player says they are at: ${place.name}` +
                (place.address ? `, ${place.address}` : "") +
                ".\n" +
                (place.look ? `What can be seen there: ${place.look}\n` : "") +
                "Is this photo taken at that place?",
            },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return json({ error: "refused" }, 422);
    const out = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const data = JSON.parse(out) as { decision?: unknown; confidence?: unknown; reason?: unknown };
    const decision = data.decision === "here" || data.decision === "not-here" ? data.decision : "unsure";
    const confidence = typeof data.confidence === "number" && Number.isFinite(data.confidence) ? Math.max(0, Math.min(1, data.confidence)) : 0;
    return json({ decision, confidence, reason: clip(data.reason, 200).trim() });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: "upstream" }, 502);
    return json({ error: "failed" }, 500);
  }
}
