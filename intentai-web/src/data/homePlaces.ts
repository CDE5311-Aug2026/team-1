import areasJson from './explore/areas.json';
import placesJson from './explore/places.sg.json';
import chinatownPhoto from '../assets/home/chinatown.webp';
import { distanceM } from '../features/nearby/geo';
import { THUMB_CREDIT, thumbUrl } from '../features/nearby/thumbs';
import type { LatLng } from '../features/nearby/types';

export type Facet = 'food' | 'monument' | 'festival' | 'history';
export const FACETS: readonly Facet[] = ['food', 'monument', 'festival', 'history'];

export interface HomePlace {
  id: string;
  name: string;
  area: string;
  point: LatLng;
  distance: string;
  /** Missing until a licensed photo exists; the UI shows a placeholder. */
  photo?: string;
  photoAlt: string;
  credit: string;
  hasCards: boolean;
  pinAlways: boolean;
}

export const HOME_BASE: LatLng = { lat: 1.3042, lng: 103.7734 };
export const HOME_BASE_LABEL = 'NUS University Town';
export const PINNED_COUNT = 4;

export function formatHomeDistance(metres: number): string {
  if (metres < 1000) return `${Math.max(50, Math.round(metres / 50) * 50)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

interface RawPlace {
  id: string;
  name: string;
  areaId: string;
  coordinates: { lat: number; lng: number };
}
interface RawArea {
  id: string;
  name: string;
  center?: LatLng;
}

const areas = (areasJson as { areas: RawArea[] }).areas;
const places = placesJson as RawPlace[];

function nearbyPlace(id: string): HomePlace {
  const raw = places.find((p) => p.id === id);
  if (!raw) throw new Error(`Home place ${id} missing from places.sg.json`);
  const point = { lat: raw.coordinates.lat, lng: raw.coordinates.lng };
  return {
    id,
    name: raw.name,
    area: areas.find((a) => a.id === raw.areaId)?.name ?? '',
    point,
    distance: formatHomeDistance(distanceM(HOME_BASE, point)),
    photo: thumbUrl(id)!,
    photoAlt: `${raw.name} (3D map view)`,
    credit: THUMB_CREDIT,
    hasCards: false,
    pinAlways: true,
  };
}

const chinatownArea = areas.find((a) => a.id === 'sg-chinatown');
if (!chinatownArea?.center) throw new Error('sg-chinatown centre missing from areas.json');

export const HOME_PLACES: readonly HomePlace[] = [
  {
    id: 'berlin-wall-fragments',
    name: 'Berlin Wall Fragments',
    area: 'NUS University Town',
    point: { lat: 1.30583, lng: 103.77472 },
    distance: '200 m',
    photoAlt: '',
    credit: '',
    hasCards: true,
    pinAlways: true,
  },
  {
    id: 'chinatown',
    name: 'Chinatown',
    area: 'Chinatown & Tanjong Pagar',
    point: { lat: chinatownArea.center.lat, lng: chinatownArea.center.lng },
    distance: '8.4 km',
    photo: chinatownPhoto,
    photoAlt: 'Pagoda Street shophouses in Chinatown, Singapore, with lanterns and shoppers',
    credit: 'Marcin Konsek, CC BY-SA 4.0, via Wikimedia Commons',
    hasCards: true,
    pinAlways: false,
  },
  nearbyPlace('curated:sg-national-university-of-singapore'),
  nearbyPlace('curated:sg-haw-par-villa'),
  nearbyPlace('curated:sg-holland-village'),
];

export function homePlace(id: string): HomePlace | undefined {
  return HOME_PLACES.find((p) => p.id === id);
}

/** Always-pinned places, plus the selected one when it is not always pinned. */
export function visiblePins(selectedId: string): HomePlace[] {
  return HOME_PLACES.filter((p) => p.pinAlways || p.id === selectedId);
}

export type PlaceProgress = Record<string, Facet[]>;

export function isPlaceProgress(v: unknown): v is PlaceProgress {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  return Object.values(v).every(
    (list) => Array.isArray(list) && list.every((f) => FACETS.includes(f as Facet)),
  );
}

export function openedCount(progress: PlaceProgress, id: string): number {
  return new Set(progress[id] ?? []).size;
}
