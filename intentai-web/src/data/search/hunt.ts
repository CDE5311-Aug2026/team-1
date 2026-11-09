// Hunt's challenges and story volumes as Search and the place page see them (v2 boards 07, 08). Kept light on
// purpose: no game code and none of the large story files, so Search and a place page load without the Hunt game.
// The volume list is Hunt's own list (pages/HuntPage/hunts.ts HUNTS, which loads the story data);
// search/index.test.ts checks that both stay the same.
import pinsJson from '../hunt/stopPins.json';
import { HUNT_CHALLENGES, type HuntChallenge } from '../hunt/stories';
import { distanceM } from '../../features/nearby/geo';
import type { CuratedPlace } from '../../features/nearby/domain';
import type { TourismCategory } from '../tourism';

export interface HuntVolume {
  /** The story's route id ('short' is the Golden Dome, which has no FindSG route). */
  id: string;
  roman: string;
  title: string;
  /** Where the story is set. */
  place: string;
}

/** Every hunt, in Hunt's order. */
export const HUNT_VOLUMES: readonly HuntVolume[] = [
  { id: 'only-one-missing', roman: 'I', title: 'Only One Missing', place: 'Kampong Gelam' },
  { id: 'short', roman: 'II', title: 'Beneath the Golden Dome', place: 'Kampong Gelam' },
  { id: 'telok-ayer', roman: 'III', title: 'Letters to the Shore', place: 'Telok Ayer' },
  { id: 'kampong-gelam', roman: 'IV', title: 'The Last Edition', place: 'Kampong Gelam' },
  { id: 'balestier', roman: 'V', title: 'The Last Screening', place: 'Balestier' },
  { id: 'civic-f1', roman: 'VI', title: 'The Missing Years', place: 'Civic District' },
];

/**
 * Every story is a walk through a historic precinct, which Tourism 2040 files under "Attractions, Precincts &
 * Destination Hotels" (STB factsheet, Section 2). Hunt has no other category data, so challenges and volumes sit there.
 */
export const HUNT_CATEGORY: TourismCategory = 'att';

export const volumeOf = (id: string) => HUNT_VOLUMES.find((v) => v.id === id);

/** Where a hunt opens: its step screen on Hunt's page (the Golden Dome too). */
export const volumeHref = (id: string) => `/hunt#story/${id}`;

interface Pin {
  lat: number;
  lng: number;
  pin: string;
  match?: string;
}
const PINS = Object.entries((pinsJson as unknown as { stops: Record<string, Pin> }).stops);

/** The stop pins of a story, in stop order (ids are `<route>-NN`; the short story's are `short-…`). */
export function stopPins(routeId: string): [string, Pin][] {
  return PINS.filter(([id]) => id.startsWith(`${routeId}-`)).sort(([a], [b]) => a.localeCompare(b));
}

export const stopCount = (routeId: string) => stopPins(routeId).length;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-11-07', '2026-11-08' → '7–8 Nov'; across months '30 Nov – 1 Dec'. */
export function dateRange(from: string, to: string): string {
  const [, fm, fd] = from.split('-').map(Number);
  const [, tm, td] = to.split('-').map(Number);
  if (!fm || !tm) return `${from} – ${to}`;
  if (from === to) return `${fd} ${MONTHS[fm - 1]}`;
  return fm === tm ? `${fd}–${td} ${MONTHS[fm - 1]}` : `${fd} ${MONTHS[fm - 1]} – ${td} ${MONTHS[tm - 1]}`;
}

const STOP_WORDS = new Set(['singapore', 'street', 'road', 'lane', 'place', 'drive', 'jalan', 'centre', 'house', 'park', 'the', 'and']);
const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w)),
  );

/** A stop is at a place when the place is the nearest one to a surveyed pin and either stands on it (≤ 25 m) or is
 *  within 100 m and shares a name word with the address OneMap matched. Approximate pins never link a place. */
export const STOP_EXACT_M = 25;
export const STOP_NAMED_M = 100;

export interface ChallengeStop {
  challenge: HuntChallenge;
  volume: HuntVolume | undefined;
  /** 1-based. */
  stop: number;
  stops: number;
}

let stopPlaces: Map<string, string> | null = null;

/** pin id → place id, for the surveyed pins that stand at a published place. */
function stopPlaceMap(places: readonly CuratedPlace[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const [id, pin] of PINS) {
    if (pin.pin === 'approx') continue;
    let best: { p: CuratedPlace; d: number } | null = null;
    for (const p of places) {
      const d = distanceM(pin, p.coordinates);
      if (d <= STOP_NAMED_M && (!best || d < best.d)) best = { p, d };
    }
    if (!best) continue;
    const pinWords = words(pin.match ?? '');
    const named = [...words(best.p.name)].some((w) => pinWords.has(w));
    if (best.d <= STOP_EXACT_M || named) out.set(id, best.p.id);
  }
  return out;
}

/** The challenges whose route stops at this place, with the stop's number. */
export function challengesAt(place: CuratedPlace, published: readonly CuratedPlace[]): ChallengeStop[] {
  stopPlaces ??= stopPlaceMap(published);
  const out: ChallengeStop[] = [];
  for (const challenge of HUNT_CHALLENGES) {
    const pins = stopPins(challenge.routeId);
    const at = pins.findIndex(([id]) => stopPlaces!.get(id) === place.id);
    if (at >= 0) out.push({ challenge, volume: volumeOf(challenge.routeId), stop: at + 1, stops: pins.length });
  }
  return out;
}

/** Test-only: forget the cached pin → place map. */
export function resetStopPlacesForTests() {
  stopPlaces = null;
}
