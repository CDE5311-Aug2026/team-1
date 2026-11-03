/* Hunt (2 Nov 2026): bespoke miniatures for the Telok Ayer stops not drawn in field-stops.js.
 * Fuk Tak Chi (No. 76), Ying Fo Fui Kun (No. 98) and Chong Wen Ge (No. 168). Same conventions as field-stops.js:
 * front (+z) is Telok Ayer Street, model units are about 1 : 3.3, interpretive after public photographs. */
import {rect, ring, frontAt, backAt, sideAt} from '../field-kit.js';
import {PI, mat, swallowRidge} from '../field-stop-shapes.js';

const lerp = (a, b, t) => a + (b - a) * t;
/** xz outline of a regular n-gon with apothem r, one flat face looking down +z */
const ngon = (r, cx = 0, cz = 0, n = 8) => Array.from({length: n}, (_, i) => {const a = (i + .5) / n * 2 * PI, R = r / Math.cos(PI / n); return [cx + Math.sin(a) * R, cz + Math.cos(a) * R];});
/** wall frame on face `th` (radians from +z) of an n-gon with apothem r */
const polyFrame = (cx, cz, r, th) => (u, v, w = 0) => [cx + Math.sin(th) * (r + w) + Math.cos(th) * u, v, cz + Math.cos(th) * (r + w) - Math.sin(th) * u];
const quads = (P, nu, nt, u0 = -1, u1 = 1) => {
  const list = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nt; j++) {const a = lerp(u0, u1, i / nu), b = lerp(u0, u1, (i + 1) / nu), s = j / nt, t = (j + 1) / nt; list.push([P(a, s), P(b, s), P(b, t), P(a, t)]);}
  return list;
};
const fan = pts => {const c = [0, 0, 0]; pts.forEach(p => {c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; c[2] += p[2] / pts.length;}); return pts.map((p, i) => [c, p, pts[(i + 1) % pts.length]]);};
/** side-wall frame whose u is simply z (so one rect fits either side); s = +1 faces +x */
const zside = (x, s) => (z, v, w = 0) => [x + w * s, v, z];
const up = (p, dy) => [p[0], p[1] + dy, p[2]];
/** eave fascia (a board hanging under an eave line) and a glazed roll along it */
function eave(k, pts, fascia, trim, drop = .06, r = .026) {
  if (fascia) k.triangles(fascia, pts.slice(1).map((p, i) => [pts[i], p, up(p, -drop), up(pts[i], -drop)]));
  if (trim) k.tube(trim, pts.map(p => up(p, .012)), r, 5);
}

/* Chinese roof along x with a concave profile and upturned corners. tb = 0 is a gable roof, tb = 1 a hipped roof, and
 * anything between is the hip-and-gable (xieshan) roof: hipped skirts below, gable triangles above. a = half ridge. */
function roofX(k, m, o) {
  const {cx = 0, cz = 0, w, d, y0, h, tb = 0, lift = .1, ends = [1, 1], cols = 10, rows = 6} = o, W = w / 2, D = d / 2, a = o.a ?? W;
  const H = t => y0 + h * (.3 * t + .7 * t * t), xw = t => tb > 0 ? W - (W - a) * Math.min(1, t / tb) : W;
  const L = (u, t, e) => lift * Math.abs(u) ** 4 * (1 - t) ** 2 * ends[e < 0 ? 0 : 1];
  const F = (s, u, t) => [cx + u * xw(t), H(t) + L(u, t, u), cz + s * D * (1 - t)];
  const E = (e, u, t) => {const q = t * tb; return [cx + e * (W - (W - a) * t), H(q) + L(u, q, e), cz + u * D * (1 - q)];};
  const er = Math.max(2, Math.round(rows * tb)), list = [];
  for (const s of [-1, 1]) list.push(...quads((u, t) => F(s, u, t), cols, rows));
  if (tb > 0) for (const e of [-1, 1]) list.push(...quads((u, t) => E(e, u, t), 4, er));
  k.triangles(m, list);
  if (o.roll) {
    for (const s of [-1, 1]) for (let i = 1; i <= o.rolls; i++) {const u = -1 + 2 * i / (o.rolls + 1), pts = []; for (let j = 0; j <= rows; j++) pts.push(up(F(s, u, j / rows), .016)); k.tube(o.roll, pts, .014, 3);}
    if (tb > 0) for (const e of [-1, 1]) for (let i = 1; i <= 3; i++) {const u = -1 + i / 2, pts = []; for (let j = 0; j <= er; j++) pts.push(up(E(e, u, j / er), .016)); k.tube(o.roll, pts, .014, 3);}
  }
  for (const s of [-1, 1]) eave(k, Array.from({length: cols + 1}, (_, i) => F(s, -1 + 2 * i / cols, 0)), o.fascia, o.trim);
  if (tb > 0) for (const e of [-1, 1]) eave(k, Array.from({length: 5}, (_, i) => E(e, -1 + i / 2, 0)), o.fascia, o.trim);
  if (o.trim) for (const s of [-1, 1]) for (const e of [-1, 1]) {
    if (tb > 0 && ends[e < 0 ? 0 : 1] > 0) {const pts = [0, .25, .5, .75, 1].map(t => up(F(s, e, t * tb), .02)); k.tube(o.hip || o.trim, [up([pts[0][0] + e * .1, pts[0][1], pts[0][2] + s * .1], .11), ...pts], .03, 5);}
    if (tb < 1 && (tb > 0 || ends[e < 0 ? 0 : 1] > 0)) k.tube(o.hip || o.trim, [0, .2, .4, .6, .8, 1].map(t => up(F(s, e, lerp(tb, 1, t)), .02)), .028, 5);
  }
  if (o.gable && tb < 1) for (const e of [-1, 1]) {
    if (!ends[e < 0 ? 0 : 1] && o.cut) continue;
    const pts = [];
    for (let j = 0; j <= 6; j++) pts.push(F(-1, e, lerp(tb, 1, j / 6)));
    for (let j = 5; j >= 0; j--) pts.push(F(1, e, lerp(tb, 1, j / 6)));
    if (o.gBase != null) {const p = F(1, e, tb), q = F(-1, e, tb); pts.push([p[0], o.gBase, p[2]], [q[0], o.gBase, q[2]]);}
    k.triangles(o.gable, fan(pts));
  }
  return {F, H, top: H(1), a};
}
/* Octagonal (n-sided) concave roof skirt from apothem r0 at the eave to r1 at the top, corners turned up. */
function octRoof(k, m, o) {
  const {cx, cz, r0, r1 = 0, y0, h, lift = .1, n = 8, rows = 5, cols = 4} = o, half = Math.tan(PI / n);
  const H = t => y0 + h * (.3 * t + .7 * t * t);
  const P = (i, u, t) => {const th = i * 2 * PI / n, R = lerp(r0, r1, t); return [cx + Math.sin(th) * R + Math.cos(th) * u * R * half, H(t) + lift * Math.abs(u) ** 4 * (1 - t) ** 2, cz + Math.cos(th) * R - Math.sin(th) * u * R * half];};
  const list = [];
  for (let i = 0; i < n; i++) list.push(...quads((u, t) => P(i, u, t), cols, rows));
  k.triangles(m, list);
  for (let i = 0; i < n; i++) {
    eave(k, Array.from({length: cols + 1}, (_, j) => P(i, -1 + 2 * j / cols, 0)), o.fascia, o.trim, .05, .022);
    if (o.trim) {const c = P(i, 1, 0), dx = c[0] - cx, dz = c[2] - cz, l = Math.hypot(dx, dz); k.tube(o.hip || o.trim, [[c[0] + dx / l * .1, c[1] + .12, c[2] + dz / l * .1], ...[0, .25, .5, .75, 1].map(t => up(P(i, 1, t), .02))], .026, 5);}
  }
  return H(1);
}

/* ---- facade bits ---- */
const GLYPHS = [
  [[-.5, .5, .36, .48], [-.06, .06, -.5, .5], [-.42, .42, -.48, -.36], [-.42, -.3, -.2, .2], [.3, .42, -.2, .2]],
  [[-.5, -.38, -.5, .5], [-.25, .5, .36, .48], [-.2, .45, -.06, .06], [-.25, .5, -.48, -.36], [.33, .45, -.48, .48]],
  [[-.5, .5, .38, .5], [-.5, .5, -.06, .06], [-.3, -.18, -.5, .5], [.18, .3, -.5, .38], [-.5, .5, -.5, -.38]],
  [[-.45, .45, .3, .42], [-.5, -.38, -.5, .3], [.38, .5, -.5, .3], [-.25, .25, -.1, .02], [-.5, .5, -.5, -.38]],
];
/** a lacquered name board with a gold frame and n abstract gold characters (vertical boards read top-down) */
function board(k, C, F, cu, cv, bw, bh, n, w0 = 0, vertical = false, face = C.dark) {
  k.slab(C.gold, rect(cu - bw / 2, cu + bw / 2, cv - bh / 2, cv + bh / 2), F, w0, w0 + .03);
  k.slab(face, rect(cu - bw / 2 + .022, cu + bw / 2 - .022, cv - bh / 2 + .022, cv + bh / 2 - .022), F, w0 + .03, w0 + .036);
  const L = vertical ? bh : bw, g = Math.min(L / (n + .7), (vertical ? bw : bh) - .06) * .72;
  for (let i = 0; i < n; i++) {
    const t = (i - (n - 1) / 2) * L / (n + .7), gu = vertical ? cu : cu + t, gv = vertical ? cv - t : cv;
    glyph(k, C.gold, F, gu, gv, g, i * 3 + n, w0 + .036);
  }
}
function glyph(k, m, F, gu, gv, g, idx, w) {for (const [a, b, c, d] of GLYPHS[idx % 4]) k.slab(m, rect(gu + a * g, gu + b * g, gv + c * g, gv + d * g), F, w, w + .01);}
/** an arch band (annulus between radii r0 and r1 about (cu, sp)) laid on a wall */
function archBand(k, m, F, cu, sp, r0, r1, w, n = 12, a0 = 0, a1 = PI) {
  const P = (r, a) => F(cu + Math.cos(a) * r, sp + Math.sin(a) * r, w);
  k.triangles(m, Array.from({length: n}, (_, i) => {const a = lerp(a0, a1, i / n), b = lerp(a0, a1, (i + 1) / n); return [P(r0, a), P(r0, b), P(r1, b), P(r1, a)];}));
}
/** a granite guardian lion on its pedestal, looking along +z */
function lion(k, m, x, z, y = 0) {
  k.block(m, .2, .16, .22, x, y, z);
  k.block(m, .22, .03, .24, x, y + .16, z);
  k.block(m, .12, .1, .17, x, y + .19, z - .01);
  k.lathe(m, [[.001, 0], [.065, .02], [.075, .08], [.06, .13], [.001, .15]], x, z + .04, 8, 0, y + .23);
  k.lathe(m, [[.001, 0], [.035, .01], [.04, .04], [.001, .06]], x, z + .1, 6, 0, y + .27);
}
/** painted door gods on a pair of leaves */
function doorGods(k, C, F, cu, v0, lw, lh, w) {
  for (const s of [-1, 1]) {
    const u = cu + s * lw / 2, m = s < 0 ? C.blue : C.yel;
    k.shape(m, [[u - lw * .34, v0 + lh * .08], [u + lw * .34, v0 + lh * .08], [u + lw * .26, v0 + lh * .62], [u - lw * .26, v0 + lh * .62]], F, w);
    k.shape(C.gold, ring(lw * .13, 10, u, v0 + lh * .72), F, w);
    k.shape(C.dark, rect(u - lw * .16, u + lw * .16, v0 + lh * .8, v0 + lh * .88), F, w + .002);
    k.shape(C.gold, rect(u - lw * .4, u + lw * .4, v0 + lh * .62, v0 + lh * .65), F, w + .002);
  }
}
/** a barred opening: dark backing and vertical bars */
function grille(k, F, u0, u1, v0, v1, n, back, bar, w = 0, bw = .018) {
  k.shape(back, rect(u0, u1, v0, v1), F, w);
  for (let i = 1; i <= n; i++) {const u = lerp(u0, u1, i / (n + 1)); k.slab(bar, rect(u - bw, u + bw, v0, v1), F, w, w + .03);}
}
/** timber window with a frame, two louvred leaves and a hood */
function louvred(k, F, cu, v0, v1, hw, frame, leaf, w = 0) {
  k.slab(frame, rect(cu - hw - .045, cu + hw + .045, v0 - .045, v1 + .03), F, w, w + .025);
  k.slab(frame, rect(cu - hw - .07, cu + hw + .07, v0 - .07, v0 - .03), F, w, w + .06);
  k.slab(frame, rect(cu - hw - .07, cu + hw + .07, v1 + .03, v1 + .08), F, w, w + .07);
  k.shape(leaf, rect(cu - hw, cu + hw, v0, v1), F, w + .028);
  for (let v = v0 + .04; v < v1 - .03; v += .062) k.slab(leaf, rect(cu - hw + .015, cu + hw - .015, v, v + .024), F, w + .028, w + .042);
  k.slab(frame, rect(cu - .008, cu + .008, v0, v1), F, w + .028, w + .046);
}
function lantern(k, C, x, y, z, r = .09) {
  k.lathe(C.lamp, [[.001, 0], [r * .6, r * .1], [r, r * .6], [r, r * 1.2], [r * .6, r * 1.7], [.001, r * 1.8]], x, z, 10, 0, y);
  k.lathe(C.gold, [[r * .45, 0], [r * .45, r * .18]], x, z, 8, 0, y + r * 1.72);
  k.lathe(C.gold, [[r * .45, 0], [r * .45, r * .18]], x, z, 8, 0, y - r * .1);
  k.block(C.gold, .012, r * .9, .012, x, y - r, z);
}
/** a pedestrian for scale (about 1.75 m) */
function person(k, cloth, skin, x, z, ry = 0) {
  for (const s of [-1, 1]) k.block(cloth, .05, .21, .055, x + Math.cos(ry) * s * .038, .1, z - Math.sin(ry) * s * .038, ry);
  k.lathe(cloth, [[.055, 0], [.075, .04], [.075, .14], [.055, .18], [.025, .2]], x, z, 8, 0, .31);
  k.lathe(skin, [[.001, 0], [.03, .01], [.038, .04], [.03, .07], [.001, .08]], x, z, 8, 0, .5);
}

/* ===== Fuk Tak Chi (1824; restored 1998 as a museum), 76 Telok Ayer Street =====
 * The Hakka and Cantonese earth-god temple, now a museum within Far East Square (its neighbours are left out). Red and white: a granite-based
 * white front with barred stone windows, the recessed porch with red doors and door gods, the black-and-gold name
 * board set on the wall right over the entrance under a red eave beam on carved brackets; the entrance hall under a
 * hip-and-gable roof with curled corners, a cut-porcelain ridge and the gourd on top; a small airwell, then the main
 * hall with a swallowtail ridge; at the back the glass doors through to Far East Square. Front (+z) is the street. */
function fukTakChi(k, M) {
  const C = {wall: mat('#f2ede2', .9), gran: mat('#a9a397', .95), red: mat('#9b2b20', .65), tile: mat('#a65440', .9), tile2: mat('#87402f', .9), green: mat('#3f7b54', .55),
    dark: mat('#29211c', .75), gold: M.gold, wood: mat('#6a4630', .8), lamp: mat('#d8382a', .6, {emissive: '#ff4a22', emissiveIntensity: .35}),
    blue: mat('#3d6fb8', .6), yel: mat('#e2b93b', .6)};
  const HX = 1.55, ZF = 1.55, ZP = 1.22, ZH = .62, ZM = -.42, ZB = -1.9, YF = 1.56, YM = 1.72;
  k.box(C.gran, -HX - .05, HX + .05, 0, .1, ZB - .05, ZF + .04);
  k.box(C.gran, -.78, .78, 0, .06, ZF, ZF + .3);
  // entrance hall: side bays, door wall at the back of the porch, the mass over the porch
  for (const s of [-1, 1]) k.box(C.wall, s * .72, s * HX, .1, YF, ZH, ZF);
  k.box(C.wall, -.72, .72, .1, YF, ZH, ZP);
  k.box(C.wall, -.72, .72, 1.1, YF, ZP, ZF);
  const F = frontAt(ZF), G = frontAt(ZP);
  for (const s of [-1, 1]) {
    const u0 = s < 0 ? -HX : .72, u1 = s < 0 ? -.72 : HX, um = (u0 + u1) / 2;
    k.slab(C.gran, rect(u0, u1, .1, .44), F, 0, .025);
    k.slab(C.gran, rect(u0 + .07, u1 - .07, .16, .38), F, .025, .04);
    k.slab(C.gran, rect(um - .27, um + .27, .58, 1.14), F, 0, .03);
    grille(k, F, um - .21, um + .21, .64, 1.08, 6, C.dark, C.gran, .031);
    k.slab(C.wall, rect(u0, u1, 1.18, 1.42), F, 0, .02);
    [C.blue, C.yel, C.blue].forEach((m, i) => k.shape(m, rect(u0 + .08 + i * (u1 - u0 - .16) / 3 + .02, u0 + .08 + (i + 1) * (u1 - u0 - .16) / 3 - .02, 1.22, 1.38), F, .022));
    // porch jambs: granite pilasters carrying red couplet boards
    k.slab(C.gran, rect(s * .72 - .07, s * .72 + .07, .1, 1.14), F, 0, .045);
    board(k, C, F, s * .78 + s * .08, .66, .13, .78, 5, .03, true, C.red);
    lantern(k, C, s * .46, .78, ZF - .08, .085);
  }
  k.slab(C.gran, rect(-.79, .79, 1.08, 1.15), F, 0, .05);
  board(k, C, F, 0, 1.3, .96, .29, 3, .02);
  for (const s of [-1, 1]) k.shape(C.gold, ring(.045, 10, s * .58, 1.3), F, .03);
  // red eave beam on carved brackets
  k.slab(C.red, rect(-HX - .02, HX + .02, 1.45, 1.56), F, 0, .07);
  for (const u of [-1.38, -1.0, -.62, -.25, .25, .62, 1.0, 1.38]) {k.block(C.wood, .07, .1, .14, u, 1.46, ZF + .1); k.block(C.gold, .05, .03, .05, u, 1.56, ZF + .16);}
  // inside the porch: granite door frame, red doors with door gods, threshold
  k.slab(C.gran, rect(-.44, .44, .1, 1.02), G, 0, .025);
  k.shape(C.red, rect(-.37, .37, .1, .97), G, .028);
  k.shape(C.dark, rect(-.006, .006, .1, .97), G, .031);
  doorGods(k, C, G, 0, .14, .36, .78, .031);
  k.box(C.gran, -.42, .42, .1, .15, ZP, ZP + .07);
  // hip-and-gable roof over the entrance hall, cut-porcelain ridge, swallowtails and the gourd
  const r1 = roofX(k, C.tile, {cz: 1.08, w: 3.62, d: 1.72, y0: 1.58, h: .74, a: 1.0, tb: .5, lift: .15, gable: C.wall, trim: C.green, fascia: C.red, roll: C.tile2, rolls: 15});
  k.shape(C.gold, [[-.07, 0], [.07, 0], [0, -.1]].map(([u, v]) => [u, r1.top - .12 + v]), sideAt(1.02, 1, 1.08), .01);
  k.box(C.wall, -.92, .92, r1.top - .06, r1.top + .14, 1.03, 1.13);
  [C.blue, C.yel, C.green, C.yel, C.blue].forEach((m, i) => k.shape(m, rect(-.82 + i * .33, -.58 + i * .33, r1.top - .02, r1.top + .1), frontAt(1.131), 0));
  swallowRidge(k, C.green, 0, 1.08, .94, r1.top + .16, -.03, .34, .035);
  k.lathe(C.gold, [[.001, 0], [.05, .02], [.075, .07], [.045, .13], [.035, .14], [.055, .19], [.035, .24], [.001, .27]], 0, 1.08, 10, 0, r1.top + .17);
  // airwell with side corridors and an urn
  for (const s of [-1, 1]) {
    k.box(C.wall, s * 1.05, s * HX, .1, 1.3, ZM, ZH);
    k.triangles(C.tile, [[[s * 1.0, 1.24, ZM], [s * 1.0, 1.24, ZH], [s * (HX + .05), 1.48, ZH], [s * (HX + .05), 1.48, ZM]]]);
    k.slab(C.red, rect(ZM, ZH, 1.17, 1.24), zside(s * 1.05, -s), 0, .03);
  }
  k.box(C.gran, -1.05, 1.05, .1, .12, ZM, ZH);
  k.lathe(C.gold, [[.12, 0], [.16, .08], [.16, .16], [.1, .2], [.12, .23]], 0, .1, 12, 0, .12);
  // main hall with a gable roof and the tallest ridge
  k.box(C.wall, -HX, HX, .1, YM, ZB, ZM);
  const Mf = frontAt(ZM);
  k.shape(C.red, rect(-.62, .62, .12, 1.22), Mf, .01);
  for (const u of [-.32, 0, .32]) k.shape(C.gold, rect(u - .006, u + .006, .12, 1.22), Mf, .014);
  board(k, C, Mf, 0, 1.4, .7, .2, 3, .01);
  const r2 = roofX(k, C.tile, {cz: -1.16, w: 3.16, d: 1.86, y0: YM, h: .8, tb: 0, lift: .07, gable: C.wall, gBase: YM - .01, trim: C.green, fascia: C.red, roll: C.tile2, rolls: 13});
  k.box(C.wall, -1.2, 1.2, r2.top - .06, r2.top + .15, -1.21, -1.11);
  [C.yel, C.blue, C.green, C.blue, C.yel].forEach((m, i) => {k.shape(m, rect(-1.08 + i * .44, -.8 + i * .44, r2.top - .02, r2.top + .1), frontAt(-1.109), 0); k.shape(m, rect(-1.08 + i * .44, -.8 + i * .44, r2.top - .02, r2.top + .1), backAt(-1.211), 0);});
  swallowRidge(k, C.green, 0, -1.16, 1.22, r2.top + .17, -.04, .42, .04);
  k.lathe(C.gold, [[.001, 0], [.07, .05], [.001, .14]], 0, -1.16, 10, 0, r2.top + .15);
  // the sides and back: granite dado, painted frieze, high vents; glass doors through to Far East Square
  for (const s of [-1, 1]) {
    const S = zside(s * HX, s);
    k.slab(C.gran, rect(ZB, ZF, .1, .44), S, 0, .02);
    k.slab(C.wall, rect(ZH + .05, ZF - .05, 1.2, 1.44), S, 0, .02);
    k.slab(C.wall, rect(ZB + .05, ZM - .05, 1.34, 1.6), S, 0, .02);
    for (const [u0, u1, v0, v1] of [[ZH + .1, ZF - .1, 1.24, 1.4], [ZB + .1, ZM - .1, 1.38, 1.56]]) for (let i = 0; i < 3; i++) k.shape(i % 2 ? C.yel : C.blue, rect(lerp(u0, u1, i / 3) + .03, lerp(u0, u1, (i + 1) / 3) - .03, v0, v1), S, .022);
    for (const u of [1.1, -.9, -1.5]) {k.slab(C.gran, rect(u - .16, u + .16, .78, 1.0), S, 0, .025); grille(k, S, u - .12, u + .12, .81, .97, 4, C.dark, C.gran, .026, .012);}
  }
  const B = backAt(ZB);
  k.slab(C.gran, rect(-HX, HX, .1, .44), B, 0, .02);
  k.slab(C.red, rect(-.5, .5, .1, 1.18), B, 0, .03);
  k.shape(C.dark, rect(-.43, .43, .1, 1.12), B, .032);
  k.shape(C.red, rect(-.01, .01, .1, 1.12), B, .034);
  for (const s of [-1, 1]) {k.shape(C.gran, ring(.17, 16, s * 1.0, 1.15), B, .01); k.shape(C.green, ring(.13, 16, s * 1.0, 1.15), B, .014); k.slab(C.gran, rect(s - .13, s + .13, 1.135, 1.165), B, .014, .03); k.slab(C.gran, rect(s - .015, s + .015, 1.02, 1.28), B, .014, .03);}
  k.slab(C.wall, rect(-HX, HX, 1.36, 1.62), B, 0, .02);
  return {
    baseWidth: 5.2, detail: [0, 1.25, ZF], overview: [0, 1.45, 0], distance: 10.8, elevation: .2,
    front: ZF + .04, back: ZB - .04,
    anchors: {
      'back-envelope': {position: [0, .98, ZB - .12]}, 'front-envelope': {position: [0, 1.3, ZF + .24]},
      plaque: {position: [0, 1.3, ZF + .1], scale: .6}, 'front-door': {position: [0, .6, ZP + .1], scale: .6}, roof: {position: [0, r1.top, 1.08]},
    },
  };
}

/* ===== Ying Fo Fui Kun (1881-82), 98 Telok Ayer Street =====
 * The Hakka clan house of the five counties: a broad, white two-storey front on a granite base, five bays between
 * pilasters, the ground-floor windows set high above the street behind iron bars (the tulou habit of keeping openings
 * out of reach), louvred windows upstairs, the arched entrance on two Doric columns with the name board in the arch,
 * a painted frieze under the eaves; behind, an airwell and the taller main hall. Hard gables at both ends. A passer-by
 * stands on the pavement for scale. Front (+z) is the street. */
function yingFoFuiKun(k, M) {
  const C = {wall: mat('#f1ece0', .9), trim: mat('#e2d8bf', .85), gran: mat('#a39d92', .95), tile: mat('#a65a42', .9), tile2: mat('#874632', .9), green: mat('#3f7b54', .55),
    shut: mat('#2f5e4e', .7), dark: mat('#262220', .75), door: mat('#5b2a20', .7), gold: M.gold, blue: mat('#4a72a8', .6), yel: mat('#d9b244', .6),
    lamp: mat('#d8382a', .6, {emissive: '#ff4a22', emissiveIntensity: .35}), cloth: mat('#4f6a8c', .8), skin: mat('#c99b78', .8)};
  const HX = 2.12, ZF = 1.5, ZB = -1.9, Y1 = 1.42, Y2 = 2.62, PW = .46, ZD = ZF - .3;
  k.box(C.gran, -HX - .05, HX + .05, 0, .1, ZB - .05, ZF + .05);
  k.box(C.gran, -.66, .66, 0, .05, ZF, ZF + .32);
  k.box(C.gran, -.56, .56, .05, .1, ZF, ZF + .16);
  // front block with the arched porch
  for (const s of [-1, 1]) k.box(C.wall, s * PW, s * HX, .1, Y2, .3, ZF);
  k.box(C.wall, -PW, PW, 1.38, Y2, .3, ZF);
  k.box(C.wall, -PW, PW, .1, 1.38, .3, ZD);
  const F = frontAt(ZF), D = frontAt(ZD);
  {
    const hw = PW - .02, sp = .81, n = 12, pts = [];
    for (let i = 0; i <= n; i++) {const t = PI - i / n * PI; pts.push([Math.cos(t) * hw, sp + Math.sin(t) * hw]);}
    const list = [];
    for (let i = 0; i < n; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      list.push([F(a[0], a[1], 0), F(b[0], b[1], 0), F(b[0], 1.38, 0), F(a[0], 1.38, 0)]);
      list.push([F(a[0], a[1], 0), F(b[0], b[1], 0), F(b[0], b[1], -.3), F(a[0], a[1], -.3)]);
    }
    k.triangles(C.wall, list);
    // the arch carries the association's name, gold on a dark band between gilt edges
    archBand(k, C.trim, F, 0, sp, hw, hw + .14, .03, 14);
    archBand(k, C.dark, F, 0, sp, hw + .02, hw + .13, .036, 14);
    archBand(k, C.gold, F, 0, sp, hw + .02, hw + .03, .04, 14);
    archBand(k, C.gold, F, 0, sp, hw + .12, hw + .13, .04, 14);
    [.8, .62, .38, .2].forEach((t, i) => glyph(k, C.gold, F, Math.cos(t * PI) * (hw + .075), sp + Math.sin(t * PI) * (hw + .075), .07, i * 3 + 1, .036));
    for (const s of [-1, 1]) {
      const x = s * (PW - .02);
      k.block(C.gran, .2, .07, .2, x, .1, ZF + .07);
      k.lathe(C.trim, [[.085, 0], [.085, .03], [.07, .05], [.062, .54], [.075, .56], [.075, .58]], x, ZF + .07, 12, 0, .17);
      k.block(C.trim, .2, .06, .2, x, .75, ZF + .07);
    }
    k.slab(C.trim, rect(-PW - .06, PW + .06, .1, .3), F, 0, .03);
  }
  k.slab(C.gran, rect(-.38, .38, .1, .88), D, 0, .025);
  k.shape(C.door, rect(-.32, .32, .1, .84), D, .028);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) k.shape(C.gold, ring(.012, 6, s * .16 + (i - 1.5) * .05, .28 + j * .11), D, .031);
  k.shape(C.dark, rect(-.006, .006, .1, .84), D, .031);
  grille(k, D, -.3, .3, .92, 1.16, 7, C.dark, C.shut, .01, .01);
  for (const s of [-1, 1]) lion(k, C.gran, s * .78, ZF + .2, .05);
  for (const s of [-1, 1]) lantern(k, C, s * .26, .68, ZD + .14, .07);
  // facade: base course, pilasters, high barred windows, string course, louvred windows, frieze and cornice
  for (const s of [-1, 1]) {
    k.slab(C.gran, rect(s < 0 ? -HX : PW, s < 0 ? -PW : HX, .1, .32), F, 0, .03);
    for (const u of [.62, 1.27, 2.05]) {
      k.slab(C.trim, rect(s * u - .065, s * u + .065, .32, Y1), F, 0, .04);
      k.slab(C.trim, rect(s * u - .085, s * u + .085, Y1 - .12, Y1 - .04), F, 0, .06);
      k.slab(C.trim, rect(s * u - .06, s * u + .06, Y1 + .1, Y2 - .26), F, 0, .035);
      k.slab(C.trim, rect(s * u - .08, s * u + .08, Y2 - .34, Y2 - .26), F, 0, .055);
    }
    for (const u of [.945, 1.66]) {
      const c = s * u;
      k.slab(C.trim, rect(c - .23, c + .23, .72, 1.2), F, 0, .025);
      k.slab(C.gran, rect(c - .27, c + .27, .67, .73), F, 0, .07);
      grille(k, F, c - .18, c + .18, .76, 1.16, 6, C.dark, C.shut, .026, .011);
      k.shape(C.shut, rect(c - .18, c + .18, 1.0, 1.02), F, .05);
      louvred(k, F, c, 1.68, 2.24, .19, C.trim, C.shut);
    }
    louvred(k, F, s * .27, 1.68, 2.24, .14, C.trim, C.shut);
  }
  k.slab(C.trim, rect(-HX - .03, HX + .03, Y1, Y1 + .1), F, 0, .08);
  k.slab(C.trim, rect(-HX - .03, HX + .03, Y1 + .1, Y1 + .13), F, 0, .05);
  k.slab(C.wall, rect(-HX, HX, Y2 - .24, Y2), F, 0, .03);
  for (let i = 0; i < 8; i++) {const u0 = -HX + .1 + i * (2 * HX - .2) / 8; k.shape(i % 2 ? C.yel : C.blue, rect(u0 + .04, u0 + (2 * HX - .2) / 8 - .04, Y2 - .2, Y2 - .05), F, .032);}
  board(k, C, F, 0, Y2 - .44, .62, .16, 4, .03);
  // roofs: front block, the airwell wings, the taller main hall behind; hard gables with copings
  k.box(C.wall, -HX, HX, .1, 2.8, ZB, -.32);
  for (const s of [-1, 1]) {
    k.box(C.wall, s * 1.45, s * HX, .1, Y2, -.32, .3);
    k.triangles(C.tile, [[[s * 1.4, Y2 - .05, -.32], [s * 1.4, Y2 - .05, .3], [s * (HX + .02), Y2 + .2, .3], [s * (HX + .02), Y2 + .2, -.32]]]);
  }
  k.box(C.gran, -1.45, 1.45, .1, .12, -.32, .3);
  const rf = roofX(k, C.tile, {cz: .9, w: 2 * HX + .04, d: 1.62, y0: Y2 + .02, h: .62, tb: 0, lift: .04, gable: C.wall, gBase: Y2, trim: C.green, fascia: C.wall, roll: C.tile2, rolls: 21});
  const rb = roofX(k, C.tile, {cz: -1.12, w: 2 * HX + .04, d: 1.9, y0: 2.82, h: .7, tb: 0, lift: .04, gable: C.wall, gBase: 2.8, trim: C.green, fascia: C.wall, roll: C.tile2, rolls: 21});
  for (const [r, cz] of [[rf, .9], [rb, -1.12]]) {
    k.box(C.tile2, -HX + .05, HX - .05, r.top - .02, r.top + .1, cz - .06, cz + .06);
    for (const s of [-1, 1]) k.tube(C.tile2, [[s * (HX - .1), r.top + .06, cz], [s * (HX + .02), r.top + .1, cz], [s * (HX + .1), r.top + .22, cz]], .045, 5);
  }
  // sides and back: few, high openings
  for (const s of [-1, 1]) {
    const S = zside(s * HX, s);
    k.slab(C.gran, rect(ZB, ZF, .1, .32), S, 0, .02);
    k.slab(C.trim, rect(ZB, ZF, Y1, Y1 + .08), S, 0, .04);
    for (const u of [1.0, -.1, -1.2]) {k.slab(C.trim, rect(u - .15, u + .15, .78, 1.12), S, 0, .02); grille(k, S, u - .11, u + .11, .81, 1.09, 3, C.dark, C.shut, .022, .01);}
    for (const u of [1.0, -1.2]) louvred(k, S, u, 1.72, 2.2, .14, C.trim, C.shut);
    if (s > 0) { // the Cross Street side is a dressed elevation: pilasters, painted frieze and cornice
      for (const z of [1.47, .45, -.6, -1.86]) {k.slab(C.trim, rect(z - .055, z + .055, .32, Y2 - .26), S, 0, .035); k.slab(C.trim, rect(z - .075, z + .075, Y2 - .34, Y2 - .26), S, 0, .05);}
      k.slab(C.wall, rect(ZB, ZF, Y2 - .24, Y2), S, 0, .025);
      for (let i = 0; i < 6; i++) {const z0 = lerp(ZB + .1, ZF - .1, i / 6); k.shape(i % 2 ? C.yel : C.blue, rect(z0 + .04, z0 + (ZF - ZB - .2) / 6 - .04, Y2 - .2, Y2 - .05), S, .027);}
    }
  }
  const B = backAt(ZB);
  k.slab(C.gran, rect(-HX, HX, .1, .32), B, 0, .02);
  k.slab(C.trim, rect(-HX, HX, Y1, Y1 + .08), B, 0, .04);
  k.slab(C.trim, rect(-.34, .34, .1, .95), B, 0, .025);
  k.shape(C.door, rect(-.28, .28, .1, .9), B, .028);
  for (const u of [-1.5, -.8, .8, 1.5]) {k.slab(C.trim, rect(u - .16, u + .16, .8, 1.14), B, 0, .02); grille(k, B, u - .12, u + .12, .83, 1.11, 3, C.dark, C.shut, .022, .01);}
  for (const u of [-1.5, -.8, 0, .8, 1.5]) louvred(k, B, u, 1.75, 2.3, .15, C.trim, C.shut);
  person(k, C.cloth, C.skin, -1.3, ZF + .28, .3);
  return {
    baseWidth: 5.5, detail: [0, 1.25, ZF], overview: [0, 1.6, 0], distance: 11.6, elevation: .18,
    front: ZF + .05, back: ZB - .05,
    anchors: {
      'front-envelope': {position: [-.945, .96, ZF + .2]}, 'high-window': {position: [-.945, .96, ZF + .08], scale: .55},
      'front-door': {position: [0, .55, ZD + .1], scale: .6}, 'back-envelope': {position: [0, 1.3, ZB - .12]},
    },
  };
}

/* ===== Chong Wen Ge (1849-52), 168 Telok Ayer Street =====
 * The "Institute for the Veneration of Literature", Singapore's first Chinese school, beside Thian Hock Keng: the
 * octagonal three-tier pagoda ("Ba Gua Lou") behind the compound wall and the Chong Boon Gate on the street, with
 * curled octagonal eaves, a timber second tier with lattice windows and balustrade, and the open top tier whose eaves
 * rest on eight carved figures, crowned by a gourd finial. On the left the end of Thian Hock Keng (granite platform,
 * swallowtail ridge); on the right, set back, the 1913 Chong Hock Pavilion that housed Chong Hock Girls' School from
 * 1915: a separate two-storey building with its own hipped roof. Front (+z) is the street. */
function chongWenGe(k, M) {
  const C = {wall: mat('#f1ece0', .9), gran: mat('#a29c91', .95), red: mat('#962a20', .65), tile: mat('#a65440', .9), tile2: mat('#87402f', .9), green: mat('#3f7b54', .55),
    dark: mat('#29211c', .75), gold: M.gold, blue: mat('#3d6fb8', .6), yel: mat('#e2b93b', .6), pave: mat('#c6bfb2', .95), cream: mat('#ece2c8', .88),
    shut: mat('#2f5e4e', .7), lamp: mat('#d8382a', .6, {emissive: '#ff4a22', emissiveIntensity: .35})};
  const PX = -.3, PZ = .1, ZW = 1.7, Y0 = .08;
  k.box(C.gran, -1.62, 2.75, 0, Y0, -2.0, ZW + .06);
  k.box(C.pave, -1.55, .7, Y0, Y0 + .01, -1.7, ZW - .1);
  // Thian Hock Keng's east end on its granite platform (the temple continues past the edge of the miniature)
  {
    k.box(C.gran, -2.75, -1.62, 0, .25, -2.05, 2.0);
    k.box(C.wall, -2.75, -1.78, .25, 1.45, .9, 1.55);
    k.box(C.gran, -2.75, -1.76, .25, .52, .88, 1.57);
    const F = frontAt(1.55);
    k.slab(C.gran, rect(-2.55, -1.98, .25, 1.1), F, 0, .02); k.shape(C.red, rect(-2.47, -2.06, .25, 1.0), F, .025);
    doorGods(k, C, F, -2.265, .3, .2, .62, .03);
    k.lathe(C.gran, [[.075, 0], [.075, 1.12]], -1.85, 1.85, 10, 0, .25); k.block(C.gran, .18, .08, .18, -1.85, .25, 1.85);
    k.box(C.green, -2.75, -1.7, 1.4, 1.46, 1.55, 2.0);
    const r = roofX(k, C.tile, {cx: -2.25, cz: 1.3, w: 1.1, d: 1.6, y0: 1.45, h: .42, tb: 0, lift: .12, ends: [0, 1], gable: C.wall, gBase: 1.45, trim: C.green, fascia: C.green, roll: C.tile2, rolls: 4});
    k.tube(C.green, [[-2.75, r.top + .02, 1.3], [-2.2, r.top, 1.3], [-1.85, r.top + .05, 1.3], [-1.66, r.top + .22, 1.3], [-1.56, r.top + .4, 1.3]], t => .036 * (1 - t * .5), 6);
    k.box(C.wall, -2.75, -1.9, .25, 1.6, -1.85, -.35);
    k.box(C.wall, -2.75, -2.1, .25, 1.4, -.35, .9);
    for (const [z0, z1, h] of [[-1.85, -.35, 1.6], [-.35, .9, 1.4], [.9, 1.55, 1.45]]) {const S = zside(-2.75, -1); k.slab(C.gran, rect(z0, z1, .25, .52), S, 0, .02); k.slab(C.wall, rect(z0 + .04, z1 - .04, h - .22, h - .04), S, 0, .02); for (let i = 0; i < 2; i++) k.shape(i ? C.yel : C.blue, rect(lerp(z0, z1, i / 2) + .06, lerp(z0, z1, (i + 1) / 2) - .06, h - .19, h - .07), S, .022);}
    for (const z of [-1.3, .25]) {const S = sideAt(-2.75, -1, z); k.shape(C.gran, ring(.16, 14, 0, .95), S, .01); k.shape(C.green, ring(.12, 14, 0, .95), S, .014);}
    for (const z of [-1.5, -.7]) {k.slab(C.gran, rect(-.16, .16, .7, 1.1), sideAt(-1.9, 1, z), 0, .02); grille(k, sideAt(-1.9, 1, z), -.12, .12, .74, 1.06, 3, C.dark, C.gran, .022, .012);}
    const r2 = roofX(k, C.tile, {cx: -2.3, cz: -1.1, w: 1.0, d: 2.4, y0: 1.62, h: .62, tb: 0, lift: .14, ends: [0, 1], gable: C.wall, gBase: 1.6, trim: C.green, fascia: C.green, roll: C.tile2, rolls: 3});
    k.tube(C.green, [[-2.75, r2.top + .02, -1.1], [-2.15, r2.top, -1.1], [-1.9, r2.top + .06, -1.1], [-1.74, r2.top + .26, -1.1], [-1.64, r2.top + .46, -1.1]], t => .042 * (1 - t * .5), 6);
  }
  // compound wall on the street with green glazed grilles and a tiled coping; the Chong Boon Gate on the pagoda's axis
  {
    const F = frontAt(ZW), segs = [[-1.62, PX - .5], [PX + .5, 2.75]];
    for (const [u0, u1] of segs) {
      k.box(C.wall, u0, u1, Y0, .82, ZW - .12, ZW);
      k.slab(C.gran, rect(u0, u1, Y0, .3), F, 0, .02);
      for (let u = u0 + .15; u < u1 - .3; u += .55) {k.slab(C.gran, rect(u, u + .38, .44, .72), F, 0, .02); grille(k, F, u + .04, u + .34, .48, .68, 5, C.dark, C.green, .021, .012);}
      k.triangles(C.tile, [[[u0, .86, ZW + .06], [u1, .86, ZW + .06], [u1, .94, ZW - .06], [u0, .94, ZW - .06]], [[u0, .86, ZW - .18], [u1, .86, ZW - .18], [u1, .94, ZW - .06], [u0, .94, ZW - .06]]]);
      k.box(C.green, u0, u1, .82, .86, ZW - .2, ZW + .08);
      k.tube(C.green, [[u0, .95, ZW - .06], [u1, .95, ZW - .06]], .022, 5);
    }
    k.box(C.gran, -1.62, -1.5, Y0, .98, -2.0, ZW);
    for (const s of [-1, 1]) {k.box(C.gran, PX + s * .5 - .08, PX + s * .5 + .08, Y0, 1.28, ZW - .16, ZW + .04); k.box(C.wall, PX + s * .44 - .03, PX + s * .44 + .03, Y0, 1.22, ZW - .14, ZW - .02);}
    k.box(C.wall, PX - .58, PX + .58, 1.0, 1.28, ZW - .16, ZW + .02);
    k.box(C.red, PX - .58, PX + .58, .96, 1.0, ZW - .16, ZW + .05);
    const G = frontAt(ZW - .14);
    k.shape(C.red, rect(PX - .38, PX + .38, Y0, .95), G, .01);
    k.shape(C.dark, rect(PX - .006, PX + .006, Y0, .95), G, .013);
    doorGods(k, C, G, PX, Y0 + .04, .38, .82, .013);
    k.box(C.gran, PX - .4, PX + .4, Y0, .13, ZW - .14, ZW + .02);
    board(k, C, frontAt(ZW + .02), PX, 1.14, .5, .16, 3, 0);
    const g = roofX(k, C.tile, {cx: PX, cz: ZW - .07, w: 1.42, d: .66, y0: 1.28, h: .3, a: .42, tb: .55, lift: .1, gable: C.wall, trim: C.green, fascia: C.red, roll: C.tile2, rolls: 7});
    swallowRidge(k, C.green, PX, ZW - .07, .38, g.top + .04, -.02, .2, .025);
    for (const s of [-1, 1]) lantern(k, C, PX + s * .58, .74, ZW + .1, .06);
  }
  // the pagoda: three octagonal tiers
  {
    const ap = r => r / Math.cos(PI / 8), face = (r, i) => polyFrame(PX, PZ, r, i * PI / 4);
    k.prism(C.gran, ngon(.86, PX, PZ), Y0, .2);
    k.prism(C.gran, ngon(.76, PX, PZ), .2, .27);
    // ground storey: white walls, granite dado and corner strips, the doorway in front, barred windows round the rest
    const R1 = .7, T1 = 1.22;
    k.prism(C.wall, ngon(R1, PX, PZ), .27, T1);
    for (let i = 0; i < 8; i++) {
      const F = face(R1, i), hw = R1 * Math.tan(PI / 8);
      k.slab(C.gran, rect(-hw, hw, .27, .42), F, 0, .015);
      k.slab(C.gran, rect(hw - .045, hw + .002, .27, T1), F, 0, .02);
      k.slab(C.red, rect(-hw, hw, T1 - .1, T1 - .04), F, 0, .025);
      k.shape(i % 2 ? C.blue : C.yel, rect(-hw + .06, hw - .06, T1 - .03, T1 + .04), F, .005);
      if (i === 0) {
        k.slab(C.gran, rect(-.2, .2, .27, .98), F, 0, .025); k.shape(C.red, rect(-.15, .15, .27, .94), F, .028); k.shape(C.dark, rect(-.004, .004, .27, .94), F, .031);
        doorGods(k, C, F, 0, .3, .15, .58, .031);
        board(k, C, F, 0, 1.05, .32, .1, 3, .02);
      } else if (i === 4) {
        k.slab(C.gran, rect(-.18, .18, .27, .9), F, 0, .025); k.shape(C.dark, rect(-.14, .14, .27, .86), F, .028);
      } else {
        k.slab(C.gran, rect(-.14, .14, .55, .98), F, 0, .025);
        grille(k, F, -.1, .1, .59, .94, 3, C.dark, C.green, .026, .011);
      }
    }
    // first eave, balustrade on it, the timber second tier
    const e1 = octRoof(k, C.tile, {cx: PX, cz: PZ, r0: 1.0, r1: .62, y0: T1 + .02, h: .3, lift: .12, trim: C.green, fascia: C.red});
    const R2 = .56, B2 = e1 - .04, T2 = B2 + .74;
    k.prism(C.red, ngon(R2, PX, PZ), B2, T2);
    k.prism(C.green, ngon(.66, PX, PZ), B2, B2 + .025);
    for (let i = 0; i < 8; i++) {
      const F = face(R2, i), hw = R2 * Math.tan(PI / 8);
      k.slab(C.gold, rect(-hw + .03, hw - .03, B2 + .2, T2 - .08), F, 0, .012);
      k.slab(C.dark, rect(-hw + .05, hw - .05, B2 + .22, T2 - .1), F, .012, .016);
      for (const v of [.33, .45, .57]) k.slab(C.red, rect(-hw + .05, hw - .05, B2 + v - .01, B2 + v + .01), F, .016, .026);
      for (const u of [-.07, 0, .07]) k.slab(C.red, rect(u - .01, u + .01, B2 + .22, T2 - .1), F, .016, .026);
      const G = face(.66, i), gw = .66 * Math.tan(PI / 8);
      k.slab(C.green, rect(-gw, gw, B2 + .15, B2 + .18), G, -.02, .01);
      for (let j = 0; j < 4; j++) {const u = -gw + (j + .5) * 2 * gw / 4; k.slab(C.green, rect(u - .018, u + .018, B2 + .025, B2 + .15), G, -.015, .005);}
      k.block(C.red, .035, .2, .035, ...(p => [p[0], B2, p[2]])(face(.66, i)(gw, 0, -.005)));
    }
    const e2 = octRoof(k, C.tile, {cx: PX, cz: PZ, r0: .86, r1: .44, y0: T2 + .02, h: .26, lift: .11, trim: C.green, fascia: C.red});
    // the open top tier: eight red posts, lattice, and the carved figures bracing the top eave
    const R3 = .4, B3 = e2 - .03, T3 = B3 + .5;
    k.prism(C.wall, ngon(.3, PX, PZ), B3, T3 - .02);
    for (let i = 0; i < 8; i++) {
      const th = (i + .5) * PI / 4, rr = R3 / Math.cos(PI / 8), x = PX + Math.sin(th) * rr, z = PZ + Math.cos(th) * rr;
      k.lathe(C.red, [[.028, 0], [.028, T3 - B3]], x, z, 6, 0, B3);
      k.block(C.yel, .05, .085, .04, x + Math.sin(th) * .045, T3 - .14, z + Math.cos(th) * .045, th);
      k.lathe(C.dark, [[.001, 0], [.026, .01], [.026, .04], [.001, .05]], x + Math.sin(th) * .045, z + Math.cos(th) * .045, 6, 0, T3 - .055);
      const F = face(R3, i), hw = R3 * Math.tan(PI / 8);
      k.slab(C.red, rect(-hw, hw, B3, B3 + .12), F, -.02, .0);
      k.slab(C.red, rect(-hw, hw, T3 - .06, T3), F, -.02, .0);
      k.shape(C.dark, rect(-hw + .03, hw - .03, B3 + .12, T3 - .06), polyFrame(PX, PZ, .3, i * PI / 4), .004);
    }
    const top = octRoof(k, C.tile, {cx: PX, cz: PZ, r0: .66, r1: 0, y0: T3, h: .5, lift: .1, trim: C.green, fascia: C.red});
    k.lathe(C.gold, [[.06, 0], [.06, .05], [.09, .1], [.1, .16], [.06, .22], [.045, .24], [.07, .3], [.04, .37], [.012, .4], [.012, .55], [.001, .58]], PX, PZ, 10, 0, top - .03);
  }
  // Chong Hock Pavilion (1913), set back on the right: two storeys, verandah below, louvred windows above, hipped roof
  {
    const x0 = .78, x1 = 2.7, z0 = -1.75, z1 = .72, cx = (x0 + x1) / 2, w = x1 - x0;
    k.box(C.cream, x0, x1, Y0, 2.1, z0, z1 - .28);
    k.box(C.cream, x0, x1, 1.05, 2.1, z1 - .28, z1);
    const F = frontAt(z1, cx);
    k.slab(C.wall, rect(-w / 2 - .02, w / 2 + .02, 1.0, 1.08), F, 0, .05);
    k.slab(C.wall, rect(-w / 2 - .02, w / 2 + .02, 2.02, 2.1), F, 0, .06);
    for (const u of [-w / 2 + .06, -w / 6, w / 6, w / 2 - .06]) {k.block(C.wall, .1, .92, .1, cx + u, Y0, z1 - .05); k.block(C.wall, .14, .05, .14, cx + u, Y0, z1 - .05);}
    for (const u of [-.72, -.24, .24, .72]) louvred(k, F, u, 1.3, 1.86, .14, C.wall, C.shut);
    for (const u of [-.6, 0, .6]) {k.shape(C.shut, rect(u - .16, u + .16, Y0, .78), frontAt(z1 - .28, cx), .01); k.shape(C.wall, rect(u - .005, u + .005, Y0, .78), frontAt(z1 - .28, cx), .013);}
    for (const z of [-1.4, -.6]) louvred(k, sideAt(x1, 1, z), 0, 1.3, 1.86, .14, C.wall, C.shut);
    for (const u of [-.6, 0, .6]) louvred(k, backAt(z0, cx), u, 1.3, 1.86, .14, C.wall, C.shut);
    const r = roofX(k, C.tile, {cx, cz: (z0 + z1) / 2, w: w + .22, d: z1 - z0 + .22, y0: 2.1, h: .55, a: .45, tb: 1, lift: .05, trim: C.tile2, fascia: C.wall, roll: C.tile2, rolls: 9});
    k.tube(C.tile2, [[cx - .45, r.top + .02, (z0 + z1) / 2], [cx + .45, r.top + .02, (z0 + z1) / 2]], .03, 5);
  }
  return {
    baseWidth: 5.5, detail: [PX, 1.9, .9], overview: [0, 1.8, 0], distance: 12.0, elevation: .2,
    front: ZW + .06, back: -2.05,
    anchors: {
      'front-envelope': {position: [PX, 1.0, ZW + .24]}, roof: {position: [PX, 3.3, PZ + .4]}, 'octagon-body': {position: [PX, 1.9, PZ + .62], scale: .6},
      'front-door': {position: [PX, .55, ZW + .05], scale: .6}, 'back-envelope': {position: [PX, 1.2, -2.12]},
    },
  };
}

export const TELOK_STOPS = {'telok-ayer-01': fukTakChi, 'telok-ayer-02': yingFoFuiKun, 'telok-ayer-06': chongWenGe};
