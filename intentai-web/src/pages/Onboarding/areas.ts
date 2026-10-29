import { distanceM } from '../../features/nearby/geo';
import type { LatLng } from '../../features/nearby/types';

export interface Area extends LatLng {
  name: string;
}

/** The 17 named areas of the home-base map (canvas names, real coordinates). */
export const AREAS: readonly Area[] = [
  { name: 'NUS UTown', lat: 1.3049, lng: 103.7735 },
  { name: 'Clementi', lat: 1.3151, lng: 103.765 },
  { name: 'Kent Ridge', lat: 1.2935, lng: 103.7845 },
  { name: 'Buona Vista', lat: 1.3071, lng: 103.7903 },
  { name: 'Holland Village', lat: 1.311, lng: 103.796 },
  { name: 'Dempsey', lat: 1.3046, lng: 103.81 },
  { name: 'Queenstown', lat: 1.2942, lng: 103.806 },
  { name: 'Tanglin', lat: 1.305, lng: 103.824 },
  { name: 'Orchard', lat: 1.304, lng: 103.8318 },
  { name: 'Tiong Bahru', lat: 1.286, lng: 103.827 },
  { name: 'Novena', lat: 1.3204, lng: 103.8438 },
  { name: 'Dhoby Ghaut', lat: 1.299, lng: 103.8455 },
  { name: 'Little India', lat: 1.3066, lng: 103.8518 },
  { name: 'Bugis', lat: 1.3009, lng: 103.8559 },
  { name: 'Chinatown', lat: 1.2836, lng: 103.8443 },
  { name: 'Marina Bay', lat: 1.2823, lng: 103.8585 },
  { name: 'Toa Payoh', lat: 1.3343, lng: 103.8563 },
];

const OVERVIEW_NAMES = ['NUS UTown', 'Holland Village', 'Orchard', 'Chinatown', 'Marina Bay', 'Clementi', 'Novena', 'Bugis', 'Queenstown'];

/** The 9 areas labelled at the overview zoom; the zoomed map labels all 17. */
export const OVERVIEW_AREAS: readonly Area[] = AREAS.filter((a) => OVERVIEW_NAMES.includes(a.name));

/** Canvas rule: a pin within 180 map px (4.78 m each) of an area takes its name. */
export const NEAR_AREA_M = 860;

/** Named area for a point, or `Near <area>` when none is within 860 m. */
export function labelFor(point: LatLng): string {
  let best = AREAS[0];
  let bestM = Infinity;
  for (const area of AREAS) {
    const m = distanceM(point, area);
    if (m < bestM) {
      bestM = m;
      best = area;
    }
  }
  return bestM < NEAR_AREA_M ? best.name : `Near ${best.name}`;
}

/** Canvas format: under 1000 m the nearest 50 m (at least 50), else kilometres to one decimal. */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.max(50, Math.round(metres / 50) * 50)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}
