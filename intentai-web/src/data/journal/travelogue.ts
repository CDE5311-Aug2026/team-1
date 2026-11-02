// A day's travelogue for sharing: the set of pictures (your own photos first, then real photos of the places you went),
// a caption and hashtags. The caption comes from /api/caption (Claude) when the server has a key; otherwise it is
// written here from the day's facts, so sharing always works offline too.
import type { JournalDay, JournalEntry } from "./journal";
import { clockOf, dayParts } from "./journal";
import { sceneryIn } from "./placePhotos";

export type Platform = "wechat" | "instagram" | "x";
export type Tone = "warm" | "playful" | "poetic";

export interface Frame {
  id: string;
  src: string;
  title: string;
  /** Your own photo (not a photo of the place from Commons). */
  own: boolean;
  /** A place near where you went, not one you went to (fills the set). */
  nearby?: boolean;
  /** Who took it, for photos that are not yours. */
  credit?: string;
  area?: string;
}

export interface PlatformSpec {
  label: string;
  /** Pictures per post. */
  max: number;
  /** Exported picture size. */
  w: number;
  h: number;
  /** Caption length the platform shows without cutting. */
  chars: number;
}

export const PLATFORMS: Record<Platform, PlatformSpec> = {
  wechat: { label: "WeChat", max: 9, w: 1080, h: 1080, chars: 220 },
  instagram: { label: "Instagram", max: 10, w: 1080, h: 1350, chars: 600 },
  x: { label: "X", max: 4, w: 1200, h: 1200, chars: 200 },
};

export const TONES: { id: Tone; label: string }[] = [
  { id: "warm", label: "Warm" },
  { id: "playful", label: "Playful" },
  { id: "poetic", label: "Poetic" },
];

const PLACE_KINDS = new Set(["visit", "checkin", "stamp"]);

/**
 * Everything worth a picture that day: own photos first (in the order taken), then one real photo per place, then —
 * when that is fewer than `fill` — real photos of other places in the same areas.
 */
export function framesOf(day: JournalDay, fill = 0): Frame[] {
  const out: Frame[] = [];
  const seen = new Set<string>();
  const push = (f: Frame) => {
    if (seen.has(f.src)) return;
    seen.add(f.src);
    out.push(f);
  };
  for (const e of day.entries)
    if (e.kind === "photo" && e.image)
      push({ id: e.id, src: e.image, title: e.title, own: true });
  for (const e of day.entries)
    if (e.real)
      push({
        id: e.id,
        src: e.real.src,
        title: placeOf(e),
        own: false,
        credit: e.real.credit,
        area: e.area,
      });
  if (out.length < fill) {
    const areas = [
      ...new Set(day.entries.flatMap((e) => (e.area ? [e.area] : []))),
    ];
    for (const f of sceneryIn(areas, seen, fill - out.length))
      push({ ...f, own: false, nearby: true });
  }
  return out;
}

const placeOf = (e: JournalEntry) => e.title.replace(/^Finished /, "");

export interface DayFacts {
  date: string;
  weekday: string;
  areas: string[];
  places: { name: string; kind: string }[];
  stories: string[];
  photos: string[];
  hours?: string;
}

export function factsOf(day: JournalDay): DayFacts {
  const { num, month } = dayParts(day.day);
  const [y, m, d] = day.day.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
  });
  const places: { name: string; kind: string }[] = [];
  const names = new Set<string>();
  const areas: string[] = [];
  for (const e of day.entries) {
    if (e.area && !areas.includes(e.area)) areas.push(e.area);
    if (!PLACE_KINDS.has(e.kind) || names.has(e.title)) continue;
    names.add(e.title);
    places.push({
      name: e.title,
      kind: e.kind === "stamp" ? "Hunt stop" : e.tag,
    });
  }
  return {
    date: `${num} ${month}`,
    weekday,
    areas,
    places,
    stories: day.entries
      .filter((e) => e.kind === "finish")
      .map((e) => placeOf(e)),
    photos: day.entries
      .filter((e) => e.kind === "photo" && e.title !== "A photo")
      .map((e) => e.title),
    hours:
      day.from !== undefined &&
      day.to !== undefined &&
      day.to - day.from > 30 * 60_000
        ? `${clockOf(day.from)}–${clockOf(day.to)}`
        : undefined,
  };
}

/** "Tampines" → "Tampines"; "Bukit Timah" → "BukitTimah"; "Hawker centre" → "HawkerCentre". */
const camel = (s: string) =>
  s
    .replace(/&/g, "And")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");

const KIND_TAGS: [RegExp, string][] = [
  [/mosque|church|temple|cathedral|shrine|synagogue|gurdwara/i, "SacredSpaces"],
  [/hawker|food|restaurant|cafe|kopitiam/i, "SGFood"],
  [/museum|gallery|heritage|monument/i, "SGHeritage"],
  [/park|garden|reserve|beach|nature/i, "GreenSG"],
  [/hunt stop|check-in|story/i, "CityHunt"],
];

export function hashtagsOf(facts: DayFacts): string[] {
  const tags = ["Singapore", "FindSG"];
  for (const a of facts.areas.slice(0, 3)) tags.push(camel(a));
  for (const p of facts.places)
    for (const [re, tag] of KIND_TAGS)
      if (re.test(p.kind) && !tags.includes(tag)) tags.push(tag);
  if (facts.stories.length) tags.push("StoriesOfSG");
  tags.push("ExploreSingapore");
  return [...new Set(tags)].slice(0, 8);
}

const list = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
const pick = <T>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];

/** The caption written on the device: from the day's facts only, in three tones and three rewrites each. */
export function writeCaption(
  facts: DayFacts,
  tone: Tone,
  platform: Platform,
  seed = 0,
): string {
  const named = facts.places
    .slice(0, platform === "x" ? 2 : 3)
    .map((p) => p.name);
  const more = facts.places.length - named.length;
  const where = facts.areas.length
    ? list(facts.areas.slice(0, 2))
    : "Singapore";
  const places =
    more > 0
      ? `${list([...named, `${plural(more, "more place")}`])}`
      : list(named);
  const story = facts.stories[0];
  const photo = facts.photos[0];
  const n = facts.places.length;

  const lines: Record<Tone, string[][]> = {
    warm: [
      [
        `${facts.weekday} in ${where}. ${n ? `Walked to ${places}.` : ""}`,
        story ? `Finished “${story}” on the way.` : "",
        photo
          ? `Best moment: ${photo.toLowerCase()}.`
          : `${plural(n, "place")} I had never really looked at before.`,
      ],
      [
        `Spent ${facts.weekday} exploring ${where} with no plan and good shoes.`,
        n ? `${places} — each with its own story.` : "",
        story ? `And “${story}” is solved.` : "Already planning the next walk.",
      ],
      [
        `Today's map: ${where}.`,
        n ? `${plural(n, "stop")}, starting at ${named[0]}.` : "",
        facts.hours
          ? `Out from ${facts.hours}, and it went by fast.`
          : "A good day to be curious.",
      ],
    ],
    playful: [
      [
        `Side quest unlocked: ${where} 🗺️`,
        n ? `${places} ✅` : "",
        story
          ? `Cracked “${story}” too. Detective mode: on.`
          : "Legs tired, camera roll full.",
      ],
      [
        `${plural(n, "place")}, one ${facts.weekday}, zero regrets ✨`,
        named.length ? `Highlights: ${list(named)}.` : "",
        photo
          ? `Exhibit A: ${photo.toLowerCase()} 📸`
          : "Who knew the neighbourhood had this much going on?",
      ],
      [
        `POV: you said “just a short walk” in ${where} 😅`,
        n ? `…and ended up at ${places}.` : "",
        story ? `Bonus: “${story}” solved 🔍` : "Would do it again tomorrow.",
      ],
    ],
    poetic: [
      [
        `${where}, ${facts.date}.`,
        n
          ? `${list(named)} — places that were always here, waiting to be noticed.`
          : "",
        story
          ? `A story closed: “${story}”.`
          : "The city is quieter than it looks.",
      ],
      [
        `I walked ${where} slowly today.`,
        named.length ? `${named[0]} first, then the rest of the way.` : "",
        photo ? `${photo}.` : "Some streets only speak if you stop.",
      ],
      [
        `Notes from ${facts.weekday}:`,
        n ? `${plural(n, "door")} opened in ${where}.` : "",
        story
          ? `One old story, “${story}”, finally read to its end.`
          : "Everything old here is still in use.",
      ],
    ],
  };
  const text = pick(lines[tone], seed)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const limit = PLATFORMS[platform].chars;
  return text.length <= limit
    ? text
    : `${text.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

/** Asks the server for a caption; null when it has no key or fails (then the device writes one). */
export async function aiCaption(
  facts: DayFacts,
  tone: Tone,
  platform: Platform,
  signal?: AbortSignal,
): Promise<{ caption: string; tags: string[] } | null> {
  try {
    const res = await fetch("/api/caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform, tone, day: facts }),
      signal,
    });
    if (
      !res.ok ||
      !res.headers.get("content-type")?.includes("application/json")
    )
      return null;
    const data = (await res.json()) as { caption?: string; tags?: string[] };
    return data.caption
      ? { caption: data.caption, tags: data.tags ?? [] }
      : null;
  } catch {
    return null;
  }
}

/** The text that goes with the pictures: caption, then the hashtags that are on (as many as fit under `max`). */
export function postText(
  caption: string,
  tags: string[],
  max = Infinity,
): string {
  const kept = [...tags];
  const join = () => {
    const t = kept.map((x) => `#${x}`).join(" ");
    return t ? `${caption}\n\n${t}` : caption;
  };
  while (kept.length && [...join()].length > max) kept.pop();
  return join();
}
