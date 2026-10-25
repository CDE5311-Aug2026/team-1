import type { LatLng } from './types';

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle (straight-line) distance in metres. Not a walking or travel distance. */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "Approx. 450 m" / "Approx. 1.2 km" / "Approx. 37 km". Straight line, rounded honestly. */
export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres) || metres < 0) return 'Not available';
  if (metres < 1000) return `Approx. ${Math.max(50, Math.round(metres / 50) * 50)} m`;
  if (metres < 10_000) return `Approx. ${(metres / 1000).toFixed(1)} km`;
  return `Approx. ${Math.round(metres / 1000)} km`;
}

export type Ring = [number, number][]; // [lng, lat]

/** Ray-casting point-in-polygon on [lng, lat] rings. */
export function inRing(point: LatLng, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Shortest distance (m) from a point to a ring's edges, using a local equirectangular approximation. */
export function distanceToRingM(point: LatLng, ring: Ring): number {
  const kx = 111_320 * Math.cos(toRad(point.lat));
  const ky = 110_574;
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = (ring[j][0] - point.lng) * kx;
    const ay = (ring[j][1] - point.lat) * ky;
    const bx = (ring[i][0] - point.lng) * kx;
    const by = (ring[i][1] - point.lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

/**
 * Whether a point is in Singapore, using the simplified Natural Earth outline. A point within
 * `toleranceM` of the simplified coast (piers, reclaimed land, offshore islands the outline omits) counts.
 */
export function inSingapore(point: LatLng, rings: Ring[], toleranceM = 3000): boolean {
  if (rings.some((ring) => inRing(point, ring))) return true;
  return rings.some((ring) => distanceToRingM(point, ring) <= toleranceM);
}

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function boundsOf(points: LatLng[]): Bounds | null {
  if (points.length === 0) return null;
  return points.reduce<Bounds>(
    (b, p) => ({
      south: Math.min(b.south, p.lat),
      west: Math.min(b.west, p.lng),
      north: Math.max(b.north, p.lat),
      east: Math.max(b.east, p.lng),
    }),
    { south: 90, west: 180, north: -90, east: -180 },
  );
}
