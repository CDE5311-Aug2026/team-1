// POST /api/caption: a short travel-post caption and hashtags for one day of exploring, written by Claude.
// The app sends only a summary of the day (place names, kinds, areas, own photo captions). Without ANTHROPIC_API_KEY
// the endpoint answers 503 and the app writes the caption itself (src/data/journal/travelogue.ts).
import Anthropic from "@anthropic-ai/sdk";

export interface CaptionDay {
  date: string;
  weekday: string;
  areas: string[];
  places: { name: string; kind: string }[];
  stories: string[];
  photos: string[];
  hours?: string;
}

export interface CaptionRequest {
  platform: "wechat" | "instagram" | "x";
  tone: "warm" | "playful" | "poetic";
  day: CaptionDay;
}

const LIMITS = { wechat: 220, instagram: 600, x: 200 } as const;
const TONES = {
  warm: "warm and personal, like a note to friends",
  playful: "light, playful and upbeat, with one or two fitting emoji",
  poetic: "quiet and observant, a little literary, no emoji",
} as const;

const SCHEMA = {
  type: "object",
  properties: {
    caption: {
      type: "string",
      description: "The post text, without hashtags.",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Hashtags without the # sign, CamelCase, no spaces.",
    },
  },
  required: ["caption", "tags"],
  additionalProperties: false,
} as const;

const SYSTEM =
  "You write social posts for people exploring Singapore with the FindSG app. Write in English, first person, " +
  "about the day described. Use only the places, areas and details given: never invent events, food, people or " +
  "weather. Mention two to four of the places by name and say what kind of day it was. No hashtags inside the caption.";

const clip = (s: unknown, n: number) =>
  typeof s === "string" ? s.slice(0, n) : "";
const list = (a: unknown, n: number, len: number) =>
  Array.isArray(a)
    ? a
        .slice(0, n)
        .map((s) => clip(s, len))
        .filter(Boolean)
    : [];

/** Validates and trims what the browser sent, so the prompt stays small and plain. */
export function readRequest(body: unknown): CaptionRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const platform =
    b.platform === "instagram" || b.platform === "x"
      ? b.platform
      : b.platform === "wechat"
        ? "wechat"
        : null;
  const tone = b.tone === "playful" || b.tone === "poetic" ? b.tone : "warm";
  const d = b.day as Record<string, unknown> | undefined;
  if (!platform || !d) return null;
  const places = Array.isArray(d.places)
    ? d.places.slice(0, 24).flatMap((p) =>
        p && typeof p === "object"
          ? [
              {
                name: clip((p as { name?: unknown }).name, 80),
                kind: clip((p as { kind?: unknown }).kind, 40),
              },
            ]
          : [],
      )
    : [];
  if (
    !places.length &&
    !list(d.stories, 8, 80).length &&
    !list(d.photos, 9, 80).length
  )
    return null;
  return {
    platform,
    tone,
    day: {
      date: clip(d.date, 20),
      weekday: clip(d.weekday, 12),
      areas: list(d.areas, 8, 40),
      places,
      stories: list(d.stories, 8, 80),
      photos: list(d.photos, 9, 80),
      hours: clip(d.hours, 20) || undefined,
    },
  };
}

export async function handleCaption(
  request: Request,
  apiKey: string | undefined,
): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  if (!apiKey) return json({ error: "not_configured" }, 503);
  const text = await request.text();
  if (text.length > 12_000) return json({ error: "too_large" }, 413);
  let parsed: CaptionRequest | null = null;
  try {
    parsed = readRequest(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed) return json({ error: "bad_request" }, 400);

  const { platform, tone, day } = parsed;
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
          content:
            `Write a ${platform === "x" ? "post for X" : platform === "instagram" ? "post for Instagram" : "WeChat Moments post"} ` +
            `in a tone that is ${TONES[tone]}. At most ${LIMITS[platform]} characters. Then give 5 to 8 hashtags ` +
            `(always include Singapore and FindSG; add the areas and kinds of place).\n\nThe day:\n${JSON.stringify(day)}`,
        },
      ],
    });
    if (response.stop_reason === "refusal")
      return json({ error: "refused" }, 422);
    const out = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("");
    const data = JSON.parse(out) as { caption?: unknown; tags?: unknown };
    const caption = clip(data.caption, LIMITS[platform] + 40).trim();
    const tags = list(data.tags, 10, 30)
      .map((t) => t.replace(/[^\p{L}\p{N}_]/gu, ""))
      .filter(Boolean);
    if (!caption) return json({ error: "empty" }, 502);
    return json({ caption, tags });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError)
      return json({ error: "busy" }, 429);
    if (err instanceof Anthropic.APIError)
      return json({ error: "upstream" }, 502);
    return json({ error: "failed" }, 500);
  }
}
