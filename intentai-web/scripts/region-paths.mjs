// Builds src/components/RegionMap/regionPaths.generated.ts (Redesign v2, C7): the five URA regions as SVG paths in
// the 346 × 228.3 viewBox of board 25, from the planning-area rings in src/data/ura/areas.json.
//
// Framing (see "fit" below): one transform, uniform scale + translation in projection metres so the island keeps its
// true shape, is used for both the area rings (map metres, projection.ts frame) and project(lat, lng), so pins and
// shapes always line up. Board 25's 29 draft pins set the translation. Each region's path is its areas' rings as subpaths (fill-rule nonzero);
// RegionMap hides the internal seams by filling over its own stroke. Rings are simplified to TOL px.
//
// Run: node scripts/region-paths.mjs   (no dependencies)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AREAS = resolve(ROOT, 'src/data/ura/areas.json');
const OUT = resolve(ROOT, 'src/components/RegionMap/regionPaths.generated.ts');

const VIEW_W = 346;
const VIEW_H = 228.3;
const TOL = 0.35; // px
const MIN_RING_AREA = 0.6; // px², drops specks

// projection.ts constants (read-only there; repeated so this script runs in plain node)
const LON0 = 103.845;
const LAT0 = 1.315;
const MX = 111_290.5;
const MY = 110_574.0;

// Board 25 reference pins: [name, lat, lng, x, y]. Coordinates from data/explore/places.sg.json where the place
// exists there, others are left out (no unsourced coordinates in the repo).
const REF = [
  ['Marina Bay Sands', 1.2838, 103.85941, 189, 146],
  ['Gardens by the Bay', 1.2816, 103.8636, 201, 150],
  ['Jewel Changi Airport', 1.36022, 103.98975, 289, 88],
  ['Science Centre Singapore', 1.3329, 103.7359, 101, 112],
  ['Singapore Botanic Gardens', 1.31039, 103.81636, 158, 121],
  ['Bukit Timah Nature Reserve', 1.35278, 103.77833, 128, 99],
  ['East Coast Park', 1.30317, 103.92060, 244, 116],
  ['Changi Beach Park', 1.38333, 104.00167, 284, 68],
  ['Sungei Buloh Wetland Reserve', 1.44611, 103.72889, 95, 25],
  ['Woodlands Waterfront Park', 1.4527, 103.780115, 131, 18],
  ['Punggol Waterway Park', 1.410997, 103.904815, 218, 52],
  ['Coney Island Park', 1.409913, 103.923131, 232, 44],
  ['Pulau Ubin', 1.40944, 103.96, 258, 46],
  ['Jurong Lake Gardens', 1.3339, 103.72746, 86, 100],
  ['Bukit Batok Nature Park', 1.35014, 103.7642, 111, 92],
  ['Singapore Sports Hub', 1.30444, 103.87435, 207, 129],
  ['Fort Canning Park', 1.29373, 103.84716, 180, 138],
];

// ---- fit: x = s·mx + tx, y = −s·my + ty (mx, my in projection metres, y up; no rotation or shear) ----
// Board 25's 29 pins are hand-placed drafts: a free least-squares fit to them gives ~6.7 px/km with rms ~8.5 px, and
// pushes Pulau Tekong off the right edge. Board 03's drawn region outlines are the better framing reference: they
// measure 6.24 px/km (sqrt of drawn area / URA area, within 0.5 % for all five regions), span the full 346 px width,
// and leave room at the bottom for the legend. So the scale is the board-03 value and the translation is the least-
// squares fit of the URA region centroids (area-weighted, metres) onto board 03's region centroids (px, measured from
// its path markup). The pins' residuals against this frame are printed as a check.
const BOARD_PX_PER_KM = 6.24;
const S = BOARD_PX_PER_KM / 1000;
const BOARD03_CENTROIDS = { central: [162.6, 120.1], east: [252.9, 90.0], north: [136.4, 43.3], 'north-east': [248.1, 59.0], west: [69.3, 107.0] };
const signedArea = (r) => r.reduce((t, p, i) => { const q = r[(i + 1) % r.length]; return t + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
function centroidOf(region, areas) {
  let A = 0;
  let X = 0;
  let Y = 0;
  for (const a of areas.filter((x) => x.region === region))
    for (const r of a.rings) {
      const sa = signedArea(r);
      let cx = 0;
      let cy = 0;
      r.forEach((p, i) => { const q = r[(i + 1) % r.length]; const c = p[0] * q[1] - q[0] * p[1]; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; });
      A += Math.abs(sa);
      X += (cx / (6 * sa)) * Math.abs(sa);
      Y += (cy / (6 * sa)) * Math.abs(sa);
    }
  return [X / A, Y / A];
}
const uraAreas = JSON.parse(readFileSync(AREAS, 'utf8')).areas;
const cents = Object.entries(BOARD03_CENTROIDS).map(([id, [x, y]]) => { const [mx, my] = centroidOf(id, uraAreas); return { mx, my, x, y }; });
const TX = cents.reduce((t, p) => t + p.x - S * p.mx, 0) / cents.length;
const TY = cents.reduce((t, p) => t + p.y + S * p.my, 0) / cents.length;
const fromMetres = (mx, my) => [S * mx + TX, -S * my + TY];
const m = REF.map(([, lat, lng, x, y]) => ({ mx: (lng - LON0) * MX, my: (lat - LAT0) * MY, x, y }));
const n = m.length;

const residuals = m.map((p) => {
  const [x, y] = fromMetres(p.mx, p.my);
  return Math.hypot(x - p.x, y - p.y);
});
const rms = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / n);
const max = Math.max(...residuals);
console.log(`fit: ${(S * 1000).toFixed(4)} px/km · rms ${rms.toFixed(2)} px · max ${max.toFixed(2)} px`);
REF.forEach(([name], i) => residuals[i] > 6 && console.log(`  ${name}: ${residuals[i].toFixed(1)} px`));

// ---- simplify (Douglas–Peucker on a closed ring) ----
function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  let best = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > best) [best, idx] = [d, i];
  }
  if (best <= tol) return [pts[0], pts[pts.length - 1]];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}
function simplifyRing(ring) {
  // split at the point farthest from the first, so the closed ring keeps both halves
  let far = 0;
  let fd = -1;
  ring.forEach((p, i) => {
    const d = Math.hypot(p[0] - ring[0][0], p[1] - ring[0][1]);
    if (d > fd) [fd, far] = [d, i];
  });
  const a = dp(ring.slice(0, far + 1), TOL);
  const b = dp([...ring.slice(far), ring[0]], TOL);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}
const ringArea = (r) => Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const f1 = (v) => (Math.round(v * 10) / 10).toString();

// ---- regions ----
const ura = JSON.parse(readFileSync(AREAS, 'utf8'));
const paths = {};
const label = {};
for (const { id } of ura.regions) {
  const parts = [];
  let ax = 0;
  let ay = 0;
  let aw = 0;
  for (const area of ura.areas.filter((a) => a.region === id)) {
    for (const ring of area.rings) {
      const px = ring.map(([mx, my]) => fromMetres(mx, my));
      const s = simplifyRing(px);
      const A = ringArea(s);
      if (s.length < 3 || A < MIN_RING_AREA) continue;
      // label weight: area-weighted vertex mean of the bigger rings
      const mxp = s.reduce((t, p) => t + p[0], 0) / s.length;
      const myp = s.reduce((t, p) => t + p[1], 0) / s.length;
      ax += mxp * A;
      ay += myp * A;
      aw += A;
      parts.push('M' + s.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z');
    }
  }
  paths[id] = parts.join('');
  label[id] = { x: Math.round((ax / aw) * 10) / 10, y: Math.round((ay / aw) * 10) / 10 };
}
// Board 03 places the labels by hand where they read best; keep those (they sit inside the fitted shapes).
const BOARD_LABELS = { central: [162.4, 123.4], east: [252.9, 94], north: [135.9, 47.5], 'north-east': [194, 69], west: [67.4, 107] };
for (const [id, [x, y]] of Object.entries(BOARD_LABELS)) label[id] = { x, y };

const ts = `// GENERATED by scripts/region-paths.mjs from src/data/ura/areas.json — do not edit by hand.
// URA Master Plan 2019 planning-area outlines (Singapore Open Data Licence v1.0), merged per region and projected
// into the 346 × 228.3 viewBox of board 25 (${BOARD_PX_PER_KM} px/km; board 25's 29 draft pins sit rms ${rms.toFixed(2)} px, max ${max.toFixed(2)} px from it).
import type { RegionId } from '../../data/ura/ura';

export const VIEWBOX = { width: ${VIEW_W}, height: ${VIEW_H} } as const;

/** URA regions in areas.json order, with their display names. */
export const REGION_IDS: readonly RegionId[] = ${JSON.stringify(ura.regions.map((r) => r.id))};
export const REGION_NAMES: Record<RegionId, string> = ${JSON.stringify(Object.fromEntries(ura.regions.map((r) => [r.id, r.name])))};

/** Map metres (projection.ts frame) per viewBox px is 1 / SCALE. */
const SCALE = ${S.toPrecision(10)};
const TX = ${TX.toPrecision(10)};
const TY = ${TY.toPrecision(10)};

/** lat/lng → viewBox x, y (same transform as the region paths). */
export function project(lat: number, lng: number): { x: number; y: number } {
  return { x: SCALE * (lng - ${LON0}) * ${MX} + TX, y: -SCALE * (lat - ${LAT0}) * ${MY} + TY };
}

export const REGION_LABEL_AT: Record<RegionId, { x: number; y: number }> = ${JSON.stringify(label)};

export const REGION_PATHS: Record<RegionId, string> = {
${Object.entries(paths).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};
`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, ts);
console.log(`wrote ${OUT} (${(Buffer.byteLength(ts) / 1024).toFixed(1)} KB)`);
