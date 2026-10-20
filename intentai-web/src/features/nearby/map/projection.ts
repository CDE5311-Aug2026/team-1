// The EARTH ONLINE (City Brush) Singapore map frame: a local equirectangular projection in metres around
// 103.845 E, 1.315 N (sgreal/common.py), covering a 56 × 56 km square. Its 2D ground image
// (sg-ground.webp, 4096 px) is drawn in exactly this frame, so pins line up with the 3D model.
import type { LatLng } from '../types';

export const LON0 = 103.845;
export const LAT0 = 1.315;
export const MX = 111_290.5; // metres per degree of longitude at LAT0
export const MY = 110_574.0; // metres per degree of latitude
export const HALF = 28_000; // the square is ±28 km

export interface XY {
  x: number;
  y: number;
}

export function toXY(p: LatLng): XY {
  return { x: (p.lng - LON0) * MX, y: (p.lat - LAT0) * MY };
}

export function toLatLng(p: XY): LatLng {
  return { lat: LAT0 + p.y / MY, lng: LON0 + p.x / MX };
}

export interface View {
  /** Map centre in metres. */
  center: XY;
  /** Screen pixels per metre. */
  scale: number;
  width: number;
  height: number;
}

export const MIN_SCALE = 0.004;
export const MAX_SCALE = 0.6;
export const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
export const clampCenter = (c: XY): XY => ({
  x: Math.min(HALF, Math.max(-HALF, c.x)),
  y: Math.min(HALF, Math.max(-HALF, c.y)),
});

export function toScreen(p: XY, view: View): XY {
  return { x: (p.x - view.center.x) * view.scale + view.width / 2, y: (view.center.y - p.y) * view.scale + view.height / 2 };
}

export function fromScreen(sx: number, sy: number, view: View): XY {
  return { x: view.center.x + (sx - view.width / 2) / view.scale, y: view.center.y - (sy - view.height / 2) / view.scale };
}

/** Centre and scale that fit the points (metres) with padding in pixels. */
export function fitView(points: XY[], width: number, height: number, padding = 40, maxScale = 0.12): { center: XY; scale: number } {
  if (points.length === 0) return { center: { x: 0, y: 2000 }, scale: clampScale(Math.min(width, height) / 44_000) };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const scale = clampScale(Math.min(maxScale, (width - 2 * padding) / w, (height - 2 * padding) / h));
  return { center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, scale };
}

/** Scale that shows a circle of `radiusM` with some padding. */
export function scaleForRadius(radiusM: number, width: number, height: number, padding = 24) {
  return clampScale(Math.max(20, Math.min(width, height) / 2 - padding) / radiusM);
}

export interface Cluster<T> {
  id: string;
  x: number;
  y: number;
  items: T[];
}

/**
 * Greedy screen-space clustering: an item joins the first cluster whose centre is within `radiusPx`.
 * Deterministic for a given input (items are processed in key order).
 */
export function cluster<T extends { key: string }>(items: T[], position: (item: T) => XY, radiusPx = 26): Cluster<T>[] {
  const out: Cluster<T>[] = [];
  const sorted = [...items].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (const item of sorted) {
    const p = position(item);
    const hit = out.find((c) => Math.hypot(c.x - p.x, c.y - p.y) <= radiusPx);
    if (hit) {
      hit.items.push(item);
      const n = hit.items.length;
      hit.x += (p.x - hit.x) / n;
      hit.y += (p.y - hit.y) / n;
    } else {
      out.push({ id: item.key, x: p.x, y: p.y, items: [item] });
    }
  }
  // Means drift: merge clusters whose centres ended up closer than the radius, so targets never overlap.
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) > radiusPx) continue;
        const n = a.items.length + b.items.length;
        a.x = (a.x * a.items.length + b.x * b.items.length) / n;
        a.y = (a.y * a.items.length + b.y * b.items.length) / n;
        a.items.push(...b.items);
        out.splice(j, 1);
        merged = true;
        break;
      }
    }
  }
  for (const c of out) c.id = c.items.length === 1 ? c.items[0].key : `cluster:${c.items[0].key}:${c.items.length}`;
  return out;
}
