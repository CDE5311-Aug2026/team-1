/* Hunt (2 Nov 2026): bespoke miniatures for Balestier stops 01-03 (see field-stops.js for the conventions).
 * Goh Chor Tua Pek Kong Temple with its 1906 wayang stage (No. 249), the Sim Kwong Ho corner shophouses
 * (Nos. 292-312) and Lam Yeo Coffee Powder Factory (No. 328). Front (+z) is Balestier Road; model units are about
 * 1 : 3.3. Interpretive, after URA conservation-portal and Roots photographs; no lettering is baked in. */
import {rect, archShape, ring, frontAt, backAt, sideAt} from '../field-kit.js';
import {PI, mat, semi, swallowRidge} from '../field-stop-shapes.js';

/* ---- local helpers ---- */
/** a wall frame at (ox, oz) facing heading `ang` (0 looks down +z): u runs left to right seen from outside, w outward */
const wallF = (ox, oz, ang = 0) => {const c = Math.cos(ang), s = Math.sin(ang); return (u, v, w = 0) => [ox + u * c + w * s, v, oz - u * s + w * c];};
const ID = frontAt(0);
const RZ = wallF(0, 0, PI / 2); // u runs toward -z, w toward +x: for ridges that run front to back
const quad = (F, u0, u1, v0, v1, w) => [F(u0, v0, w), F(u1, v0, w), F(u1, v1, w), F(u0, v1, w)];
const bx = (k, m, F, u0, u1, v0, v1, w0, w1) => k.slab(m, rect(u0, u1, v0, v1), F, w0, w1);
const ball = r => Array.from({length: 7}, (_, i) => {const a = -PI / 2 + i / 6 * PI; return [Math.max(.001, Math.cos(a) * r), r + Math.sin(a) * r];});
const at = (F, u, w) => {const p = F(u, 0, w); return [p[0], p[2]];};

/** curved Chinese tile roof in a frame, ridge along u at cw; returns its surface sampler for rakes and bands */
function roofF(k, m, F, cu, cw, w, d, y0, h, lift, {gable = null, ribs = null, eave = null, cols = 14, rows = 6} = {}) {
  const P = (i, j, side, up = 0) => {const x = -w / 2 + w * i / cols, sl = j / rows, ex = Math.abs(2 * x / w) ** 4; return F(cu + x, y0 + h * sl ** 1.6 + lift * (1 - sl) * ex + up, cw + side * d / 2 * (1 - sl));};
  const list = [];
  for (const side of [-1, 1]) for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) list.push([P(i, j, side), P(i + 1, j, side), P(i + 1, j + 1, side), P(i, j + 1, side)]);
  list.push(...[0, cols].map(i => [P(i, 0, -1, -.05), P(i, 0, 1, -.05), P(i, 0, 1), P(i, 0, -1)]));
  k.triangles(m, list);
  if (ribs) for (const side of [-1, 1]) for (let i = 1; i < cols; i++) k.tube(ribs, Array.from({length: rows}, (_, j) => P(i, j, side, .018)), .016, 4);
  if (eave) for (const side of [-1, 1]) k.tube(eave, Array.from({length: cols + 1}, (_, i) => P(i, 0, side, .01)), .03, 5);
  if (gable) for (const i of [0, cols]) {
    const rim = []; for (let j = 0; j <= rows; j++) rim.push(P(i, j, -1)); for (let j = rows - 1; j >= 0; j--) rim.push(P(i, j, 1));
    const base = F(cu - w / 2 + w * i / cols, y0, cw); k.triangles(gable, rim.slice(0, -1).map((v, n) => [base, v, rim[n + 1]]));
  }
  return P;
}
/** swallowtail ridge in a frame (field-stop-shapes' swallowRidge, for ridges that do not run along x) */
function ridgeF(k, m, F, cu, cw, a, y, sag = -.05, curl = .4, r = .04) {
  k.tube(m, Array.from({length: 13}, (_, i) => {const x = -a + 2 * a * i / 12; return F(cu + x, y + sag * (1 - (x / a) ** 2), cw);}), r, 6);
  for (const s of [-1, 1]) for (const dz of [-1, 1]) k.tube(m, Array.from({length: 8}, (_, i) => {const t = i / 7; return F(cu + s * (a + t * .38), y + curl * t ** 1.9, cw + dz * .045 * t);}), t => r * (1 - t * .6), 5);
}
/** frustum roof in a frame: eave rectangle [u0,u1]x[w0,w1] at y0 rising h to the top rectangle [U0,U1]x[W0,W1]
 * (a ridge when W0 = W1). Tile ribs run straight up each slope and stop at the hips. */
function hipF(k, m, F, [u0, u1, w0, w1], [U0, U1, W0, W1], y0, h, {ribs = null, step = .12, gable = null} = {}) {
  const A = [[u0, w0], [u1, w0], [u1, w1], [u0, w1]], B = [[U0, W0], [U1, W0], [U1, W1], [U0, W1]];
  const a = A.map(([u, w]) => F(u, y0, w)), b = B.map(([u, w]) => F(u, y0 + h, w)), list = [a.slice().reverse()];
  for (let n = 0; n < 4; n++) {
    const j = (n + 1) % 4, q = [A[n], A[j], B[j], B[n]], flat = q.every(p => Math.abs(p[0] - q[0][0]) < 1e-6) || q.every(p => Math.abs(p[1] - q[0][1]) < 1e-6);
    if (flat && gable) k.triangles(gable, [[a[n], a[j], b[j], b[n]]]); else list.push([a[n], a[j], b[j], b[n]]);
  }
  if (W1 - W0 > 1e-4 && U1 - U0 > 1e-4) list.push(b);
  k.triangles(m, list);
  if (!ribs) return;
  const lim = (x, x0, x1, X0, X1) => Math.min(1, x < X0 ? (X0 - x0 > 1e-6 ? (x - x0) / (X0 - x0) : 1) : 1, x > X1 ? (x1 - X1 > 1e-6 ? (x1 - x) / (x1 - X1) : 1) : 1);
  for (const [side, we, WE] of [[-1, w0, W0], [1, w1, W1]]) for (let u = u0 + step / 2; u < u1; u += step) {
    const t = lim(u, u0, u1, U0, U1); if (t > .06) k.tube(ribs, [F(u, y0 + .012, we), F(u, y0 + h * t + .012, we + t * (WE - we))], .014, 4);
  }
  for (const [ue, UE] of [[u0, U0], [u1, U1]]) if (Math.abs(UE - ue) > 1e-6) for (let w = w0 + step / 2; w < w1; w += step) {
    const t = lim(w, w0, w1, W0, W1); if (t > .06) k.tube(ribs, [F(ue, y0 + .012, w), F(ue + t * (UE - ue), y0 + h * t + .012, w)], .014, 4);
  }
}
/** a cut-porcelain ridge dragon arching along u from its tail (u0) to its head (u1), in a frame */
function dragon(k, body, fin, jaw, F, u0, u1, w, y) {
  const s = Math.sign(u1 - u0), n = 16, L = [];
  for (let i = 0; i <= n; i++) {const t = i / n; L.push([u0 + (u1 - u0) * t, y + .02 + Math.abs(Math.sin(t * PI * 2.2)) * .1 * (.45 + .55 * t) + t * .08, w + Math.sin(t * PI * 3) * .025]);}
  k.tube(body, L.map(p => F(...p)), t => .013 + .027 * Math.min(1, t * 1.7), 6);
  const fins = []; for (let i = 2; i < n - 1; i += 2) {const [u, v, ww] = L[i]; fins.push([F(u - s * .025, v + .012, ww), F(u + s * .02, v + .012, ww), F(u - s * .012, v + .065, ww)]);}
  k.triangles(fin, fins);
  const [hu, hv, hw] = L[n], lo = Math.min(hu, hu + s * .14), hi = Math.max(hu, hu + s * .14);
  bx(k, body, F, lo, hi, hv - .03, hv + .05, hw - .04, hw + .04);
  bx(k, jaw, F, Math.min(hu + s * .04, hu + s * .16), Math.max(hu + s * .04, hu + s * .16), hv - .06, hv - .034, hw - .032, hw + .032);
  for (const d of [-1, 1]) bx(k, fin, F, Math.min(hu + s * .05, hu + s * .08), Math.max(hu + s * .05, hu + s * .08), hv + .02, hv + .045, hw + d * .04, hw + d * .045);
  for (const d of [-1, 1]) {
    k.tube(fin, [F(hu, hv + .035, hw + d * .02), F(hu - s * .07, hv + .11, hw + d * .035)], .008, 4);
    k.tube(fin, [F(hu + s * .1, hv, hw + d * .03), F(hu + s * .17, hv + .05, hw + d * .07)], .006, 4);
  }
  for (const i of [5, 11]) {const [u, v, ww] = L[i]; for (const d of [-1, 1]) k.tube(body, [F(u, v, ww), F(u + s * .03, y + .004, ww + d * .035)], .008, 4);}
}
/** an abstract raised glyph (strokes only, never a real character) in a size-`z` cell */
const GLYPHS = [
  [[.1, .78, .9, .88], [.45, .05, .55, .95], [.12, .45, .88, .55], [.15, .1, .35, .35], [.65, .1, .85, .35]],
  [[.08, .05, .2, .9], [.08, .82, .9, .92], [.8, .05, .92, .9], [.3, .5, .7, .6], [.45, .2, .55, .75]],
  [[.1, .6, .9, .7], [.2, .25, .8, .35], [.42, .05, .58, .95], [.1, .05, .25, .5], [.75, .05, .9, .5]],
  [[.1, .1, .9, .2], [.1, .8, .9, .9], [.1, .1, .22, .9], [.45, .35, .9, .45], [.6, .45, .7, .8]],
];
function glyph(k, m, F, cu, cv, z, w0, w1, seed = 0) {
  for (const [a, b, c, d] of GLYPHS[seed % GLYPHS.length]) bx(k, m, F, cu + (a - .5) * z, cu + (c - .5) * z, cv + (b - .5) * z, cv + (d - .5) * z, w0, w1);
}
function planks(k, m, F, u0, u1, v0, v1, w, step = .085) {
  const list = []; for (let u = u0 + step; u < u1 - .02; u += step) list.push(quad(F, u - .006, u + .006, v0, v1, w));
  k.triangles(m, list);
}
/** white mortar joints over red plaster, as on Hokkien temple walls */
function brickLines(k, m, F, u0, u1, v0, v1, w, row = .11, len = .27) {
  const list = []; let r = 0;
  for (let v = v0 + row; v < v1 - .02; v += row) list.push(quad(F, u0, u1, v - .006, v + .006, w));
  for (let v = v0; v < v1 - .03; v += row, r++) for (let u = u0 + (r % 2 ? len / 2 : len); u < u1 - .03; u += len) list.push(quad(F, u - .006, u + .006, v, Math.min(v1, v + row), w));
  k.triangles(m, list);
}

/* ===== Goh Chor Tua Pek Kong Temple (1847; renovated 1920, 1928) and its wayang stage (1906), 249 Balestier Road =====
 * Left: the Hokkien temple on a granite platform. Its red plaster walls are lined out like brick in white; the pink
 * side wing has a curved gable edged in rainbow bands; the main hall turns its decorated gable to the road under a
 * ridge of cut-porcelain dragons; the open worship porch has red columns on tall granite pedestals and a swallowtail
 * ridge with two dragons chasing a pearl. Right: Tan Boo Liat's freestanding opera stage on a masonry base, red
 * boarding with mint trim, the proscenium hung with a red valance before a painted backdrop, octagonal paintings on
 * either side, and a hip-and-gable tiled roof with figurine ridges. Both face the car park and Balestier Road (+z). */
function gohChorTuaPekKong(k, M) {
  const C = {red: mat('#c8352b', .78), white: mat('#f1ebe0', .9), pink: mat('#e897aa', .85), gran: mat('#a09d95', .95), pave: mat('#bab7af', .96),
    green: mat('#2e8a57', .5), tile: mat('#a44b35', .9), blue: mat('#2b62bd', .55), yellow: mat('#ebc23b', .55), orange: mat('#e5812f', .6), gold: M.gold,
    dark: mat('#2a2220', .8), lamp: mat('#e2332a', .5, {emissive: '#ff3a1c', emissiveIntensity: .4}), mint: mat('#6dc290', .65), cream: mat('#d4d5ce', .92), wood: M.wood};
  // car park with bay lines
  k.box(C.pave, -3.55, 3.55, 0, .03, -2.08, 2.08);
  for (const x of [-3.1, -2.2, 1.3, 2.3, 3.3]) k.box(C.white, x - .02, x + .02, .03, .036, 1.45, 2.0);
  k.box(C.white, -3.3, -2.0, .03, .036, 1.43, 1.47);
  // ---- temple ----
  k.box(C.gran, -3.47, .58, .03, .12, -1.72, 1.08);
  for (const [x0, x1, s] of [[-2.15, -1.35, 1], [-.62, .17, 1]]) {k.box(C.gran, x0, x1, .03, .08, 1.08, 1.24 * s); k.box(C.gran, x0 + .04, x1 - .04, .08, .12, 1.08, 1.16);}
  // the pink side wing with its curved, rainbow-edged gable
  const WX0 = -3.42, WX1 = -2.5, WZ0 = -1.4, WZ1 = .55;
  k.box(C.pink, WX0, WX1, .12, 1.0, WZ0, WZ1);
  k.box(C.red, WX0 - .02, WX1, .12, .22, WZ0 - .02, WZ1 + .02);
  const prof = Array.from({length: 9}, (_, i) => {const t = i / 8; return [WX0 - .12 + t * (WX1 - WX0 + .12), 1.0 + .68 * t ** 1.8 + .08 * (1 - t) ** 5];});
  const roofs = [];
  for (let i = 0; i < 8; i++) roofs.push([[prof[i][0], prof[i][1], WZ0 - .12], [prof[i + 1][0], prof[i + 1][1], WZ0 - .12], [prof[i + 1][0], prof[i + 1][1], WZ1 + .14], [prof[i][0], prof[i][1], WZ1 + .14]]);
  k.triangles(C.green, roofs);
  for (let z = WZ0 - .06; z < WZ1 + .12; z += .13) k.tube(C.green, prof.map(([x, y]) => [x, y + .018, z]), .016, 4);
  const gableFill = [[WX0, 1.0], [WX1, 1.0], ...prof.filter(([x]) => x >= WX0).reverse()];
  for (const z of [WZ1, WZ0]) k.shape(C.pink, gableFill, frontAt(z), z > 0 ? .002 : -.002);
  [C.red, C.orange, C.yellow, C.green, C.blue].forEach((m, n) => k.tube(m, prof.map(([x, y]) => [x, y - .012 - n * .042, WZ1 + .15]), .024, 5));
  for (let i = 1; i < 8; i++) {const [x, y] = prof[i]; k.shape([C.yellow, C.mint, C.orange][i % 3], rect(x - .04, x + .04, y - .3, y - .24), frontAt(WZ1), .006);}
  k.tube(C.red, prof.map(([x, y]) => [x, y - .01, WZ0 - .13]), .024, 5);
  {const S = sideAt(WX0, -1); k.shape(C.dark, rect(-.6, -.25, .45, .75), S, .004); for (let u = -.56; u < -.26; u += .06) k.shape(C.red, rect(u - .008, u + .008, .45, .75), S, .008);}
  // the main hall, gable end to the road
  const HX0 = -2.5, HX1 = -1.0, HZ0 = -1.65, HZ1 = .75, hx = (HX0 + HX1) / 2, hu = -(HZ0 + HZ1) / 2;
  k.box(C.red, HX0, HX1, .12, 1.45, HZ0, HZ1);
  const P = roofF(k, C.tile, RZ, hu, hx, HZ1 - HZ0 + .32, HX1 - HX0 + .34, 1.45, .82, .1, {gable: C.red, ribs: C.tile, eave: C.green});
  for (const [i, dz] of [[0, .03], [14, -.03]]) {
    const rake = [...Array.from({length: 7}, (_, j) => P(i, 6 - j, -1)), ...Array.from({length: 6}, (_, j) => P(i, j + 1, 1).slice())].reverse();
    [[C.green, 0, .03], [C.blue, .055, .026]].forEach(([m, dy, r]) => k.tube(m, rake.map(p => [p[0], p[1] - dy, p[2] + dz]), r, 5));
    if (dz > 0) rake.forEach((p, n) => n % 2 || n === 6 ? 0 : k.block([C.yellow, C.mint, C.orange, C.blue][n % 4], .09, .07, .02, p[0] + (p[0] < hx ? .08 : -.08), p[1] - .17, p[2] + .01));
  }
  {const F = frontAt(HZ1 + .16); k.shape(C.blue, ring(.1, 14, hx, 1.94), F, .004); k.shape(C.gold, ring(.07, 14, hx, 1.94), F, .008); k.shape(C.white, ring(.04, 10, hx, 1.94), F, .012);}
  bx(k, C.white, RZ, hu - 1.3, hu + 1.3, 2.18, 2.32, hx - .055, hx + .055);
  for (let u = hu - 1.22, n = 0; u < hu + 1.25; u += .13, n++) for (const d of [-1, 1]) bx(k, [C.blue, C.yellow, C.mint, C.orange][n % 4], RZ, u - .045, u + .045, 2.21, 2.29, hx + d * .055, hx + d * .065);
  ridgeF(k, C.green, RZ, hu, hx, 1.3, 2.34, -.04, .5, .045);
  dragon(k, C.blue, C.yellow, C.red, RZ, hu - 1.15, hu - .13, hx, 2.34);
  dragon(k, C.mint, C.yellow, C.red, RZ, hu + 1.15, hu + .13, hx, 2.34);
  {const [x, z] = at(RZ, hu, hx); k.lathe(C.red, ball(.05), x, z, 10, 0, 2.37); k.lathe(C.orange, [[.04, 0], [.0, .11]], x, z, 6, 0, 2.44);}
  {
    const F = frontAt(HZ1);
    brickLines(k, C.white, F, HX0, HX1, .12, 1.45, .002);
    k.slab(C.gran, rect(hx - .3, hx + .3, .12, 1.14), F, 0, .03);
    k.shape(C.dark, rect(hx - .25, hx + .25, .12, 1.06), F, .032);
    for (const s of [-1, 1]) {
      k.slab(C.red, rect(hx + s * .012, hx + s * .235, .12, 1.03), F, .032, .045);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) k.block(C.gold, .022, .022, .015, hx + s * (.06 + c * .07), .4 + r * .17, HZ1 + .052);
      k.slab(C.pink, rect(hx + s * .38, hx + s * .56, .62, 1.12), F, 0, .015);
      k.shape(C.red, rect(hx + s * .4 - .0, hx + s * .54, .66, 1.08), F, .017);
      for (let r = 0; r < 4; r++) k.shape(C.yellow, rect(hx + s * .46 - .015, hx + s * .46 + .015, .72 + r * .09, .78 + r * .09), F, .019);
    }
    k.slab(C.dark, rect(hx - .22, hx + .22, 1.17, 1.32), F, 0, .025); k.shape(C.gold, rect(hx - .19, hx + .19, 1.2, 1.29), F, .027);
    for (let n = 0; n < 2; n++) glyph(k, C.dark, F, hx - .07 + n * .14, 1.245, .07, .027, .033, n);
  }
  {const F = backAt(HZ0); brickLines(k, C.white, F, -HX1, -HX0, .12, 1.45, .002); k.shape(C.dark, rect(-hx - .14, -hx + .14, .7, 1.0), F, .004);}
  // the open worship porch and the rear hall
  const PX0 = -1.0, PX1 = .58, PZ0 = -.4, PZ1 = 1.0, px = (PX0 + PX1) / 2;
  k.box(C.gran, PX0, PX1, .12, .2, PZ0, PZ1 + .05);
  k.box(C.red, PX0, PX1, .2, 1.4, PZ0, PZ0 + .08);
  k.box(C.red, PX1 - .07, PX1, .2, 1.4, PZ0, .35);
  {
    const F = frontAt(PZ0 + .08);
    k.shape(C.dark, rect(px - .32, px + .32, .2, 1.12), F, .003);
    for (let u = px - .3; u <= px + .31; u += .046) k.slab(C.red, rect(u - .007, u + .007, .2, 1.12), F, .003, .015);
    for (const v of [.2, .66, 1.12]) k.slab(C.red, rect(px - .33, px + .33, v - .015, v + .015), F, .003, .018);
    for (const s of [-1, 1]) {k.slab(C.gold, rect(px + s * .45 - .06, px + s * .45 + .06, .4, 1.15), F, 0, .012); k.shape(C.red, rect(px + s * .45 - .045, px + s * .45 + .045, .42, 1.13), F, .014); for (let r = 0; r < 5; r++) k.shape(C.gold, rect(px + s * .45 - .02, px + s * .45 + .02, .48 + r * .13, .55 + r * .13), F, .016);}
    k.slab(C.gold, rect(px - .28, px + .28, 1.2, 1.34), F, 0, .02); k.shape(C.red, rect(px - .25, px + .25, 1.22, 1.32), F, .022);
  }
  k.box(C.red, px - .26, px + .26, .2, .55, PZ0 + .22, PZ0 + .5); k.box(C.gold, px - .28, px + .28, .55, .58, PZ0 + .2, PZ0 + .52);
  k.lathe(C.gold, [[.05, 0], [.09, .03], [.1, .09], [.07, .12], [.08, .14]], px, PZ0 + .36, 12, 0, .58);
  for (const s of [-1, 1]) {k.lathe(C.red, [[.012, 0], [.012, .22]], px + s * .17, PZ0 + .36, 6, 0, .58); k.lathe(C.yellow, [[.016, 0], [.0, .05]], px + s * .17, PZ0 + .36, 6, 0, .8);}
  for (const x of [-.92, -.45, .0, .5]) {
    k.block(C.gran, .16, .32, .16, x, .2, PZ1 - .08); k.block(C.gran, .19, .04, .19, x, .5, PZ1 - .08);
    k.lathe(C.red, [[.05, 0], [.046, .84]], x, PZ1 - .08, 12, 0, .54);
    k.lathe(C.gold, [[.056, 0], [.056, .03]], x, PZ1 - .08, 12, 0, 1.28);
    k.block(C.gold, .1, .05, .16, x, 1.31, PZ1 - .03); k.block(C.green, .14, .04, .2, x, 1.36, PZ1 - .02);
  }
  k.box(C.red, PX0, PX1, 1.34, 1.48, PZ1 - .15, PZ1 - .02);
  k.box(C.gold, PX0, PX1, 1.37, 1.39, PZ1 - .02, PZ1);
  k.box(C.green, PX0, PX1, 1.44, 1.47, PZ1 - .02, PZ1 + .005);
  for (let x = PX0 + .12; x < PX1 - .05; x += .2) k.block([C.blue, C.yellow, C.mint][Math.round((x - PX0) / .2) % 3], .12, .04, .01, x, 1.395, PZ1);
  for (const s of [-1, 1]) {const x = px + s * .45; k.tube(C.dark, [[x, 1.34, PZ1 - .1], [x, 1.28, PZ1 - .1]], .006, 4); k.lathe(C.lamp, [[.02, 0], [.08, .04], [.09, .12], [.05, .18], [.0, .19]], x, PZ1 - .1, 12, 0, 1.08); k.lathe(C.gold, [[.04, 0], [.04, .025]], x, PZ1 - .1, 10, 0, 1.25);}
  roofF(k, C.tile, ID, px, (PZ0 + PZ1) / 2, PX1 - PX0 + .36, PZ1 - PZ0 + .42, 1.47, .6, .13, {gable: C.red, ribs: C.tile, eave: C.green});
  k.box(C.white, px - .82, px + .82, 2.03, 2.13, .27, .33);
  for (let x = px - .78, n = 0; x < px + .8; x += .13, n++) k.box([C.blue, C.yellow, C.mint, C.orange][n % 4], x - .045, x + .045, 2.05, 2.11, .33, .34);
  swallowRidge(k, C.green, px, .3, .82, 2.15, -.04, .42, .042);
  dragon(k, C.blue, C.yellow, C.red, ID, px - .8, px - .12, .3, 2.15);
  dragon(k, C.mint, C.yellow, C.red, ID, px + .8, px + .12, .3, 2.15);
  k.lathe(C.red, ball(.05), px, .3, 10, 0, 2.18); k.lathe(C.orange, [[.04, 0], [.0, .11]], px, .3, 6, 0, 2.25);
  k.box(C.red, PX0, PX1, .12, 1.32, -1.65, PZ0);
  roofF(k, C.tile, ID, px, (-1.65 + PZ0) / 2, PX1 - PX0 + .3, 1.25 + .36, 1.32, .5, .1, {gable: C.red, ribs: C.tile, eave: C.green, cols: 12});
  swallowRidge(k, C.green, px, -1.025, .74, 1.84, -.03, .26, .035);
  {
    const S = sideAt(PX1, 1);
    brickLines(k, C.white, S, -.35, 1.65, .12, 1.32, .002);
    k.shape(C.mint, ring(.17, 16, 1.0, .78), S, .006); k.shape(C.dark, ring(.13, 16, 1.0, .78), S, .01);
    for (const u of [.94, 1.0, 1.06]) k.shape(C.mint, rect(u - .01, u + .01, .66, .9), S, .012);
    brickLines(k, C.white, backAt(-1.65), -PX1, -PX0, .12, 1.32, .002);
    brickLines(k, C.white, sideAt(-3.42, -1), -1.4, .55, .22, 1.0, .002);
  }
  // the bronze censer and red bollards in the car park
  k.box(C.gran, -.4, -.06, .03, .16, 1.38, 1.72);
  for (let i = 0; i < 3; i++) {const a = i * 2 * PI / 3; k.tube(C.gold, [[-.23 + Math.sin(a) * .1, .16, 1.55 + Math.cos(a) * .1], [-.23 + Math.sin(a) * .13, .3, 1.55 + Math.cos(a) * .13]], .018, 4);}
  k.lathe(C.gold, [[.06, 0], [.15, .04], [.18, .14], [.15, .22], [.18, .25], [.18, .28]], -.23, 1.55, 14, 0, .28);
  for (const s of [-1, 1]) k.tube(C.gold, [[-.23 + s * .17, .5, 1.55], [-.23 + s * .23, .55, 1.55], [-.23 + s * .23, .62, 1.55]], .014, 4);
  for (const x of [-1.05, .62]) {k.lathe(C.red, [[.035, 0], [.035, .5]], x, 1.22, 8, 0, .03); k.lathe(C.white, [[.038, 0], [.038, .05]], x, 1.22, 8, 0, .42);}

  // ---- the wayang stage ----
  const SX0 = .92, SX1 = 3.3, SZ0 = -1.3, SZ1 = .85, sx = (SX0 + SX1) / 2, sz = (SZ0 + SZ1) / 2, BY = .72, TY = 1.95, O = .8;
  k.box(C.cream, SX0, SX1, .03, BY, SZ0, SZ1);
  {
    const F = frontAt(SZ1);
    for (const x of [SX0 + .07, sx - .41, sx + .41, SX1 - .07]) {k.slab(C.cream, rect(x - .07, x + .07, .03, BY), F, 0, .04); for (let v = .1; v < BY; v += .08) k.shape(C.gran, rect(x - .07, x + .07, v - .005, v + .005), F, .042);}
    for (const x of [sx - .82, sx, sx + .82]) for (const [u0, u1, v0, v1] of [[-.3, .3, .1, .125], [-.3, .3, .6, .625], [-.3, -.275, .1, .625], [.275, .3, .1, .625]]) k.slab(C.gran, rect(x + u0, x + u1, v0, v1), F, 0, .016);
  }
  for (const [S, u0, u1] of [[sideAt(SX1, 1), -SZ1, -SZ0], [sideAt(SX0, -1), SZ0, SZ1]]) {
    k.shape(C.red, rect(u0, u1, .03, BY), S, .003);
    for (let n = 0; n < 3; n++) {
      const a = u0 + .12 + n * (u1 - u0 - .24) / 3, b = a + (u1 - u0 - .24) / 3 - .1;
      k.slab(C.yellow, rect(a, b, .14, .62), S, .003, .012); k.shape(C.blue, rect(a + .03, b - .03, .17, .59), S, .014);
      k.tube(n % 2 ? C.mint : C.green, Array.from({length: 11}, (_, i) => S(a + .06 + (b - a - .12) * i / 10, .38 + Math.sin(i * 1.3) * .1, .022)), .022, 5);
      k.lathe(C.orange, ball(.03), ...at(S, b - .1, .03), 8, 0, .42);
    }
    for (const u of [u0 + .05, u1 - .05]) k.slab(C.red, rect(u - .05, u + .05, .03, BY), S, 0, .04);
  }
  k.box(C.mint, SX0 - .04, SX1 + .04, BY, BY + .06, SZ0 - .04, SZ1 + .04);
  k.box(C.red, SX0, SX1, BY + .06, TY, SZ0, SZ0 + .08);
  k.box(C.red, SX0, SX0 + .08, BY + .06, TY, SZ0, SZ1); k.box(C.red, SX1 - .08, SX1, BY + .06, TY, SZ0, SZ1);
  k.box(C.red, SX0, sx - O, BY + .06, TY, SZ1 - .08, SZ1); k.box(C.red, sx + O, SX1, BY + .06, TY, SZ1 - .08, SZ1);
  k.box(C.red, sx - O, sx + O, 1.62, TY, SZ1 - .08, SZ1);
  k.box(C.dark, SX0, SX1, TY - .03, TY, SZ0, SZ1);
  // inside the proscenium: boards, painted backdrop, valance, lamps
  k.box(C.wood, sx - O, sx + O, BY + .06, BY + .075, -.2, SZ1);
  k.box(C.blue, sx - O, sx + O, BY + .075, 1.62, -.24, -.18);
  {
    const F = frontAt(-.18);
    k.slab(C.gold, rect(sx - .27, sx + .27, BY + .075, 1.36), F, 0, .012); k.shape(C.dark, rect(sx - .2, sx + .2, BY + .075, 1.24), F, .014);
    k.shape(C.mint, rect(sx - .36, sx + .36, 1.38, 1.56), F, .006);
    for (const s of [-1, 1]) {
      k.shape(C.orange, [[sx + s * .06, 1.42], [sx + s * .3, 1.46], [sx + s * .22, 1.52], [sx + s * .1, 1.5]], F, .01);
      k.shape(C.yellow, ring(.15, 16, sx + s * .55, 1.18), F, .006); k.shape(C.blue, ring(.12, 16, sx + s * .55, 1.18), F, .009); k.shape(C.red, ring(.06, 12, sx + s * .55, 1.18), F, .012);
      k.shape(C.dark, rect(sx + s * .55 - .14, sx + s * .55 + .14, BY + .075, .98), F, .006);
      k.tube(C.mint, Array.from({length: 9}, (_, i) => F(sx + s * .31 + Math.sin(i * 1.4) * .025, BY + .1 + i * .07, .03)), .024, 5);
    }
  }
  k.tube(C.red, Array.from({length: 11}, (_, i) => {const t = i / 10; return [sx - O + .02 + t * (2 * O - .04), 1.56 - Math.sin(t * PI) * .1, SZ1 + .02];}), .045, 6);
  k.tube(C.gold, Array.from({length: 11}, (_, i) => {const t = i / 10; return [sx - O + .02 + t * (2 * O - .04), 1.505 - Math.sin(t * PI) * .1, SZ1 + .04];}), .012, 4);
  for (const s of [-1, 1]) {
    k.tube(C.red, [[sx + s * (O - .04), 1.58, SZ1 + .02], [sx + s * (O - .06), 1.4, SZ1 + .03], [sx + s * (O - .03), 1.22, SZ1 + .02]], .04, 6);
    k.lathe(C.lamp, [[.02, 0], [.07, .04], [.08, .12], [.05, .17], [.0, .18]], sx + s * (O - .14), SZ1 + .04, 12, 0, 1.14); k.lathe(C.gold, [[.035, 0], [.035, .03]], sx + s * (O - .14), SZ1 + .04, 8, 0, 1.31);
  }
  for (let n = 0; n < 6; n++) {const x = sx - .6 + n * .24; k.block(C.dark, .01, .06, .01, x, 1.56, SZ1 - .12); k.lathe(C.gold, [[.0, 0], [.035, .02], [.03, .05]], x, SZ1 - .12, 8, 0, 1.52);}
  {
    const F = frontAt(SZ1);
    k.slab(C.mint, rect(sx - O - .05, sx + O + .05, 1.62, 1.94), F, 0, .02);
    for (let n = 0; n < 5; n++) {
      const u = sx - .64 + n * .32;
      k.shape(n % 2 ? C.white : C.red, rect(u - .135, u + .135, 1.66, 1.9), F, .022);
      k.shape(n % 2 ? C.orange : C.yellow, ring(.06, 10, u - .04, 1.78), F, .025); k.shape(n % 2 ? C.blue : C.green, ring(.045, 10, u + .06, 1.77), F, .026);
    }
    for (const [u0, u1] of [[SX0, sx - O], [sx + O, SX1]]) {
      planks(k, C.tile, F, u0, u1, BY + .06, TY, .002);
      for (const u of [u0 + .04, u1 - .04]) k.slab(C.mint, rect(u - .035, u + .035, BY + .06, TY), F, 0, .025);
      for (const v of [BY + .1, TY - .04]) k.slab(C.mint, rect(u0, u1, v - .025, v + .025), F, 0, .025);
      const u = (u0 + u1) / 2;
      k.slab(C.mint, ring(.17, 8, u, 1.45), F, 0, .03); k.shape(C.white, ring(.135, 8, u, 1.45), F, .032);
      k.shape(C.mint, rect(u - .11, u + .11, 1.33, 1.37), F, .033); k.shape(C.blue, [[u - .07, 1.36], [u + .01, 1.36], [u - .02, 1.5]], F, .034); k.shape(C.white, ring(.022, 8, u - .025, 1.52), F, .035); k.shape(C.orange, [[u + .02, 1.36], [u + .09, 1.36], [u + .06, 1.47]], F, .034); k.shape(C.dark, ring(.02, 8, u + .06, 1.49), F, .035);
      k.slab(C.red, rect(u - .13, u + .13, .9, 1.18), F, .025, .035); k.shape(C.white, rect(u - .09, u + .09, .95, 1.06), F, .037);
    }
  }
  for (const [S, u0, u1, door] of [[sideAt(SX1, 1), -SZ1, -SZ0, true], [sideAt(SX0, -1), SZ0, SZ1, false], [backAt(SZ0), -SX1, -SX0, false]]) {
    planks(k, C.tile, S, u0, u1, BY + .06, TY, .002);
    for (const u of [u0 + .04, u1 - .04]) k.slab(C.mint, rect(u - .035, u + .035, BY + .06, TY), S, 0, .025);
    for (const v of [BY + .1, TY - .04]) k.slab(C.mint, rect(u0, u1, v - .025, v + .025), S, 0, .025);
    const n = door ? 2 : 2, span = u1 - u0;
    for (let i = 0; i < n; i++) {
      const u = u0 + span * (i + 1) / (n + 1.4);
      k.slab(C.mint, rect(u - .18, u + .18, .98, 1.78), S, 0, .03);
      for (const [a, b] of [[-.15, -.01], [.01, .15]]) for (const [c, d] of [[1.01, 1.27], [1.3, 1.5]]) k.shape(C.red, rect(u + a, u + b, c, d), S, .032);
      for (let v = 1.54; v < 1.75; v += .045) k.slab(C.red, rect(u - .15, u + .15, v, v + .025), S, .03, .045);
    }
    if (door) {const u = u1 - .32; k.slab(C.mint, rect(u - .16, u + .16, BY + .06, 1.65), S, 0, .03); k.shape(C.red, rect(u - .12, u + .12, BY + .06, 1.6), S, .033);}
  }
  // hip-and-gable roof
  const EY = TY + .03, RW = SX1 - SX0 + .34, RD = SZ1 - SZ0 + .34, HW = RW - 1.3, HD = RD - 1.3, GY = EY + .36, RY = GY + .4;
  k.box(C.red, SX0 - .17, SX1 + .17, TY - .07, EY, SZ0 - .17, SZ1 + .17);
  k.box(C.mint, SX0 - .18, SX1 + .18, TY - .09, TY - .06, SZ0 - .18, SZ1 + .18);
  hipF(k, C.tile, ID, [sx - RW / 2, sx + RW / 2, sz - RD / 2, sz + RD / 2], [sx - HW / 2, sx + HW / 2, sz - HD / 2, sz + HD / 2], EY, .36, {ribs: C.tile, step: .11});
  const gz0 = sz - HD / 2 - .06, gz1 = sz + HD / 2 + .06;
  k.triangles(C.tile, [[[sx - HW / 2 - .05, GY - .02, gz0], [sx - HW / 2 - .05, GY - .02, gz1], [sx, RY, gz1], [sx, RY, gz0]], [[sx + HW / 2 + .05, GY - .02, gz0], [sx + HW / 2 + .05, GY - .02, gz1], [sx, RY, gz1], [sx, RY, gz0]]]);
  for (let z = gz0 + .06; z < gz1 - .03; z += .11) for (const s of [-1, 1]) k.tube(C.tile, [[sx + s * (HW / 2 + .04), GY, z], [sx, RY + .015, z]], .014, 4);
  for (const [z, d] of [[gz1 - .03, 1], [gz0 + .03, -1]]) {
    const F = frontAt(z);
    k.shape(C.red, [[sx - HW / 2, GY], [sx + HW / 2, GY], [sx, RY - .03]], F, d * .001);
    k.shape(C.mint, [[sx - HW / 2 + .14, GY + .04], [sx + HW / 2 - .14, GY + .04], [sx, RY - .1]], F, d * .004);
    k.shape(C.blue, [[sx - HW / 2 + .24, GY + .07], [sx + HW / 2 - .24, GY + .07], [sx, RY - .16]], F, d * .007);
    k.shape(C.yellow, ring(.04, 10, sx, GY + .14), F, d * .01);
  }
  for (const [x, z] of [[sx - RW / 2, sz - RD / 2], [sx + RW / 2, sz - RD / 2], [sx + RW / 2, sz + RD / 2], [sx - RW / 2, sz + RD / 2]]) {
    const tx = sx + Math.sign(x - sx) * HW / 2, tz = sz + Math.sign(z - sz) * HD / 2;
    k.tube(C.green, [[x, EY + .02, z], [tx, GY + .02, tz]], .028, 5);
    k.tube(C.green, [[x, EY + .02, z], [x + Math.sign(x - sx) * .1, EY + .14, z + Math.sign(z - sz) * .1]], t => .028 * (1 - t * .5), 5);
  }
  ridgeF(k, C.green, RZ, -sz, sx, HD / 2 + .06, RY + .02, -.015, .26, .04);
  for (const z of [gz1 - .02, gz0 + .02]) for (let n = -1; n <= 1; n++) {
    const x = sx + n * .1;
    k.lathe([C.blue, C.yellow, C.mint][n + 1], [[.03, 0], [.04, .05], [.025, .1]], x, z, 8, 0, RY + .04);
    k.lathe(C.white, ball(.022), x, z, 8, 0, RY + .14); k.lathe(C.red, [[.025, 0], [.0, .03]], x, z, 6, 0, RY + .185);
  }
  for (const s of [-1, 1]) {const z = sz + s * (HD / 2 + .32); k.tube(C.mint, [[sx, RY + .02, z - s * .32], [sx, RY + .12, z - s * .2], [sx, RY + .2, z - s * .26], [sx, RY + .16, z - s * .34]], .025, 5);}
  return {
    baseWidth: 7.2, detail: [0, 1.6, .9], overview: [0, 1.45, 0], distance: 13.4, elevation: .2, front: 1.0, back: -1.75,
    anchors: {
      'left-wing': {position: [hx, 1.74, HZ1 + .25], scale: .52},
      'right-wing': {position: [sx, 1.78, SZ1 + .1], scale: .52},
      'back-envelope': {position: [hx, 1.0, HZ0 - .14]}, 'front-envelope': {position: [px, 1.3, PZ1 + .3]},
    },
  };
}

/* ===== Sim Kwong Ho shophouses (Westerhout & Oman, 1926), 292-312 Balestier Road =====
 * The Chinese Baroque corner block, turned so its splayed corner faces the viewer and the two street fronts recede
 * left and right. Ochre piers carry the five-foot way; above, white walls with arched red casements over pink
 * panels, pilasters faced in pink and purple glazed tiles under teal wreath capitals, a frieze of plaster birds,
 * flowers and round vents, a teal dentil band and orange cornice, red pantile hipped roofs. One unit is the lilac
 * No. 300 with its balustraded balcony and louvred windows. On the corner, urn-topped piers frame a pediment
 * carrying the raised name board. Behind: rear kitchen wings and the back court of the corner unit. */
function simKwongHo(k, M) {
  const C = {white: mat('#f3f0e7', .85), ochre: mat('#e3a04a', .7), orange: mat('#d9883b', .6), teal: mat('#3fb3a3', .55), red: mat('#c42a2c', .55),
    pinkP: mat('#f2c9c3', .7), glass: mat('#2c3a39', .35), tileP: mat('#e7a1b6', .6), tileV: mat('#7c4e9a', .6), green: mat('#3f8b4b', .6), gold: M.gold,
    roof: mat('#c9653f', .85), lilac: mat('#c7a4cf', .85), dark: mat('#2b2a28', .8), floor: mat('#9a5a43', .9)};
  const ZC = 1.55, S = .55, A = .6, L = 3.3, D = 1.45, R = .38, nb = 3, bw = L / nb;
  const FR = wallF(S, ZC, A), FL = wallF(-S - L * Math.cos(A), ZC - L * Math.sin(A), -A), FC = frontAt(ZC);
  k.box(C.dark, -3.5, 3.5, 0, .02, -2.08, 2.08);
  k.box(mat('#b9b4a8', .95), -3.5, 3.5, .02, .035, -2.08, 2.08);
  const archWin = (F, u, v0, hw, spring, panel = C.pinkP, frame = C.red) => {
    k.slab(C.orange, archShape(hw + .035, spring, 10, u, v0 - .015), F, 0, .016);
    k.slab(C.orange, rect(u - .025, u + .025, v0 + spring + hw - .01, v0 + spring + hw + .05), F, 0, .03);
    k.slab(frame, archShape(hw, spring, 10, u, v0), F, .016, .028);
    k.shape(C.glass, semi(hw - .022, u, v0 + spring, 8), F, .03);
    k.shape(C.glass, rect(u - hw + .022, u + hw - .022, v0 + spring * .52, v0 + spring - .02), F, .03);
    for (const s of [-1, 1]) k.shape(panel, rect(u + s * .012, u + s * (hw - .022), v0 + .025, v0 + spring * .48), F, .03);
    k.shape(frame, rect(u - .006, u + .006, v0 + spring * .52, v0 + spring + hw - .025), F, .032);
    k.shape(frame, rect(u - hw + .02, u + hw - .02, v0 + spring * .78, v0 + spring * .78 + .01), F, .032);
    k.slab(C.white, rect(u - hw - .04, u + hw + .04, v0 - .04, v0), F, 0, .05);
  };
  const pilaster = (F, u, hw, tile, v1 = 2.1, wall = C.white) => {
    k.slab(wall, rect(u - hw, u + hw, 1.25, v1), F, 0, .035);
    k.shape(tile, rect(u - hw + .02, u + hw - .02, 1.34, 1.94), F, .037);
    k.slab(C.teal, rect(u - hw - .015, u + hw + .015, 1.96, 2.1), F, 0, .06);
    k.shape(C.red, ring(.024, 8, u, 2.03), F, .062); k.shape(C.green, rect(u - .006, u + .006, 1.97, 2.0), F, .062);
  };
  const frieze = (F, u0, u1, wall) => {
    k.slab(wall, rect(u0, u1, 2.1, 2.36), F, 0, .02);
    for (let u = u0 + .04; u < u1 - .03; u += .075) k.slab(C.teal, rect(u, u + .045, 2.36, 2.43), F, 0, .05);
    k.slab(C.white, rect(u0, u1, 2.355, 2.365), F, 0, .055);
    k.slab(C.ochre, rect(u0, u1, 2.43, 2.53), F, 0, .1);
  };
  const reliefs = (F, u) => {
    for (const s of [-1, 1]) {
      k.slab(C.gold, [[u + s * .03, 2.2], [u + s * .1, 2.24], [u + s * .13, 2.29], [u + s * .08, 2.25], [u + s * .02, 2.24]], F, .02, .032);
      k.slab(C.green, rect(u + s * .11, u + s * .17, 2.16, 2.19), F, .02, .03);
    }
    k.shape(C.red, ring(.025, 8, u - .06, 2.18), F, .033); k.shape(C.red, ring(.025, 8, u + .06, 2.18), F, .033);
  };
  const vent = (F, u) => {k.slab(C.white, ring(.04, 10, u, 2.24), F, .02, .035); k.shape(C.dark, ring(.024, 8, u, 2.24), F, .037);};
  const peacock = (F, u, v0) => {
    k.shape(C.white, rect(u - .13, u + .13, v0, v0 + .5), F, .012);
    k.shape(C.ochre, [[u - .06, v0 + .04], [u + .04, v0 + .04], [u + .06, v0 + .2], [u - .02, v0 + .26], [u - .08, v0 + .14]], F, .016);
    k.tube(C.teal, [F(u - .09, v0 + .16, .02), F(u - .03, v0 + .2, .022), F(u + .02, v0 + .25, .022), F(u + .04, v0 + .33, .02)], .022, 5);
    k.tube(C.teal, [F(u + .02, v0 + .06, .02), F(u + .06, v0 + .12, .022), F(u + .05, v0 + .2, .02)], .015, 5);
    for (const [a, b] of [[-.06, .4], [.05, .44], [.08, .36], [-.03, .46]]) k.shape(C.red, ring(.022, 8, u + a, v0 + b), F, .02);
  };
  // the two street fronts
  const wing = (F, flip) => {
    bx(k, C.white, F, 0, L, 0, 1.25, -D, -R);
    bx(k, C.floor, F, 0, L, .0, .035, -R, .04);
    bx(k, C.ochre, F, 0, L, 1.1, 1.25, -.05, .04); bx(k, C.white, F, 0, L, 1.07, 1.1, -.04, .03);
    for (let b = 0; b < nb; b++) {
      const u0 = b * bw, u1 = u0 + bw, uc = (u0 + u1) / 2, n300 = !flip && b === 1, wall = n300 ? C.lilac : C.white;
      bx(k, wall, F, u0, u1, 1.25, 2.53, -D, 0);
      // ground: shop front behind the five-foot way
      const G = (u, v, w = 0) => F(u, v, w - R);
      k.shape(C.dark, rect(u0 + .12, u1 - .12, .035, .92), G, .003);
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) k.slab(C.floor, rect(s < 0 ? u0 + .12 + i * .07 : u1 - .12 - (i + 1) * .07, s < 0 ? u0 + .17 + i * .07 : u1 - .17 - i * .07, .035, .9), G, .003, .02);
      k.slab([C.red, C.teal, C.ochre][(b + (flip ? 1 : 0)) % 3], rect(u0 + .16, u1 - .16, .94, 1.06), G, 0, .04);
      k.shape(C.gold, rect(u0 + .2, u1 - .2, .985, 1.015), G, .042);
      // the upper floor
      const tile = (b + (flip ? 1 : 0)) % 2 ? C.tileV : C.tileP, hw = .115;
      if (n300) {
        bx(k, C.white, F, u0 + .05, u1 - .05, 1.26, 1.3, 0, .2);
        for (let u = u0 + .1; u < u1 - .05; u += .06) k.lathe(C.white, [[.014, 0], [.022, .04], [.012, .09], [.016, .13]], ...at(F, u, .17), 6, 0, 1.3);
        bx(k, C.white, F, u0 + .05, u1 - .05, 1.43, 1.47, .12, .21);
      }
      for (let i = 0; i < 3; i++) {
        const u = u0 + bw * (i + .5) / 3;
        if (!n300 && i === 1 && b === 0) peacock(F, u, 1.42);
        else archWin(F, u, 1.45, hw, .36, n300 ? C.white : C.pinkP, n300 ? C.green : C.red);
        if (n300) for (let v = 1.5; v < 1.6; v += .03) k.slab(C.white, rect(u - hw + .02, u + hw - .02, v, v + .012), F, .03, .04);
        k.slab(C.white, rect(u - hw, u + hw, 1.28, 1.41), F, 0, .012); k.shape(i === 1 ? C.tileV : C.tileP, rect(u - hw + .02, u + hw - .02, 1.3, 1.39), F, .014);
        reliefs(F, u);
        if (i < 2) {pilaster(F, u0 + bw * (i + 1) / 3, .035, tile, 2.1, wall); vent(F, u0 + bw * (i + 1) / 3);}
      }
      frieze(F, u0, u1, wall);
    }
    for (let b = flip ? 0 : 1; b <= (flip ? nb - 1 : nb); b++) {
      const u = b * bw;
      pilaster(F, u, .065, b % 2 ? C.tileV : C.tileP, 2.1);
      bx(k, C.ochre, F, u - .08, u + .08, .035, 1.07, -.12, .03);
      bx(k, C.white, F, u - .1, u + .1, .035, .14, -.14, .05); bx(k, C.white, F, u - .1, u + .1, .98, 1.07, -.14, .05);
      k.shape(C.white, ring(.05, 12, u, .62), F, .032); k.shape(C.ochre, ring(.035, 12, u, .62), F, .034);
    }
    // red pantile roof, gabled into a party wall at the far end and open at the corner to meet the corner roof
    const far = flip ? 0 : L, e0 = flip ? -.04 : -.05, e1 = flip ? L + .05 : L + .04, RW = -D / 2 + .02;
    hipF(k, C.roof, F, [e0, e1, -D - .12, .16], [e0, e1, RW, RW], 2.53, .55, {ribs: C.roof, step: .11, gable: C.white});
    k.tube(C.roof, [F(e0, 3.1, RW), F(e1, 3.1, RW)], .03, 5);
    const E = (u, v, w = 0) => F(far + (flip ? -w : w), v, -u);
    k.slab(C.white, [[-.2, 2.45], [D + .14, 2.45], [D + .14, 2.58], [D / 2 - .02, 3.24], [-.2, 2.6]], E, -.07, .03);
    for (const [a, b] of [[-.22, 2.6], [D + .16, 2.58]]) k.tube(C.white, [E(a, b, -.02), E(D / 2 - .02, 3.27, -.02)], .035, 5);
    k.tube(C.dark, [E(D * .75, .035, .05), E(D * .75, 2.5, .05)], .018, 5);
    for (const v of [1.25, 2.53]) k.shape(C.ochre, rect(-.02, D, v - .03, v + .02), E, .032);
    // the back: rear wall windows, kitchen wings, downpipes
    const B = (u, v, w = 0) => F(L - u, v, -D - w);
    for (let b = 0; b < nb; b++) {
      const uc = L - (b + .5) * bw;
      for (const s of [-1, 1]) {
        k.slab(C.white, rect(uc + s * .25 - .12, uc + s * .25 + .12, 1.55, 2.05), B, 0, .02);
        k.shape(C.green, rect(uc + s * .25 - .1, uc + s * .25 - .005, 1.58, 2.02), B, .022); k.shape(C.green, rect(uc + s * .25 + .005, uc + s * .25 + .1, 1.58, 2.02), B, .022);
      }
      k.tube(C.dark, [B(uc + bw / 2 - .05, .03, .04), B(uc + bw / 2 - .05, 2.5, .04)], .018, 5);
      const own = flip ? b < nb - 1 : b > 0;
      if (own) {
        bx(k, C.white, B, uc - .3, uc + .3, 0, 1.6, 0, .52);
        k.triangles(C.roof, [[B(uc - .36, 1.82, -.02), B(uc + .36, 1.82, -.02), B(uc + .36, 1.56, .6), B(uc - .36, 1.56, .6)]]);
        k.shape(C.floor, rect(uc - .12, uc + .12, .035, .72), (u, v, w = 0) => B(u, v, .52 + w), .004);
        k.shape(C.green, rect(uc - .1, uc + .1, 1.0, 1.3), (u, v, w = 0) => B(u, v, .52 + w), .004);
      } else k.shape(C.floor, rect(uc - .14, uc + .14, .035, .8), B, .004);
    }
  };
  wing(FR, false);
  wing(FL, true);
  // the corner: piers with urns, three windows, the pediment with its raised name board
  const RRo = FR(-.05, 3.08, -D / 2 + .02), RLo = FL(L + .05, 3.08, -D / 2 + .02);
  k.prism(C.white, [[-S, ZC], [S, ZC], [0, .72]].map(([x, z]) => [x, z]), 1.25, 2.53);
  k.prism(C.white, [[-.29, ZC - R], [.29, ZC - R], [0, .72]], 0, 1.25);
  k.box(C.floor, -S, S, 0, .035, ZC - R, ZC + .04);
  {
    const G = frontAt(ZC - R);
    k.shape(C.dark, rect(-.3, .3, .035, .92), G, .003); k.slab(C.teal, rect(-.34, .34, .94, 1.06), G, 0, .05); k.shape(C.gold, rect(-.3, .3, .985, 1.015), G, .052);
  }
  bx(k, C.ochre, FC, -S, S, 1.1, 1.25, -.05, .04);
  for (const s of [-1, 1]) {
    bx(k, C.ochre, FC, s * S - .09, s * S + .09, .035, 1.07, -.12, .03);
    bx(k, C.white, FC, s * S - .11, s * S + .11, .035, .14, -.14, .05); bx(k, C.white, FC, s * S - .11, s * S + .11, .98, 1.07, -.14, .05);
    k.shape(C.white, ring(.05, 12, s * S, .62), FC, .032);
    pilaster(FC, s * (S - .06), .07, C.tileV, 2.53);
    bx(k, C.white, FC, s * (S - .06) - .085, s * (S - .06) + .085, 2.53, 3.18, -.12, .05);
    k.shape(C.tileV, rect(s * (S - .06) - .05, s * (S - .06) + .05, 2.6, 2.95), FC, .052);
    bx(k, C.teal, FC, s * (S - .06) - .1, s * (S - .06) + .1, 3.0, 3.06, -.14, .07);
    bx(k, C.white, FC, s * (S - .06) - .11, s * (S - .06) + .11, 3.18, 3.22, -.15, .07);
    const [x, z] = at(FC, s * (S - .06), -.04);
    k.lathe(C.gold, [[.04, 0], [.04, .03], [.02, .05], [.065, .1], [.07, .15], [.04, .2], [.05, .22], [.0, .27]], x, z, 12, 0, 3.22);
    pilaster(FC, s * .135, .03, C.tileP);
  }
  archWin(FC, -.28, 1.45, .095, .36); archWin(FC, .28, 1.45, .095, .36); archWin(FC, 0, 1.31, .095, .52);
  for (const u of [-.28, .28]) {k.slab(C.white, rect(u - .095, u + .095, 1.28, 1.41), FC, 0, .012); k.shape(C.tileP, rect(u - .075, u + .075, 1.3, 1.39), FC, .014);}
  frieze(FC, -S + .12, S - .12, C.white); reliefs(FC, 0); vent(FC, -.27); vent(FC, .27);
  {
    k.triangles(C.roof, [[[-S - .09, 2.53, ZC + .16], [S + .09, 2.53, ZC + .16], RRo, RLo], [[S + .09, 2.53, ZC + .16], FR(-.05, 2.53, .16), RRo], [[-S - .09, 2.53, ZC + .16], FL(L + .05, 2.53, .16), RLo]]);
    k.tube(C.roof, [RLo, RRo], .03, 5);
    const T = [[-.44, 2.73], [.44, 2.73], [0, 3.46]];
    bx(k, C.white, FC, -.42, .42, 2.53, 2.73, -.1, .05);
    bx(k, C.teal, FC, -.36, .36, 2.57, 2.68, .05, .06);
    for (const s of [-1, 1]) {k.slab(C.gold, [[s * .05, 2.6], [s * .3, 2.6], [s * .33, 2.64], [s * .2, 2.66], [s * .08, 2.65]], FC, .06, .075); k.shape(C.red, ring(.022, 8, s * .18, 2.625), FC, .078);}
    bx(k, C.teal, FC, -.45, .45, 2.71, 2.75, -.1, .08);
    k.slab(C.white, T, FC, -.1, .04);
    for (const s of [-1, 1]) k.tube(C.teal, [FC(s * .48, 2.75, .055), FC(0, 3.5, .055)], .028, 5);
    k.lathe(C.gold, [[.03, 0], [.05, .05], [.0, .13]], ...at(FC, 0, -.02), 10, 0, 3.48);
    k.slab(C.white, rect(-.23, .23, 2.8, 3.04), FC, .04, .075);
    for (const [u0, u1, v0, v1] of [[-.23, .23, 2.8, 2.817], [-.23, .23, 3.023, 3.04], [-.23, -.213, 2.8, 3.04], [.213, .23, 2.8, 3.04]]) k.shape(C.red, rect(u0, u1, v0, v1), FC, .077);
    for (let n = 0; n < 3; n++) glyph(k, C.red, FC, -.13 + n * .13, 2.92, .1, .075, .085, n + 1);
    for (const s of [-1, 1]) {k.slab(C.gold, [[s * .22, 2.8], [s * .32, 2.8], [s * .27, 2.9], [s * .23, 2.95]], FC, .02, .05); k.tube(C.gold, [FC(s * .25, 2.95, .05), FC(s * .3, 3.0, .05), FC(s * .27, 3.05, .05)], .012, 4);}
  }
  // the back court of the corner unit
  k.box(C.white, -.72, .72, 0, 2.05, -1.05, .45);
  k.hip(C.roof, 0, -.3, 1.62, 1.68, .5, 0, 2.05, .4);
  {
    const B = backAt(-1.05);
    k.shape(C.floor, rect(-.17, .17, .035, .75), B, .004); k.slab(C.white, rect(-.21, .21, .75, .8), B, 0, .04);
    for (const s of [-1, 1]) {k.slab(C.white, rect(s * .42 - .13, s * .42 + .13, 1.0, 1.55), B, 0, .02); k.shape(C.green, rect(s * .42 - .11, s * .42 + .11, 1.02, 1.53), B, .022); k.shape(C.white, rect(s * .42 - .006, s * .42 + .006, 1.02, 1.53), B, .024);}
    k.tube(C.dark, [[.66, .03, -1.08], [.66, 2.05, -1.08]], .018, 5);
  }
  return {
    baseWidth: 7, detail: [0, 2.2, ZC], overview: [0, 1.7, 0], distance: 13, elevation: .2, front: ZC + .15, back: -1.1,
    anchors: {'back-envelope': {position: [0, 1.25, -1.13]}, 'front-envelope': {position: [0, 1.6, ZC + .35]}},
  };
}

/* ===== Lam Yeo Coffee Powder Factory (since 1960), 328 Balestier Road =====
 * A three-storey post-war walk-up: cream walls, a raised-letter name band over the five-foot way, paired timber
 * casements under rows of vent slots and continuous concrete sun-ledges. Under the five-foot way the old gilt
 * hanging board, the "328" plate, folded steel gates, and the open shop: twin grinders on the mint-green bin cabinet,
 * glass display cases and counter, sacks, tins and a barrel. Cut in at each side: the same row on the left and an
 * older two-storey shophouse with a tiled roof on the right. Front (+z) is Balestier Road. */
function lamYeo(k, M) {
  const C = {cream: mat('#ebe2ca', .9), cream2: mat('#dcd8cc', .9), black: mat('#1f1d1b', .6), glass: mat('#33403e', .35), frame: mat('#4b3a2b', .8),
    grey: mat('#8f9391', .7), gold: M.gold, mint: mat('#a8cdb5', .7), steel: mat('#c7ccd0', .32, {metalness: .6}), sack: mat('#bb9b6b', .95), wood: M.wood,
    white: mat('#f1f2ee', .85), blue: mat('#7a9fc6', .7), tile: mat('#7c4b3b', .9), yellow: mat('#e9c13d', .6), red: mat('#c0312a', .6)};
  const X = 1.3, ZF = .95, ZS = .4, ZB = -1.75, G = 1.7, OT = 1.3, F1 = 2.15, F2 = 3.0, TOP = 3.85;
  k.box(C.grey, -3.5, 3.5, 0, .02, ZS, ZF + .03);
  k.box(C.cream2, -3.5, 3.5, .02, .1, ZF + .03, ZF + .09);
  // the Lam Yeo unit: walls, the five-foot way, the shop opening with its lintel, vents and folded gates
  k.box(C.cream, -X, X, G, TOP, ZB, ZF);
  k.box(C.cream, -X, X, 0, G, ZB, -1.0);
  k.box(C.white, -X + .05, X - .05, G - .08, G, -1.0, ZS);
  k.box(C.grey, -X, X, 0, .03, -1.0, ZS);
  k.box(C.cream, -X, -1.05, 0, G, -1.0, ZS); k.box(C.cream, 1.05, X, 0, G, -1.0, ZS);
  k.box(C.cream, -1.05, 1.05, OT, G, ZS - .08, ZS);
  for (const x of [-X, X]) {k.box(C.cream, x - .1, x + .1, 0, G, ZF - .2, ZF); k.box(C.cream2, x - .12, x + .12, 0, .12, ZF - .22, ZF + .02);}
  {
    const F = frontAt(ZS);
    k.slab(C.cream, rect(-1.12, 1.12, OT, OT + .08), F, 0, .03);
    k.slab(C.grey, rect(-1.2, 1.2, OT + .1, OT + .19), F, 0, .01);
    for (let u = -1.15; u < 1.15; u += .12) k.shape(C.black, rect(u, u + .08, OT + .115, OT + .175), F, .012);
    k.slab(C.white, rect(-.86, -.68, OT + .015, OT + .065), F, .03, .04); for (let n = 0; n < 3; n++) k.shape(C.black, rect(-.84 + n * .055, -.81 + n * .055, OT + .023, OT + .057), F, .042);
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const u = s * (1.04 - i * .028);
      k.slab(C.grey, rect(u - .006, u + .006, .03, OT), F, .01, .04);
      if (i < 5) for (const [a, b] of [[.1, .7], [.7, 1.25]]) k.tube(C.grey, [F(u, a, .025), F(u - s * .028, b, .025)], .005, 3);
    }
  }
  const ZP = ZF - .26;
  k.box(C.gold, -.24, .5, 1.27, 1.56, ZP, ZP + .03);
  k.box(C.frame, -.26, .52, 1.26, 1.57, ZP - .005, ZP + .025);
  for (const x of [-.16, .42]) k.tube(C.black, [[x, 1.56, ZP + .015], [x, G, ZP + .015]], .006, 3);
  {const F = frontAt(ZP + .03); glyph(k, C.frame, F, .01, 1.44, .16, 0, .012, 0); glyph(k, C.frame, F, .26, 1.44, .16, 0, .012, 2); for (let n = 0; n < 7; n++) if (n !== 3) k.slab(C.frame, rect(-.12 + n * .075, -.08 + n * .075, 1.3, 1.335), F, 0, .012);}
  // inside the shop: display cases and counter, the grinders on the bin cabinet, tins, sacks, posters, barrel
  k.box(C.white, -X + .05, X - .05, .03, G - .08, -1.02, -1.0);
  for (const x of [-.5, .5]) k.box(C.white, x - .25, x + .25, G - .1, G - .08, -.5, -.46);
  k.box(C.frame, -1.24, -1.0, .03, 1.3, -.95, .3);
  {const S = sideAt(-1.0, 1); for (let n = 0; n < 4; n++) {const u = -.25 + n * .3; k.shape(C.glass, rect(u - .13, u + .13, .1, 1.26), S, .003); for (const v of [.45, .76, 1.02]) k.slab(C.frame, rect(u - .13, u + .13, v, v + .015), S, 0, .03);} for (let n = 0; n < 9; n++) k.block([C.red, C.yellow, C.white][n % 3], .04, .06, .04, -.96, .47 + (n % 3) * .3, -.75 + n * .12);}
  k.box(C.frame, -.95, -.4, .03, .45, -.55, .25); k.box(C.mint, -.97, -.38, .45, .5, -.57, .27);
  k.box(C.glass, -.94, -.41, .08, .42, .25, .26);
  for (let n = 0; n < 3; n++) k.lathe([C.red, C.white, C.steel][n], [[.04, 0], [.04, .09], [.03, .1]], -.85 + n * .12, .05, 8, 0, .5);
  k.box(C.mint, -.32, .32, .03, .48, -.25, .12);
  {const F = frontAt(.12); for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {const u = -.24 + c * .16; k.shape(C.glass, rect(u - .065, u + .065, .07 + r * .2, .23 + r * .2), F, .003); k.shape(C.white, rect(u - .025, u + .025, .19 + r * .2, .22 + r * .2), F, .006);}}
  for (const x of [-.15, .15]) {
    k.box(C.steel, x - .07, x + .07, .48, .62, -.12, .02);
    k.lathe(C.steel, [[.035, 0], [.035, .08], [.08, .16], [.08, .19]], x, -.05, 12, 0, .62);
    k.lathe(C.steel, [[.03, 0], [.03, .06]], x + .09, -.05, 8, 0, .5);
  }
  k.box(C.frame, .7, 1.22, .03, .45, -.8, .1);
  for (let n = 0; n < 6; n++) k.lathe(C.steel, [[.035, 0], [.035, .1], [.02, .12]], .78 + (n % 3) * .14, -.65 + Math.floor(n / 3) * .35, 8, 0, .45);
  {const S = sideAt(1.25, -1); for (let n = 0; n < 4; n++) {const u = -.85 + n * .27; k.slab(C.mint, rect(u - .11, u + .11, .85, 1.18), S, 0, .015); k.shape(C.sack, rect(u - .09, u + .09, .87, 1.16), S, .017); k.shape(C.glass, ring(.04, 8, u, 1.01), S, .019);}}
  for (let n = 0; n < 5; n++) k.lathe(C.sack, [[.06, 0], [.08, .05], [.07, .12], [.0, .14]], 1.12, -.7 + n * .17, 8, 0, 1.28);
  k.box(C.frame, .9, 1.25, 1.26, 1.28, -.85, -.05);
  k.box(C.frame, -.8, .8, .65, .68, -.98, -.82); k.box(C.frame, -.8, .8, .95, .98, -.98, -.82);
  for (let n = 0; n < 8; n++) k.lathe([C.sack, C.steel, C.red][n % 3], [[.045, 0], [.045, .12]], -.7 + n * .2, -.9, 8, 0, .68);
  for (let n = 0; n < 4; n++) k.block(C.sack, .4, .1, .22, -.05 + (n % 2) * .05, .03 + n * .1, -.7, n * .2);
  k.lathe(C.white, [[.06, 0], [.06, .015]], .25, -.99, 12, 0, 1.2); k.box(C.red, .5, .66, 1.12, 1.28, -.99, -.9);
  k.box(C.yellow, -1.02, -.5, .03, .62, ZS + .12, ZS + .34); k.box(C.yellow, -1.02, -.5, .62, .74, ZS + .12, ZS + .2);
  for (const [u0, u1, v0, v1] of [[-.98, -.78, .08, .3], [-.74, -.54, .08, .3], [-.98, -.54, .34, .58]]) k.shape(C.frame, rect(u0, u1, v0, v1), frontAt(ZS + .34), .003);
  k.lathe(C.wood, [[.11, 0], [.13, .14], [.11, .3]], .82, .22, 14, 0, .03);
  for (const y of [.08, .25]) k.lathe(C.frame, [[.128, 0], [.128, .02]], .82, .22, 14, 0, y);
  // the raised-letter name band, paired casements under vent slots, continuous sun-ledges
  {
    const F = frontAt(ZF);
    k.slab(C.cream, rect(-X, X, G, G + .05), F, 0, .05);
    for (let n = 0; n < 8; n++) glyph(k, C.black, F, -1.05 + n * .3, G + .29, .2, 0, .03, n);
    let u = -.95; for (const len of [3, 0, 3, 0, 6, 0, 6, 0, 5, 0, 7]) {if (!len) {u += .06; continue;} for (let i = 0; i < len; i++, u += .062) k.slab(C.black, rect(u, u + .045, G + .08, G + .15), F, 0, .025);}
    k.tube(C.sack, [[-X + .12, G - .05, ZF - .07], [X - .12, G - .05, ZF - .07]], .045, 8);
    for (const x of [-.8, 0, .8]) k.tube(C.grey, [[x, G - .1, ZF - .03], [x, 1.2, ZF - .03]], .004, 3);
    for (const fl of [F1, F2]) {
      for (const s of [-1, 1]) {
        const u = s * .58;
        k.slab(C.cream, rect(u - .36, u + .36, fl + .14, fl + .17), F, 0, .06);
        k.shape(C.glass, rect(u - .33, u + .33, fl + .17, fl + .6), F, .004);
        for (const du of [-.33, -.11, .11, .33]) k.slab(C.frame, rect(u + du - .015, u + du + .015, fl + .17, fl + .6), F, 0, .02);
        for (const v of [fl + .17, fl + .45, fl + .6]) k.slab(C.frame, rect(u - .33, u + .33, v - .015, v + .015), F, 0, .02);
        k.slab(C.grey, rect(u - .33, u + .33, fl + .64, fl + .72), F, 0, .008);
        for (let i = 0; i < 6; i++) k.shape(C.black, rect(u - .3 + i * .105, u - .23 + i * .105, fl + .655, fl + .705), F, .01);
      }
      k.slab(C.cream, rect(-X - .02, X + .02, fl + .75, fl + .8), F, 0, .16);
    }
    k.slab(C.cream, rect(-X - .02, X + .02, TOP, TOP + .08), F, 0, .2);
  }
  k.box(C.cream, -X, X, TOP + .08, TOP + .2, ZF - .06, ZF);
  k.box(C.cream, -.6, .2, TOP, TOP + .45, ZB + .1, ZB + .9); k.box(C.cream, -.65, .25, TOP + .45, TOP + .5, ZB + .05, ZB + .95);
  k.tube(C.grey, [[.8, TOP, -.8], [.8, TOP + .6, -.8]], .01, 4); for (const y of [.42, .54]) k.tube(C.grey, [[.62, TOP + y, -.8], [.98, TOP + y, -.8]], .008, 3);
  // the back lane side
  const backs = (x0, x1, top, wall, floors) => {
    const F = backAt(ZB), cx = -(x0 + x1) / 2;
    for (const fl of floors) for (const s of [-1, 1]) {
      const u = cx + s * (x1 - x0) * .22; if (!fl && s > 0) continue;
      k.slab(wall, rect(u - .25, u + .25, fl + .3, fl + .34), F, 0, .05);
      k.shape(C.glass, rect(u - .22, u + .22, fl + .34, fl + .64), F, .004);
      for (let v = fl + .36; v < fl + .62; v += .04) k.slab(C.grey, rect(u - .22, u + .22, v, v + .012), F, .004, .02);
      k.slab(wall, rect(u - .26, u + .26, fl + .68, fl + .71), F, 0, .08);
    }
    k.shape(C.frame, rect(cx + .15, cx + .5, .02, .95), F, .004);
    k.tube(C.grey, [F(cx - (x1 - x0) / 2 + .12, .02, .05), F(cx - (x1 - x0) / 2 + .12, top, .05)], .02, 5);
  };
  backs(-X, X, TOP, C.cream, [0, F1, F2]);
  backs(-3.45, -X, TOP, C.cream2, [0, F1, F2]);
  backs(X, 3.45, 2.75, C.white, [0, 1.75]);
  k.box(C.white, -.35, -.05, F1 + .2, F1 + .4, ZB - .14, ZB);
  // the side party walls, cut as a section: floor slabs show as bands
  {
    const S = sideAt(-3.45, -1);
    for (const v of [G, F1, F2, TOP]) k.shape(C.grey, rect(ZB, ZF, v - .025, v + .03), S, .003);
    for (const fl of [F1, F2]) for (const u of [-1.15, -.35]) {
      k.shape(C.glass, rect(u - .22, u + .22, fl + .2, fl + .58), S, .004);
      for (const du of [-.22, 0, .22]) k.slab(C.white, rect(u + du - .015, u + du + .015, fl + .2, fl + .58), S, 0, .02);
      k.slab(C.cream2, rect(u - .26, u + .26, fl + .62, fl + .66), S, 0, .12);
    }
    k.tube(C.grey, [[-3.48, .02, .2], [-3.48, TOP, .2]], .02, 5);
    k.shape(C.grey, rect(ZB, ZS, .0, .03), S, .003);
    const P = sideAt(X, 1);
    for (let n = 0; n < 2; n++) k.shape(C.grey, rect(-.2 + n * .9, .1 + n * .9, 3.3, 3.5), P, .003);
    k.tube(C.grey, [[X + .05, 2.9, -1.6], [X + .05, TOP, -1.6]], .02, 5);
  }
  // left: the same post-war row; right: an older two-storey shophouse with a tiled roof
  {
    const x0 = -3.45, x1 = -X;
    k.box(C.cream2, x0, x1, G, TOP, ZB, ZF); k.box(C.cream2, x0, x1, 0, G, ZB, ZS);
    k.box(C.cream2, x0, x0 + .2, 0, G, ZF - .2, ZF);
    const F = frontAt(ZF), cx = (x0 + x1) / 2;
    k.slab(C.yellow, rect(x0 + .15, x1 - .15, G + .12, G + .42), F, 0, .03);
    for (let n = 0; n < 5; n++) glyph(k, C.red, F, x0 + .4 + n * .34, G + .28, .2, .03, .04, n + 2);
    k.slab(C.cream2, rect(x0, x1, G, G + .05), F, 0, .05);
    for (const fl of [F1, F2]) {
      for (const s of [-1, 1]) {
        const u = cx + s * .48;
        k.shape(C.glass, rect(u - .3, u + .3, fl + .17, fl + .6), F, .004); k.shape(C.mint, rect(u - .28, u + .28, fl + .3, fl + .58), F, .006);
        for (const du of [-.3, 0, .3]) k.slab(C.white, rect(u + du - .015, u + du + .015, fl + .17, fl + .6), F, 0, .02);
        k.slab(C.grey, rect(u - .3, u + .3, fl + .64, fl + .72), F, 0, .008);
        for (let i = 0; i < 5; i++) k.shape(C.black, rect(u - .27 + i * .115, u - .2 + i * .115, fl + .655, fl + .705), F, .01);
      }
      k.slab(C.cream2, rect(x0, x1, fl + .75, fl + .8), F, 0, .16);
      k.box(C.white, cx + .1, cx + .4, fl + .2, fl + .4, ZF, ZF + .14);
    }
    k.slab(C.cream2, rect(x0, x1, TOP, TOP + .08), F, 0, .2);
    const S = frontAt(ZS);
    k.shape(C.black, rect(x0 + .3, x1 - .2, .03, OT), S, .003);
    for (let v = .75; v < OT; v += .05) k.slab(C.grey, rect(x0 + .3, x1 - .2, v, v + .035), S, .003, .02);
    for (let n = 0; n < 3; n++) k.lathe(C.grey, [[.08, 0], [.08, .16]], x0 + .6 + n * .18, ZS + .15, 10, 0, .03 + (n === 1 ? .16 : 0));
  }
  {
    const x0 = X, x1 = 3.45, cx = (x0 + x1) / 2, EY = 2.75, ZM = (ZB + ZF) / 2;
    k.box(C.white, x0, x1, G, EY, ZB, ZF); k.box(C.white, x0, x1, 0, G, ZB, ZS);
    k.box(C.white, x1 - .18, x1, 0, G, ZF - .2, ZF);
    k.gable(C.tile, cx, ZM, x1 - x0 + .02, ZF - ZB + .3, EY, .6, .05);
    for (let x = x0 + .1; x < x1; x += .12) for (const s of [-1, 1]) k.tube(C.tile, [[x, EY + .02, ZM + s * ((ZF - ZB) / 2 + .15)], [x, EY + .62, ZM]], .014, 4);
    k.tube(C.tile, [[x0, EY + .62, ZM], [x1, EY + .62, ZM]], .03, 5);
    const F = frontAt(ZF);
    k.slab(C.blue, rect(x0, x1, G - .05, G + .05), F, 0, .06);
    for (const u of [x0 + .1, x1 - .1]) {k.slab(C.white, rect(u - .08, u + .08, G, EY), F, 0, .04); k.slab(C.blue, rect(u - .1, u + .1, EY - .18, EY - .1), F, 0, .06);}
    for (const s of [-1, 1]) {
      const u = cx + s * .45;
      k.slab(C.blue, rect(u - .26, u + .26, 1.85, 2.6), F, 0, .02); k.shape(C.glass, rect(u - .22, u + .22, 1.89, 2.56), F, .022);
      k.shape(s < 0 ? C.red : C.blue, rect(u - .16, u + .16, 1.97, 2.45), F, .024); k.shape(C.white, rect(u - .1, u + .1, 2.05, 2.3), F, .026);
    }
    k.box(C.red, x1 - .55, x1 - .5, 1.8, 2.7, ZF, ZF + .4); k.box(C.white, x1 - .555, x1 - .495, 1.95, 2.55, ZF + .08, ZF + .32);
    const S = frontAt(ZS);
    k.slab(C.red, rect(x0 + .15, x1 - .25, 1.08, 1.3), S, 0, .04); for (let n = 0; n < 4; n++) glyph(k, C.yellow, S, x0 + .45 + n * .4, 1.19, .13, .04, .05, n);
    k.shape(C.glass, rect(x0 + .15, x1 - .25, .03, 1.04), S, .004);
    for (const u of [x0 + .8, x0 + 1.4]) k.slab(C.white, rect(u - .015, u + .015, .03, 1.04), S, 0, .02);
    const E = sideAt(x1, 1);
    for (const [u, v] of [[.1, 2.0], [1.3, 2.0], [1.3, .6]]) {k.shape(C.glass, rect(u - .2, u + .2, v, v + .4), E, .003); k.slab(C.blue, rect(u - .22, u + .22, v - .04, v), E, 0, .03); for (let w = v + .04; w < v + .38; w += .05) k.slab(C.white, rect(u - .2, u + .2, w, w + .015), E, .003, .015);}
    k.slab(C.blue, rect(-ZF - .05, -ZB + .05, EY - .08, EY), E, 0, .03);
    k.tube(C.grey, [[x1 + .04, .02, -1.5], [x1 + .04, EY, -1.5]], .02, 5);
    for (const v of [G]) k.shape(C.grey, rect(-ZF, -ZB, v - .025, v + .03), E, .003);
  }
  return {
    baseWidth: 7, detail: [0, 1.6, ZF], overview: [0, 1.95, 0], distance: 13.2, elevation: .2, front: ZF + .05, back: ZB - .05,
    anchors: {'front-envelope': {position: [0, 1.75, ZF + .25]}, 'back-envelope': {position: [0, 1.4, ZB - .12]}},
  };
}

export const BALESTIER_A_STOPS = {'balestier-01': gohChorTuaPekKong, 'balestier-02': simKwongHo, 'balestier-03': lamYeo};
