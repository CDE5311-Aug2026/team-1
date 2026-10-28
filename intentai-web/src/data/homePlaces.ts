import areasJson from './explore/areas.json';
import berlinPhoto from '../assets/home/berlin-wall-fragments.webp';
import berlinThumb from '../assets/home/berlin-wall-thumb.webp';
import chinatownPhoto from '../assets/home/chinatown.webp';
import { distanceM } from '../features/nearby/geo';
import { THUMB_CREDIT, thumbUrl } from '../features/nearby/thumbs';
import type { LatLng } from '../features/nearby/types';

export { FACETS, openedCount } from './placeStories';
export type { Facet, PlaceStories } from './placeStories';

export interface HomePlace {
  id: string;
  name: string;
  area: string;
  point: LatLng;
  distance: string;
  /** Optional; the UI shows a placeholder when a place has no photo. */
  photo?: string;
  photoAlt: string;
  credit: string;
  hasCards: boolean;
  pinAlways: boolean;
}

/** 80x80 crop of the right-hand panel, for the Deepavali card's anniversary row. */
export const BERLIN_THUMB: string = berlinThumb;

export const HOME_BASE: LatLng = { lat: 1.3042, lng: 103.7734 };
export const HOME_BASE_LABEL = 'NUS University Town';
export const PINNED_COUNT = 4;

export function formatHomeDistance(metres: number): string {
  if (metres < 1000) return `${Math.max(50, Math.round(metres / 50) * 50)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

interface RawArea {
  id: string;
  name: string;
  center?: LatLng;
}

const areas = (areasJson as { areas: RawArea[] }).areas;

// Written out here so the Nearby catalogue (places.sg.json) stays out of the main bundle;
// homePlaces.test.ts checks these against the catalogue.
function nearbyPlace(id: string, name: string, area: string, point: LatLng): HomePlace {
  return {
    id,
    name,
    area,
    point,
    distance: formatHomeDistance(distanceM(HOME_BASE, point)),
    photo: thumbUrl(id)!,
    photoAlt: `${name} (3D map view)`,
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
    photo: berlinPhoto,
    photoAlt: 'Two painted Berlin Wall panels in a garden at NUS University Town',
    credit: 'Photo supplied by the IntentAI team',
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
  nearbyPlace('curated:sg-national-university-of-singapore', 'National University of Singapore', 'Queenstown & Holland', { lat: 1.2985, lng: 103.776 }),
  nearbyPlace('curated:sg-haw-par-villa', 'Haw Par Villa', 'Queenstown & Holland', { lat: 1.28405, lng: 103.78142 }),
  nearbyPlace('curated:sg-holland-village', 'Holland Village', 'Queenstown & Holland', { lat: 1.31194, lng: 103.79611 }),
];

export function homePlace(id: string): HomePlace | undefined {
  return HOME_PLACES.find((p) => p.id === id);
}

/** Always-pinned places, plus the selected one when it is not always pinned. */
export function visiblePins(selectedId: string): HomePlace[] {
  return HOME_PLACES.filter((p) => p.pinAlways || p.id === selectedId);
}
