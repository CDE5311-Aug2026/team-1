// v2 board 09 (owner decision D1: a labelled demo). A challenge here is one of Hunt's public challenges
// (HUNT_CHALLENGES in stories.ts) seen through its story route: the route's stops (the FindSG stop ids, with the pins in
// stopPins.json), the catalogue places some of those stops stand at, the Tourism 2040 category those places share, and
// the planning area the route starts in. Nothing new is invented: player counts and best times come from the sample
// data in stories.ts and are always shown with an "Example" label.
//
// There is no challenge page any more (second canvas, 8 Nov 2026): a challenge opens its volume. Home, the place
// page and Search keep what they show: its title, kind, dates, category, stops and your stamps there. Nothing is
// kept on the phone here.
import { useEffect, useMemo, useState } from 'react';
import { TOURISM_CATEGORIES, tourismOf, type TourismCategory } from '../tourism';
import { areaOfPlace, type RegionId } from '../ura/ura';
import { curatedPlace } from '../../features/nearby/catalogue';
import { useExplorePersonal } from '../../features/nearby/actions';
import type { ExplorePersonalData } from '../../features/nearby/domain';
import pins from './stopPins.json';
import { HUNT_CHALLENGES, type HuntChallenge, type HuntRouteId } from './stories';

/**
 * Story stops that stand at a published catalogue place, so a check-in at that place counts for the stop. Reviewed by
 * hand (8 Nov 2026) against the stop's own name in the story (findStory) and its OneMap pin in stopPins.json: a stop is
 * listed only when its name names the place (or the pin is within 15 m of the place's pin, the same building). Stops
 * at a street, a promenade or a building with no catalogue record are left out; they count through the story only.
 * challenges.test.ts checks each pair (name or distance).
 */
export const STOP_PLACES: Readonly<Record<string, string>> = {
  'civic-f1-02': 'curated:sg-old-hill-street-police-station',
  'civic-f1-03': 'curated:sg-the-arts-house-old-parliament-house',
  'civic-f1-04': 'curated:sg-cavenagh-bridge',
  // "The Victoria clock tower": the tower of Victoria Theatre and Concert Hall (the pins are the same point)
  'civic-f1-06': 'curated:sg-victoria-theatre-and-concert-hall',
  'civic-f1-08': 'curated:sg-tan-kim-seng-fountain',
  'kampong-gelam-06': 'curated:sg-malabar-mosque',
  'kampong-gelam-07': 'curated:sg-malay-heritage-centre-istana-kampong-gelam',
};

type Pin = { lat: number; lng: number; pin: string };
const PINS = (pins as { stops: Record<string, Pin> }).stops;

export interface ChallengeStop {
  /** The FindSG stop id, e.g. "civic-f1-02". */
  id: string;
  n: number;
  pin: { lat: number; lng: number } | null;
  /** The catalogue place at this stop, when there is one (STOP_PLACES). */
  placeId?: string;
}

export interface Challenge {
  id: string;
  routeId: HuntRouteId;
  /** "Civic District" (from "Weekend challenge · Civic District"). */
  title: string;
  /** "Weekend" */
  kind: string;
  /** ISO dates, inclusive. */
  from: string;
  to: string;
  /** The category most of its catalogue stops share; undefined when none of its stops is a catalogue place. */
  category?: TourismCategory;
  /** The URA planning area and region of its first catalogue stop. */
  areaName?: string;
  region?: RegionId;
  stops: ChallengeStop[];
  /** SAMPLE data (stories.ts): always shown with an "Example" label, and only in together mode. */
  example: { players: number; bestMinutes: number };
}

function majority(cats: TourismCategory[]): TourismCategory | undefined {
  let best: TourismCategory | undefined;
  let most = 0;
  for (const c of TOURISM_CATEGORIES) {
    const n = cats.filter((x) => x === c).length;
    if (n > most) {
      best = c;
      most = n;
    }
  }
  return best;
}

function build(c: HuntChallenge): Challenge {
  const ids = Object.keys(PINS)
    .filter((k) => k.startsWith(`${c.routeId}-`) && /^\d+$/.test(k.slice(c.routeId.length + 1)))
    .sort();
  const stops: ChallengeStop[] = ids.map((id, i) => {
    const p = PINS[id];
    const placeId = STOP_PLACES[id];
    return { id, n: i + 1, pin: p ? { lat: p.lat, lng: p.lng } : null, ...(placeId && curatedPlace(placeId) ? { placeId } : {}) };
  });
  const places = stops.flatMap((s) => (s.placeId ? [curatedPlace(s.placeId)!] : []));
  const first = places[0] ? areaOfPlace(places[0].id) : undefined;
  const [kind, ...rest] = c.title.split(' · ');
  return {
    id: c.id,
    routeId: c.routeId,
    title: rest.length ? rest.join(' · ') : c.title,
    kind: rest.length ? kind.replace(/ challenge$/i, '') : 'Challenge',
    from: c.from,
    to: c.to,
    category: majority(places.flatMap((p) => tourismOf(p) ?? [])),
    areaName: first?.name,
    region: first?.region,
    stops,
    example: { players: c.players, bestMinutes: c.bestMinutes },
  };
}

export const CHALLENGES: readonly Challenge[] = HUNT_CHALLENGES.map(build);

/** Open today or later (a challenge whose last day has passed is over). */
export function openChallenges(today: string): Challenge[] {
  return CHALLENGES.filter((c) => c.to >= today);
}

// ---- dates ----
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parts = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
};

/** "7–8 Nov", "30 Nov – 1 Dec", "8 Nov" */
export function shortDates(from: string, to: string): string {
  const a = parts(from);
  const b = parts(to);
  if (from === to) return `${a.d} ${MONTH[a.m - 1]}`;
  return a.m === b.m ? `${a.d}–${b.d} ${MONTH[b.m - 1]}` : `${a.d} ${MONTH[a.m - 1]} – ${b.d} ${MONTH[b.m - 1]}`;
}

// ---- stamps and the clock ----
/** One stop's stamp: an exact time (the story's own check-in) or only a day (a place check-in keeps the date). */
export type Stamp = { at: string; exact: true } | { day: string; exact: false };

export type ChallengeTimer =
  | { kind: 'none' }
  | { kind: 'running'; since: Stamp }
  | { kind: 'minutes'; minutes: number; finished: boolean }
  | { kind: 'days'; days: number; finished: boolean };

const dayOf = (s: Stamp) => (s.exact ? localDay(new Date(s.at)) : s.day);
function localDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const dayNumber = (iso: string) => {
  const { y, m, d } = parts(iso);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** The clock runs from your first stamp to your last: minutes when every stamp has a time, else whole days. */
export function challengeTimer(stamps: readonly Stamp[], total: number): ChallengeTimer {
  if (!stamps.length) return { kind: 'none' };
  const finished = stamps.length >= total;
  if (stamps.length === 1 && !finished) return { kind: 'running', since: stamps[0] };
  if (stamps.every((s) => s.exact)) {
    const times = stamps.map((s) => Date.parse((s as { at: string }).at));
    return { kind: 'minutes', minutes: Math.round((Math.max(...times) - Math.min(...times)) / 60_000), finished };
  }
  const days = stamps.map((s) => dayNumber(dayOf(s)));
  return { kind: 'days', days: Math.max(...days) - Math.min(...days), finished };
}

/** "96 min", "2 h 5 min", "same day", "3 days" */
export function timerText(t: ChallengeTimer): string {
  if (t.kind === 'none') return 'Not started';
  if (t.kind === 'running') return 'Clock running';
  if (t.kind === 'days') return t.days === 0 ? 'Same day' : `${t.days} ${t.days === 1 ? 'day' : 'days'}`;
  const h = Math.floor(t.minutes / 60);
  const m = t.minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

// ---- the story's own data (FindSG), loaded on demand ----
export interface StoryStop {
  name: string;
  address: string;
  /** When the story recorded your check-in at this stop (on site or in remote play), if it did. */
  checkedAt?: string;
}

/** Stop names and the story's check-ins. FindSG is big, so it loads only when a screen asks for it. */
export async function loadStoryStops(routeId: HuntRouteId): Promise<Record<string, StoryStop>> {
  const fsg = await import('../../findsg');
  const names = fsg.findStory(routeId).stops;
  const onsite = fsg.ONSITE_ROUTES[routeId]?.stops ?? [];
  const records = (['manual', 'preview'] as const).map((mode) => {
    try {
      return (fsg.readOnsite(routeId, onsite, mode) as unknown as { stops?: Record<string, { checkin?: { confirmedAt?: string } | null }> }).stops ?? {};
    } catch {
      return {};
    }
  });
  const out: Record<string, StoryStop> = {};
  onsite.forEach((s, i) => {
    const times = records.map((r) => r[s.id]?.checkin?.confirmedAt).filter((t): t is string => typeof t === 'string' && !Number.isNaN(Date.parse(t)));
    out[s.id] = { name: names[i]?.name ?? '', address: names[i]?.address ?? '', ...(times.length ? { checkedAt: times.sort()[0] } : {}) };
  });
  return out;
}

export interface StopProgress {
  stop: ChallengeStop;
  name?: string;
  address?: string;
  stamp?: Stamp;
}

/** A stop is stamped by the story's check-in (with its time) or by checking in at its catalogue place (with the day). */
export function stopProgress(c: Challenge, story: Record<string, StoryStop> | null, personal: ExplorePersonalData): StopProgress[] {
  return c.stops.map((stop) => {
    const s = story?.[stop.id];
    const visit = stop.placeId ? personal.places.find((p) => p.placeKey === stop.placeId && p.visited) : undefined;
    const stamp: Stamp | undefined = s?.checkedAt
      ? { at: s.checkedAt, exact: true }
      : visit?.visitedOn
        ? { day: visit.visitedOn, exact: false }
        : undefined;
    return { stop, name: s?.name || undefined, address: s?.address || undefined, ...(stamp ? { stamp } : {}) };
  });
}

/** Stops with your stamps; the story's names and check-ins arrive a moment later (when `withStory`). */
export function useChallengeProgress(c: Challenge | undefined, withStory = true) {
  const personal = useExplorePersonal();
  const [story, setStory] = useState<Record<string, StoryStop> | null>(null);
  useEffect(() => {
    if (!c || !withStory) return undefined;
    let live = true;
    loadStoryStops(c.routeId)
      .then((s) => live && setStory(s))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [c, withStory]);
  return useMemo(() => {
    if (!c) return null;
    const stops = stopProgress(c, story, personal);
    const stamps = stops.flatMap((s) => (s.stamp ? [s.stamp] : []));
    return { stops, stamped: stamps.length, timer: challengeTimer(stamps, c.stops.length), storyLoaded: !!story };
  }, [c, story, personal]);
}
