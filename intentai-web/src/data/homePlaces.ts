import areasJson from './explore/areas.json';
import berlinPhoto from '../assets/home/berlin-wall-fragments.webp';
import berlinThumb from '../assets/home/berlin-wall-thumb.webp';
import { distanceM } from '../features/nearby/geo';
import { THUMB_CREDIT, thumbUrl } from '../features/nearby/thumbs';
import type { LatLng } from '../features/nearby/types';
import { PUBLISHED_PLACES } from '../features/nearby/catalogue';
import { placePicture } from './home/nearbyCards';
import { areaOfPlace } from './ura/ura';

export { FACETS, openedCount } from './placeStories';
export type { Facet, PlaceStories } from './placeStories';

export interface HomePlace {
  id: string;
  name: string;
  /** The URA planning area it lies in (as Home's decks group places), e.g. "Queenstown". */
  area: string;
  /** What it is, from the catalogue: "Monument", "Hawker centre", … */
  kind: string;
  point: LatLng;
  distance: string;
  /** Optional; the UI shows a placeholder when a place has no photo. */
  photo?: string;
  photoAlt: string;
  credit: string;
  hasCards: boolean;
  pinAlways: boolean;
  /** Other names the Home search matches (besides name and area). */
  aliases?: readonly string[];
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

const KIND = new Map<string, string>(PUBLISHED_PLACES.map((p) => [p.id, p.kind]));

/**
 * The area a card names is the URA planning area, the same one the deck it sits in is named after (owner, 1 Nov 2026:
 * the Berlin Wall's card said "Queenstown" above and "Clementi & Kent Ridge" below). Nearby's own locality name
 * (`locality`) stays searchable.
 */
function placeArea(id: string, locality: string): Pick<HomePlace, 'area' | 'kind'> {
  return { area: areaOfPlace(id)?.name ?? locality, kind: KIND.get(id) ?? '' };
}

// Written out here so the Nearby catalogue (places.sg.json) stays out of the main bundle;
// homePlaces.test.ts checks these against the catalogue.
function nearbyPlace(id: string, name: string, locality: string, point: LatLng, aliases?: readonly string[]): HomePlace {
  return {
    id,
    name,
    ...placeArea(id, locality),
    point,
    distance: formatHomeDistance(distanceM(HOME_BASE, point)),
    photo: thumbUrl(id)!,
    photoAlt: `${name} (3D map view)`,
    credit: THUMB_CREDIT,
    hasCards: false,
    pinAlways: true,
    aliases: [...(aliases ?? []), locality],
  };
}

export const HOME_PLACES: readonly HomePlace[] = [
  {
    // Team 1's photo of the panels; the place itself is the Nearby catalogue entry (story cards removed 31 Oct).
    ...nearbyPlace('curated:sg-berlin-wall-fragments-utown', 'Berlin Wall Fragments', 'Clementi & Kent Ridge', { lat: 1.30583, lng: 103.77472 }, [
      'Tembusu College',
      'Berlin',
      'UTown',
      'University Town',
    ]),
    photo: berlinPhoto,
    photoAlt: 'Two painted Berlin Wall panels in a garden at NUS University Town',
    credit: 'Photo supplied by the IntentAI team',
  },
  nearbyPlace('curated:sg-national-university-of-singapore', 'National University of Singapore', 'Queenstown & Holland', { lat: 1.2985, lng: 103.776 }, [
    'NUS',
    'UTown',
  ]),
  nearbyPlace('curated:sg-haw-par-villa', 'Haw Par Villa', 'Queenstown & Holland', { lat: 1.28405, lng: 103.78142 }, ['Haw Par', 'Tiger Balm Garden']),
  nearbyPlace('curated:sg-holland-village', 'Holland Village', 'Queenstown & Holland', { lat: 1.31194, lng: 103.79611 }, ['Holland V', 'Holland Road']),
];

/** Short area names for the card line (areas.json names). */
const AREA_NAME = new Map(areas.map((a) => [a.id, a.name]));

/**
 * Every other published Nearby place (merge 2026-10-29: Home's carousel lists all real places, nearest to the home
 * base first). Picture: culture-card photo → Wikimedia Commons photo → 3D view (none → the card's placeholder).
 * They have no story cards: the card's button opens the place in Nearby. Pinned on the map only when selected.
 */
const CATALOGUE_PLACES: HomePlace[] = PUBLISHED_PLACES.filter((p) => !HOME_PLACES.some((h) => h.id === p.id))
  .map((p): HomePlace => {
    const picture = placePicture(p);
    return {
      id: p.id,
      name: p.name,
      ...placeArea(p.id, AREA_NAME.get(p.areaId) ?? ''),
      point: { lat: p.coordinates.lat, lng: p.coordinates.lng },
      distance: formatHomeDistance(distanceM(HOME_BASE, p.coordinates)),
      photo: picture.src,
      photoAlt: picture.kind === '3d' ? `${p.name} (3D map view)` : p.name,
      credit: picture.credit,
      hasCards: false,
      pinAlways: false,
      aliases: [...(p.nameZh ? [p.nameZh] : []), AREA_NAME.get(p.areaId) ?? ''].filter(Boolean),
    };
  })
  .sort((a, b) => distanceM(HOME_BASE, a.point) - distanceM(HOME_BASE, b.point));

export const ALL_HOME_PLACES: readonly HomePlace[] = [...HOME_PLACES, ...CATALOGUE_PLACES];

/** The "places to explore" chip: every published place in Nearby Explore. */
export const EXPLORE_COUNT = PUBLISHED_PLACES.length;

export function homePlace(id: string): HomePlace | undefined {
  return ALL_HOME_PLACES.find((p) => p.id === id);
}

/** Always-pinned places, plus the selected one when it is not always pinned. */
export function visiblePins(selectedId: string): HomePlace[] {
  return ALL_HOME_PLACES.filter((p) => p.pinAlways || p.id === selectedId);
}

/**
 * Home search: case-insensitive substring match on name, area and aliases. An empty query lists every place.
 * Places with cards come first, the rest keep their card order.
 */
export function searchHomePlaces(query: string): { withCards: HomePlace[]; others: HomePlace[] } {
  const q = query.trim().toLowerCase();
  // An empty query suggests the five Home places; typing searches every real place.
  const hits = (q ? ALL_HOME_PLACES : HOME_PLACES).filter((p) => !q || [p.name, p.area, ...(p.aliases ?? [])].some((text) => text.toLowerCase().includes(q)));
  return { withCards: hits.filter((p) => p.hasCards), others: hits.filter((p) => !p.hasCards) };
}
