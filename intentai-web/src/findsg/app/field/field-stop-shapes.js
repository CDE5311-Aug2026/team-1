/* Hunt (2 Nov 2026): shapes shared by the bespoke stop builders (field-stops*.js). */
import {rect} from './field-kit.js';

export const PI = Math.PI;
export const mat = (color, roughness = .88, extra = {}) => ({color, roughness, ...extra});

export function semi(r, cu, cv, n = 8) {const pts = [[cu + r, cv]]; for (let i = 1; i < n; i++) {const a = i / n * PI; pts.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]);} pts.push([cu - r, cv]); return pts;}
/** a crescent standing in a wall frame, horns up */
export function crescent(k, m, frame, cu, cv, r, w = .012) {
  const outer = [], inner = [];
  for (let i = 0; i <= 12; i++) {
    const a = PI * .18 + i / 12 * PI * 1.64;
    outer.push([cu + Math.sin(a) * r, cv - Math.cos(a) * r]);
    inner.push([cu + Math.sin(a) * r * .72 + r * .12, cv - Math.cos(a) * r * .78 + r * .05]);
  }
  const list = [];
  for (const off of [-w, w]) for (let i = 0; i < 12; i++) list.push([frame(...outer[i], off), frame(...outer[i + 1], off), frame(...inner[i + 1], off), frame(...inner[i], off)]);
  k.triangles(m, list);
}
export const towerFrames = (cx, cz, hw) => [
  (u, v, w = 0) => [cx + u, v, cz + hw + w], (u, v, w = 0) => [cx - u, v, cz - hw - w],
  (u, v, w = 0) => [cx + hw + w, v, cz - u], (u, v, w = 0) => [cx - hw - w, v, cz + u],
];
export function curvedRoof(k, m, cx, cz, w, d, y0, h, lift = .12, gableMat = null) {
  const rows = 6, cols = 10, list = [];
  const P = (i, j, side) => {const x = -w / 2 + w * i / cols, sl = j / rows, ex = Math.abs(2 * x / w) ** 4; return [cx + x, y0 + h * sl ** 1.6 + lift * (1 - sl) * ex, cz + side * d / 2 * (1 - sl)];};
  for (const side of [-1, 1]) for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) list.push([P(i, j, side), P(i + 1, j, side), P(i + 1, j + 1, side), P(i, j + 1, side)]);
  k.triangles(m, list);
  if (gableMat) for (const i of [0, cols]) {const ring = []; for (let j = 0; j <= rows; j++) ring.push(P(i, j, -1)); for (let j = rows - 1; j >= 0; j--) ring.push(P(i, j, 1)); const base = [P(i, 0, -1)[0], y0, cz]; k.triangles(gableMat, ring.slice(0, -1).map((v, n) => [base, v, ring[n + 1]]));}
}
export function swallowRidge(k, m, cx, cz, a, y, sag = -.06, curl = .5, r = .045) {
  const pts = []; for (let i = 0; i <= 12; i++) {const x = -a + 2 * a * i / 12; pts.push([cx + x, y + sag * (1 - (x / a) ** 2), cz]);}
  k.tube(m, pts, r, 6);
  for (const s of [-1, 1]) for (const dz of [-1, 1]) {
    const tail = []; for (let i = 0; i <= 7; i++) {const t = i / 7; tail.push([cx + s * (a + t * .42), y + curl * t ** 1.9, cz + dz * .05 * t]);}
    k.tube(m, tail, t => r * (1 - t * .6), 5);
  }
}
