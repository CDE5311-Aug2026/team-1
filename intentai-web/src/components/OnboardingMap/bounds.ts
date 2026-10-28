import { HOME_BASE_BOUNDS } from '../../data/domain';
import type { LatLng } from '../../features/nearby/types';

/** The map cannot be panned past these (south-west, north-east): Singapore with some sea around it. */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [1.2, 103.6],
  [1.47, 104.05],
];

/** True when a point is inside the range the onboarding store accepts for a home base. */
export function inBaseBounds(p: LatLng): boolean {
  const b = HOME_BASE_BOUNDS;
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= b.latMin && p.lat <= b.latMax && p.lng >= b.lngMin && p.lng <= b.lngMax;
}
