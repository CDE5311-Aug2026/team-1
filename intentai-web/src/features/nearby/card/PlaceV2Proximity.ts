// How far you are from a place, and what the "Stamp here" bar may say about it (plan C4, B7). The stamp itself is
// always the self-reported check-in; this only decides the hint. "Within range" needs all of: a building pin (or an
// older curated pin), a fix accurate to 100 m and under 60 s old, and at most 150 m. Street, area and approximate
// pins never show range: only "about X km", or no distance at all. Nothing here is ever called "verified".
import type { CuratedPlace } from '../domain';
import { distanceM, formatDistance } from '../geo';
import { isPrecise, type LocationState } from '../location';

export const RANGE_M = 150;
export const RANGE_ACCURACY_M = 100;
export const FRESH_MS = 60_000;

export type StampHint =
  /** Location not asked for on this page: offer to check. */
  | { kind: 'ask' }
  | { kind: 'locating' }
  | { kind: 'denied' }
  | { kind: 'unavailable' }
  | { kind: 'elsewhere' }
  | { kind: 'stale' }
  | { kind: 'in-range'; metres: number }
  | { kind: 'out-of-range'; distance: string }
  /** A rough distance only (an approximate fix or pin). */
  | { kind: 'about'; distance: string }
  /** The pin is too rough to give a distance this close. */
  | { kind: 'rough-pin' };

/** Pins good enough for "within range": surveyed buildings and the older curated pins (no quality recorded). */
export function rangeEligible(place: Pick<CuratedPlace, 'pinQuality'>): boolean {
  return place.pinQuality === undefined || place.pinQuality === 'building';
}

/** "About 3 km" / "About 12 km" for rough pins, which only ever give whole kilometres. */
const aboutKm = (m: number) => `About ${Math.max(1, Math.round(m / 1000))} km`;

/**
 * The hint under the stamp bar. `inSingapore` is the result of the shared Singapore check (LocationFlow), passed in
 * so this module stays free of map outlines.
 */
export function stampHint(place: Pick<CuratedPlace, 'pinQuality' | 'coordinates'>, state: LocationState, inSingapore: boolean, now = Date.now()): StampHint {
  switch (state.status) {
    case 'manual':
      return { kind: 'ask' };
    case 'requesting':
      return { kind: 'locating' };
    case 'denied':
      return { kind: 'denied' };
    case 'unavailable':
    case 'timeout':
    case 'unsupported':
      return { kind: 'unavailable' };
  }
  const fix = state.fix;
  if (!fix) return { kind: 'unavailable' };
  if (!inSingapore) return { kind: 'elsewhere' };
  if (now - fix.timestamp >= FRESH_MS) return { kind: 'stale' };
  const d = distanceM(fix, place.coordinates);
  if (!rangeEligible(place)) return d >= 1000 ? { kind: 'about', distance: aboutKm(d) } : { kind: 'rough-pin' };
  if (!isPrecise(fix)) return { kind: 'about', distance: d >= 1000 ? aboutKm(d) : formatDistance(d) };
  if (fix.accuracyM <= RANGE_ACCURACY_M && d <= RANGE_M) return { kind: 'in-range', metres: Math.max(10, Math.round(d / 10) * 10) };
  if (fix.accuracyM > RANGE_ACCURACY_M) return { kind: 'about', distance: formatDistance(d) };
  return { kind: 'out-of-range', distance: formatDistance(d) };
}

const SELF = 'stamps are self-reported';

/** The hint in words (one short line). */
export function hintText(h: StampHint): string {
  switch (h.kind) {
    case 'ask':
      return `Stamps are self-reported`;
    case 'locating':
      return 'Finding your location…';
    case 'denied':
      return `Location is off · ${SELF}`;
    case 'unavailable':
      return `Location not available · ${SELF}`;
    case 'elsewhere':
      return `You seem to be outside Singapore · ${SELF}`;
    case 'stale':
      return `Your location is out of date · ${SELF}`;
    case 'in-range':
      return `You are ${h.metres} m away · within range`;
    case 'out-of-range':
      return `${h.distance} away · out of range · ${SELF}`;
    case 'about':
      return `${h.distance} away · ${SELF}`;
    case 'rough-pin':
      return `This pin is approximate · ${SELF}`;
  }
}

/** The distance for a location line or a list row, or null. The same pin rules as the hint. */
export function distanceLabel(place: Pick<CuratedPlace, 'pinQuality' | 'coordinates'>, state: LocationState, inSingapore: boolean): string | null {
  if (state.status !== 'active' || !state.fix || !inSingapore || !isPrecise(state.fix)) return null;
  const d = distanceM(state.fix, place.coordinates);
  if (!rangeEligible(place)) return d >= 1000 ? aboutKm(d) : null;
  return formatDistance(d);
}
