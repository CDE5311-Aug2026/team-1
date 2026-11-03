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
/** Street level: about OneMap's zoom 19 on a standard screen (3 px per metre). */
export const MAX_SCALE = 3;
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

/* ---------- OneMap basemap tiles (Singapore Land Authority) ---------- */

/**
 * OneMap's Default basemap: Web Mercator (EPSG:3857) XYZ tiles, zoom 11–19, within its published bounds
 * (https://www.onemap.gov.sg/docs/maps/). Its terms require the OneMap logo and attribution wherever it is shown.
 */
export const ONEMAP = {
  minZoom: 11,
  maxZoom: 19,
  sw: { lat: 1.144, lng: 103.535 },
  ne: { lat: 1.494, lng: 104.502 },
  url: (z: number, x: number, y: number) => `https://www.onemap.gov.sg/maps/tiles/Default/${z}/${x}/${y}.png`,
};
/** Tiles fade in over the ground picture between these scales (px per metre): streets and buildings from here on. */
export const TILES_FROM = 0.03;
export const TILES_FULL = 0.05;

/** Web Mercator metres per tile pixel at zoom 0 on the equator. */
const MERCATOR_M_PER_PX = 156_543.033_92;

/** The tile zoom whose pixels match `scale` (px per metre) on a screen of `dpr`, within OneMap's range. */
export function tileZoom(scale: number, dpr = 1): number {
  const z = Math.round(Math.log2(scale * dpr * MERCATOR_M_PER_PX * Math.cos((LAT0 * Math.PI) / 180)));
  return Math.min(ONEMAP.maxZoom, Math.max(ONEMAP.minZoom, z));
}

/** The north-west corner of tile (x, y) at zoom z. */
export function tileCorner(x: number, y: number, z: number): LatLng {
  const n = 2 ** z;
  return { lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI, lng: (x / n) * 360 - 180 };
}

/** The tile (fractional x, y) at a point. */
export function tileAt(p: LatLng, z: number): XY {
  const n = 2 ** z;
  const lat = (p.lat * Math.PI) / 180;
  return { x: ((p.lng + 180) / 360) * n, y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n };
}

export interface Tile {
  key: string;
  url: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The OneMap tiles at zoom z that cover the view, placed on screen by projecting each tile's corners into the map
 * frame (edges rounded to whole pixels so neighbours meet without seams). Empty beyond `max` tiles.
 */
export function viewTiles(view: View, z: number, max = 120): Tile[] {
  const a = toLatLng(fromScreen(0, 0, view));
  const b = toLatLng(fromScreen(view.width, view.height, view));
  const north = Math.min(ONEMAP.ne.lat, a.lat);
  const south = Math.max(ONEMAP.sw.lat, b.lat);
  const west = Math.max(ONEMAP.sw.lng, a.lng);
  const east = Math.min(ONEMAP.ne.lng, b.lng);
  if (north <= south || east <= west) return [];
  const nw = tileAt({ lat: north, lng: west }, z);
  const se = tileAt({ lat: south, lng: east }, z);
  const [x0, x1, y0, y1] = [Math.floor(nw.x), Math.floor(se.x), Math.floor(nw.y), Math.floor(se.y)];
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > max) return [];
  const tiles: Tile[] = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const p = toScreen(toXY(tileCorner(x, y, z)), view);
      const q = toScreen(toXY(tileCorner(x + 1, y + 1, z)), view);
      const left = Math.round(p.x);
      const top = Math.round(p.y);
      tiles.push({ key: `${z}/${x}/${y}`, url: ONEMAP.url(z, x, y), left, top, width: Math.round(q.x) - left, height: Math.round(q.y) - top });
    }
  return tiles;
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
 * Pins that are never merged (numbered route stops), pushed apart on screen until no two are closer than `minPx`,
 * so each keeps its own target (WCAG 2.5.8). Each pair moves apart along the line between them, half each; pins on
 * the same spot split left and right. Positions already far enough apart are unchanged.
 */
export function spread<T extends { key: string }>(items: T[], position: (item: T) => XY, minPx: number): Cluster<T>[] {
  const out: Cluster<T>[] = items.map((item) => ({ id: item.key, ...position(item), items: [item] }));
  for (let round = 0; round < 30; round++) {
    let moved = false;
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d >= minPx - 0.01) continue;
        const ux = d > 0.01 ? (b.x - a.x) / d : 1;
        const uy = d > 0.01 ? (b.y - a.y) / d : 0;
        const push = (minPx - d) / 2;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        moved = true;
      }
    if (!moved) break;
  }
  return out;
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
