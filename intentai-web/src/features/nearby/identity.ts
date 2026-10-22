// Canonical place identity. Ids are namespaced (`curated:`) so other id spaces can be added later
// without collisions; route and import values are validated before use.
import { curatedPlace } from './catalogue';
import { isPlaceKey, type CuratedId, type PlaceKey } from './domain';

export const curatedKey = (slug: string): CuratedId => `curated:${slug}`;

/** Validates a route or import value. */
export function parsePlaceKey(raw: string | undefined | null): PlaceKey | null {
  if (!raw) return null;
  return isPlaceKey(raw) ? raw : null;
}

/** Today every key is already canonical; kept as the single place to map renamed ids later. */
export function canonicalKey(key: PlaceKey): PlaceKey {
  return key;
}

/** A key that names a published place in this catalogue (unknown ids stay recoverable in personal data). */
export function isKnownPlace(key: PlaceKey): boolean {
  return curatedPlace(key) !== undefined;
}
