/* Hunt: bespoke stop miniatures (see field-stops.js) for Balestier stops 04, 05 and 07.
 * Interpretive miniatures after the NHB Balestier Heritage Trail booklet (2020), Roots.gov.sg and Wikimedia Commons
 * photographs, not surveys. Front (+z) is always the street the stop is observed from. */
import {rect, archShape, ring, frontAt, backAt, sideAt} from '../field-kit.js';
import {PI, mat, curvedRoof, swallowRidge, towerFrames} from '../field-stop-shapes.js';

/* ---- local helpers ---- */
const ellipse = (rx, ry, cu, cv, n = 10) => Array.from({length: n}, (_, i) => [cu + Math.cos(i / n * 2 * PI) * rx, cv + Math.sin(i / n * 2 * PI) * ry]);
const oct = (r, cu, cv) => Array.from({length: 8}, (_, i) => [cu + Math.cos(PI / 8 + i * PI / 4) * r, cv + Math.sin(PI / 8 + i * PI / 4) * r]);
/** a wall frame standing at (px, pz) whose outward normal is turned `a` from +z */
const facing = (px, pz, a) => (u, v, w = 0) => [px + Math.cos(a) * u + Math.sin(a) * w, v, pz - Math.sin(a) * u + Math.cos(a) * w];
/** a lathed ball centred at (x, y, z), squashed by sy */
function ball(k, m, r, x, y, z, n = 8, sy = 1) {
  const p = []; for (let i = 0; i <= 6; i++) {const a = -PI / 2 + i / 6 * PI; p.push([Math.max(0, Math.cos(a) * r), (Math.sin(a) + 1) * r * sy]);}
  k.lathe(m, p, x, z, n, 0, y - r * sy);
}
/** a 2D polyline drawn as a tube on a wall frame (raised lettering, rails, vines) */
const stroke = (k, m, F, pts, w, r, sides = 5) => k.tube(m, pts.map(([u, v]) => F(u, v, w)), r, sides);
/** potted plant: terracotta pot and a few leafy balls */
function potPlant(k, pot, leaf, x, z, s = 1, y = 0) {
  k.lathe(pot, [[.045 * s, 0], [.065 * s, .11 * s], [.072 * s, .12 * s], [.06 * s, .12 * s], [0, .1 * s]], x, z, 9, 0, y);
  ball(k, leaf, .085 * s, x, y + .2 * s, z, 7, 1.15);
  ball(k, leaf, .06 * s, x + .05 * s, y + .3 * s, z - .02 * s, 7);
  ball(k, leaf, .055 * s, x - .05 * s, y + .27 * s, z + .03 * s, 7);
}
/** banana plant: a trunk and broad drooping leaves */
function banana(k, trunk, leaf, x, z, h, turn = 0) {
  k.tube(trunk, [[x, 0, z], [x + .01, h * .5, z], [x, h, z]], t => .04 * (1 - t * .4), 6);
  for (let i = 0; i < 6; i++) {
    const a = turn + i * 1.1, d = [Math.sin(a), Math.cos(a)], L = h * (.6 + (i % 3) * .1), quads = [];
    const P = (t, side) => {const r = t * L, y = h + Math.sin(t * PI * .8) * L * .35 - t * t * L * .35, w = Math.sin(t * PI) * .07 * (L / .5) * side;
      return [x + d[0] * r - d[1] * w, y, z + d[1] * r + d[0] * w];};
    for (let j = 0; j < 6; j++) {const t0 = j / 6, t1 = (j + 1) / 6; quads.push([P(t0, -1), P(t1, -1), P(t1, 0), P(t0, 0)], [P(t0, 0), P(t1, 0), P(t1, 1), P(t0, 1)]);}
    k.triangles(leaf, quads);
  }
}
/** the Shaw Brothers shield: gold border, blue field, sunburst rays and the raised letters S and B */
function sbShield(k, C, F, cu, cv, s, w0 = 0) {
  const N = [[-1, .72], [-.86, 1], [-.46, .86], [0, .94], [.46, .86], [.86, 1], [1, .72], [1, .1], [.9, -.36], [.66, -.7], [.34, -.9], [0, -1], [-.34, -.9], [-.66, -.7], [-.9, -.36], [-1, .1]];
  const out = sc => N.map(([x, y]) => [cu + x * s * sc, cv + y * s * 1.1 * sc]);
  k.slab(C.gold, out(1), F, w0, w0 + .02);
  k.shape(C.blue, out(.86), F, w0 + .022);
  for (let i = 0; i < 9; i++) {const a = PI * (.12 + i * .095), x = Math.cos(a), y = Math.sin(a);
    k.shape(C.ray, [[cu, cv - s * .35], [cu + (x - .025) * s * .8, cv - s * .35 + (y + .02) * s * 1.1], [cu + (x + .025) * s * .8, cv - s * .35 + (y - .02) * s * 1.1]], F, w0 + .024);}
  const h = s * .62, S = [], B = [[-.18, -.5], [-.18, .5], [0, .5]];
  for (let i = 0; i <= 10; i++) {const a = .12 * PI + i / 10 * 1.38 * PI; S.push([Math.cos(a) * .2, .25 + Math.sin(a) * .25]);}
  for (let i = 1; i <= 10; i++) {const a = .5 * PI - i / 10 * 1.4 * PI; S.push([Math.cos(a) * .2, -.25 + Math.sin(a) * .25]);}
  for (let i = 1; i <= 8; i++) {const a = .5 * PI - i / 8 * PI; B.push([Math.cos(a) * .2, .25 + Math.sin(a) * .25]);}
  B.push([-.18, 0], [.03, 0]);
  for (let i = 1; i <= 8; i++) {const a = .5 * PI - i / 8 * PI; B.push([.03 + Math.cos(a) * .2, -.25 + Math.sin(a) * .25]);}
  B.push([-.18, -.5]);
  stroke(k, C.cream, F, S.map(([x, y]) => [cu - s * .36 + x * h, cv + s * .06 + y * h]), w0 + .03, s * .055);
  stroke(k, C.cream, F, B.map(([x, y]) => [cu + s * .3 + x * h, cv + s * .06 + y * h]), w0 + .03, s * .055);
}


/* ===== Kwan Yow Luen shophouses (1928), 412-418 Balestier Road, corner of Jalan Kemaman =====
 * Developed by Sim Cheng Neo, designed by Kwan Yow Luen: a row of four two-storey shophouses dressed in white plaster
 * stucco (deliberately monochrome, unlike the coloured Sim Kwong Ho row at stop 02). Pairs of round-arched windows with
 * dark green frames between panelled pilasters with thin tile strips, relief beasts under the sills, a dragon frieze on
 * the beam over the five-foot way, a salmon string course, dentil cornice and green eaves under red tiles. The corner
 * unit No. 412 carries the stepped pediment (two lions, buffalo at the feet, crest and urn finials) and its ground
 * piers hold Sikh jaga guardians. Behind the cornice of No. 414 a half-timbered gable faces the road. The five-foot way
 * wraps round the corner; rear service wings and airwells at the back. Front (+z) is Balestier Road, left is Kemaman. */
function kwanYowLuen(k, M) {
  const C = {wall: mat('#ebe6d8', .88), orn: mat('#f8f5ec', .78), shade: mat('#cdc5b2', .92), band: mat('#cf9273', .78), green: mat('#1f5745', .6),
    glass: mat('#1d2624', .45), tile: mat('#9a4532', .9), tile2: mat('#7a3427', .9), awning: mat('#2a2b2e', .75), shop: mat('#4a3d33', .9),
    pave: mat('#bab3a4', .95), red: mat('#a9483a', .88), road: mat('#5a5c5f', .95), gold: M.gold};
  const X0 = -2.85, X1 = 2.95, N = 4, UW = (X1 - X0) / N, ZF = 1.2, ZS = .78, ZB = -.7, ZR = -1.95, XS = X0 + .42;
  const Y0 = .06, YB = 1.1, YS = 1.4, YU = 1.48, YE = 2.86, YC = 3.04, YR = 3.1, RH = .74;
  const F = frontAt(ZF), SD = sideAt(X0, -1); // SD: u runs along +z on the Jalan Kemaman face
  const unitC = i => X0 + (i + .5) * UW, bnd = i => i === 0 ? X0 + .12 : i === N ? X1 - .11 : X0 + i * UW;

  // street: Balestier Road in front, Jalan Kemaman on the left, red-tiled apron at the corner
  k.box(C.road, -3.7, 3.7, 0, .018, 1.86, 2.2);
  k.box(C.road, -3.7, -3.36, 0, .018, -2.2, 1.86);
  k.box(C.shade, -3.36, 3.7, 0, .065, 1.78, 1.86);
  k.box(C.shade, -3.36, -3.28, 0, .065, -2.2, 1.86);
  k.box(C.pave, X0 + UW, 3.7, 0, .05, ZF, 1.78);
  k.box(C.red, -3.28, X0 + UW, 0, .052, ZF, 1.78);
  k.box(C.red, -3.28, X0, 0, .052, -2.2, ZF);
  for (let x = -3.1; x < X0 + UW; x += .19) k.box(C.tile2, x, x + .008, .052, .055, ZF, 1.78);
  for (let z = ZF + .15; z < 1.78; z += .19) k.box(C.tile2, -3.28, X0 + UW, .052, .055, z, z + .008);
  for (let z = -2.1; z < ZF; z += .19) k.box(C.tile2, -3.28, X0, .052, .055, z, z + .008);
  for (let x = -3.45; x < 3.6; x += .62) k.box(C.orn, x, x + .32, .018, .022, 2.03, 2.06);
  k.box(C.orn, -3.68, -3.38, .018, .022, 1.62, 1.68);
  k.box(C.gold, -3.36, -3.33, .065, .068, -2.2, 1.6);

  // masses: shops behind the five-foot way, the upper floor over it, the entablature
  k.box(C.pave, X0, X1, 0, Y0, ZS, ZF);
  k.box(C.pave, X0, XS, 0, Y0, ZB, ZS);
  k.box(C.wall, XS, X1, 0, YB, ZB, ZS);
  k.box(C.wall, X0, X1, YB, YE, ZB, ZF);
  k.box(C.wall, X0, X1, YE, YC, ZB, ZF + .02);
  // horizontal bands: beam moulding, salmon string course, floor moulding, cornice with dentils
  k.box(C.orn, X0 - .02, X1, YB - .03, YB + .02, ZB + .05, ZF + .035);
  k.box(C.band, X0 - .05, X1, YS, YS + .06, ZB + .05, ZF + .05);
  k.box(C.orn, X0 - .03, X1, YS + .06, YU, ZB + .05, ZF + .03);
  k.box(C.orn, X0 - .02, X1, YE, YE + .04, ZB + .05, ZF + .05);
  k.box(C.orn, X0 - .09, X1, YC - .03, YC + .02, ZB, ZF + .09);
  for (let x = X0 + .03; x < X1 - .03; x += .085) k.box(C.orn, x, x + .04, YC - .08, YC - .03, ZF, ZF + .055);
  for (let z = ZB + .05; z < ZF; z += .085) k.box(C.orn, X0 - .055, X0, YC - .08, YC - .03, z, z + .04);

  // upper-floor ornament on one wall frame
  const win = (W, u, french) => {
    const v0 = YU + .36, sp = .42, top = v0 + sp + .205;
    k.slab(C.orn, rect(u - .23, u + .23, v0 - .05, v0), W, 0, .07);
    k.slab(C.orn, rect(u - .2, u + .2, YU + .08, v0 - .07), W, 0, .022);
    k.shape(C.shade, rect(u - .16, u + .16, YU + .11, v0 - .1), W, .024);
    k.slab(C.orn, ellipse(.085, .042, u - .02, YU + .19), W, .02, .042);
    k.slab(C.orn, ellipse(.032, .028, u + .085, YU + .225), W, .02, .046);
    k.slab(C.orn, archShape(.205, sp, 12, u, v0), W, 0, .03);
    k.slab(C.green, archShape(.165, sp, 12, u, v0), W, 0, .036);
    k.shape(C.glass, archShape(.13, sp, 12, u, v0 + .03), W, .038);
    if (french) {k.shape(C.green, rect(u - .13, u + .13, v0 + .03, v0 + .27), W, .04); k.shape(C.shade, rect(u - .1, u + .1, v0 + .08, v0 + .22), W, .042);}
    k.shape(C.green, rect(u - .007, u + .007, v0 + .03, v0 + sp + .12), W, .041);
    k.shape(C.green, rect(u - .13, u + .13, v0 + sp - .01, v0 + sp + .01), W, .041);
    k.slab(C.orn, [[u - .035, top - .07], [u + .035, top - .07], [u + .05, top + .05], [u - .05, top + .05]], W, 0, .05);
    for (const s of [-1, 1]) k.slab(C.orn, ring(.035, 8, u + s * .25, top - .05), W, 0, .03);
    k.slab(C.orn, rect(u - .23, u + .23, top + .06, top + .1), W, 0, .045);
    k.slab(C.orn, rect(u - .19, u + .19, top + .14, YE - .05), W, 0, .016);
    k.shape(C.shade, rect(u - .15, u + .15, top + .17, YE - .08), W, .018);
    k.slab(C.orn, ellipse(.09, .04, u, (top + YE) / 2 + .045), W, .016, .036);
  };
  const pilaster = (W, b, w) => {
    k.slab(C.orn, rect(b - w / 2, b + w / 2, YU, YE), W, 0, .05);
    k.shape(C.shade, rect(b - w / 2 + .04, b + w / 2 - .04, YU + .14, YE - .18), W, .052);
    k.slab(C.band, rect(b - .025, b + .025, YU + .17, YE - .21), W, .05, .056);
    for (let v = YU + .27; v < YE - .28; v += .17) k.slab(C.orn, ring(.024, 6, b, v), W, .05, .062);
    k.slab(C.orn, rect(b - w / 2 - .03, b + w / 2 + .03, YE - .13, YE), W, 0, .08);
    k.slab(C.orn, rect(b - w / 2 - .04, b + w / 2 + .04, YE - .17, YE - .13), W, 0, .065);
    k.slab(C.orn, rect(b - w / 2 - .02, b + w / 2 + .02, YU, YU + .1), W, 0, .07);
  };
  const minor = (W, b) => {
    k.slab(C.orn, rect(b - .06, b + .06, YU + .05, YE), W, 0, .035);
    for (const d of [-.025, .025]) k.shape(C.shade, rect(b + d - .008, b + d + .008, YU + .2, YE - .2), W, .037);
    k.slab(C.orn, rect(b - .08, b + .08, YE - .1, YE), W, 0, .055);
  };
  // the dragon frieze on the beam: two dragons chasing a pearl, per bay
  const dragons = (W, c, half) => {
    for (const s of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 14; i++) {const t = i / 14; pts.push([c + s * (.09 + t * (half - .14)), YB + .15 + Math.sin(t * PI * 2.6) * .06 * (1 - t * .3)]);}
      stroke(k, C.orn, W, pts, .025, .024, 5);
      k.slab(C.orn, ellipse(.045, .035, c + s * .12, YB + .16), W, .02, .05);
      k.slab(C.orn, ring(.025, 6, c + s * (half - .06), YB + .22), W, .02, .04);
    }
    k.slab(C.orn, ring(.045, 10, c, YB + .15), W, .02, .055);
  };
  for (let i = 0; i < N; i++) {
    const cx = unitC(i);
    for (const s of [-1, 1]) win(F, cx + s * .33, i === 0 && s < 0);
    minor(F, cx);
    dragons(F, cx, UW / 2 - .12);
    k.slab(C.orn, rect(cx - .3, cx + .3, YE + .05, YC - .1), F, 0, .014);
    k.slab(C.orn, ellipse(.07, .028, cx, YE + .1), F, .014, .03);
  }
  for (let i = 0; i <= N; i++) pilaster(F, bnd(i), i === 0 || i === N ? .24 : .22);
  // Jalan Kemaman face of the corner unit
  for (const u of [-.12, .5]) win(SD, u, false);
  minor(SD, .19);
  pilaster(SD, ZB + .12, .24); pilaster(SD, ZF - .12, .24);
  dragons(SD, (ZB + ZF) / 2, .9);

  // ground floor: piers with panels, two Sikh jaga guardians at the corner, shopfronts, awning
  const jaga = f => {
    k.shape(C.shade, archShape(.08, .42, 8, 0, .38), f, .003);
    for (const s of [-1, 1]) k.slab(C.orn, rect(s * .008, s * .038, .4, .58), f, 0, .02);
    k.slab(C.orn, [[-.055, .56], [.055, .56], [.045, .76], [-.045, .76]], f, 0, .03);
    k.slab(C.orn, rect(-.072, -.048, .58, .74), f, 0, .022);
    k.slab(C.orn, rect(.048, .072, .6, .74), f, 0, .022);
    k.slab(C.orn, rect(.064, .074, .4, .86), f, .02, .03);
    k.slab(C.orn, ring(.03, 8, 0, .8), f, 0, .032);
    k.slab(C.orn, ellipse(.042, .032, 0, .84), f, .006, .04);
    k.slab(C.orn, [[-.02, .78], [.02, .78], [0, .74]], f, .02, .036);
  };
  const pier = (x, z, w, guards = []) => {
    k.block(C.wall, w, YB - Y0, w, x, Y0, z);
    k.block(C.orn, w + .07, .3, w + .07, x, Y0, z);
    k.block(C.orn, w + .1, .035, w + .1, x, Y0 + .3, z);
    k.block(C.orn, w + .08, .06, w + .08, x, YB - .14, z);
    k.block(C.orn, w + .12, .07, w + .12, x, YB - .08, z);
    const fr = towerFrames(x, z, w / 2);
    [0, 3].forEach(n => {
      const f = fr[n];
      if (guards.includes(n)) return jaga(f);
      k.shape(C.shade, rect(-w / 2 + .035, w / 2 - .035, .4, YB - .2), f, .002);
      k.slab(C.orn, [[0, .5], [.06, .64], [0, .78], [-.06, .64]], f, 0, .016);
      k.slab(C.orn, ring(.025, 6, 0, .87), f, 0, .016);
    });
  };
  pier(X0 + .15, ZF - .15, .3, [0, 3]);
  for (let i = 1; i < N; i++) pier(bnd(i), ZF - .13, .26, i === 1 ? [0] : []);
  pier(X1 - .13, ZF - .13, .26);
  pier(X0 + .13, ZB + .13, .26); pier(X0 + .13, .25, .24);
  const SF = frontAt(ZS);
  for (let i = 0; i < N; i++) {
    const cx = unitC(i);
    k.shape(C.shop, rect(cx - .55, cx + .55, Y0, YB - .17), SF, .003);
    k.shape(C.wall, rect(cx - .5, cx + .5, Y0 + .3, YB - .4), SF, .001);
    for (const s of [-1, 1]) k.slab(C.green, rect(cx + s * .55 - .07, cx + s * .55 + .07, Y0, YB - .17), SF, 0, .02);
    k.slab(i === 0 ? C.orn : C.green, rect(cx - .55, cx + .55, YB - .16, YB - .03), SF, 0, .025);
    if (i === 0) for (let j = 0; j < 7; j++) k.block(C.red, .045, .05, .01, cx - .36 + j * .12, YB - .12, ZS + .028);
    if (i > 0) for (const dx of [-.35, .1, .45]) {
      k.lathe(C.orn, [[0, 0], [.012, 0], [.012, .23], [.075, .23], [.075, .25], [0, .25]], cx + dx, .99, 10, 0, Y0);
      for (const s of [-1, 1]) k.lathe(C.red, [[0, 0], [.01, 0], [.01, .13], [.03, .13], [.03, .15], [0, .15]], cx + dx + s * .11, .99, 8, 0, Y0);
    }
  }
  {
    const W = sideAt(XS, -1);
    k.shape(C.shop, rect(ZB + .25, ZS - .1, Y0, YB - .17), W, .003);
    k.slab(C.green, rect(ZB + .2, ZB + .3, Y0, YB - .17), W, 0, .02);
    k.slab(C.orn, rect(ZB + .25, ZS - .1, YB - .16, YB - .03), W, 0, .025);
  }
  // the modern canvas awning over Nos. 414-418 and the red vertical sign on the corner pier
  {
    const x0 = X0 + UW + .1, x1 = X1 - .12, y = YB - .03, z = ZF + .03;
    k.triangles(C.awning, [[[x0, y, z], [x1, y, z], [x1, y - .22, z + .5], [x0, y - .22, z + .5]], [[x0, y, z], [x0, y - .22, z + .5], [x0, y - .32, z + .5]], [[x1, y, z], [x1, y - .22, z + .5], [x1, y - .32, z + .5]]]);
    k.box(C.awning, x0, x1, y - .32, y - .21, z + .49, z + .52);
    k.box(C.orn, x0, x1, y - .29, y - .27, z + .52, z + .525);
    for (const x of [x0 + .3, (x0 + x1) / 2, x1 - .3]) k.tube(C.shade, [[x, y - .3, ZF], [x, y - .22, z + .48]], .01, 4);
    k.block(C.gold, .02, .7, .24, X0 - .012, .34, ZF - .15);
    k.block(C.red, .024, .66, .2, X0 - .03, .36, ZF - .15);
    for (let j = 0; j < 5; j++) k.block(C.orn, .01, .06, .07, X0 - .045, .45 + j * .11, ZF - .15);
  }

  // roof: hipped over the corner, running on as a gable along the row; tile rolls, ridges, green fascia
  const ex0 = X0 - .2, ex1 = X1 + .02, ez0 = ZB - .14, ez1 = ZF + .22, zc = (ez0 + ez1) / 2, yr = YR + RH, hx = ex0 + (ez1 - ez0) / 2;
  k.triangles(C.tile, [[[ex0, YR, ez1], [ex1, YR, ez1], [ex1, yr, zc], [hx, yr, zc]], [[ex1, YR, ez0], [ex0, YR, ez0], [hx, yr, zc], [ex1, yr, zc]], [[ex0, YR, ez0], [ex0, YR, ez1], [hx, yr, zc]]]);
  for (let x = ex0 + .1; x < ex1 - .04; x += .13) for (const ez of [ez0, ez1]) {
    const t = Math.min(1, (x - ex0) / (hx - ex0)); if (t < .1) continue;
    k.tube(C.tile2, [[x, YR + .012, ez], [x, YR + RH * t + .012, ez + (zc - ez) * t]], .014, 4);
  }
  for (let z = ez0 + .1; z < ez1 - .05; z += .13) {const t = 1 - Math.abs(z - zc) / ((ez1 - ez0) / 2); if (t > .1) k.tube(C.tile2, [[ex0 + .01, YR + .012, z], [ex0 + (hx - ex0) * t, YR + RH * t + .012, z]], .014, 4);}
  k.tube(C.tile2, [[hx, yr + .02, zc], [ex1, yr + .02, zc]], .036, 6);
  for (const ez of [ez0, ez1]) k.tube(C.tile2, [[ex0, YR + .02, ez], [hx, yr + .02, zc]], .03, 6);
  k.box(C.green, ex0, ex1, YR - .1, YR + .005, ez1 - .03, ez1 + .01);
  k.box(C.green, ex0, ex1, YR - .1, YR + .005, ez0 - .01, ez0 + .03);
  k.box(C.green, ex0 - .01, ex0 + .03, YR - .1, YR + .005, ez0, ez1);
  // party walls rising through the roof as low fire walls, and the gable end of No. 418
  const roofY = z => YR + RH * (1 - Math.abs(z - zc) / ((ez1 - ez0) / 2));
  k.slab(C.wall, [[-ZF, YC], [-ZB, YC], [-zc, yr - .02]], sideAt(X1, 1), -.05, 0);
  k.tube(C.orn, [[X1 + .01, roofY(ez1) + .02, ez1], [X1 + .01, yr + .04, zc], [X1 + .01, roofY(ez0) + .02, ez0]], .03, 5);
  k.tube(C.shade, [[X1 + .03, YR - .05, ZB + .2], [X1 + .03, .06, ZB + .2]], .018, 5);
  {
    const E = sideAt(X1, 1); // u = -z on the blank end wall of No. 418
    for (const [v0, v1, m] of [[YS, YS + .06, C.band], [YB - .03, YB + .02, C.orn], [YE, YE + .04, C.orn], [YC - .03, YC + .02, C.orn]]) k.slab(m, rect(-ZF - .05, -ZF + .55, v0, v1), E, 0, .03);
    k.slab(C.orn, rect(-ZF + .55, -ZF + .62, YU, YE), E, 0, .03);
    for (const z of [.2, -.35]) {k.slab(C.orn, rect(-z - .07, -z + .07, 2.25, 2.45), E, 0, .015); k.shape(C.glass, rect(-z - .05, -z + .05, 2.27, 2.43), E, .017); for (let j = 0; j < 3; j++) k.shape(C.orn, rect(-z - .05, -z + .05, 2.3 + j * .05, 2.31 + j * .05), E, .019);}
    k.box(C.orn, X1, X1 + .14, 1.6, 1.78, -.5, -.18);
    k.shape(C.shade, ring(.06, 10, .34, 1.69), sideAt(X1 + .14, 1), .002);
    k.tube(C.shade, [[X1 + .04, 1.6, -.34], [X1 + .04, .9, -.34], [X1 + .04, .9, -.5]], .012, 4);
    k.shape(C.shade, rect(-ZS - .02, -ZB + .02, Y0, YB - .1), sideAt(X1, 1), .001);
    k.shape(C.wall, rect(-ZS + .1, -ZB - .1, Y0 + .2, YB - .25), sideAt(X1, 1), .002);
  }
  // half-timbered gable over No. 414 facing the road, with green bargeboards
  {
    const gx = X0 + 1.5 * UW, gw = .64, gz = ZF + .1, gy0 = YR + .04, gy1 = YR + .9, G = frontAt(gz);
    k.slab(C.orn, [[gx - gw, gy0], [gx + gw, gy0], [gx, gy1]], G, -.04, 0);
    k.shape(C.green, rect(gx - gw * .85, gx + gw * .85, gy0 + .1, gy0 + .14), G, .003);
    for (const d of [-.38, -.13, .13, .38]) k.shape(C.green, rect(gx + d - .016, gx + d + .016, gy0 + .14, gy0 + (gy1 - gy0) * (1 - Math.abs(d) / gw) - .06), G, .003);
    for (const s of [-1, 1]) {
      k.shape(C.band, [[gx + s * .16, gy0 + .18], [gx + s * .34, gy0 + .18], [gx + s * .16, gy0 + .4]], G, .002);
      k.triangles(C.tile, [[[gx + s * (gw + .1), gy0 - .06, gz + .14], [gx, gy1 + .05, gz + .14], [gx, gy1 + .05, zc], [gx + s * (gw + .1), gy0 - .06, zc]]]);
    }
    k.tube(C.green, [[gx - gw - .1, gy0 - .05, gz + .15], [gx, gy1 + .06, gz + .15], [gx + gw + .1, gy0 - .05, gz + .15]], .024, 5);
    k.tube(C.tile2, [[gx, gy1 + .07, gz + .12], [gx, gy1 + .07, zc]], .032, 6);
  }
  // the corner pediment of No. 412: lions, buffalo, crest and urn finials on pedestals
  {
    const px = X0 + UW / 2, P = F;
    k.slab(C.orn, rect(X0 - .05, X0 + UW + .02, YC + .02, YC + .16), P, -.06, .08);
    k.slab(C.wall, [[px - .52, YC + .16], [px + .52, YC + .16], [px, YC + .98]], P, -.08, .03);
    k.shape(C.shade, [[px - .38, YC + .22], [px + .38, YC + .22], [px, YC + .8]], P, .032);
    k.tube(C.orn, [P(px - .58, YC + .17, .05), P(px, YC + 1.03, .05), P(px + .58, YC + .17, .05)], .03, 6);
    k.slab(C.orn, ring(.11, 12, px, YC + 1.08), P, -.03, .05);
    k.slab(C.shade, ring(.065, 10, px, YC + 1.08), P, .05, .055);
    k.slab(C.orn, ring(.035, 8, px, YC + 1.08), P, .05, .075);
    k.lathe(C.orn, [[.0, 0], [.03, 0], [.035, .05], [.012, .1], [.0, .13]], px, ZF + .01, 8, 0, YC + 1.18);
    for (const s of [-1, 1]) {
      k.slab(C.orn, ellipse(.075, .05, px + s * .15, YC + .31), P, .03, .065);
      k.slab(C.orn, ring(.045, 8, px + s * .08, YC + .4), P, .03, .075);
      k.slab(C.orn, ellipse(.02, .05, px + s * .22, YC + .38), P, .03, .055);
      k.slab(C.orn, ellipse(.06, .032, px + s * .33, YC + .25), P, .03, .06);
      k.slab(C.orn, ring(.025, 6, px + s * .38, YC + .28), P, .03, .065);
      k.slab(C.orn, ring(.055, 10, px + s * .48, YC + .23), P, .0, .06);
      const x = px + s * .6;
      k.block(C.orn, .14, .42, .14, x, YC + .02, ZF - .02);
      k.shape(C.shade, rect(x - .045, x + .045, YC + .1, YC + .36), frontAt(ZF + .05), 0);
      k.block(C.orn, .18, .04, .18, x, YC + .44, ZF - .02);
      k.lathe(C.orn, [[0, 0], [.05, 0], [.06, .04], [.035, .08], [.056, .13], [.03, .19], [0, .25]], x, ZF - .02, 8, 0, YC + .48);
    }
    k.slab(C.orn, ring(.06, 10, px, YC + .55), P, .03, .06);
    for (let j = 0; j < 6; j++) {const a = j * PI / 3; k.slab(C.orn, ring(.025, 6, px + Math.cos(a) * .085, YC + .55 + Math.sin(a) * .085), P, .03, .05);}
  }

  // the back: upper rear windows, rear service wings with lean-to roofs, airwells with boundary walls and gates
  const BK = backAt(ZB);
  for (let i = 0; i < N; i++) {
    const cx = unitC(i), xl = X0 + i * UW + .04, xr = xl + .76, nx = i < N - 1 ? X0 + (i + 1) * UW + .04 : X1;
    k.slab(C.orn, rect(-(cx + .24) - .2, -(cx + .24) + .2, 2.12, 2.7), BK, 0, .025);
    k.shape(C.green, rect(-(cx + .24) - .16, -(cx + .24) + .16, 2.16, 2.66), BK, .028);
    for (let j = 0; j < 5; j++) k.shape(C.glass, rect(-(cx + .24) - .14, -(cx + .24) + .14, 2.2 + j * .09, 2.23 + j * .09), BK, .03);
    k.shape(C.green, rect(-(xr + .12) - .14, -(xr + .12) + .14, Y0, .78), BK, .003);
    k.box(C.wall, xl, xr, 0, 2.05, ZR, ZB);
    k.triangles(C.tile, [[[xl - .04, 2.2, ZR - .08], [xl - .04, 2.2, ZB], [xr + .12, 2.0, ZB], [xr + .12, 2.0, ZR - .08]]]);
    for (let z = ZR - .02; z < ZB - .03; z += .13) k.tube(C.tile2, [[xl - .03, 2.212, z], [xr + .11, 2.012, z]], .013, 4);
    k.box(C.green, xr + .09, xr + .13, 1.93, 2.0, ZR - .08, ZB);
    const R = backAt(ZR), WS = sideAt(xr, 1);
    k.slab(C.orn, rect(-(xl + .38) - .15, -(xl + .38) + .15, Y0, .85), R, 0, .02);
    k.shape(C.green, rect(-(xl + .38) - .12, -(xl + .38) + .12, Y0, .82), R, .022);
    k.slab(C.orn, rect(-(xl + .38) - .14, -(xl + .38) + .14, 1.25, 1.65), R, 0, .02);
    k.shape(C.green, rect(-(xl + .38) - .11, -(xl + .38) + .11, 1.28, 1.62), R, .022);
    for (const z of [-1.0, -1.6]) {k.slab(C.orn, rect(-z - .12, -z + .12, 1.2, 1.6), WS, 0, .02); k.shape(C.green, rect(-z - .09, -z + .09, 1.23, 1.57), WS, .022);}
    k.tube(C.shade, [[xr + .1, 1.98, ZR - .05], [xr + .1, .05, ZR - .05]], .016, 5);
    k.box(C.orn, xl + .06, xl + .3, 1.75, 1.92, ZR - .13, ZR);
    k.shape(C.shade, ring(.055, 10, -(xl + .15), 1.835), backAt(ZR - .13), .002);
    k.box(C.wall, xr, nx, 0, .75, ZR, ZR + .07);
    k.box(C.orn, xr, nx, .75, .79, ZR - .01, ZR + .08);
    k.shape(C.green, rect(-((xr + nx) / 2) - .16, -((xr + nx) / 2) + .16, .05, .7), R, .002);
  }
  {
    const W = sideAt(X0 + .04, -1);
    for (const u of [-1.0, -1.6]) {k.slab(C.orn, rect(u - .13, u + .13, 1.2, 1.62), W, 0, .02); k.shape(C.green, rect(u - .1, u + .1, 1.23, 1.59), W, .022);}
    k.shape(C.green, rect(-1.45, -1.15, Y0, .82), W, .003);
  }

  return {
    baseWidth: 7.4, detail: [X0 + UW / 2, 2.2, ZF], overview: [0, 2.0, 0], distance: 11.8, elevation: .2,
    front: ZF + .05, back: ZR - .1,
    anchors: {
      'entry-arch': {position: [X0 + UW / 2, .62, ZF + .12], scale: .62},
      'back-envelope': {position: [0, 1.4, ZR - .2]}, 'front-envelope': {position: [0, 1.6, ZF + .5]},
    },
    // dial piece: the corner unit No. 412 with its pediment, arched green windows and hipped tiled roof
    alignPart(kk) {
      const P = frontAt(.3);
      kk.box(C.wall, -.6, .6, 0, .95, -.3, .3);
      kk.box(C.band, -.63, .63, .38, .43, -.33, .33);
      kk.box(C.orn, -.64, .64, .9, .95, -.34, .34);
      for (const u of [-.27, .27]) {kk.slab(C.orn, archShape(.13, .2, 10, u, .5), P, 0, .025); kk.shape(C.green, archShape(.1, .2, 10, u, .52), P, .027); kk.shape(C.glass, archShape(.075, .19, 10, u, .54), P, .029);}
      for (const u of [-.56, 0, .56]) kk.slab(C.orn, rect(u - .05, u + .05, .43, .9), P, 0, .04);
      for (const u of [-.48, .48]) kk.block(C.orn, .14, .38, .14, u, 0, .26);
      kk.shape(C.shop, rect(-.38, .38, 0, .32), P, .002);
      kk.box(C.green, -.68, .68, .95, 1.0, -.38, .38);
      kk.hip(C.tile, 0, 0, 1.36, .76, .6, 0, 1.0, .32);
      kk.slab(C.wall, [[-.42, .95], [.42, .95], [0, 1.42]], P, -.04, .03);
      kk.slab(C.orn, ring(.07, 10, 0, 1.45), P, -.02, .05);
      for (const s of [-1, 1]) {kk.block(C.orn, .08, .26, .08, s * .48, .95, .28); kk.lathe(C.orn, [[0, 0], [.035, 0], [.04, .04], [.02, .08], [0, .12]], s * .48, .28, 8, 0, 1.21);}
    },
  };
}


/* ===== Boon Teck Road water kiosk, at the junction with Balestier Road =====
 * The last free-water kiosk of Thong Teck Sian Tong Lian Sin Sia: a stainless-steel counter carrying two big steel urns
 * (plain water and Teochew su teh) with brass taps, under a red corrugated zinc roof on green steel posts, a white
 * signboard of red characters hung from the front beam. It stands on the red-brick pavement by the kerb, a rain tree
 * behind it, the temple's green-glazed gate pavilion over the boundary wall and a shophouse corner across the way;
 * STOP sign, street-name blades and bollards at the corner. Front (+z) is Boon Teck Road, right is Balestier Road. */
function waterKiosk(k, M) {
  const C = {steel: mat('#c5cacc', .3, {metalness: .65}), frame: mat('#2f5c4b', .6), zinc: mat('#bb5638', .7), board: mat('#f3efe4', .8), red: mat('#b9302a', .6),
    brick: mat('#a65a44', .92), kerb: mat('#aaa69c', .95), road: mat('#56585b', .95), line: mat('#f1efe7', .7), leaf: mat('#5d7f45', .9),
    bark: mat('#6b5442', .9), wall: mat('#ece0c2', .88), roof: mat('#9a4733', .9), glazed: mat('#2e7a59', .5), gold: M.gold, yellow: mat('#e3b230', .6)};
  const FR = 1.45, KX = -.15, KZ0 = -.32, KZ1 = .24, KY = .07;

  // the junction: brick pavement with a rounded kerb, Boon Teck Road in front, Balestier Road to the right
  k.box(C.road, -3.2, 3.2, 0, .02, FR, 2.2);
  k.box(C.road, 2.0, 3.2, 0, .02, -2.2, FR);
  k.box(C.brick, -3.2, 1.5, 0, .06, -.05, FR);
  k.box(C.brick, 1.35, 2.0, 0, .06, -2.2, .95);
  k.prism(C.brick, [[1.5, .95], ...Array.from({length: 7}, (_, i) => [1.5 + Math.cos(i / 6 * PI / 2) * .5, .95 + Math.sin(i / 6 * PI / 2) * .5])], 0, .06);
  k.box(C.kerb, -3.2, 1.5, 0, .075, FR, FR + .08);
  k.box(C.kerb, 2.0, 2.08, 0, .075, -2.2, .95);
  k.tube(C.kerb, Array.from({length: 9}, (_, i) => [1.5 + Math.cos(i / 8 * PI / 2) * .54, .04, .95 + Math.sin(i / 8 * PI / 2) * .54]), .04, 5);
  for (let x = -3.1; x < 1.5; x += .2) k.box(C.roof, x, x + .008, .06, .063, -.05, FR);
  for (let z = .1; z < FR; z += .2) k.box(C.roof, -3.2, 1.5, .06, .063, z, z + .008);
  for (let z = -2.1; z < .95; z += .2) k.box(C.roof, 1.35, 2.0, .06, .063, z, z + .008);
  k.box(C.line, 1.84, 1.92, .02, .024, FR + .1, 2.18);
  for (let x = -3.0; x < 1.6; x += .55) k.box(C.line, x, x + .28, .02, .024, 1.86, 1.89);
  for (let z = -2.0; z < 2.1; z += .55) k.box(C.line, 2.62, 2.65, .02, .024, z, z + .28);
  k.box(C.yellow, -3.2, 1.45, .02, .024, FR + .1, FR + .13);
  for (const [x, z] of [[1.72, 1.32], [1.95, 1.1]]) {k.lathe(C.yellow, [[.035, 0], [.035, .32], [0, .34]], x, z, 8, 0, .06); for (const y of [.12, .24]) k.lathe(C.road, [[.037, 0], [.037, .04]], x, z, 8, 0, .06 + y);}

  // verge, rain tree and the temple boundary behind the kiosk
  k.box(C.leaf, -3.2, 1.35, 0, .05, -.95, -.05);
  k.tube(C.bark, [[-1.15, 0, -.5], [-1.1, .8, -.48], [-1.0, 1.55, -.55], [-.7, 2.1, -.5]], t => .1 - t * .05, 7);
  k.tube(C.bark, [[-1.08, 1.2, -.5], [-1.6, 1.85, -.7]], .045, 6);
  k.tube(C.bark, [[-1.02, 1.5, -.52], [-.2, 2.05, -.3]], .04, 6);
  for (const [x, y, z, r] of [[-1.5, 2.2, -.7, .5], [-.6, 2.35, -.5, .55], [.15, 2.25, -.35, .42], [-1.0, 2.6, -.75, .48], [-1.9, 2.05, -.4, .38], [-.3, 2.72, -.8, .4], [-1.6, 2.5, -1.0, .36], [-.1, 2.45, -.9, .35], [-.9, 2.25, -.2, .38]]) ball(k, C.leaf, r, x, y, z, 10, .5);
  for (const [x, z] of [[-2.9, -.35], [-2.5, -.6], [.95, -.4]]) {ball(k, C.leaf, .17, x, .2, z, 8, .8); ball(k, C.leaf, .12, x + .12, .28, z - .05, 8, .8);}
  k.box(C.wall, -3.2, .3, 0, .42, -1.08, -.96);
  k.box(C.glazed, -3.22, .32, .42, .47, -1.1, -.94);
  for (let x = -3.05; x < .3; x += .32) k.block(C.wall, .09, .55, .09, x, 0, -1.02);
  // the temple's gate pavilion: red columns, a green glazed roof with curled ridge
  {
    const gx = -2.1, gz = -1.65;
    k.box(C.kerb, gx - .8, gx + .8, 0, .1, gz - .5, gz + .5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {k.lathe(C.red, [[.045, 0], [.045, 1.05]], gx + sx * .6, gz + sz * .32, 10, 0, .1); k.block(C.kerb, .13, .08, .13, gx + sx * .6, .1, gz + sz * .32);}
    k.box(C.red, gx - .68, gx + .68, 1.05, 1.18, gz - .38, gz + .38);
    k.box(C.gold, gx - .7, gx + .7, 1.17, 1.21, gz - .4, gz + .4);
    k.box(C.glazed, gx - .72, gx + .72, 1.16, 1.18, gz + .38, gz + .41);
    curvedRoof(k, C.glazed, gx, gz, 1.85, 1.25, 1.2, .5, .16, C.red);
    swallowRidge(k, C.gold, gx, gz, .62, 1.7, -.05, .3, .035);
    k.lathe(C.gold, [[0, 0], [.07, .05], [0, .14]], gx, gz, 10, 0, 1.68);
    k.lathe(C.gold, [[.12, 0], [.16, .06], [.16, .18], [.12, .2], [.14, .22], [0, .22]], gx + .1, gz + .9, 12, 0, .05);
    for (const s of [-1, 1]) k.lathe(C.red, [[0, 0], [.07, .03], [.08, .12], [.05, .17], [0, .18]], gx + s * .45, gz + .4, 10, 0, .92);
  }
  // a shophouse corner across the way: five-foot way on two sides, green shutters, hipped tile roof
  {
    const x0 = .45, x1 = 1.95, z0 = -2.15, z1 = -1.0, gy = .9, ey = 1.95;
    k.box(C.wall, x0, x1 - .3, 0, gy, z0, z1 - .3);
    k.box(C.wall, x0, x1, gy, ey, z0, z1);
    k.box(C.board, x0, x1 + .03, gy - .02, gy + .05, z0, z1 + .03);
    k.box(C.board, x0, x1 + .05, ey - .05, ey, z0, z1 + .05);
    for (const [x, z] of [[x1 - .08, z1 - .08], [x1 - .08, z0 + .55], [x1 - .08, z0 + .08], [x0 + .5, z1 - .08], [x0 + .08, z1 - .08]]) k.block(C.board, .12, gy, .12, x, 0, z);
    const SF = frontAt(z1), SR = sideAt(x1, 1);
    for (const u of [x0 + .35, x0 + .95]) {k.slab(C.board, rect(u - .16, u + .16, 1.15, 1.75), SF, 0, .02); k.shape(C.frame, rect(u - .13, u + .13, 1.18, 1.72), SF, .022); k.shape(C.road, rect(u - .006, u + .006, 1.18, 1.72), SF, .024);}
    for (const u of [-(z1 - .3), -(z1 - .85)]) {k.slab(C.board, rect(u - .16, u + .16, 1.15, 1.75), SR, 0, .02); k.shape(C.frame, rect(u - .13, u + .13, 1.18, 1.72), SR, .022); k.shape(C.road, rect(u - .006, u + .006, 1.18, 1.72), SR, .024);}
    k.shape(C.road, rect(x0 + .1, x1 - .45, .06, gy - .12), frontAt(z1 - .3), .002);
    k.shape(C.red, rect(x0 + .15, x1 - .5, gy - .1, gy - .03), frontAt(z1 - .3), .004);
    const SB = backAt(z0), SL = sideAt(x0, -1);
    for (const x of [.75, 1.45]) for (const v of [.3, 1.2]) {k.slab(C.board, rect(-x - .13, -x + .13, v, v + .48), SB, 0, .015); k.shape(C.frame, rect(-x - .1, -x + .1, v + .03, v + .45), SB, .017);}
    for (const z of [-1.4, -1.85]) {k.slab(C.board, rect(z - .12, z + .12, 1.2, 1.68), SL, 0, .015); k.shape(C.frame, rect(z - .09, z + .09, 1.23, 1.65), SL, .017);}
    k.tube(C.kerb, [[x0 + .05, ey, z0 - .03], [x0 + .05, .05, z0 - .03]], .014, 4);
    k.hip(C.roof, (x0 + x1) / 2 + .02, (z0 + z1) / 2 + .02, x1 - x0 + .2, z1 - z0 + .2, .6, 0, ey, .5);
    k.box(C.frame, x0, x1 + .1, ey - .04, ey + .02, z1 + .08, z1 + .11);
  }

  // the kiosk: steel counter and worktop, two urns with taps, posts, red zinc roof, signboard
  k.box(C.kerb, KX - .78, KX + .78, .06, KY, KZ0 - .06, KZ1 + .06);
  k.box(C.steel, KX - .7, KX + .7, KY, .62, KZ0, KZ1);
  k.box(C.steel, KX - .74, KX + .74, .62, .65, KZ0 - .02, KZ1 + .04);
  k.box(C.steel, KX - .74, KX + .74, .65, .8, KZ0 - .02, KZ0 + .01);
  {
    const D = frontAt(KZ1);
    for (const u of [KX - .233, KX + .233]) k.shape(C.road, rect(u - .004, u + .004, KY + .04, .6), D, .002);
    for (const u of [KX - .47, KX, KX + .47]) {k.shape(C.kerb, rect(u - .2, u + .2, KY + .06, .56), D, .001); k.block(C.road, .06, .015, .015, u, .5, KZ1 + .008);}
    k.shape(C.road, rect(KX - .7, KX + .7, KY, KY + .04), D, .002);
    k.shape(C.road, rect(KX - .05, KX + .05, .36, .42), D, .003);
  }
  for (const s of [-1, 1]) {
    const x = KX + s * .33, z = KZ0 + .25;
    k.lathe(C.steel, [[0, 0], [.17, 0], [.185, .02], [.185, .3], [.195, .32], [.165, .33], [0, .33]], x, z, 16, 0, .65);
    k.lathe(C.steel, [[.17, 0], [.15, .04], [.05, .075], [.025, .1], [.032, .12], [0, .13]], x, z, 16, 0, .98);
    for (const y of [.74, .9]) k.lathe(C.kerb, [[.188, 0], [.188, .012]], x, z, 16, 0, y);
    for (const d of [-1, 1]) k.tube(C.steel, [[x + d * .185, .9, z - .04], [x + d * .225, .9, z - .02], [x + d * .225, .9, z + .02], [x + d * .185, .9, z + .04]], .01, 4);
    k.tube(C.gold, [[x, .72, z + .18], [x, .72, z + .26], [x, .69, z + .275], [x, .66, z + .275]], .014, 5);
    k.block(C.gold, .05, .02, .02, x, .74, z + .245);
    k.block(C.red, .12, .12, .012, x, .77, z + .186);
    k.box(C.steel, x - .1, x + .1, .65, .67, z + .2, z + .34);
    for (let j = 0; j < 4; j++) k.box(C.road, x - .09, x + .09, .671, .673, z + .21 + j * .035, z + .22 + j * .035);
  }
  for (let j = 0; j < 4; j++) k.lathe(C.board, [[.022, 0], [.03, .07], [0, .07]], KX - .05 + (j % 2) * .07, KZ0 + .16 + (j > 1 ? .07 : 0), 8, 0, .65);
  for (const [x, z] of [[KX - .76, KZ0 - .02], [KX + .76, KZ0 - .02], [KX - .76, KZ1 + .03], [KX + .76, KZ1 + .03]]) k.block(C.frame, .045, (z > KZ1 ? 1.62 : 1.4) - KY, .045, x, KY, z);
  k.box(C.frame, KX - .8, KX + .8, 1.52, 1.58, KZ1 + .01, KZ1 + .05);
  k.box(C.frame, KX - .8, KX + .8, 1.32, 1.38, KZ0 - .04, KZ0);
  for (const x of [KX - .76, KX + .76]) k.tube(C.frame, [[x, 1.57, KZ1 + .03], [x, 1.37, KZ0 - .02]], .02, 4);
  {
    const zf = KZ1 + .3, zb = KZ0 - .28, yf = 1.66, yb = 1.36, x0 = KX - .98, x1 = KX + .98;
    k.triangles(C.zinc, [[[x0, yf, zf], [x1, yf, zf], [x1, yb, zb], [x0, yb, zb]]]);
    k.triangles(C.roof, [[[x0, yf - .018, zf], [x1, yf - .018, zf], [x1, yb - .018, zb], [x0, yb - .018, zb]]]);
    for (let x = x0 + .035; x < x1; x += .07) k.tube(C.zinc, [[x, yf + .008, zf + .01], [x, yb + .008, zb - .01]], .016, 4);
    for (const t of [.3, .65]) k.tube(C.frame, [[x0 + .1, yf + (yb - yf) * t - .04, zf + (zb - zf) * t], [x1 - .1, yf + (yb - yf) * t - .04, zf + (zb - zf) * t]], .018, 4);
    k.box(C.zinc, x0, x1, yf - .06, yf + .01, zf - .01, zf + .01);
  }
  {
    const z = KZ1 + .07, D = frontAt(z + .025);
    k.box(C.board, KX - .64, KX + .64, 1.25, 1.52, z, z + .025);
    for (const [v0, v1] of [[1.25, 1.27], [1.5, 1.52]]) k.shape(C.red, rect(KX - .64, KX + .64, v0, v1), D, .002);
    for (const u of [KX - .64, KX + .62]) k.shape(C.red, rect(u, u + .02, 1.25, 1.52), D, .002);
    for (let j = 0; j < 9; j++) k.shape(C.red, rect(KX - .52 + j * .13 - .04, KX - .52 + j * .13 + .04, 1.4, 1.47), D, .004);
    for (let j = 0; j < 8; j++) k.shape(C.red, rect(KX - .46 + j * .13 - .04, KX - .46 + j * .13 + .04, 1.29, 1.36), D, .004);
  }
  k.tube(C.frame, [[KX + .73, 1.35, KZ0 - .05], [KX + .73, .4, KZ0 - .05], [KX + .6, .3, KZ0 - .05], [KX + .4, .66, KZ0 + .02]], .012, 5);
  k.lathe(C.frame, [[.1, 0], [.11, .32], [.12, .34], [0, .36]], KX + 1.05, .1, 12, 0, .06);
  k.lathe(C.red, [[.0, 0], [.07, 0], [.08, .2], [.0, .2]], KX - .95, .25, 10, 0, .06);

  // a bicycle parked on the pavement and a fire hydrant by the kerb
  {
    const z = .7, wheel = cx => Array.from({length: 13}, (_, i) => [cx + Math.cos(i / 12 * 2 * PI) * .14, .2 + Math.sin(i / 12 * 2 * PI) * .14, z]);
    for (const cx of [-2.7, -2.2]) {k.tube(C.road, wheel(cx), .014, 4); k.tube(C.steel, [[cx, .2, z], [cx + .1, .26, z]], .005, 3);}
    k.tube(C.frame, [[-2.7, .2, z], [-2.48, .2, z], [-2.56, .42, z], [-2.7, .2, z]], .013, 4);
    k.tube(C.frame, [[-2.48, .2, z], [-2.29, .42, z], [-2.56, .4, z]], .013, 4);
    k.tube(C.frame, [[-2.2, .2, z], [-2.27, .48, z]], .012, 4);
    k.tube(C.steel, [[-2.27, .48, z - .1], [-2.27, .48, z + .1]], .01, 4);
    k.block(C.road, .09, .025, .04, -2.57, .43, z);
    k.lathe(C.red, [[.065, 0], [.065, .04], [.048, .05], [.048, .25], [.058, .27], [.032, .32], [0, .34]], .95, 1.25, 10, 0, .06);
    for (const d of [-1, 1]) k.block(C.gold, .05, .04, .04, .95 + d * .06, .22, 1.25);
  }
  // STOP sign facing the Boon Teck traffic, with street-name blades; a street lamp on Balestier Road
  {
    const px = 1.75, pz = 1.05, A = -.75, S = facing(px, pz + .02, A);
    k.lathe(C.steel, [[.022, 0], [.022, 1.55]], px, pz, 8, 0, .06);
    k.slab(C.board, oct(.19, 0, 1.25), S, 0, .012);
    k.shape(C.red, oct(.17, 0, 1.25), S, .014);
    for (let j = 0; j < 4; j++) k.shape(C.board, rect(-.12 + j * .065, -.08 + j * .065, 1.22, 1.29), S, .016);
    for (const [ry, w] of [[0, .5], [PI / 2, .44]]) {k.block(C.board, w + .03, .11, .016, px, 1.61 + (ry ? .13 : 0), pz, ry); k.block(C.frame, w, .08, .02, px, 1.625 + (ry ? .13 : 0), pz, ry);}
    k.tube(C.steel, [[2.25, .06, -1.6], [2.25, 2.5, -1.6], [2.4, 2.8, -1.6], [2.75, 2.85, -1.6]], .028, 6);
    k.block(C.steel, .3, .05, .12, 2.8, 2.78, -1.6);
  }

  return {
    baseWidth: 6.4, detail: [KX, .95, KZ1], overview: [0, 1.1, 0], distance: 10.6, elevation: .5,
    front: FR, back: -2.2,
    anchors: {
      'front-envelope': {position: [KX, .95, KZ1 + .3], scale: .6},
      'water-basin': {position: [KX, .85, KZ1 + .1], scale: .6},
      'back-envelope': {position: [0, 1.2, -2.3]},
    },
  };
}


/* ===== Former Malay Film Productions studio (Shaw Brothers, 1940/1947-67), 8 Jalan Ampas =====
 * From the street: the faded teal corrugated-zinc hoarding and its pipe-framed gate (SB sticker on the post, chain, a
 * blue address plate with the number 8), the heritage-trail marker and banana plants on the verge. Inside: Block A, the
 * long single-storey 1950s office block with the big Shaw Brothers shield on its street end and steel-framed windows,
 * vents and film memorabilia along the yard; Block B at the end of the yard with its tall stair window and the red
 * SILENCE sign; the sound stage on the right with its pebble-dash base, ledge, green clerestory and big stage door
 * under a red warning lamp. Taps: producer = the SB shield, director = SILENCE, actor = the stage door. */
function jalanAmpas(k, M) {
  const C = {white: mat('#efeee8', .85), rough: mat('#d9d6cb', .98), trim: mat('#bfbcb2', .9), zinc: mat('#3f9886', .72), zinc2: mat('#2c7465', .75),
    steel: mat('#5d686d', .55, {metalness: .3}), glass: mat('#27302f', .4), green: mat('#64a86e', .45), blue: mat('#23448e', .55), gold: M.gold,
    red: mat('#b8292a', .5, {emissive: '#5a0c0c', emissiveIntensity: .25}), door: mat('#8b989d', .8), ray: mat('#a9c0dc', .6), cream: mat('#f6efd6', .6),
leaf: mat('#4d7c3c', .85), pot: mat('#a8603f', .9)};
  const FZ = 1.5, A0 = -3.35, A1 = -1.45, AZ0 = -1.85, AZ1 = 1.05, AH = 1.28, B0 = -1.3, B1 = .95, BZ0 = -2.05, BZ1 = -1.0, BH = 2.38;
  const S0 = 1.15, S1 = 3.4, SZ0 = -1.95, SZ1 = .95;

  // Jalan Ampas: road, kerb, grass verge, the driveway apron; the concrete yard inside
  k.box(C.steel, -3.6, 3.6, 0, .02, 1.86, 2.2);
  k.box(C.trim, -3.6, 3.6, 0, .065, 1.79, 1.86);
  k.box(C.leaf, -3.6, 3.6, 0, .045, FZ, 1.79);
  k.box(C.trim, -.85, .85, 0, .055, FZ - .02, 1.87);
  for (let x = -3.4; x < 3.5; x += .6) k.box(C.white, x, x + .3, .02, .024, 2.02, 2.05);
  k.box(C.trim, -3.6, 3.6, 0, .03, -2.2, FZ);
  for (const [x0, z0, x1, z1] of [[-.8, .9, .2, .3], [.2, .3, .1, -.6], [-.4, -.2, .6, -.7], [-1.2, -.5, -.5, -.9]]) k.tube(C.trim, [[x0, .032, z0], [(x0 + x1) / 2 + .08, .032, (z0 + z1) / 2], [x1, .032, z1]], .008, 3);

  // the hoarding: teal corrugated zinc on round pipe posts; the gate with one leaf swung open
  const ribs = (x0, x1, z, y0, y1) => {for (let x = x0 + .025; x < x1; x += .05) k.box(C.zinc2, x - .008, x + .008, y0, y1, z, z + .014);};
  for (const [x0, x1] of [[-3.55, -.82], [.82, 3.55]]) {
    k.box(C.zinc, x0, x1, .03, .68, FZ - .01, FZ + .01);
    ribs(x0, x1, FZ + .01, .03, .68);
    for (let x = x0; x <= x1 + .01; x += (x1 - x0) / 3) {k.lathe(C.zinc2, [[.026, 0], [.026, .74], [.032, .76], [0, .78]], x, FZ + .04, 8, 0, 0);}
    k.tube(C.zinc2, [[x0, .66, FZ + .035], [x1, .66, FZ + .035]], .016, 5);
  }
  for (const x of [-.82, .82]) {k.lathe(C.zinc, [[.045, 0], [.045, .86], [.05, .88], [0, .9]], x, FZ + .02, 10, 0, 0); for (const y of [.25, .6]) k.lathe(C.pot, [[.047, 0], [.047, .05]], x, FZ + .02, 10, 0, y);}
  {
    const L = (x0, x1) => {k.box(C.zinc, x0, x1, .06, .7, FZ - .01, FZ + .01); ribs(x0, x1, FZ + .01, .06, .7); for (const y of [.08, .4, .7]) k.tube(C.zinc2, [[x0, y, FZ + .03], [x1, y, FZ + .03]], .014, 5);};
    L(-.78, -.02);
    // the open leaf, hinged on the right post and swung into the yard
    const th = 1.15, d = [-Math.cos(th), -Math.sin(th)], cx = .78 + d[0] * .38, cz = FZ + d[1] * .38, ry = Math.atan2(-d[1], d[0]);
    k.block(C.zinc, .76, .64, .02, cx, .06, cz, ry);
    for (let t = .04; t < .76; t += .05) k.block(C.zinc2, .016, .64, .036, .78 + d[0] * t, .06, FZ + d[1] * t, ry);
    for (const y of [.08, .4, .7]) k.tube(C.zinc2, [[.78, y, FZ], [.78 + d[0] * .76, y, FZ + d[1] * .76]], .014, 5);
    // SB sticker on the left post, a chain, the address plate and the no-entry board
    const PF = frontAt(FZ + .066);
    k.slab(C.gold, [[-.86, .5], [-.78, .5], [-.78, .44], [-.82, .4], [-.86, .44]], PF, 0, .008);
    k.shape(C.cream, [[-.85, .495], [-.79, .495], [-.79, .445], [-.82, .415], [-.85, .445]], PF, .01);
    k.tube(C.steel, [[-.78, .62, FZ + .05], [-.7, .5, FZ + .05], [-.62, .44, FZ + .05], [-.55, .5, FZ + .05], [-.5, .58, FZ + .05]], .009, 4);
    const AP = frontAt(FZ + .03);
    k.slab(C.white, rect(-1.18, -.96, .42, .58), AP, 0, .012);
    k.shape(C.blue, rect(-1.165, -.975, .435, .565), AP, .014);
    for (const v of [.47, .525]) stroke(k, C.white, AP, ring(.024, 12, -1.07, v).concat([[-1.07 + .024, v]]), .018, .006, 4);
    k.slab(C.white, rect(-.6, -.2, .44, .6), frontAt(FZ + .045), 0, .01);
    for (let j = 0; j < 5; j++) k.shape(C.red, rect(-.56 + j * .075, -.51 + j * .075, .53, .57), frontAt(FZ + .045), .012);
    k.shape(C.red, rect(-.56, -.24, .47, .49), frontAt(FZ + .045), .012);
  }
  // verge: the Balestier Heritage Trail marker and banana plants
  {
    const x = -2.55, z = 1.66;
    k.block(C.trim, .22, .05, .12, x, .045, z);
    k.block(C.white, .17, .74, .055, x, .095, z);
    k.block(C.glass, .175, .14, .06, x, .7, z);
    k.block(C.pot, .176, .05, .062, x, .64, z);
    for (let j = 0; j < 6; j++) k.block([C.pot, C.blue, C.gold][j % 3], .02, .1, .062, x - .085, .12 + j * .1, z);
    for (let j = 0; j < 6; j++) k.block([C.blue, C.gold, C.pot][j % 3], .02, .1, .062, x + .085, .12 + j * .1, z);
    for (let j = 0; j < 4; j++) k.block(C.trim, .1, .025, .058, x, .3 + j * .07, z);
    k.block(C.glass, .1, .07, .058, x, .52, z);
  }
  banana(k, C.zinc2, C.leaf, -3.15, 1.68, .55, .4);
  banana(k, C.zinc2, C.leaf, 3.05, 1.2, .8, 1.3);
  banana(k, C.zinc2, C.leaf, .95, -.75, .8, .2);

  // Block A: the long single-storey office block, SB shield on its street end, steel windows along the yard
  k.box(C.white, A0, A1, .03, AH, AZ0, AZ1);
  k.box(C.white, A0 - .02, A1 + .02, AH, AH + .08, AZ0 - .02, AZ1 + .02);
  k.box(C.trim, A0 + .04, A1 - .04, AH + .02, AH + .06, AZ0 + .04, AZ1 - .04);
  k.box(C.white, A0 - .03, A1 + .03, 1.08, 1.11, AZ0 - .03, AZ1 + .03);
  k.box(C.trim, A0 - .01, A1 + .01, .03, .12, AZ0 - .01, AZ1 + .01);
  {
    const E = frontAt(AZ1);
    sbShield(k, C, E, -2.4, .86, .37, 0);
    for (const [u, v0] of [[-3.15, .5], [-1.7, .45], [-2.95, .2]]) k.shape(C.trim, rect(u - .012, u + .012, v0, 1.06), E, .002);
    for (const u of [-3.1, -1.7]) k.shape(C.glass, rect(u - .05, u + .05, 1.15, 1.22), E, .002);
    const Y = sideAt(A1, 1), u = z => -z; // yard face: u = -z
    for (const zc of [.62, -.5, -1.3]) {
      const a = u(zc);
      k.slab(C.white, rect(a - .3, a + .3, .38, .95), Y, 0, .07);
      k.shape(C.glass, rect(a - .25, a + .25, .42, .92), Y, .072);
      for (const d of [-.125, 0, .125]) k.shape(C.steel, rect(a + d - .008, a + d + .008, .42, .92), Y, .074);
      for (const v of [.58, .76]) k.shape(C.steel, rect(a - .25, a + .25, v - .008, v + .008), Y, .074);
    }
    k.slab(C.white, rect(u(AZ1) + .05, u(AZ0) - .05, .33, .38), Y, 0, .1);
    const dz = u(.05);
    k.slab(C.white, rect(dz - .17, dz + .17, .03, .95), Y, 0, .03);
    k.shape(C.door, rect(dz - .13, dz + .13, .12, .8), Y, .032);
    k.shape(C.glass, rect(dz - .13, dz + .13, .83, .93), Y, .032);
    for (const s of [-1, 1]) k.slab(C.white, rect(dz + s * .2 - .03, dz + s * .2 + .03, .03, 1.08), Y, 0, .09);
    for (let z = AZ1 - .2; z > AZ0; z -= .3) k.shape(C.glass, rect(u(z) - .035, u(z) + .035, .99, 1.06), Y, .002);
    stroke(k, C.glass, Y, [[u(.85) - .07, .98], [u(.85), 1.22], [u(.85) + .07, .98]], .004, .014, 4);
    k.shape(C.glass, rect(u(.85) - .04, u(.85) + .04, 1.07, 1.085), Y, .006);
    for (const zc of [.2, -.9]) {
      const a = u(zc);
      k.slab(C.trim, rect(a - .14, a + .14, .55, .8), Y, 0, .012);
      for (const [du, dv, m] of [[-.07, .72, C.pot], [.07, .72, C.blue], [-.07, .62, C.gold], [.07, .62, C.glass]]) k.shape(m, rect(a + du - .055, a + du + .055, dv - .04, dv + .04), Y, .014);
      stroke(k, C.green, Y, [[a - .2, .38], [a - .25, .6], [a - .18, .85], [a - .24, 1.0]], .006, .008, 4);
      for (const [du, dv] of [[-.23, .5], [-.2, .7], [-.22, .9]]) k.shape(C.green, ellipse(.025, .014, a + du, dv, 6), Y, .008);
    }
    const BKA = sideAt(A0, -1);
    for (const z of [.6, -.3, -1.2]) {k.shape(C.trim, rect(z - .2, z + .2, .45, .85), BKA, .002); k.shape(C.glass, rect(z - .17, z + .17, .48, .82), BKA, .003);}
    k.tube(C.trim, [[A0 - .03, 1.3, -1.6], [A0 - .03, .05, -1.6]], .016, 5);
    for (const z of [.6, -.2, -1.0, -1.55]) potPlant(k, C.pot, C.leaf, A1 + .15, z, 1.2, .03);
    potPlant(k, C.pot, C.leaf, A1 + .18, -.8, 1.6, .03);
    // a bonsai in a glazed pot by the gate and the blue bench
    k.lathe(C.blue, [[.07, 0], [.1, .1], [.06, .12], [0, .12]], -1.15, 1.25, 10, 0, .03);
    k.tube(C.zinc2, [[-1.15, .14, 1.25], [-1.1, .3, 1.23], [-1.18, .45, 1.27], [-1.12, .6, 1.25]], .018, 5);
    for (const [dx, y] of [[.08, .36], [-.1, .48], [.04, .62]]) ball(k, C.leaf, .09, -1.15 + dx, y, 1.25, 8, .4);
    k.box(C.blue, -1.4, -1.32, .03, .26, .55, 1.05);
    k.box(C.blue, -1.42, -1.18, .22, .25, .55, 1.05);
    for (const z of [.6, 1.0]) k.box(C.blue, -1.24, -1.2, .03, .22, z - .02, z + .02);
  }

  // Block B: the two-storey block closing the yard: wide window, tall stair window, SILENCE sign, blue awning
  k.box(C.white, B0, B1, .03, BH, BZ0, BZ1);
  k.box(C.white, B0 - .02, B1 + .02, BH, BH + .08, BZ0 - .02, BZ1 + .02);
  k.box(C.trim, B0 + .4, B0 + .9, BH + .08, BH + .3, BZ0 + .2, BZ0 + .7);
  {
    const B = frontAt(BZ1);
    k.slab(C.white, rect(-1.12, -.3, 1.38, 2.08), B, 0, .05);
    k.shape(C.glass, rect(-1.08, -.34, 1.42, 2.04), B, .052);
    for (let j = 1; j < 4; j++) k.shape(C.steel, rect(-1.08 + j * .185 - .008, -1.08 + j * .185 + .008, 1.42, 2.04), B, .054);
    k.shape(C.steel, rect(-1.08, -.34, 1.72, 1.74), B, .054);
    k.slab(C.white, rect(.3, .6, .5, 2.2), B, 0, .06);
    k.shape(C.glass, rect(.35, .55, .55, 2.15), B, .062);
    for (let v = .66; v < 2.15; v += .12) k.shape(C.steel, rect(.35, .55, v - .007, v + .007), B, .064);
    k.shape(C.steel, rect(.446, .454, .55, 2.15), B, .064);
    stroke(k, C.glass, B, [[.68, .95], [.68, 1.17], [.75, 1.17], [.78, 1.12], [.75, 1.06], [.68, 1.06], [.76, 1.06], [.79, 1.0], [.76, .95], [.68, .95]], .004, .014, 4);
    k.slab(C.white, rect(-.22, .2, 0, .78), B, 0, .03);
    k.shape(C.door, rect(-.18, .16, .05, .74), B, .032);
    k.shape(C.trim, rect(-.012, .008, .05, .74), B, .034);
    k.slab(C.red, rect(-.17, .17, .84, .97), B, 0, .035);
    k.shape(C.white, rect(-.15, .15, .86, .95), B, .037);
    k.shape(C.red, rect(-.135, .135, .875, .935), B, .039);
    for (let j = 0; j < 7; j++) k.shape(C.white, rect(-.115 + j * .036, -.095 + j * .036, .888, .922), B, .041);
    sbShield(k, C, B, .85, 2.1, .07, 0);
    for (const u of [-.5, .2]) ball(k, C.trim, .07, u, .92, BZ1 + .01, 8, .25);
    // the blue corrugated lean-to over the side door
    k.triangles(C.blue, [[[-1.25, 1.05, BZ1], [-.38, 1.05, BZ1], [-.38, .86, BZ1 + .42], [-1.25, .86, BZ1 + .42]]]);
    for (let x = -1.22; x < -.4; x += .06) k.tube(C.blue, [[x, 1.06, BZ1], [x, .87, BZ1 + .42]], .01, 3);
    for (const x of [-1.22, -.41]) k.lathe(C.steel, [[.015, 0], [.015, .83]], x, BZ1 + .4, 6, 0, .03);
    k.shape(C.glass, rect(-1.05, -.6, .03, .78), B, .002);
    for (const x of [-1.1, -.55, .4, .75]) potPlant(k, C.pot, C.leaf, x, BZ1 + .25, 1.3, .03);
    const BS = sideAt(B0, -1), BR = backAt(BZ0);
    for (const z of [-1.3, -1.75]) for (const v of [.4, 1.5]) {k.shape(C.trim, rect(z - .14, z + .14, v, v + .5), BS, .002); k.shape(C.glass, rect(z - .11, z + .11, v + .03, v + .47), BS, .003);}
    for (const x of [-.8, -.1, .5]) for (const v of [.4, 1.5]) {k.shape(C.trim, rect(-x - .16, -x + .16, v, v + .5), BR, .002); k.shape(C.glass, rect(-x - .13, -x + .13, v + .03, v + .47), BR, .003);}
    k.box(C.trim, -.3, .05, 1.2, 1.4, BZ0 - .12, BZ0);
    k.shape(C.glass, ring(.06, 10, .12, 1.3), backAt(BZ0 - .12), .002);
  }

  // the sound stage: pebble-dash base, ledge, smooth upper walls, low roof, green clerestory, big stage door
  k.box(C.rough, S0, S1, .03, 1.02, SZ0, SZ1);
  k.box(C.white, S0 + .03, S1, 1.02, 2.05, SZ0, SZ1 - .03);
  k.box(C.white, S0 - .1, S1, 1.0, 1.06, SZ0, SZ1 + .1);
  k.box(C.white, S0 - .02, S1 + .02, 2.05, 2.12, SZ0 - .02, SZ1 + .02);
  {
    const ry = 2.5, cxr = (S0 + S1) / 2;
    k.triangles(C.trim, [[[S0 - .05, 2.12, SZ1 + .06], [cxr, ry, SZ1 + .06], [cxr, ry, SZ0 - .06], [S0 - .05, 2.12, SZ0 - .06]], [[S1 + .05, 2.12, SZ1 + .06], [cxr, ry, SZ1 + .06], [cxr, ry, SZ0 - .06], [S1 + .05, 2.12, SZ0 - .06]]]);
    for (const z of [SZ1 - .03, SZ0 + .03]) k.triangles(C.white, [[[S0, 2.12, z], [S1, 2.12, z], [cxr, ry - .02, z]]]);
    for (let x = S0 + .1; x < S1; x += .16) {const y = 2.12 + (ry - 2.12) * (1 - Math.abs(x - cxr) / (cxr - S0 + .05)); k.tube(C.trim, [[x, y + .01, SZ1 + .06], [x, y + .01, SZ0 - .06]], .008, 3);}
    // clerestory box with green glazing, as on the yard side
    k.box(C.white, S0 - .14, S0 + .3, 1.75, 2.3, SZ1 - .75, SZ1 - .25);
    const G = sideAt(S0 - .14, -1);
    k.shape(C.green, rect(SZ1 - .7, SZ1 - .3, 1.8, 2.25), G, .003);
    for (const z of [SZ1 - .57, SZ1 - .43]) k.shape(C.steel, rect(z - .008, z + .008, 1.8, 2.25), G, .005);
    for (const v of [1.95, 2.1]) k.shape(C.steel, rect(SZ1 - .7, SZ1 - .3, v - .008, v + .008), G, .005);
    k.tube(C.white, [[S0 - .03, 1.55, SZ1 - .1], [S0 - .03, 1.42, SZ0 + .3]], .02, 5);
    // grey dressing-room doors along the yard side and their steps
    const Y = sideAt(S0, -1);
    for (const z of [.35, -.25, -.85, -1.45]) {k.slab(C.trim, rect(z - .13, z + .13, .03, .82), Y, 0, .015); k.shape(C.door, rect(z - .1, z + .1, .06, .8), Y, .017); k.block(C.trim, .1, .04, .3, S0 - .05, .03, z);}
    for (const z of [.0, -1.15]) {k.shape(C.trim, rect(z - .16, z + .16, 1.25, 1.75), sideAt(S0 + .03, -1), .002); k.shape(C.glass, rect(z - .13, z + .13, 1.28, 1.72), sideAt(S0 + .03, -1), .003); for (const d of [-.1, 0, .1]) k.slab(C.white, rect(z + d + .04, z + d + .06, 1.25, 1.75), sideAt(S0 + .03, -1), 0, .07);}
    // the street end: big sliding stage door on its track, red warning lamp, second SB shield
    const E = frontAt(SZ1);
    k.slab(C.trim, rect(1.6, 2.95, .03, 1.0), E, 0, .012);
    k.slab(C.door, rect(1.65, 2.3, .05, .96), E, .012, .035);
    k.slab(C.door, rect(2.3, 2.9, .05, .96), E, .035, .055);
    for (const u of [1.82, 1.98, 2.14, 2.47, 2.63, 2.78]) k.shape(C.trim, rect(u - .006, u + .006, .07, .94), E, u < 2.3 ? .037 : .057);
    k.box(C.steel, 1.55, 3.0, .98, 1.02, SZ1, SZ1 + .07);
    k.block(C.red, .14, .09, .07, 2.27, 1.17, SZ1 + .07);
    k.block(C.trim, .18, .02, .1, 2.27, 1.26, SZ1 + .07);
    sbShield(k, C, E, 2.3, 1.6, .2, 0);
    for (const z of [-.4, -1.4]) {k.shape(C.trim, rect(-z - .2, -z + .2, 1.3, 1.7), sideAt(S1, 1), .002); k.shape(C.glass, rect(-z - .17, -z + .17, 1.33, 1.67), sideAt(S1, 1), .003);}
    for (const x of [1.6, 2.4]) {k.box(C.trim, x, x + .35, .6, .85, SZ0 - .14, SZ0); k.shape(C.glass, ring(.08, 10, -(x + .17), .72), backAt(SZ0 - .14), .002);}
    k.tube(C.trim, [[S1 + .03, 2.1, SZ0 + .2], [S1 + .03, .05, SZ0 + .2]], .018, 5);
  }
  // the stage's long walls get piers in a steady rhythm, louvred vents high up, and rust streaks run down the hoarding
  for (let z = SZ1 - .25; z > SZ0 + .1; z -= .48) {
    k.block(C.white, .06, 1.98, .09, S1 + .03, .03, z);
    k.shape(C.trim, rect(-z - .12, -z + .12, 1.78, 1.92), sideAt(S1 + .001, 1), 0);
    for (let j = 0; j < 3; j++) k.shape(C.steel, rect(-z - .1, -z + .1, 1.8 + j * .04, 1.815 + j * .04), sideAt(S1 + .002, 1), 0);
  }
  for (const x of [1.7, 2.3, 2.9]) {k.block(C.white, .09, 1.98, .06, x, .03, SZ0 - .03); k.shape(C.door, rect(-x - .12, -x + .12, .05, .7), backAt(SZ0), .002);}
  for (const [x, w] of [[-3.1, .1], [-2.0, .06], [-1.2, .08], [1.3, .07], [2.4, .1], [3.2, .06]]) k.shape(C.pot, [[x - w / 2, .66], [x + w / 2, .66], [x + w * .2, .25], [x - w * .1, .3]], frontAt(FZ + .025), 0);
  // boundary: low wall and wire mesh down both sides and across the back
  for (const [x0, x1, z0, z1] of [[-3.6, -3.53, -2.18, FZ], [3.53, 3.6, -2.18, FZ], [-3.6, 3.6, -2.2, -2.13]]) {
    k.box(C.trim, x0, x1, 0, .24, z0, z1);
    const along = x1 - x0 > .5, L = along ? x1 - x0 : z1 - z0;
    for (let t = 0; t <= L + .001; t += .55) k.lathe(C.zinc2, [[.015, 0], [.015, .66]], along ? x0 + t : (x0 + x1) / 2, along ? (z0 + z1) / 2 : z0 + t, 6, 0, .24);
    for (let t = .07; t < L; t += .07) {const p = along ? [x0 + t, (z0 + z1) / 2] : [(x0 + x1) / 2, z0 + t]; k.box(C.zinc2, p[0] - .003, p[0] + .003, .24, .88, p[1] - .003, p[1] + .003);}
    for (const y of [.5, .88]) k.box(C.zinc2, along ? x0 : x0 + .03, along ? x1 : x0 + .04, y - .006, y + .006, along ? z0 + .03 : z0, along ? z0 + .04 : z1);
  }
  for (const [x, z, s] of [[-3.45, -1.0, 1.4], [3.45, -.6, 1.3], [3.45, -1.5, 1.5], [-.3, -2.05, 1.3]]) {ball(k, C.leaf, .16 * s, x, .25 * s, z, 8, .9); ball(k, C.leaf, .12 * s, x + .06, .38 * s, z + .08, 8, .9);}
  // Block A's back: drip line, vents, air-conditioner and downpipes
  {
    const BKA = sideAt(A0, -1);
    for (let z = AZ1 - .2; z > AZ0; z -= .3) k.shape(C.glass, rect(z - .035, z + .035, .99, 1.06), BKA, .002);
    k.box(C.trim, A0 - .2, A0, .5, .72, -.55, -.15);
    k.shape(C.glass, ring(.08, 10, -.35, .61), sideAt(A0 - .2, -1), .002);
    for (const z of [.95, -.75]) k.tube(C.trim, [[A0 - .03, 1.3, z], [A0 - .03, .05, z]], .016, 5);
  }
  // an old projector on its stand in the yard, a lamp post
  {
    const x = .55, z = .15;
    for (const a of [0, 2.1, 4.2]) k.tube(C.steel, [[x, .62, z], [x + Math.sin(a) * .2, .03, z + Math.cos(a) * .2]], .012, 4);
    k.box(C.glass, x - .12, x + .12, .62, .82, z - .07, z + .07);
    k.lathe(C.steel, [[.035, 0], [.045, .12], [0, .12]], x, z + .07, 8, 0, .66);
    for (const [dz, dy] of [[-.06, .98], [.07, .96]]) {
      const R = sideAt(x + .02, 1, z + dz);
      k.slab(C.steel, ring(.13, 14, 0, dy), R, -.012, .012);
      k.shape(C.glass, ring(.05, 10, 0, dy), R, .014);
      k.shape(C.glass, ring(.05, 10, 0, dy), R, -.014);
      k.tube(C.steel, [[x + .02, .82, z + dz * .5], [x + .02, dy, z + dz]], .01, 4);
    }
    k.lathe(C.steel, [[.04, 0], [.03, .05], [.025, 1.9], [0, 1.92]], -.95, -.55, 8, 0, .03);
    k.block(C.cream, .1, .14, .1, -.95, 1.95, -.55);
    k.lathe(C.steel, [[0, 0], [.08, 0], [.04, .05], [0, .06]], -.95, -.55, 8, 0, 2.09);
  }

  return {
    baseWidth: 7.2, detail: [0, 1.0, .5], overview: [0, 1.25, 0], distance: 11.4, elevation: .3,
    front: FZ + .05, back: -2.15,
    anchors: {
      'left-wing': {position: [-2.4, .9, AZ1 + .09], scale: .62},
      'central-hall': {position: [0, .9, BZ1 + .1], scale: .5},
      'right-wing': {position: [2.27, 1.0, SZ1 + .12], scale: .58},
      'back-envelope': {position: [0, 1.3, -2.3]}, 'front-envelope': {position: [0, 1.0, FZ + .25]},
    },
  };
}

export const BALESTIER_B_STOPS = {'balestier-04': kwanYowLuen, 'balestier-05': waterKiosk, 'balestier-07': jalanAmpas};
