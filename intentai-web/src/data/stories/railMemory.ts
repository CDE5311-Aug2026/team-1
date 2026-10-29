import { STORAGE_PREFIX } from '../persistentStore';
import { FACETS } from '../placeStories';

/** Router state a place page understands. `railFrom: 'open'` marks the entry the rail's "Open card" left from. */
export interface PlaceRouteState {
  railIndex?: number;
  railFrom?: 'open';
}

const key = (placeId: string) => `${STORAGE_PREFIX}storyRail:${placeId}`;

function validIndex(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < FACETS.length ? value : undefined;
}

/** Each card page records itself as the last card viewed for its place (this browser session). */
export function rememberRailIndex(placeId: string, index: number): void {
  try {
    window.sessionStorage.setItem(key(placeId), String(index));
  } catch {
    // Storage blocked: the rail then opens on the router state or the first card.
  }
}

export function lastRailIndex(placeId: string): number | undefined {
  try {
    const raw = window.sessionStorage.getItem(key(placeId));
    return raw === null ? undefined : validIndex(Number(raw));
  } catch {
    return undefined;
  }
}

/** A fresh visit opens the rail on the second card. */
export const DEFAULT_RAIL_INDEX = 1;

/**
 * Rail index on entering a place page: router `railIndex` (a card's back link) ?? the last card viewed this
 * session ?? the default (card 2). On the entry "Open card" left from, the last card viewed wins: a NEXT chain replaces card
 * entries, so browser Back lands on the card the chain ended on.
 */
export function initialRailIndex(state: unknown, placeId: string): number {
  const s = (typeof state === 'object' && state !== null ? state : {}) as PlaceRouteState;
  const fromState = validIndex(s.railIndex);
  const last = lastRailIndex(placeId);
  if (s.railFrom === 'open') return last ?? fromState ?? DEFAULT_RAIL_INDEX;
  return fromState ?? last ?? DEFAULT_RAIL_INDEX;
}
