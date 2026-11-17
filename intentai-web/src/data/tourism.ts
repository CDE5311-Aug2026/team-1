// Tourism 2040 place categories (Redesign v2, board 24). These four map 1:1 to Section 2 (Destination) of the
// STB Tourism 2040 Factsheet (2025). They sit beside the older Nearby `Category` (landmark/food/nature/culture),
// which stays for Nearby, Moments and the 3D view; screens redesigned in v2 use these instead.
// Colour never carries meaning alone: every category also has its own glyph.

export const TOURISM_CATEGORIES = ['att', 'wel', 'lei', 'cru'] as const;
export type TourismCategory = (typeof TOURISM_CATEGORIES)[number];
export type TourismFilter = TourismCategory | 'all';

export const TOURISM_SUBTYPES = [
  'attraction',
  'precinct',
  'hotel',
  'terminal',
  'marina',
  'island',
  'spa',
  'nature',
  'venue',
  'festival',
] as const;
export type TourismSubtype = (typeof TOURISM_SUBTYPES)[number];

/** Operating state of a place. Planned places are drafts: shown faded as "coming soon", never counted or stamped. */
export const OPERATING_STATUSES = ['open', 'new', 'planned', 'seasonal'] as const;
export type OperatingStatus = (typeof OPERATING_STATUSES)[number];

/** Where a pin's coordinates came from; only `building` (and older curated pins) may show "within range". */
export const PIN_QUALITIES = ['building', 'street', 'area', 'approx'] as const;
export type PinQuality = (typeof PIN_QUALITIES)[number];

export interface PlaceTourism {
  category: TourismCategory;
  subtype?: TourismSubtype;
}

export interface TourismInfo {
  id: TourismCategory;
  /** Short label used in the UI. */
  label: string;
  /** The STB factsheet name. */
  stbName: string;
  /** Three-letter code for compact legends and the passport MRZ line. */
  code: string;
  /** Marker / chip fill. */
  fill: string;
  /** Text on light backgrounds. */
  ink: string;
  /** Card and photo-placeholder tint. */
  tint: string;
  glyph: 'star' | 'leaf' | 'ticket' | 'ship';
}

export const TOURISM_INFO: Record<TourismCategory, TourismInfo> = {
  att: {
    id: 'att',
    label: 'Attractions',
    stbName: 'Attractions, Precincts & Destination Hotels',
    code: 'ATT',
    fill: '#e8862a',
    ink: '#9a4a0c',
    tint: '#f6e7d8',
    glyph: 'star',
  },
  wel: {
    id: 'wel',
    label: 'Wellness',
    stbName: 'Wellness',
    code: 'WEL',
    fill: '#3a8f5c',
    ink: '#236b43',
    tint: '#dde8df',
    glyph: 'leaf',
  },
  lei: {
    id: 'lei',
    label: 'Leisure',
    stbName: 'Leisure Events',
    code: 'LEI',
    fill: '#b8336f',
    ink: '#a02b60',
    tint: '#efdce1',
    glyph: 'ticket',
  },
  cru: {
    id: 'cru',
    label: 'Cruise',
    stbName: 'Cruise',
    code: 'CRU',
    fill: '#1d4f91',
    ink: '#1d4f91',
    tint: '#d9e0e6',
    glyph: 'ship',
  },
};

export function isTourismCategory(value: unknown): value is TourismCategory {
  return typeof value === 'string' && (TOURISM_CATEGORIES as readonly string[]).includes(value);
}

export function isTourismFilter(value: unknown): value is TourismFilter {
  return value === 'all' || isTourismCategory(value);
}

/** The place's tourism category, or undefined for a place not yet sorted (drafts, places outside v2 screens). */
export function tourismOf(place: { tourism?: PlaceTourism }): TourismCategory | undefined {
  return place.tourism?.category;
}

export function matchesTourism(place: { tourism?: PlaceTourism }, filter: TourismFilter): boolean {
  return filter === 'all' || tourismOf(place) === filter;
}
