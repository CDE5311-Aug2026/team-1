// Deterministic, explainable filtering and ordering (PRD §9). No learned scores, no profile signals.
import { collectionsContaining } from './catalogue';
import { COUNTRY_INFO, type CuratedPlace, type PlaceKey } from './domain';
import { distanceM } from './geo';
import type { Category, CategoryFilter, CountryCode, LatLng } from './types';

/** Where distances are measured from. Only a valid, precise device fix is "you". */
export type OriginKind = 'you' | 'approx' | 'area' | 'map';
export interface Origin {
  kind: OriginKind;
  point: LatLng;
  label: string;
}

export interface ExploreItem {
  key: PlaceKey;
  name: string;
  category: Category;
  kindLabel: string;
  location: LatLng;
  place: CuratedPlace;
  distanceM?: number;
  reason: string;
}

export function originPhrase(kind: OriginKind): string {
  if (kind === 'you') return 'from you';
  if (kind === 'approx') return 'from your approximate location';
  return kind === 'area' ? 'from selected area' : 'from map centre';
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Local search over the English and Chinese names, the kind and the summary. */
export function matchesQuery(place: CuratedPlace, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  const hay = fold([place.name, place.nameZh ?? '', place.kind, place.summary, place.category].join(' '));
  return q.split(/\s+/).every((word) => hay.includes(word));
}

/** One honest reason per card, from real signals only. */
export function reasonFor(place: CuratedPlace, origin?: Origin): string {
  if (place.category === 'food') return 'Food centre researched by our team';
  if (collectionsContaining(place.id).length > 0) return `In our ${COUNTRY_INFO[place.country].name} collection`;
  if (origin?.kind === 'area') return 'Near your selected area';
  return 'On the EARTH ONLINE Singapore map';
}

export function toItem(place: CuratedPlace, origin?: Origin): ExploreItem {
  return {
    key: place.id,
    name: place.name,
    category: place.category,
    kindLabel: place.kind,
    location: { lat: place.coordinates.lat, lng: place.coordinates.lng },
    place,
    distanceM: origin ? distanceM(origin.point, place.coordinates) : undefined,
    reason: reasonFor(place, origin),
  };
}

export interface PlaceFilter {
  country: CountryCode;
  category: CategoryFilter;
  query?: string;
  /** Restrict to a circle (committed area / location / map-centre search). */
  center?: LatLng;
  radiusM?: number;
}

export function filterPlaces(places: CuratedPlace[], filter: PlaceFilter): CuratedPlace[] {
  return places.filter(
    (p) =>
      p.country === filter.country &&
      (filter.category === 'all' || p.category === filter.category) &&
      (!filter.query || matchesQuery(p, filter.query)) &&
      (!filter.center || !filter.radiusM || distanceM(filter.center, p.coordinates) <= filter.radiusM),
  );
}

/** Nearest first by straight-line distance; the place id breaks ties so the order is stable. */
export function byDistance(items: ExploreItem[]): ExploreItem[] {
  return [...items].sort((a, b) => {
    const da = a.distanceM ?? Infinity;
    const db = b.distanceM ?? Infinity;
    return da === db ? (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) : da - db;
  });
}
