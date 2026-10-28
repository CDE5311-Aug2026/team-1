export type Facet = 'food' | 'monument' | 'festival' | 'history';
export const FACETS: readonly Facet[] = ['food', 'monument', 'festival', 'history'];

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
