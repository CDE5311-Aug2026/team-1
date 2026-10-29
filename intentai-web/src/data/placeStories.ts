export type Facet = 'food' | 'monument' | 'festival' | 'history';
export const FACETS: readonly Facet[] = ['food', 'monument', 'festival', 'history'];

/** What a visitor has done at one Home place: cards opened, checked in, story stamp collected. */
export interface PlaceState {
  opened: Facet[];
  checkedIn: boolean;
  stamped: boolean;
  /** ISO date (YYYY-MM-DD) the stamp was collected. */
  stampedOn?: string;
}
export type PlaceStories = Record<string, PlaceState>;

function isPlaceState(v: unknown): v is PlaceState {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  return (
    Array.isArray(s.opened) &&
    s.opened.every((f) => FACETS.includes(f as Facet)) &&
    typeof s.checkedIn === 'boolean' &&
    typeof s.stamped === 'boolean' &&
    (s.stampedOn === undefined || typeof s.stampedOn === 'string')
  );
}

export function isPlaceStories(v: unknown): v is PlaceStories {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  return Object.values(v).every(isPlaceState);
}

export function placeState(stories: PlaceStories, id: string): PlaceState {
  return stories[id] ?? { opened: [], checkedIn: false, stamped: false };
}

export function openedCount(stories: PlaceStories, id: string): number {
  return new Set(placeState(stories, id).opened).size;
}
