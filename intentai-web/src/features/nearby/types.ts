// Shared primitive types for Nearby Explorer. Singapore only for now (team decision, 20 Oct 2026);
// the country code stays explicit so another country can be added without changing stored data.

export const COUNTRIES = ['SG'] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const CATEGORIES = ['landmark', 'food', 'nature', 'culture'] as const;
export type Category = (typeof CATEGORIES)[number];
/** Discovery filter: one category or all of them. */
export type CategoryFilter = Category | 'all';

export const RADII_M = [1000, 2000, 5000] as const;
export type RadiusM = (typeof RADII_M)[number];
export const DEFAULT_RADIUS_M: RadiusM = 2000;

export const QUERY_MIN = 2;
export const QUERY_MAX = 100;

export interface LatLng {
  lat: number;
  lng: number;
}

export function isCountry(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRIES as readonly string[]).includes(value);
}

export function isCategoryFilter(value: unknown): value is CategoryFilter {
  return value === 'all' || (typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value));
}

export function isRadius(value: unknown): value is RadiusM {
  return typeof value === 'number' && (RADII_M as readonly number[]).includes(value);
}
