// Every hunt with its real progress, for Hunt's list: from the game's own saves (on site only), a category from the
// catalogue places its stops stand at, and a level from its stops and their walk.
import { useMemo } from 'react';
import { ONSITE_ROUTES, readOnsite, readShort, SHORT_EPISODE, shortCount } from '../../../findsg';
import { HUNT_ROUTE_IDS } from '../../../data/hunt/stories';
import { routeLevel, type HuntLevel } from '../../../data/hunt/level';
import { visitedSet } from '../../../data/ura/ura';
import { tourismOf, type TourismCategory } from '../../../data/tourism';
import { useExplorePersonal } from '../../../features/nearby/actions';
import { PUBLISHED_PLACES } from '../../../features/nearby/catalogue';
import { distanceM } from '../../../features/nearby/geo';
import type { LatLng } from '../../../features/nearby/types';
import { HUNTS, type HuntId } from '../hunts';
import { chapter, shortChapter, SHORT_PINS } from '../story/chapters';

/** Stops passed on site, across every hunt. */
export function huntStops(): number {
  const routes = HUNT_ROUTE_IDS.reduce((n, id) => n + readOnsite(id, ONSITE_ROUTES[id].stops, 'manual').completed.length, 0);
  return routes + shortCount(readShort('manual'));
}
/** 100 points a stop. */
export const huntPoints = () => huntStops() * 100;

export function useExplored() {
  const personal = useExplorePersonal();
  return useMemo(() => visitedSet(personal).size, [personal]);
}

/** A stop "maps" to a catalogue place when the names agree or its pin sits on the building (≤ 30 m). */
const SAME_BUILDING_M = 30;
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function placeCategory(name: string, pin: LatLng | null): TourismCategory | undefined {
  const n = norm(name);
  let best: { cat: TourismCategory; d: number } | undefined;
  for (const p of PUBLISHED_PLACES) {
    const cat = tourismOf(p);
    if (!cat || p.operatingStatus === 'planned') continue;
    const pn = norm(p.name);
    if (n.length >= 6 && pn.length >= 6 && (pn === n || pn.startsWith(n) || n.startsWith(pn))) return cat;
    if (pin) {
      const d = distanceM(pin, p.coordinates);
      if (d <= SAME_BUILDING_M && (!best || d < best.d)) best = { cat, d };
    }
  }
  return best?.cat;
}

/** The majority category of the stops that map to a place (a tie goes to the one met first on the route). */
export function majorityCategory(cats: (TourismCategory | undefined)[]): TourismCategory | undefined {
  const count = new Map<TourismCategory, number>();
  for (const c of cats) if (c) count.set(c, (count.get(c) ?? 0) + 1);
  let top: TourismCategory | undefined;
  for (const [c, n] of count) if (!top || n > count.get(top)!) top = c;
  return top;
}

const categoryCache = new Map<HuntId, TourismCategory | undefined>();
function huntCategory(id: HuntId): TourismCategory | undefined {
  if (categoryCache.has(id)) return categoryCache.get(id);
  let cats: (TourismCategory | undefined)[];
  if (id === 'short') {
    const [press, mosque] = SHORT_EPISODE.places;
    cats = [placeCategory(press.name, SHORT_PINS.press ?? null), placeCategory(mosque.name, SHORT_PINS.mosque ?? null)];
  } else {
    cats = chapter(id).stops.map((s) => placeCategory(s.name, s.pin));
  }
  const c = majorityCategory(cats);
  categoryCache.set(id, c);
  return c;
}

interface OnsiteSave {
  started?: boolean;
  stopIndex?: number;
  completed: string[];
  stops?: Record<string, { checkin?: { confirmedAt?: string | null } | null; observation?: { confirmedAt?: string | null } }>;
}
const lastPlayed = (s: OnsiteSave) =>
  Object.values(s.stops ?? {}).reduce((t, r) => {
    for (const at of [r?.checkin?.confirmedAt, r?.observation?.confirmedAt]) {
      const v = at ? Date.parse(at) : NaN;
      if (Number.isFinite(v) && v > t) t = v;
    }
    return t;
  }, 0);

export interface Volume {
  id: HuntId;
  title: string;
  /** The small-caps line under its title, in sentence case. */
  tagline: string;
  area: string;
  category?: TourismCategory;
  total: number;
  found: number;
  /** Begun and not finished. */
  inProgress: boolean;
  /** The stop you are on (1-based). */
  stop: number;
  /** The next unsolved stop's pin, for a distance from you. */
  next: { lat: number; lng: number; approx: boolean } | null;
  /** When it was last played (ms), 0 if unknown. */
  last: number;
  /** How demanding it is, from its stops and their walk (data/hunt/level.ts). */
  level: HuntLevel;
}

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** Every hunt, in Hunt's order, with its real progress. */
export function volumes(): Volume[] {
  return HUNTS.map((b) => {
    const base = { id: b.id, title: b.title, tagline: sentence(b.en), area: b.place, category: huntCategory(b.id) };
    if (b.id === 'short') {
      const ch = shortChapter();
      const begun = readShort('manual').ticket;
      const total = ch.stops.length;
      return {
        ...base,
        total,
        found: ch.solved,
        inProgress: (begun || ch.solved > 0) && ch.solved < total,
        stop: Math.min(ch.solved + 1, total),
        next: ch.stops.find((s) => !s.done)?.pin ?? null,
        last: 0,
        level: routeLevel(ch.stops.map((s) => s.pin)),
      };
    }
    const ch = chapter(b.id);
    const now = readOnsite(b.id, ONSITE_ROUTES[b.id].stops, 'manual') as unknown as OnsiteSave;
    const total = ch.stops.length;
    const at = now.started && typeof now.stopIndex === 'number' ? now.stopIndex + 1 : ch.solved + 1;
    return {
      ...base,
      total,
      found: ch.solved,
      inProgress: (!!now.started || ch.solved > 0) && ch.solved < total,
      stop: Math.max(1, Math.min(at, total)),
      next: ch.stops.find((s) => !s.done)?.pin ?? null,
      last: lastPlayed(now),
      level: routeLevel(ch.stops.map((s) => s.pin)),
    };
  });
}

/** The hunt to carry on with: the one in progress played last (list order breaks a tie), else null. */
export function inProgress(list: Volume[]): Volume | null {
  return list.filter((v) => v.inProgress).sort((x, y) => y.last - x.last)[0] ?? null;
}
