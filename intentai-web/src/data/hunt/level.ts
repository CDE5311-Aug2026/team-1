// How demanding a hunt is (user test UT01-2: "exploration should be graded by level"). Worked out from the route's own
// data only, never set by hand, so a volume and its weekend challenge always agree:
// - stops: how many places the route asks you to solve;
// - walk: the straight-line metres from stop to stop, in route order (the real walk is a little longer).
// Level 1 Beginner: 3 stops or fewer (the two-stop prologue).
// Level 3 Expert: 8 stops or more, or a walk of 1.5 km or more.
// Level 2 Explorer: everything in between.
// With today's routes: the prologue is 1; Only One Missing (6 stops, 0.6 km) and Kampong Gelam (7, 0.7 km) are 2;
// Telok Ayer (8 stops), Balestier (1.6 km) and Civic District (8 stops, 2.1 km) are 3.
import { distanceM } from '../../features/nearby/geo';

export type HuntLevel = 1 | 2 | 3;

export const LEVEL_NAMES: Record<HuntLevel, string> = { 1: 'Beginner', 2: 'Explorer', 3: 'Expert' };

const BEGINNER_MAX_STOPS = 3;
const EXPERT_MIN_STOPS = 8;
const EXPERT_MIN_WALK_M = 1500;

/** Straight-line metres from pin to pin, in order; stops without a pin are skipped. */
export function walkMetres(pins: readonly ({ lat: number; lng: number } | null | undefined)[]): number {
  const known = pins.filter((p): p is { lat: number; lng: number } => !!p);
  let m = 0;
  for (let i = 1; i < known.length; i++) m += distanceM(known[i - 1], known[i]);
  return m;
}

export function huntLevel(stops: number, walkM = 0): HuntLevel {
  if (stops <= BEGINNER_MAX_STOPS) return 1;
  if (stops >= EXPERT_MIN_STOPS || walkM >= EXPERT_MIN_WALK_M) return 3;
  return 2;
}

/** A route's level from its stops' pins (one entry a stop, null where a stop has no pin). */
export function routeLevel(pins: readonly ({ lat: number; lng: number } | null | undefined)[]): HuntLevel {
  return huntLevel(pins.length, walkMetres(pins));
}
