// Where Hunt has taken you: stops you checked in at on site, read straight from the saved games. Remote play is kept
// apart and never counts. No game code here, so Passport and Privacy can count stamps without loading the game.
export interface HuntVisit {
  story: string;
  stop: string;
  /** YYYY-MM-DD; the short story saves no time. */
  on?: string;
}

/** Each story's area, as the story itself states it; Balestier isn't placed in a catalogue area, so it stands alone. */
export const HUNT_AREAS: Readonly<Record<string, string>> = {
  'only-one-missing': 'sg-kampong-glam',
  short: 'sg-kampong-glam',
  'telok-ayer': 'sg-chinatown',
  'kampong-gelam': 'sg-kampong-glam',
  balestier: 'hunt-balestier',
  'civic-f1': 'sg-marina-bay',
};
export const HUNT_ONLY_AREAS = [{ id: 'hunt-balestier', name: 'Balestier' }] as const;

export const SHORT_STORY_SAVE = 'findsg-short-v2:gold-under-glass:manual';
export const SHORT_STOPS = { arrival1: '101 Jalan Sultan', arrival2: 'Sultan Mosque' } as const;
const ROUTES = Object.keys(HUNT_AREAS).filter((id) => id !== 'short');

function read(key: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function huntVisits(): HuntVisit[] {
  const out: HuntVisit[] = [];
  for (const story of ROUTES) {
    const stops = read(`findsg-onsite-v1:${story}:manual`)?.stops;
    if (typeof stops !== 'object' || stops === null) continue;
    for (const [stop, record] of Object.entries(stops)) {
      const checkin = (record as { checkin?: { mode?: unknown; confirmedAt?: unknown } } | null)?.checkin;
      if (checkin?.mode !== 'manual') continue;
      const at = typeof checkin.confirmedAt === 'string' ? checkin.confirmedAt.slice(0, 10) : undefined;
      out.push({ story, stop, on: at });
    }
  }
  const short = read(SHORT_STORY_SAVE);
  for (const stop of Object.keys(SHORT_STOPS)) if (short?.[stop] === true) out.push({ story: 'short', stop });
  return out;
}
