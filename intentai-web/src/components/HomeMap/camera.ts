import type { LatLng } from '../../features/nearby/types';

/** One camera instruction from the Nearby reducer. `seq` grows by 1 per command. */
export type MapCommand = { seq: number } & (
  | { kind: 'focus'; target: LatLng; fly: boolean }
  | { kind: 'zoom'; delta: 1 | -1 }
);

export interface PixelPoint {
  x: number;
  y: number;
}
export type Project = (latlng: LatLng, zoom: number) => PixelPoint;
export type Unproject = (point: PixelPoint, zoom: number) => LatLng;

/** Pan duration for a selection change (ease-out). */
export const PAN_MS = 600;
/** A batched jump further than this flies instead of jumping. */
export const FLY_OVER_M = 3000;

/**
 * Camera centre that puts `target` in the middle of the visible area above the carousel:
 * `bottomInset` px at the bottom of the map are covered, so the centre sits half of that below the target.
 */
export function offsetCentre(project: Project, unproject: Unproject, target: LatLng, zoom: number, bottomInset: number): LatLng {
  const p = project(target, zoom);
  return unproject({ x: p.x, y: p.y + bottomInset / 2 }, zoom);
}

/** The point in the middle of the visible area for a camera at `centre` (inverse of offsetCentre). */
export function visibleCentre(project: Project, unproject: Unproject, centre: LatLng, zoom: number, bottomInset: number): LatLng {
  const p = project(centre, zoom);
  return unproject({ x: p.x, y: p.y - bottomInset / 2 }, zoom);
}
