/* Hunt: bespoke stop miniatures (see field-stops.js). Civic District, first three stops:
 * the Gate of Hope in the CHIJMES wall, the Old Hill Street Police Station and the Siamese bronze elephant.
 * Interpretive miniatures after public photographs, not surveys. Front (+z) is the street side in each. */
import {rect, archShape, pointedShape, ring, frontAt, backAt, sideAt} from '../field-kit.js';
import {PI, mat, semi, towerFrames} from '../field-stop-shapes.js';

/* ---- local helpers ---- */
/** a flat quad on a wall frame (2 triangles, cheaper than kit.shape for rectangles) */
const quad = (k, m, F, u0, u1, v0, v1, w) => k.triangles(m, [[F(u0, v0, w), F(u1, v0, w), F(u1, v1, w), F(u0, v1, w)]]);
/** a block standing out of a wall: front face and four sides, no back */
function boxOn(k, m, F, u0, u1, v0, v1, w0, w1) {
  const P = F;
  k.triangles(m, [
    [P(u0, v0, w1), P(u1, v0, w1), P(u1, v1, w1), P(u0, v1, w1)],
    [P(u0, v0, w0), P(u0, v0, w1), P(u0, v1, w1), P(u0, v1, w0)],
    [P(u1, v0, w1), P(u1, v0, w0), P(u1, v1, w0), P(u1, v1, w1)],
    [P(u0, v1, w1), P(u1, v1, w1), P(u1, v1, w0), P(u0, v1, w0)],
    [P(u0, v0, w0), P(u1, v0, w0), P(u1, v0, w1), P(u0, v0, w1)],
  ]);
}
/** pitched roof with its ridge along z (kit.gable runs along x) */
function gableZ(k, m, cx, z0, z1, w, y0, h, gableMat = null) {
  const x0 = cx - w / 2, x1 = cx + w / 2;
  k.triangles(m, [[[x0, y0, z0], [x0, y0, z1], [cx, y0 + h, z1], [cx, y0 + h, z0]], [[x1, y0, z1], [x1, y0, z0], [cx, y0 + h, z0], [cx, y0 + h, z1]]]);
  if (gableMat) k.triangles(gableMat, [[[x0, y0, z0], [x1, y0, z0], [cx, y0 + h, z0]], [[x0, y0, z1], [x1, y0, z1], [cx, y0 + h, z1]]]);
}
/** a short arc of points for tubes */
const arc = (n, f) => Array.from({length: n + 1}, (_, i) => f(i / n));
/** small four-sided pinnacle or pier cap */
const pinnacle = (k, m, x, z, y, r, h) => k.lathe(m, [[r, 0], [r, h * .18], [r * .55, h * .24], [0, h]], x, z, 4, PI / 4, y);

/* ===== CHIJMES: the Gate of Hope (Victoria Street wall), with CHIJMES Hall behind =====
 * The street-side boundary wall of the former Convent of the Holy Infant Jesus: white piers and coping, a railed
 * stretch where the convent can be seen, and a solid stretch with the small round-headed grey door where babies
 * were left (named the Gate of Hope in 1996), under its name board. Behind it the Gothic Revival chapel (1903-04):
 * the five-stage spire over the pointed portal, flying buttresses at the front corners, buttressed lancet bays and
 * the apse. Front (+z) is Victoria Street; the gate is shown from the convent side on the back. */
function gateOfHope(k, M) {
  const C = {wall: mat('#f2eee4', .9), trim: mat('#fdfbf6', .82), base: mat('#aca699', .95), pave: mat('#c6bfb0', .95), lawn: mat('#7f9f5e', .95),
    door: mat('#7f868c', .7), doorDk: mat('#646b72', .7), dark: mat('#2f2b28', .8), iron: mat('#262827', .5, {metalness: .4}),
    roof: mat('#5d626b', .85), glass: mat('#33456e', .35, {emissive: '#5a3a8a', emissiveIntensity: .12}), sign: mat('#1f4337', .6), gold: M.gold,
    leaf: mat('#4d7a45', .9), wood: mat('#6a5240', .9)};
  const ZW = 1.0, T = .2, Z0 = ZW - T / 2, Z1 = ZW + T / 2, GX = .72, S0 = -.2, XE = 2.72, GP = .64;
  const R = .29, V0 = .14, SP = .84, YS = V0 + SP, YB = 1.78;   // door half-width, sill, spring, raised bay height
  const F = frontAt(Z1), B = backAt(Z0);
  // ground: Victoria Street pavement outside, lawn and paths inside
  k.box(C.pave, -XE, XE, 0, .03, Z1, 2.12);
  k.box(C.base, -XE, XE, 0, .06, 2.0, 2.12);
  k.box(C.lawn, -XE, XE, 0, .018, -2.08, Z0);
  k.box(C.pave, GX - .36, GX + .36, 0, .03, .3, Z0);
  k.box(C.pave, -1.9, GX + .36, 0, .028, .3, .62);
  // wall: base course, railed stretch (left, the chapel seen through it), solid stretch (right)
  k.box(C.base, -XE, XE, 0, .14, Z0 - .025, Z1 + .025);
  k.box(C.wall, -XE, S0, .14, .52, Z0, Z1);
  k.box(C.trim, -XE, S0, .52, .58, Z0 - .035, Z1 + .035);
  for (let x = -XE + .1; x < S0 - .05; x += .068) {
    k.box(C.iron, x - .009, x + .009, .58, 1.3, ZW - .009, ZW + .009);
    pinnacle(k, C.iron, x, ZW, 1.3, .022, .07);
  }
  for (const y of [.66, 1.2]) k.box(C.iron, -XE, S0, y, y + .02, ZW - .014, ZW + .014);
  for (const [x0, x1] of [[S0, GX - GP], [GX + GP, XE]]) {
    k.box(C.wall, x0, x1, .14, 1.38, Z0, Z1);
    k.box(C.trim, x0, x1, 1.38, 1.44, Z0 - .045, Z1 + .045);
    k.hip(C.trim, (x0 + x1) / 2, ZW, x1 - x0, T + .06, x1 - x0, .02, 1.44, .07);
    for (const Fr of [F, B]) {
      const a = Fr === F ? x0 : -x1, b = Fr === F ? x1 : -x0, n = Math.max(1, Math.round((b - a - .3) / .55)), pw = (b - a - .3) / n;
      for (let i = 0; i < n; i++) {
        const u0 = a + .15 + i * pw + .05, u1 = u0 + pw - .1;
        boxOn(k, C.trim, Fr, u0, u1, .32, 1.22, 0, .014);
        quad(k, C.wall, Fr, u0 + .035, u1 - .035, .355, 1.185, .016);
      }
      quad(k, C.dark, Fr, a, b, .2, .205, .002);
    }
  }
  // the gate bay: raised wall under a small pediment; the round-headed grey door with its fanlight, keystone and
  // impost blocks in a moulded surround; the name board above
  k.box(C.wall, GX - GP, GX + GP, .14, YB, Z0, Z1);
  k.box(C.trim, GX - GP - .04, GX + GP + .04, YB - .02, YB + .06, Z0 - .05, Z1 + .05);
  k.slab(C.trim, [[GX - GP - .04, YB + .06], [GX + GP + .04, YB + .06], [GX, YB + .32]], F, -T - .05, .05);
  k.slab(C.wall, [[GX - GP + .1, YB + .08], [GX + GP - .1, YB + .08], [GX, YB + .25]], F, .05, .055);
  k.slab(C.gold, ring(.045, 10, GX, YB + .15), F, .055, .065);
  for (const Fr of [F, B]) {const u = Fr === F ? GX : -GX; boxOn(k, C.trim, Fr, u - GP, u + GP, .14, .2, 0, .03); boxOn(k, C.trim, Fr, u - GP, u + GP, YB - .1, YB - .06, 0, .03);}
  k.slab(C.trim, archShape(R + .11, SP, 16, GX, V0), F, 0, .045);
  k.slab(C.wall, archShape(R + .07, SP, 16, GX, V0), F, .045, .05);
  k.shape(C.base, archShape(R + .03, SP, 16, GX, V0), F, .052);
  k.shape(C.door, archShape(R, SP - .02, 16, GX, V0), F, .055);
  k.shape(C.dark, semi(R - .02, GX, YS, 12), F, .058);
  for (let i = 1; i < 6; i++) {const a = i / 6 * PI; k.tube(C.door, [F(GX, YS, .062), F(GX + Math.cos(a) * (R - .02), YS + Math.sin(a) * (R - .02), .062)], .008, 4);}
  k.tube(C.door, arc(10, t => F(GX + Math.cos(t * PI) * .11, YS + Math.sin(t * PI) * .11, .062)), .009, 4);
  boxOn(k, C.door, F, GX - R, GX + R, YS - .03, YS + .015, .055, .072);
  for (const s of [-1, 1]) {
    for (const [v0, v1] of [[.24, .52], [.58, .9]]) {boxOn(k, C.doorDk, F, GX + s * (R - .03), GX + s * .04, v0, v1, .055, .067); quad(k, C.door, F, GX + s * (R - .055), GX + s * .065, v0 + .03, v1 - .03, .068);}
    boxOn(k, C.trim, F, GX + s * (R + .03), GX + s * (R + .15), YS - .06, YS + .02, 0, .07);
  }
  quad(k, C.dark, F, GX - .006, GX + .006, V0, YS - .03, .07);
  for (const s of [-1, 1]) boxOn(k, C.gold, F, GX + s * .07 - .015, GX + s * .07 + .015, .52, .6, .067, .085);
  k.slab(C.trim, [[GX - .06, YS + R - .04], [GX + .06, YS + R - .04], [GX + .085, YS + R + .12], [GX - .085, YS + R + .12]], F, 0, .075);
  boxOn(k, C.gold, F, GX - .36, GX + .36, 1.42, 1.66, 0, .02);
  boxOn(k, C.sign, F, GX - .33, GX + .33, 1.44, 1.64, .02, .03);
  quad(k, C.gold, F, GX - .22, GX + .22, 1.55, 1.585, .032);
  quad(k, C.gold, F, GX - .14, GX + .14, 1.49, 1.51, .032);
  // interpretive panel on the wall to the right, and a wall lantern to the left of the gate
  boxOn(k, C.base, F, GX + .86, GX + 1.26, .62, 1.14, 0, .02);
  boxOn(k, C.sign, F, GX + .88, GX + 1.24, .64, 1.12, .02, .028);
  for (let i = 0; i < 4; i++) quad(k, C.trim, F, GX + .92, GX + 1.2 - (i % 2) * .08, 1.02 - i * .09, 1.04 - i * .09, .03);
  k.tube(C.iron, [F(GX - GP - .24, 1.25, 0), F(GX - GP - .24, 1.32, .1), F(GX - GP - .24, 1.3, .16)], .012, 4);
  {const p = F(GX - GP - .24, 0, .16); k.lathe(C.iron, [[.0, 0], [.04, .02], [.05, .1], [.065, .12], [0, .18]], p[0], p[2], 8, 0, 1.12);}
  // the convent side of the gate: plain surround and door, a step down to the path
  k.slab(C.trim, archShape(R + .09, SP, 16, -GX, V0), B, 0, .03);
  k.shape(C.door, archShape(R, SP - .02, 16, -GX, V0), B, .033);
  quad(k, C.dark, B, -GX - .006, -GX + .006, V0, YS + R - .05, .035);
  k.box(C.base, GX - .38, GX + .38, 0, .06, Z0 - .2, Z0);
  // piers: caps, pyramids, ball finials; the two gate piers stand taller
  for (const x of [-XE + .05, -1.84, -1.02, S0, GX - GP, GX + GP, XE - .05]) {
    const tall = Math.abs(Math.abs(x - GX) - GP) < .01, h = tall ? 2.02 : 1.6, hw = tall ? .15 : .12;
    k.box(C.base, x - hw - .02, x + hw + .02, 0, .2, Z0 - .07, Z1 + .07);
    k.box(C.wall, x - hw, x + hw, .2, h, Z0 - .05, Z1 + .05);
    k.box(C.trim, x - hw - .03, x + hw + .03, h, h + .06, Z0 - .08, Z1 + .08);
    k.box(C.trim, x - hw - .01, x + hw + .01, h - .1, h - .06, Z0 - .06, Z1 + .06);
    k.hip(C.trim, x, ZW, 2 * hw + .04, T + .14, .05, .05, h + .06, .12);
    k.lathe(C.trim, [[.02, 0], [.05, .03], [.062, .07], [.045, .12], [0, .14]], x, ZW, 10, 0, h + .17);
    for (const z of [Z1 + .05, Z0 - .05]) {const Fr = z > ZW ? frontAt(z) : backAt(z), u = z > ZW ? x : -x; boxOn(k, C.trim, Fr, u - hw + .03, u + hw - .03, .4, h - .2, 0, .01);}
  }

  // ---- CHIJMES Hall: Gothic Revival chapel behind the wall ----
  const CX = -1.58, NW = .55, ZF = .02, ZB = -1.6, YE = 1.85, YR = 2.55;
  k.box(C.base, CX - NW - .04, CX + NW + .04, 0, .12, ZB, ZF + .04);
  k.box(C.wall, CX - NW, CX + NW, .12, YE, ZB, ZF);
  const FC = frontAt(ZF, CX);
  k.slab(C.wall, [[-NW, YE], [NW, YE], [0, YR]], FC, -.05, 0);
  for (const s of [-1, 1]) k.slab(C.trim, [[s * (NW + .06), YE - .03], [s * (NW + .06), YE + .05], [0, YR + .1], [0, YR + .02]], FC, -.03, .035);
  gableZ(k, C.roof, CX, ZB, ZF - .02, 2 * NW + .14, YE - .03, YR - YE + .02);
  k.box(C.trim, CX - NW - .04, CX + NW + .04, YE - .07, YE, ZB, ZF + .02);
  // side bays: stepped buttresses and lancets with a central mullion
  for (const s of [-1, 1]) {
    const S = sideAt(CX + s * NW, s, 0);
    for (let i = 0; i <= 4; i++) {
      const z = ZF - .1 - i * (ZF - ZB - .2) / 4, u = -s * z;
      boxOn(k, C.wall, S, u - .055, u + .055, .12, 1.1, 0, .14);
      boxOn(k, C.wall, S, u - .05, u + .05, 1.1, 1.55, 0, .08);
      k.hip(C.trim, CX + s * (NW + .07), z, .14, .11, .02, .11, 1.1, .1);
      k.hip(C.trim, CX + s * (NW + .04), z, .08, .1, .02, .1, 1.55, .09);
      if (i < 4) {
        const uw = -s * (z - (ZF - ZB - .2) / 8);
        k.slab(C.trim, pointedShape(.11, .78, 6, uw, .42), S, 0, .02);
        k.shape(C.glass, pointedShape(.08, .76, 6, uw, .45), S, .022);
        quad(k, C.trim, S, uw - .008, uw + .008, .45, 1.32, .025);
        k.shape(C.trim, ring(.035, 8, uw, 1.28), S, .026);
      }
    }
  }
  // the apse
  k.lathe(C.wall, [[.48, 0], [.48, 1.6]], CX, ZB, 8, PI / 8, .12);
  k.lathe(C.trim, [[.53, 0], [.53, .06]], CX, ZB, 8, PI / 8, 1.66);
  k.lathe(C.roof, [[.55, 0], [.0, .62]], CX, ZB, 8, PI / 8, 1.72);
  for (let i = 0; i < 3; i++) {const a = PI * (.75 + i * .25), x = CX + Math.sin(a) * .51, z = ZB + Math.cos(a) * .51; k.lathe(C.glass, [[.06, 0], [.06, .6], [0, .72]], x, z, 4, a + PI / 4, .55);}
  // front: lancets beside the tower, the tower with portal, rose, belfry, pinnacles and spire
  for (const s of [-1, 1]) {
    k.slab(C.trim, pointedShape(.09, .78, 6, s * .4, .42), FC, 0, .02);
    k.shape(C.glass, pointedShape(.065, .76, 6, s * .4, .45), FC, .022);
    k.slab(C.trim, pointedShape(.06, .3, 6, s * .4, 1.42), FC, 0, .02);
    k.shape(C.glass, pointedShape(.042, .28, 6, s * .4, 1.44), FC, .022);
  }
  const TW = .25, TZ = ZF + .11, TF = frontAt(TZ + TW, CX);
  k.box(C.wall, CX - TW, CX + TW, .12, 1.6, TZ - TW, TZ + TW);
  k.box(C.base, CX - TW - .03, CX + TW + .03, 0, .14, TZ - TW - .03, TZ + TW + .03);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = CX + sx * (TW + .02), z = TZ + sz * (TW + .02);
    k.block(C.wall, .07, 1.5, .07, x, .12, z);
    k.hip(C.trim, x, z, .08, .08, .01, .01, 1.62, .1);
  }
  for (const [hw, w] of [[.21, .0], [.18, .03], [.15, .06]]) k.slab(w ? C.wall : C.trim, pointedShape(hw, .42, 8, 0, .12), TF, w, w + .03);
  k.shape(C.dark, pointedShape(.12, .4, 8, 0, .12), TF, .095);
  quad(k, C.wood, TF, -.1, .1, .12, .5, .1);
  k.slab(C.trim, ring(.13, 16, 0, 1.1), TF, 0, .03);
  k.shape(C.glass, ring(.1, 16, 0, 1.1), TF, .034);
  for (let i = 0; i < 4; i++) {const a = i * PI / 4; quad(k, C.trim, (u, v, w) => {const c = Math.cos(a), s2 = Math.sin(a); return TF(u * c - (v - 1.1) * s2, 1.1 + u * s2 + (v - 1.1) * c, w);}, -.1, .1, 1.092, 1.108, .037);}
  k.box(C.trim, CX - TW - .05, CX + TW + .05, 1.6, 1.67, TZ - TW - .05, TZ + TW + .05);
  const BW = .21;
  k.box(C.wall, CX - BW, CX + BW, 1.67, 2.62, TZ - BW, TZ + BW);
  for (const f of towerFrames(CX, TZ, BW)) {
    k.slab(C.trim, pointedShape(.11, .36, 6, 0, 1.86), f, 0, .02);
    k.shape(C.dark, pointedShape(.085, .34, 6, 0, 1.88), f, .022);
    for (let j = 0; j < 4; j++) quad(k, C.trim, f, -.085, .085, 1.93 + j * .08, 1.945 + j * .08, .026);
    k.slab(C.trim, rect(-BW, BW, 2.42, 2.47), f, 0, .02);
  }
  k.box(C.trim, CX - BW - .05, CX + BW + .05, 2.62, 2.69, TZ - BW - .05, TZ + BW + .05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = CX + sx * (BW + .01), z = TZ + sz * (BW + .01);
    k.block(C.wall, .06, .95, .06, x, 1.67, z);
    pinnacle(k, C.trim, x, z, 2.69, .045, .42);
  }
  for (const f of towerFrames(CX, TZ, BW - .03)) k.slab(C.trim, [[-.09, 2.69], [.09, 2.69], [0, 2.95]], f, -.02, .02);
  k.lathe(C.wall, [[.2, 0], [.17, .3], [.11, .9], [.05, 1.5], [.012, 1.9]], CX, TZ, 8, PI / 8, 2.69);
  for (const y of [3.1, 3.7]) k.lathe(C.trim, [[.2 - (y - 2.69) * .095 + .015, 0], [.2 - (y - 2.69) * .095 + .015, .03]], CX, TZ, 8, PI / 8, y);
  k.box(C.gold, CX - .008, CX + .008, 4.55, 4.82, TZ - .008, TZ + .008);
  k.box(C.gold, CX - .06, CX + .06, 4.71, 4.73, TZ - .008, TZ + .008);
  // flying buttresses from the front corners to the tower
  for (const s of [-1, 1]) {
    const x = CX + s * (NW + .1), z = ZF - .05;
    k.box(C.wall, x - .07, x + .07, .0, 1.75, z - .1, z + .1);
    k.box(C.base, x - .09, x + .09, 0, .16, z - .12, z + .12);
    k.box(C.trim, x - .09, x + .09, 1.75, 1.8, z - .12, z + .12);
    pinnacle(k, C.trim, x, z, 1.8, .07, .5);
    const pts = arc(10, t => [x - s * t * (NW + .1 - TW - .02), 1.62 + Math.sin(t * PI * .5) * .62 + t * .05, z + t * .12]);
    k.tube(C.trim, pts, .035, 5);
    k.tube(C.wall, pts.map(p => [p[0], p[1] - .06, p[2]]), .03, 5);
  }
  // a frangipani by the wall
  k.tube(C.wood, [[2.3, 0, .1], [2.28, .6, .12], [2.2, 1.05, .08]], .05, 6);
  k.tube(C.wood, [[2.28, .6, .12], [2.45, 1.05, .2]], .035, 5);
  for (const [x, y, z, r] of [[2.2, 1.24, .08, .32], [2.47, 1.18, .22, .25], [2.05, 1.14, .3, .2]]) k.lathe(C.leaf, [[.0, 0], [r * .8, r * .25], [r, r * .55], [r * .7, r * .9], [0, r * 1.05]], x, z, 9, 0, y - r * .3);
  return {
    baseWidth: 5.5, detail: [GX, .9, Z1], overview: [-.2, 1.75, 0], distance: 12.6, elevation: .2,
    front: Z1 + .05, back: Z0 - .05,
    anchors: {
      'back-envelope': {position: [GX, .8, Z0 - .075]},
      'front-envelope': {position: [GX, .8, Z1 + .2]},
    },
  };
}

/* ===== Old Hill Street Police Station (1934), 140 Hill Street =====
 * Six storeys of Neoclassical reinforced concrete around an inner courtyard (glass-roofed since 1999). Pearly white
 * walls; a rusticated, arcaded ground floor; tall Doric pilasters spanning the second and third storeys; projecting
 * end pavilions and a central frontispiece with the pedimented main entrance; cantilevered balconies on corbels at
 * the top storey under a deep cornice and parapet. Every louvred double-leaf window is painted a rainbow colour,
 * the top two storeys more intense. Front (+z) is Hill Street. */
function hillStreet(k, M) {
  const HUE = ['#d9534a', '#ec8f3a', '#f0c63e', '#5aae5f', '#4a83cc', '#8a5ab8'], VIVID = ['#ff2a1f', '#ff7d00', '#ffd200', '#14b04a', '#1567ff', '#8d1fe0'];
  const C = {wall: mat('#f1ede2', .88), trim: mat('#fcfaf4', .8), dark: mat('#3a3733', .8), slat: mat('#1d1a17', .9, {opacity: .26}), glass: mat('#9cc0c8', .2, {metalness: .3, opacity: .55}),
    hue: HUE.map(c => mat(c, .62)), vivid: VIVID.map(c => mat(c, .5))};
  const X = 3.3, ZF = 1.3, ZB = -1.85, D = .88, YG = .62, SH = .36, YT = YG + .06 + 5 * SH, ROOF = YT + .1;
  const fl = n => YG + .06 + (n - 2) * SH;   // base of storey n (2..6)
  // the four wings round the courtyard
  k.box(C.trim, -X - .04, X + .04, 0, .08, ZB - .04, ZF + .04);
  k.box(C.wall, -X, X, .08, ROOF, ZF - D, ZF);
  k.box(C.wall, -X, X, .08, ROOF, ZB, ZB + D);
  for (const s of [-1, 1]) k.box(C.wall, s > 0 ? X - D : -X, s > 0 ? X : -X + D, .08, ROOF, ZB + D, ZF - D);
  let col = 0;
  /** one elevation: L half-length; centre adds the frontispiece and the pedimented entrance */
  function facade(F, L, centre) {
    const P = .7, Cw = centre ? 1.02 : 0, bays = [];
    for (const s of [-1, 1]) for (const i of [0, 1]) bays.push({u: s * (L - P / 4 - i * P / 2), bw: P / 2, w: .05});
    const span = L - P - Cw / 2, n = Math.max(1, Math.round(span / .3)), bw = span / n;
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) bays.push({u: s * (Cw / 2 + (i + .5) * bw), bw, w: 0});
    if (centre) for (const i of [-1, 0, 1]) bays.push({u: i * Cw / 3, bw: Cw / 3, w: .05, c: i === 0});
    bays.sort((a, b) => a.u - b.u);
    // projecting pavilions and frontispiece, rustication, bands, cornice, parapet
    for (const s of [-1, 1]) boxOn(k, C.wall, F, s > 0 ? L - P : -L - .05, s > 0 ? L + .05 : -L + P, .08, YT, 0, .05);
    if (centre) boxOn(k, C.wall, F, -Cw / 2, Cw / 2, .08, YT, 0, .05);
    // quoined edges of the pavilions and frontispiece
    for (const e of [-L - .05, -L + P, L - P, L + .05].concat(centre ? [-Cw / 2, Cw / 2] : [])) for (let v = .7, j = 0; v < YT - .1; v += .14, j++) boxOn(k, C.trim, F, e - (j % 2 ? .035 : .06), e + (j % 2 ? .035 : .06), v, v + .11, .05, .07);
    for (let v = .2; v < YG - .04; v += .1) quad(k, C.dark, F, -L, L, v, v + .008, .052);
    boxOn(k, C.trim, F, -L - .05, L + .05, YG, YG + .06, 0, .09);
    boxOn(k, C.trim, F, -L - .05, L + .05, fl(4) - .05, fl(4) + .01, 0, .085);
    boxOn(k, C.trim, F, -L - .05, L + .05, fl(6) - .035, fl(6) - .005, 0, .07);
    boxOn(k, C.trim, F, -L - .06, L + .06, YT, YT + .045, 0, .1);
    boxOn(k, C.trim, F, -L - .08, L + .08, YT + .045, YT + .1, 0, .14);
    boxOn(k, C.wall, F, -L - .05, L + .05, YT + .1, YT + .25, 0, .06);
    boxOn(k, C.trim, F, -L - .06, L + .06, YT + .25, YT + .28, 0, .08);
    // giant Doric pilasters (storeys 2-3) and corbels under the cornice at every bay division
    const edges = bays.map(b => b.u - b.bw / 2).concat([bays[bays.length - 1].u + bays[bays.length - 1].bw / 2]);
    edges.forEach((u, i) => {
      const w = i === 0 || i === edges.length - 1 ? .05 : Math.max(bays[Math.max(0, i - 1)].w, bays[Math.min(bays.length - 1, i)].w);
      boxOn(k, C.trim, F, u - .028, u + .028, YG + .06, fl(4) - .05, w, w + .03);
      boxOn(k, C.trim, F, u - .042, u + .042, fl(4) - .1, fl(4) - .05, w, w + .045);
      boxOn(k, C.trim, F, u - .02, u + .02, YT - .07, YT, w, w + .09);
    });
    bays.forEach(({u, bw, w, c}) => {
      const hue = col++ % 6, a = Math.min(.118, bw * .38);
      // ground floor: arcade opening with shutter doors, or the entrance
      if (c) {
        boxOn(k, C.trim, F, u - .2, u + .2, .08, .1, w, w + .25);
        k.shape(C.dark, archShape(.11, .28, 10, u, .1), F, w + .004);
        for (const s of [-1, 1]) {const p = F(u + s * .17, 0, w + .14); k.lathe(C.trim, [[.03, 0], [.03, .5], [.04, .52], [.045, .55]], p[0], p[2], 8, 0, .1);}
        boxOn(k, C.trim, F, u - .22, u + .22, .65, .7, w, w + .2);
        k.slab(C.trim, [[u - .24, .7], [u + .24, .7], [u, .84]], F, w, w + .2);
        k.slab(C.wall, [[u - .18, .715], [u + .18, .715], [u, .815]], F, w + .2, w + .205);
      } else {
        k.slab(C.trim, archShape(a + .02, .26, 8, u, .13), F, w, w + .012);
        k.shape(C.dark, archShape(a, .26, 8, u, .14), F, w + .014);
        quad(k, C.hue[hue], F, u - a + .01, u + a - .01, .14, .38, w + .016);
        quad(k, C.dark, F, u - .005, u + .005, .14, .38, w + .018);
        boxOn(k, C.trim, F, u - .022, u + .022, .37 + a, .42 + a, w, w + .03);
      }
      // storeys 2-6: louvred double-leaf windows; balconies on corbels at the top storey
      for (let n = 2; n <= 6; n++) {
        if (c && n === 2) continue;
        const v0 = fl(n), m = n >= 5 ? C.vivid[hue] : C.hue[hue];
        boxOn(k, C.trim, F, u - a - .016, u + a + .016, v0 + .04, v0 + .315, w, w + .014);
        quad(k, m, F, u - a, u + a, v0 + .052, v0 + .3, w + .016);
        quad(k, C.dark, F, u - .004, u + .004, v0 + .052, v0 + .25, w + .018);
        quad(k, C.dark, F, u - a, u + a, v0 + .25, v0 + .256, w + .018);
        for (let j = 0; j < 4; j++) quad(k, C.slat, F, u - a, u + a, v0 + .075 + j * .045, v0 + .087 + j * .045, w + .017);
        boxOn(k, C.trim, F, u - a - .03, u + a + .03, v0 + .03, v0 + .05, w, w + .03);
        if (n === 6) {
          boxOn(k, C.trim, F, u - bw / 2 + .012, u + bw / 2 - .012, v0 - .01, v0 + .025, w, w + .1);
          boxOn(k, C.wall, F, u - bw / 2 + .012, u + bw / 2 - .012, v0 + .025, v0 + .1, w + .085, w + .1);
          boxOn(k, C.trim, F, u - bw / 2 + .012, u + bw / 2 - .012, v0 + .1, v0 + .115, w + .08, w + .105);
          for (const s of [-1, 1]) boxOn(k, C.trim, F, u + s * (bw / 2 - .04) - .015, u + s * (bw / 2 - .04) + .015, v0 - .08, v0 - .01, w, w + .07);
        }
      }
    });
  }
  facade(frontAt(ZF), X, true);
  facade(backAt(ZB), X, false);
  for (const s of [-1, 1]) facade(sideAt(s * X, s, (ZF + ZB) / 2), (ZF - ZB) / 2, false);
  // the courtyard: inner faces with coloured windows, the floor, and the 1999 glass roof on slender ribs
  const IX = X - D, IZ0 = ZB + D, IZ1 = ZF - D;
  k.box(C.trim, -IX, IX, .08, .1, IZ0, IZ1);
  for (const [F, L] of [[frontAt(IZ0), IX], [backAt(IZ1), IX], [sideAt(IX, -1, (IZ0 + IZ1) / 2), (IZ1 - IZ0) / 2], [sideAt(-IX, 1, (IZ0 + IZ1) / 2), (IZ1 - IZ0) / 2]]) {
    const n = Math.round(2 * L / .3);
    for (let i = 0; i < n; i++) {const u = -L + (i + .5) * 2 * L / n; for (let f = 3; f <= 6; f++) quad(k, (f >= 5 ? C.vivid : C.hue)[(i + f) % 6], F, u - .08, u + .08, fl(f) + .06, fl(f) + .28, .004);}
    boxOn(k, C.trim, F, -L, L, YT - .02, YT + .03, 0, .05);
  }
  k.hip(C.glass, 0, (IZ0 + IZ1) / 2, 2 * IX + .1, IZ1 - IZ0 + .1, 2 * IX - 1.1, .02, ROOF, .26);
  for (let i = 0; i <= 12; i++) {
    const x = -IX + i * IX / 6, xt = Math.max(-IX + .55, Math.min(IX - .55, x));
    for (const s of [-1, 1]) k.tube(C.trim, [[x, ROOF + .005, (IZ0 + IZ1) / 2 + s * (IZ1 - IZ0 + .1) / 2], [xt, ROOF + .265, (IZ0 + IZ1) / 2]], .012, 4);
  }
  k.box(C.trim, -IX + .55, IX - .55, ROOF + .25, ROOF + .29, (IZ0 + IZ1) / 2 - .02, (IZ0 + IZ1) / 2 + .02);
  // rooftop stair and lift houses (the old rooftop playgrounds)
  for (const s of [-1, 1]) {
    k.box(C.wall, s * 2.2 - .3, s * 2.2 + .3, ROOF, ROOF + .32, ZB + .15, ZB + .6);
    k.box(C.trim, s * 2.2 - .33, s * 2.2 + .33, ROOF + .32, ROOF + .36, ZB + .12, ZB + .63);
  }
  // Hill Street pavement and the entrance steps
  k.box(C.trim, -.32, .32, 0, .05, ZF + .05, ZF + .36);
  return {
    baseWidth: 7.3, detail: [0, 1.5, ZF], overview: [0, 1.45, -.2], distance: 12.2, elevation: .26,
    front: ZF + .05, back: ZB - .05,
    anchors: {
      'front-envelope': {position: [0, 1.6, ZF + .27]},
      'back-envelope': {position: [0, 1.6, ZB - .17]},
    },
  };
}

/* ===== The bronze elephant (1871-72; here since 1919) before the Old Parliament House / The Arts House =====
 * The small bronze elephant King Chulalongkorn of Siam gave after his 1871 visit, standing on its tall granite
 * pedestal: two steps, a moulded base, the shaft with an inscription panel on each face (English, Siamese, Jawi,
 * Chinese) and a corniced cap, on a lawn. Behind it the white Palladian front of the Old Parliament House: a
 * two-storey portico of Doric under Ionic columns with a pediment, arched ground-floor windows, shuttered upper
 * windows with hoods, a balustraded parapet. Front (+z) faces the street. */
function elephant(k, M) {
  const C = {wall: mat('#f2eee4', .88), trim: mat('#fdfbf5', .8), dark: mat('#34302c', .8), shut: mat('#3e6650', .7), roof: mat('#8b8378', .9),
    gran: mat('#b3afa5', .9), granD: mat('#9c978c', .92), panel: mat('#4d4a45', .55), bronze: mat('#5e4a33', .42, {metalness: .55}),
    tusk: mat('#cbb27a', .35, {metalness: .5}), gold: M.gold, lawn: mat('#76a058', .95), pave: mat('#cdc5b3', .95),
    hedge: mat('#4f7d45', .92), lamp: mat('#fff2cc', .4, {emissive: '#ffd890', emissiveIntensity: .45})};
  // ---- Old Parliament House facade (left and behind) ----
  const AX0 = -2.72, AX1 = .58, ACX = (AX0 + AX1) / 2, AZ0 = -1.98, AZ1 = -.62, Y1 = 1.12, Y2 = 2.1, YE = 2.3;
  k.box(C.pave, -2.75, 2.75, 0, .025, AZ1, 2.1);
  k.box(C.granD, AX0 - .04, AX1 + .04, 0, .12, AZ0 - .04, AZ1 + .04);
  k.box(C.wall, AX0, AX1, .12, YE, AZ0, AZ1);
  k.hip(C.roof, ACX, (AZ0 + AZ1) / 2, AX1 - AX0 - .1, AZ1 - AZ0 - .1, AX1 - AX0 - 1.1, .02, YE + .12, .5);
  const elev = (F, L, wings) => {
    // rustication, string course, entablature, balustraded parapet
    for (let v = .24; v < Y1 - .05; v += .11) quad(k, C.granD, F, -L, L, v, v + .01, .002);
    boxOn(k, C.trim, F, -L - .02, L + .02, Y1 - .03, Y1 + .04, 0, .05);
    boxOn(k, C.trim, F, -L - .02, L + .02, Y2, Y2 + .08, 0, .03);
    boxOn(k, C.wall, F, -L - .02, L + .02, Y2 + .08, YE - .06, 0, .025);
    boxOn(k, C.trim, F, -L - .05, L + .05, YE - .06, YE + .02, 0, .08);
    boxOn(k, C.trim, F, -L - .02, L + .02, YE + .02, YE + .08, 0, .03);
    boxOn(k, C.trim, F, -L - .02, L + .02, YE + .3, YE + .35, -.01, .04);
    const nb = Math.round(2 * L / .085);
    for (let i = 0; i < nb; i++) {const u = -L + (i + .5) * 2 * L / nb, p = F(u, 0, .012); k.lathe(C.trim, [[.016, 0], [.026, .06], [.014, .14], [.02, .22]], p[0], p[2], 4, PI / 4, YE + .08);}
    for (const s of [-1, 1]) {
      boxOn(k, C.trim, F, s * L - .06, s * L + .06, YE + .02, YE + .35, 0, .04);
      const p = F(s * (L - .02), 0, .02); k.lathe(C.trim, [[.03, 0], [.06, .05], [.07, .12], [.03, .17], [.04, .2], [0, .25]], p[0], p[2], 8, 0, YE + .35);
      for (let v = .14; v < Y2; v += .14) boxOn(k, C.trim, F, s * L - (s > 0 ? .1 + (v * 7 % 2 < 1 ? .03 : 0) : -.0), s * L + (s < 0 ? .1 + (v * 7 % 2 < 1 ? .03 : 0) : 0), v, v + .11, 0, .015);
    }
    wings.forEach(u => {
      // ground: arched window with shutters and fanlight; upper: shuttered window with a hood
      k.slab(C.trim, archShape(.15, .48, 10, u, .26), F, 0, .02);
      k.shape(C.dark, archShape(.12, .46, 10, u, .28), F, .022);
      for (const s of [-1, 1]) quad(k, C.shut, F, u + s * .005, u + s * .115, .28, .72, .024);
      k.shape(C.trim, ring(.025, 6, u, .86), F, .025);
      boxOn(k, C.trim, F, u - .03, u + .03, .86, .92, 0, .04);
      boxOn(k, C.trim, F, u - .16, u + .16, 1.28, 1.31, 0, .04);
      boxOn(k, C.trim, F, u - .14, u + .14, 1.31, 1.86, 0, .018);
      quad(k, C.dark, F, u - .11, u + .11, 1.33, 1.84, .02);
      for (const s of [-1, 1]) {quad(k, C.shut, F, u + s * .005, u + s * .105, 1.34, 1.83, .022); for (let j = 1; j < 6; j++) quad(k, C.dark, F, u + s * .01, u + s * .1, 1.34 + j * .083, 1.346 + j * .083, .024);}
      boxOn(k, C.trim, F, u - .17, u + .17, 1.88, 1.92, 0, .06);
      k.slab(C.trim, [[u - .17, 1.92], [u + .17, 1.92], [u, 2.0]], F, 0, .05);
      for (const s of [-1, 1]) boxOn(k, C.trim, F, u + s * .25 - .03, u + s * .25 + .03, Y1 + .04, Y2, 0, .025);
    });
  };
  const LF = (AX1 - AX0) / 2;
  elev(frontAt(AZ1, ACX), LF, [-1.35, -.9, .9, 1.35]);
  elev(backAt(AZ0, ACX), LF, [-1.35, -.9, -.45, 0, .45, .9, 1.35]);
  for (const s of [-1, 1]) elev(sideAt(s > 0 ? AX1 : AX0, s, (AZ0 + AZ1) / 2), (AZ1 - AZ0) / 2, [-.36, .36]);
  // the portico: Doric below, Ionic above, pediment with the arms
  {
    const F = frontAt(AZ1, ACX), PZ = AZ1 + .42, PW = .64, PF = frontAt(PZ, ACX);
    k.box(C.granD, ACX - PW - .06, ACX + PW + .06, 0, .1, AZ1, PZ + .12);
    k.box(C.granD, ACX - PW + .1, ACX + PW - .1, 0, .05, PZ + .12, PZ + .26);
    k.slab(C.trim, archShape(.17, .5, 10, 0, .12), F, 0, .02); k.shape(C.dark, archShape(.14, .48, 10, 0, .12), F, .022);
    quad(k, C.shut, F, -.12, .12, .12, .5, .024);
    for (const u of [-.4, .4]) {k.slab(C.trim, archShape(.1, .4, 8, u, .2), F, 0, .02); k.shape(C.dark, archShape(.08, .38, 8, u, .22), F, .022);}
    for (const u of [-.4, 0, .4]) {boxOn(k, C.trim, F, u - .13, u + .13, 1.3, 1.9, 0, .018); quad(k, C.dark, F, u - .1, u + .1, 1.32, 1.88, .02); quad(k, C.shut, F, u - .095, u - .005, 1.33, 1.87, .022); quad(k, C.shut, F, u + .005, u + .095, 1.33, 1.87, .022);}
    for (const u of [-.56, -.2, .2, .56]) {
      const x = ACX + u, z = PZ - .02;
      k.block(C.trim, .17, .06, .17, x, .1, z);
      k.lathe(C.trim, [[.075, 0], [.068, .9], [.085, .93], [.09, .96]], x, z, 12, 0, .16);
      k.block(C.trim, .19, .04, .19, x, Y1 - .04, z);
      k.block(C.trim, .15, .05, .15, x, Y1 + .12, z);
      k.lathe(C.trim, [[.058, 0], [.05, .7], [.06, .72]], x, z, 12, 0, Y1 + .17);
      k.box(C.trim, x - .085, x + .085, Y1 + .89, Y1 + .93, z - .045, z + .045);
      for (const s of [-1, 1]) k.lathe(C.trim, [[.025, 0], [.025, .05]], x + s * .06, z + .03, 6, 0, Y1 + .87);
    }
    k.box(C.trim, ACX - PW - .04, ACX + PW + .04, Y1, Y1 + .12, AZ1, PZ + .07);
    for (let i = 0; i < 14; i++) {const x = ACX - PW + .06 + i * (2 * PW - .12) / 13; k.lathe(C.trim, [[.014, 0], [.024, .05], [.013, .12], [.018, .17]], x, PZ + .04, 4, PI / 4, Y1 + .12);}
    k.box(C.trim, ACX - PW, ACX + PW, Y1 + .29, Y1 + .32, PZ + .01, PZ + .07);
    k.box(C.trim, ACX - PW - .04, ACX + PW + .04, Y2, Y2 + .2, AZ1, PZ + .07);
    k.box(C.trim, ACX - PW - .07, ACX + PW + .07, Y2 + .2, Y2 + .25, AZ1, PZ + .1);
    k.slab(C.wall, [[-PW - .02, Y2 + .25], [PW + .02, Y2 + .25], [0, Y2 + .62]], PF, -.42, .05);
    for (const s of [-1, 1]) k.slab(C.trim, [[s * (PW + .08), Y2 + .22], [s * (PW + .08), Y2 + .29], [0, Y2 + .68], [0, Y2 + .6]], PF, -.42, .1);
    k.slab(C.gold, ring(.075, 12, 0, Y2 + .39), PF, .05, .07);
    for (const s of [-1, 1]) k.slab(C.trim, [[s * .09, Y2 + .32], [s * .2, Y2 + .3], [s * .17, Y2 + .42]], PF, .05, .065);
    k.lathe(C.trim, [[.03, 0], [.06, .05], [.07, .12], [.03, .17], [0, .24]], ACX, PZ - .1, 8, 0, Y2 + .66);
  }
  // clipped hedges along the front and a pair of lamp standards at the portico steps
  for (const [x0, x1] of [[AX0 + .05, ACX - .76], [ACX + .76, AX1 - .05]]) {k.box(C.hedge, x0, x1, 0, .2, AZ1 + .04, AZ1 + .24); k.box(C.hedge, x0 + .02, x1 - .02, .2, .24, AZ1 + .06, AZ1 + .22);}
  for (const s of [-1, 1]) {
    const x = ACX + s * .86, z = AZ1 + .7;
    k.lathe(C.dark, [[.06, 0], [.06, .08], [.03, .12], [.022, .9], [.035, .94]], x, z, 8, 0, 0);
    k.lathe(C.lamp, [[.03, 0], [.07, .04], [.075, .18], [.05, .22], [0, .27]], x, z, 8, 0, .94);
  }
  // ---- lawn, kerb and the granite pedestal ----
  const EX = 1.62, EZ = .5;
  k.box(C.granD, .78, 2.66, 0, .06, -.42, 1.62);
  k.box(C.lawn, .84, 2.6, 0, .07, -.36, 1.56);
  k.box(C.gran, EX - .82, EX + .82, .07, .19, EZ - .54, EZ + .54);
  k.box(C.gran, EX - .72, EX + .72, .19, .3, EZ - .46, EZ + .46);
  k.hip(C.gran, EX, EZ, 1.34, .82, 1.2, .68, .3, .06);
  k.box(C.gran, EX - .6, EX + .6, .36, .44, EZ - .34, EZ + .34);
  k.hip(C.gran, EX, EZ, 1.2, .68, 1.12, .6, .44, .04);
  const SX = .56, SZ = .3, YS0 = .48, YS1 = 1.42;
  k.box(C.gran, EX - SX, EX + SX, YS0, YS1, EZ - SZ, EZ + SZ);
  const faces = [[frontAt(EZ + SZ, EX), SX], [backAt(EZ - SZ, EX), SX], [sideAt(EX + SX, 1, EZ), SZ], [sideAt(EX - SX, -1, EZ), SZ]];
  for (const [F, L] of faces) {
    boxOn(k, C.granD, F, -L + .06, L - .06, YS0 + .08, YS1 - .08, 0, .018);
    boxOn(k, C.panel, F, -L + .1, L - .1, YS0 + .12, YS1 - .12, .018, .026);
    for (let j = 0; j < 5; j++) quad(k, C.gold, F, -L + .16, L - .16 - (j % 2) * .1 * L, YS1 - .22 - j * .1, YS1 - .205 - j * .1, .028);
  }
  k.box(C.gran, EX - SX - .03, EX + SX + .03, YS1, YS1 + .04, EZ - SZ - .03, EZ + SZ + .03);
  k.hip(C.gran, EX, EZ, 2 * SX + .06, 2 * SZ + .06, 2 * SX + .2, 2 * SZ + .2, YS1 + .04, .08);
  k.box(C.gran, EX - SX - .1, EX + SX + .1, YS1 + .12, YS1 + .18, EZ - SZ - .1, EZ + SZ + .1);
  k.box(C.granD, EX - SX - .04, EX + SX + .04, YS1 + .18, YS1 + .22, EZ - SZ - .04, EZ + SZ + .04);
  // ---- the bronze elephant, facing -x (toward the building's portico) ----
  // a: forward along the body, y: up from the pedestal top, b: across. Masses are overlapping smooth tubes.
  const OY = YS1 + .22, E = (a, y, b) => [EX - a, OY + y, EZ + b];
  const blob = (a0, a1, y0, y1, r, n = 10, sides = 14, b = 0) => k.tube(C.bronze, arc(n, t => E(a0 + (a1 - a0) * t, y0 + (y1 - y0) * t, b)), t => r * Math.sqrt(Math.max(.0004, Math.sin(t * PI))), sides);
  // barrel, withers and haunch, the sagging belly
  blob(-.5, .48, .68, .7, .3, 14, 18);
  blob(-.42, .32, .8, .82, .21, 10, 14);
  blob(-.34, .36, .56, .54, .23, 10, 14);
  for (const s of [-1, 1]) {blob(-.44, -.06, .66, .62, .2, 8, 12, s * .1); blob(.1, .44, .66, .62, .19, 8, 12, s * .1);}
  // head: big domed skull carried low, the twin bosses of the Asian elephant, cheeks, eyes
  blob(.4, .86, .86, .5, .28, 10, 16);
  for (const s of [-1, 1]) {blob(.5, .74, .98, .92, .12, 6, 10, s * .07); blob(.6, .8, .62, .56, .11, 6, 10, s * .1);}
  // trunk: thick at the face, hanging and curling forward at the tip
  k.tube(C.bronze, arc(20, t => E(.84 + Math.sin(t * 1.5) * .06 + (t > .8 ? Math.pow(t - .8, 1.3) * 1.1 : 0), .6 - t * .52 + (t > .84 ? Math.pow(t - .84, 1.3) * 1.2 : 0), 0)), t => .115 * (1 - t * .64), 12);
  for (const s of [-1, 1]) {
    // tusks, eye, and the ear laid back against the side of the head
    k.tube(C.tusk, arc(6, t => E(.8 + t * .2, .44 - t * .1 + t * t * .14, s * (.1 + t * .03))), t => .03 * (1 - t * .75), 6);
    k.box(C.dark, EX - .78 - .03, EX - .78 + .02, OY + .74, OY + .77, EZ + s * .2 - .012, EZ + s * .2 + .012);
    const ear = arc(14, t => {const a = t * PI * 2, low = Math.sin(a) < 0; return [.55 + Math.cos(a) * (low ? .14 : .17) - (low ? .05 : 0), .68 + Math.sin(a) * (low ? .28 : .19)];});
    const off = p => s * (.25 + Math.max(0, .55 - p[0]) * .3 + Math.max(0, .62 - p[1]) * .1);
    const c0 = E(.55, .64, s * .27);
    k.triangles(C.bronze, ear.slice(0, -1).map((p, i) => [c0, E(p[0], p[1], off(p)), E(ear[i + 1][0], ear[i + 1][1], off(ear[i + 1]))]));
    k.tube(C.bronze, ear.map(p => E(p[0], p[1], off(p))), .018, 5);
  }
  // pillar legs, slightly bowed behind, toenails at the feet
  for (const [a, sb] of [[.26, 1], [.26, -1], [-.3, 1], [-.3, -1]]) {
    const b = sb * .14;
    k.tube(C.bronze, arc(6, t => E(a + (a < 0 ? Math.sin(t * PI) * .03 : 0), .66 - t * .66, b)), t => t > .88 ? .12 + (t - .88) * .25 : .132 - t * .018, 12);
    for (const d of [-.055, 0, .055]) k.box(C.tusk, EX - a - .14, EX - a - .115, OY, OY + .035, EZ + b + d - .02, EZ + b + d + .02);
  }
  // tail with its tuft
  k.tube(C.bronze, arc(8, t => E(-.47 - t * .08 + t * t * .02, .78 - t * .44, Math.sin(t * 2) * .02)), t => .024 - t * .01, 6);
  k.lathe(C.bronze, [[.0, 0], [.032, .03], [.022, .09], [0, .11]], EX + .53, EZ + .02, 6, 0, OY + .24);
  return {
    baseWidth: 5.5, detail: [EX - .3, OY + .2, EZ + .4], overview: [-.2, 1.55, 0], distance: 11.8, elevation: .2,
    front: EZ + .6, back: AZ0 - .05,
    anchors: {
      'back-envelope': {position: [EX, .9, EZ - SZ - .075]},
      'front-envelope': {position: [EX, .9, EZ + SZ + .2]},
    },
  };
}

export const CIVIC_A_STOPS = {'civic-f1-01': gateOfHope, 'civic-f1-02': hillStreet, 'civic-f1-03': elephant};
