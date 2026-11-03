/* Hunt: bespoke stop miniatures (see field-stops.js). Civic District, second half: Cavenagh Bridge, the Victoria
 * Theatre and Concert Hall with its clock tower, and the Tan Kim Seng Fountain. Interpretive miniatures after public
 * photographs and the NHB / Roots records, not surveys. */
import {rect, archShape, ring, frontAt, backAt, sideAt} from '../field-kit.js';
import {PI, mat} from '../field-stop-shapes.js';

/* ---- local helpers ---- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm = v => {const l = Math.hypot(...v) || 1; return v.map(x => x / l);};
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** a flat bar from a to b, w wide in the vertical plane through it and t thick across it (eyebars, lattice, cornices) */
function bar(k, m, a, b, w, t, across = [0, 0, 1]) {
  const d = nrm(sub(b, a)); let n = crs(d, across); if (Math.hypot(...n) < 1e-4) n = crs(d, [1, 0, 0]); n = nrm(n);
  const q = nrm(crs(n, d)), P = (p, sn, sq) => [p[0] + n[0] * w / 2 * sn + q[0] * t / 2 * sq, p[1] + n[1] * w / 2 * sn + q[1] * t / 2 * sq, p[2] + n[2] * w / 2 * sn + q[2] * t / 2 * sq];
  const A = [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1)], B = [P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)];
  k.triangles(m, [A.slice().reverse(), B, [A[0], A[1], B[1], B[0]], [A[1], A[2], B[2], B[1]], [A[2], A[3], B[3], B[2]], [A[3], A[0], B[0], B[3]]]);
}
/** an eyebar chain: flat links with a wider head and pin at every joint */
function eyebars(k, m, pin, a, b, step = .3, w = .04, t = .022) {
  bar(k, m, a, b, w, t);
  const d = sub(b, a), n = Math.max(1, Math.round(Math.hypot(...d) / step)), u = nrm(d);
  for (let i = 0; i <= n; i++) {
    const p = a.map((v, j) => v + d[j] * i / n);
    bar(k, m, p.map((v, j) => v - u[j] * .028), p.map((v, j) => v + u[j] * .028), w * 1.75, t * 1.2);
    bar(k, pin, [p[0], p[1], p[2] - t * .8], [p[0], p[1], p[2] + t * .8], .014, .014, [1, 0, 0]);
  }
}
/** polyline version of eyebars (the catenary) */
const chainPath = (k, m, pin, pts, w, t) => pts.slice(1).forEach((p, i) => eyebars(k, m, pin, pts[i], p, 9, w, t));
/** a point turned about a vertical axis through (cx, cz): local x across, z outward */
const hoop = (k, m, r, y, t, n = 32) => k.tube(m, Array.from({length: n + 1}, (_, i) => [Math.sin(i / n * 2 * PI) * r, y, Math.cos(i / n * 2 * PI) * r]), t, 5);
const turn = (cx, y0, cz, a) => (x, y, z) => [cx + x * Math.cos(a) + z * Math.sin(a), y0 + y, cz - x * Math.sin(a) + z * Math.cos(a)];

/* ===== Cavenagh Bridge (1868-69), over the Singapore River between Empress Place and the Fullerton =====
 * The Ordish-Lefeuvre bridge from P. & W. MacLellan of Glasgow: the white-painted iron deck between lattice girders
 * hangs from straight eyebar chains fanning down from four white pylons on granite abutments, with the auxiliary
 * catenary passing over saddles in the pylon crowns to anchorages on the banks. Hanging lamps, the Cavenagh crest
 * plates, the old police notice on the north approach, and the 1880s survey benchmark (a broad arrow under a bar)
 * cut in the north abutment. The river runs front to back; north (Empress Place) is to the left, -x. */
function cavenaghBridge(k, M) {
  const C = {gran: mat('#a9a497', .95), granL: mat('#c3beb1', .92), joint: mat('#7d786e', .95), iron: mat('#f3f2ec', .5, {metalness: .2}),
    pin: mat('#b9bab4', .45, {metalness: .5}), deck: mat('#8e8a83', .92), pave: mat('#cdc5b1', .95), water: mat('#4f8487', .18, {metalness: .3}),
    ripple: mat('#6fa3a3', .25), cut: mat('#2d2a27', .85), black: mat('#22272a', .55, {metalness: .3}), sign: mat('#f6f3e8', .7),
    lamp: mat('#fff0c4', .4, {emissive: '#ffd27a', emissiveIntensity: .6}), grass: mat('#7d9a60', .95), gold: M.gold};
  const RX = 2.55, X1 = 3.8, Z = 2.2, WY = .07, BY = .62, DY = .76, GB = .5, DZ = .7, CZ = .8, TX = 2.55, TT = 2.36, AX = .3;
  // river, quay walls and banks
  k.box(C.water, -RX, RX, 0, WY, -Z, Z);
  for (let i = 0; i < 26; i++) {const x = -2.3 + (i * 1.618 % 1) * 4.6, z = -2.1 + (i * .382 % 1) * 3.6; k.box(C.ripple, x - .012, x + .012, WY, WY + .003, z, z + .25 + (i % 3) * .15);}
  for (const s of [-1, 1]) {
    const xq = s * RX, xo = s * X1, W = sideAt(xq, s);
    k.box(C.gran, Math.min(xq, xo), Math.max(xq, xo), 0, BY, -Z, Z);
    k.box(C.granL, Math.min(xq, xo) - (s < 0 ? 0 : .04), Math.max(xq, xo) + (s < 0 ? .04 : 0), BY - .05, BY + .02, -Z, Z);
    k.box(C.pave, Math.min(xq, xo) + (s < 0 ? 0 : .05), Math.max(xq, xo) - (s < 0 ? .05 : 0), BY + .02, BY + .025, -Z, Z);
    for (let v = WY + .1; v < BY - .06; v += .11) k.shape(C.joint, rect(-Z, Z, v, v + .008), W, .003);
    for (const z0 of [-2.0, 1.3]) k.box(C.grass, s * 3.15 - .3, s * 3.15 + .3, BY + .025, BY + .04, z0, z0 + .7);
    // riverside railing along the quays, clear of the bridge
    for (const [z0, z1] of [[-Z + .05, -1.2], [1.2, Z - .05]]) {
      const x = s * (RX + .08);
      k.box(C.black, x - .012, x + .012, BY + .26, BY + .29, z0, z1);
      for (let z = z0; z <= z1 + 1e-6; z += (z1 - z0) / 5) k.box(C.black, x - .015, x + .015, BY, BY + .29, z - .015, z + .015);
    }
  }
  // granite abutments, rusticated, jutting into the river; the north one carries the benchmark
  for (const s of [-1, 1]) {
    const cx = s * (RX - .065), hw = .385, xi = s * (RX - .45);
    k.box(C.gran, Math.min(s * (RX + .32), xi), Math.max(s * (RX + .32), xi), 0, DY - .02, -1.08, 1.08);
    k.box(C.granL, cx - hw - .03, cx + hw + .03, DY - .06, DY, -1.12, 1.12);
    const F = frontAt(1.08, cx), Bk = backAt(-1.08, cx), R = sideAt(xi, -s);
    for (const W of [F, Bk]) for (let v = WY + .08, r = 0; v < DY - .1; v += .12, r++) {
      k.shape(C.joint, rect(-hw, hw, v, v + .01), W, .003);
      for (let u = -hw + (r % 2 ? .1 : .2); u < hw; u += .2) k.shape(C.joint, rect(u, u + .01, v + .01, v + .12), W, .003);
    }
    for (let v = WY + .08; v < DY - .1; v += .12) k.shape(C.joint, rect(-1.08, 1.08, v, v + .01), R, .003);
    // a plinth course at the waterline, so the abutment reads from the side too
    k.slab(C.granL, rect(-1.1, 1.1, WY, WY + .07), R, 0, .04);
  }
  // the benchmark on the north abutment: a dressed panel, the bar, and the broad arrow pointing up to it
  {
    const F = frontAt(1.08, -RX + .24), v = .38;
    k.slab(C.granL, rect(-.17, .17, v - .24, v + .17), F, 0, .014);
    k.shape(C.cut, rect(-.14, .14, v + .07, v + .1), F, .018);
    k.shape(C.cut, rect(-.014, .014, v - .17, v + .045), F, .018);
    for (const sg of [-1, 1]) k.shape(C.cut, [[0, v + .045], [sg * .02, v + .025], [sg * .125, v - .165], [sg * .105, v - .18]], F, .018);
  }
  // deck, cross girders and the lattice main girders
  k.box(C.deck, -X1 + .25, X1 - .25, DY - .045, DY, -DZ, DZ);
  for (const z of [-DZ + .12, DZ - .12]) k.box(C.pave, -X1 + .25, X1 - .25, DY, DY + .006, z - .015, z + .015);
  for (let x = -2.25; x <= 2.26; x += .375) k.box(C.iron, x - .022, x + .022, GB + .06, DY - .045, -DZ, DZ);
  for (const zs of [-1, 1]) {
    const z = zs * (DZ + .04);
    k.box(C.iron, -RX - .28, RX + .28, GB, DY + .02, z - .035, z + .035);
    k.box(C.iron, -RX - .28, RX + .28, GB - .02, GB + .03, z - .06, z + .06);
    for (let x = -2.4; x <= 2.41; x += .3) k.box(C.iron, x - .012, x + .012, GB + .02, DY, z + zs * .035, z + zs * .05);
    // parapet: posts, rails, diagonal lattice, from end to end
    const y0 = DY + .02, y1 = DY + .3, xa = -X1 + .3, xb = X1 - .3;
    k.box(C.iron, xa, xb, y1, y1 + .035, z - .04, z + .04);
    k.box(C.iron, xa, xb, y0, y0 + .03, z - .03, z + .03);
    k.box(C.iron, xa, xb, (y0 + y1) / 2 - .008, (y0 + y1) / 2 + .008, z - .025, z + .025);
    const n = 44, dx = (xb - xa) / n;
    for (let i = 0; i < n; i++) {
      const x = xa + i * dx;
      bar(k, C.iron, [x, y0 + .03, z], [x + dx, y1, z], .013, .012);
      bar(k, C.iron, [x + dx, y0 + .03, z], [x, y1, z], .013, .012);
      if (i % 4 === 0) k.box(C.iron, x - .02, x + .02, y0, y1 + .05, z - .035, z + .035);
    }
  }
  // the four pylons: granite pedestal, white panelled shaft, crest plate, saddle crown with arches, square ogee cap
  for (const s of [-1, 1]) for (const zs of [-1, 1]) {
    const x = s * TX, z = zs * (CZ + .06), hw = .13;
    k.block(C.granL, .42, .08, .42, x, DY, z); k.block(C.gran, .36, .22, .36, x, DY + .08, z);
    k.block(C.granL, .4, .04, .4, x, DY + .3, z);
    k.block(C.iron, hw * 2, 1.12, hw * 2, x, DY + .34, z);
    const fr = [frontAt(z + hw, x), backAt(z - hw, x), sideAt(x + hw, 1, z), sideAt(x - hw, -1, z)];
    fr.forEach(F => {
      k.slab(C.iron, rect(-hw, hw, DY + .34, DY + .42), F, 0, .025);
      k.slab(C.iron, rect(-.085, .085, DY + .52, DY + 1.3), F, 0, .012);
      k.shape(C.pin, rect(-.06, .06, DY + .55, DY + 1.27), F, .014);
      k.slab(C.iron, rect(-hw, hw, DY + 1.38, DY + 1.46), F, 0, .03);
    });
    k.block(C.iron, .34, .05, .34, x, DY + 1.46, z);
    k.block(C.iron, .3, .3, .3, x, DY + 1.51, z);
    [frontAt(z + .15, x), backAt(z - .15, x), sideAt(x + .15, 1, z), sideAt(x - .15, -1, z)].forEach(F => {
      k.slab(C.iron, archShape(.075, .1, 8, 0, DY + 1.55), F, 0, .006);
      k.shape(C.cut, archShape(.055, .1, 8, 0, DY + 1.57), F, .008);
    });
    k.block(C.iron, .38, .05, .38, x, DY + 1.81, z);
    k.lathe(C.iron, [[.17, 0], [.16, .04], [.11, .08], [.13, .13], [.07, .2], [.02, .24]], x, z, 4, PI / 4, DY + 1.86);
    k.lathe(C.gold, [[.012, 0], [.012, .05], [.035, .07], [.03, .1], [0, .12]], x, z, 8, 0, DY + 2.1);
    // crest plate and hanging lamp on the face toward the deck
    const Fi = zs > 0 ? backAt(z - hw, x) : frontAt(z + hw, x);
    k.shape(C.gold, ring(.055, 14, 0, DY + 1.0).map(([u, v]) => [u, DY + 1.0 + (v - DY - 1.0) * 1.25]), Fi, .016);
    k.shape(C.iron, ring(.035, 12, 0, DY + 1.0), Fi, .02);
    const lz = z - zs * (hw + .02);
    k.tube(C.black, [[x, DY + 1.22, lz], [x, DY + 1.24, lz - zs * .1], [x, DY + 1.2, lz - zs * .17], [x, DY + 1.12, lz - zs * .19]], .008, 4);
    k.lathe(C.black, [[.0, 0], [.03, .01], [.04, .04], [.0, .06]], x, lz - zs * .19, 6, 0, DY + 1.06);
    k.lathe(C.lamp, [[.02, 0], [.034, .02], [.036, .08], [.02, .1]], x, lz - zs * .19, 6, 0, DY + .97);
  }
  // chains in each girder plane: four straight stays from each saddle, two backstays, and the catenary over the saddles
  for (const zs of [-1, 1]) {
    const z = zs * CZ, foot = DY + .06;
    for (const s of [-1, 1]) {
      const top = [s * TX, TT, z];
      for (const d of [.62, 1.3, 2.05]) eyebars(k, C.iron, C.pin, top, [s * (TX - d), foot, z], .4, .052, .026);
      for (const d of [.5, .9]) eyebars(k, C.iron, C.pin, [s * TX, TT - .05, z], [s * (TX + d), foot, z], .4, .048, .024);
    }
    const sag = .86, cat = [];
    for (let i = 0; i <= 16; i++) {const x = -TX + i * TX * 2 / 16; cat.push([x, TT + .1 - sag * (1 - (x / TX) ** 2), z]);}
    chainPath(k, C.iron, C.pin, cat, .036, .02);
    for (let i = 2; i < 15; i += 2) bar(k, C.iron, cat[i], [cat[i][0], DY + .33, z], .01, .01);
    for (const s of [-1, 1]) {
      const a = [s * TX, TT + .1, z], b = [s * (X1 - AX), BY + .1, z];
      eyebars(k, C.iron, C.pin, a, b, .26, .036, .02);
      k.block(C.granL, .26, .14, .26, b[0], BY, z); k.block(C.gran, .2, .06, .2, b[0], BY + .14, z);
    }
  }
  // lamp standards at the approaches and the police notice on the north approach
  for (const s of [-1, 1]) for (const zs of [-1, 1]) {
    const x = s * (X1 - .55), z = zs * 1.05;
    k.block(C.black, .08, .06, .08, x, BY + .025, z);
    k.lathe(C.black, [[.022, 0], [.016, .5], [.026, .53]], x, z, 6, 0, BY + .08);
    k.lathe(C.lamp, [[.03, 0], [.05, .04], [.05, .12], [.03, .15]], x, z, 6, 0, BY + .61);
    k.lathe(C.black, [[.06, 0], [.0, .05]], x, z, 6, 0, BY + .76);
  }
  {
    const x = -X1 + .62, z = 1.55, ry = .35, P = turn(x, BY + .025, z, ry);
    for (const u of [-.16, .16]) {const p = P(u, 0, 0); k.block(C.black, .03, .58, .03, p[0], BY + .025, p[2], ry);}
    const c = P(0, 0, .02); k.block(C.black, .4, .28, .025, c[0], BY + .3, c[2], ry);
    const f = P(0, 0, .035); k.block(C.sign, .36, .24, .01, f[0], BY + .32, f[2], ry);
    const b = P(0, 0, .042);
    k.block(C.black, .2, .025, .006, b[0], BY + .51, b[2], ry);
    for (let i = 0; i < 5; i++) {const w = i === 4 ? .18 : .3; k.block(C.black, w, .012, .006, b[0], BY + .345 + i * .03, b[2], ry);}
  }
  return {
    baseWidth: 7.6, detail: [-RX + .24, .5, 1.1], overview: [0, 1.3, 0], distance: 11.4, elevation: .2,
    front: 1.1, back: -1.1,
    anchors: {
      'entry-arch': {position: [-RX + .24, .38, 1.17], scale: .45},
      'back-envelope': {position: [0, 1.2, -1.0]}, 'front-envelope': {position: [0, 1.2, 1.3]},
    },
    alignPart(kk) {
      kk.box(C.gold, -.54, .54, -.4, .4, -.06, -.02); kk.box(C.gran, -.5, .5, -.36, .36, -.05, .04);
      for (const y of [-.2, 0, .2]) kk.box(C.joint, -.5, .5, y - .006, y + .006, .04, .045);
      kk.box(C.granL, -.34, .34, -.3, .3, .04, .06);
      kk.box(C.cut, -.26, .26, .17, .22, .06, .075);
      kk.box(C.cut, -.022, .022, -.22, .12, .06, .075);
      for (const sg of [-1, 1]) kk.triangles(C.cut, [[[0, .12, .075], [sg * .03, .09, .075], [sg * .2, -.2, .075], [sg * .17, -.23, .075]]]);
    },
  };
}

/* ===== Victoria Theatre and Concert Hall, 9 Empress Place =====
 * Two white Victorian Revival halls joined by the 1906 clock tower: on the left the old Town Hall (1862, now
 * Victoria Theatre), on the right the Victoria Memorial Hall (1905, renamed Victoria Concert Hall in 1979, the old name
 * still in the frieze). Each hall fronts Empress Place with a two-storey arcaded portico under a full-width pediment;
 * arched windows between pilasters run down the long sides. The tower rises from the linking corridor in stages:
 * rusticated base, tall shaft with paired arched lights, the clock stage with four dials under pediments, a balustrade,
 * the open belfry and the cupola. Raffles' statue stands before the Concert Hall. Front (+z) is Empress Place. */
function victoriaHalls(k, M) {
  const C = {wall: mat('#f4f1e8', .86), trim: mat('#fbfaf5', .8), shade: mat('#e2ddd0', .9), base: mat('#b9b3a6', .95), roof: mat('#7d7f80', .8), seam: mat('#909293', .75),
    win: mat('#2f3a40', .45, {metalness: .2}), door: mat('#4a3a2c', .75), dial: mat('#f7f2df', .6), hand: mat('#1f2224', .6), bronze: mat('#4d4a3c', .5, {metalness: .55}),
    pave: mat('#cfc7b4', .95), grass: mat('#7f9c62', .95), gold: M.gold};
  const ZF = 1.25, ZB = -2.0, Y0 = .12, Y1 = .86, Y2 = 1.6, HX = 1.15, PZ = .34;
  k.box(C.pave, -3.3, 3.3, 0, .02, ZF, 2.2);
  k.box(C.grass, -3.2, -2.35, .02, .035, 1.85, 2.15); k.box(C.grass, -1.3, -.55, .02, .035, 1.85, 2.15);
  for (const s of [-1, 1]) {
    const cx = s * 1.95, x0 = cx - HX, x1 = cx + HX;
    k.box(C.base, x0 - .03, x1 + .03, 0, Y0, ZB - .03, ZF + .03);
    k.box(C.wall, x0, x1, Y0, Y2, ZB, ZF);
    k.box(C.shade, x0 - .03, x1 + .03, Y1 - .04, Y1 + .03, ZB - .03, ZF + .03);
    k.box(C.shade, x0 - .02, x1 + .02, Y2 - .1, Y2, ZB - .02, ZF + .02);
    k.box(C.trim, x0 - .07, x1 + .07, Y2, Y2 + .07, ZB - .07, ZF + .07);
    // pitched roof, ridge front to back, with pediments at both ends
    k.hip(C.roof, cx, (ZF + ZB) / 2 - .02, 2 * HX + .1, ZF - ZB, 0, ZF - ZB, Y2 + .07, .56);
    k.tube(C.shade, [[cx, Y2 + .64, ZB], [cx, Y2 + .64, ZF]], .025, 5);
    for (let z = ZB + .2; z < ZF - .1; z += .26) for (const sg of [-1, 1]) bar(k, C.seam, [cx, Y2 + .64, z], [cx + sg * (HX + .05), Y2 + .08, z], .022, .014);
    for (const F of [frontAt(ZF + .03, cx), backAt(ZB - .03, cx)]) {
      const tri = [[-HX - .05, Y2 + .07], [HX + .05, Y2 + .07], [0, Y2 + .62]];
      k.slab(C.wall, tri, F, -.06, .02);
      k.shape(C.shade, [[-HX + .2, Y2 + .14], [HX - .2, Y2 + .14], [0, Y2 + .52]], F, .022);
      for (const sg of [-1, 1]) {const a = F(sg * (HX + .12), Y2 + .05, .04), b = F(0, Y2 + .67, .04); bar(k, C.trim, a, b, .07, .1, [0, 0, 1]);}
      for (const [u, y] of [[0, Y2 + .66], [-HX, Y2 + .1], [HX, Y2 + .1]]) {const p = F(u, 0, 0); k.block(C.trim, .1, .05, .1, p[0], y, p[2]); k.lathe(C.trim, [[.03, 0], [.045, .04], [.035, .08], [.012, .1], [.022, .12], [0, .15]], p[0], p[2], 8, 0, y + .05);}
      // the crest in the tympanum
      k.shape(C.trim, ring(.09, 14, 0, Y2 + .3), F, .028);
      k.shape(C.gold, ring(.06, 12, 0, Y2 + .3), F, .032);
    }
    // front elevation: rusticated corners, arched outer bays, the two-storey portico
    {
      const F = frontAt(ZF, cx);
      for (const sg of [-1, 1]) {
        const u = sg * (HX - .07);
        for (let v = Y0, i = 0; v < Y1 - .05; v += .09, i++) k.slab(C.trim, rect(u - (i % 2 ? .06 : .085), u + (i % 2 ? .06 : .085), v + .006, v + .084), F, 0, .025);
        k.slab(C.trim, rect(u - .06, u + .06, Y1 + .03, Y2 - .1), F, 0, .03);
        k.slab(C.trim, rect(u - .08, u + .08, Y2 - .2, Y2 - .1), F, 0, .045);
        const ub = sg * .84;
        k.slab(C.trim, archShape(.13, .3, 10, ub, Y0 + .2), F, 0, .02); k.shape(C.win, archShape(.1, .3, 10, ub, Y0 + .23), F, .024);
        k.slab(C.trim, rect(ub - .16, ub + .16, Y0 + .17, Y0 + .2), F, 0, .035);
        k.slab(C.trim, archShape(.13, .36, 10, ub, Y1 + .1), F, 0, .02); k.shape(C.win, archShape(.1, .36, 10, ub, Y1 + .13), F, .024);
        k.slab(C.trim, [[ub - .17, Y1 + .62], [ub + .17, Y1 + .62], [ub, Y1 + .7]], F, 0, .04);
        k.slab(C.trim, rect(ub - .15, ub + .15, Y1 + .1, Y1 + .13), F, 0, .04);
      }
      // portico projecting PZ: ground arcade on piers with attached columns, glazed loggia above
      const P = frontAt(ZF + PZ, cx), pw = .62;
      k.box(C.wall, cx - pw, cx + pw, Y0, Y2 - .1, ZF, ZF + PZ);
      k.box(C.base, cx - pw - .04, cx + pw + .04, 0, Y0, ZF, ZF + PZ + .04);
      for (const u of [-.41, 0, .41]) {
        k.slab(C.trim, archShape(.15, .38, 10, u, Y0), P, 0, .015); k.shape(C.door, archShape(.12, .38, 10, u, Y0), P, .018);
        k.shape(C.win, archShape(.08, .1, 8, u, Y0 + .4), P, .02);
        k.slab(C.trim, archShape(.14, .4, 10, u, Y1 + .1), P, 0, .015); k.shape(C.win, archShape(.115, .4, 10, u, Y1 + .1), P, .018);
        for (let j = 0; j < 4; j++) k.shape(C.trim, rect(u - .115, u + .115, Y1 + .18 + j * .1, Y1 + .19 + j * .1), P, .021);
        k.shape(C.trim, rect(u - .006, u + .006, Y1 + .1, Y1 + .55), P, .022);
      }
      for (const u of [-.62, -.205, .205, .62]) {
        const p = P(u, 0, .06);
        k.block(C.trim, .13, .08, .13, p[0], Y0, p[2]);
        k.lathe(C.trim, [[.048, 0], [.044, .58], [.07, .6], [.07, .64]], p[0], p[2], 10, 0, Y0 + .08);
        k.block(C.trim, .12, .06, .12, p[0], Y1 + .04, p[2]);
        k.lathe(C.trim, [[.04, 0], [.036, .52], [.06, .55], [.06, .58]], p[0], p[2], 10, 0, Y1 + .1);
      }
      k.box(C.trim, cx - pw - .06, cx + pw + .06, Y1 - .02, Y1 + .1, ZF, ZF + PZ + .1);
      for (let x = cx - pw + .04; x <= cx + pw - .03; x += .055) k.lathe(C.trim, [[.012, 0], [.02, .05], [.012, .1]], x, ZF + PZ + .075, 5, 0, Y1 + .1);
      k.box(C.trim, cx - pw, cx + pw, Y1 + .2, Y1 + .23, ZF + PZ + .05, ZF + PZ + .1);
      k.box(C.trim, cx - pw - .06, cx + pw + .06, Y2 - .1, Y2 + .07, ZF, ZF + PZ + .1);
      // the frieze name panel: the Concert Hall keeps its old name, the Theatre its own (no lettering, only the band)
      k.box(C.shade, cx - pw + .05, cx + pw - .05, Y2 - .08, Y2 - .01, ZF + PZ + .1, ZF + PZ + .11);
      for (let x = cx - pw + .1; x <= cx + pw - .1; x += .045) k.box(C.gold, x - .012, x + .012, Y2 - .065, Y2 - .025, ZF + PZ + .11, ZF + PZ + .116);
      k.box(C.trim, cx - pw - .02, cx + pw + .02, Y2 + .07, Y2 + .17, ZF + PZ - .02, ZF + PZ + .08);
      for (let x = cx - pw + .03; x <= cx + pw - .02; x += .06) k.lathe(C.trim, [[.012, 0], [.02, .045], [.012, .09]], x, ZF + PZ + .03, 5, 0, Y2 + .17);
      k.box(C.trim, cx - pw - .02, cx + pw + .02, Y2 + .26, Y2 + .29, ZF + PZ - .02, ZF + PZ + .08);
    }
    // long sides: six bays of arched windows on two floors between pilasters
    for (const side of [-1, 1]) {
      const xw = side < 0 ? x0 : x1, F = sideAt(xw, side, (ZF + ZB) / 2), L = (ZF - ZB) / 2, inner = side === -s;
      const n = 6, du = 2 * L / n;
      for (let i = 0; i < n; i++) {
        const u = -L + (i + .5) * du, z = (ZF + ZB) / 2 - u * side;
        if (inner && z > -.75) continue;
        k.slab(C.trim, archShape(.1, .26, 8, u, Y0 + .22), F, 0, .015); k.shape(C.win, archShape(.075, .26, 8, u, Y0 + .25), F, .018);
        k.slab(C.trim, archShape(.11, .34, 8, u, Y1 + .1), F, 0, .015); k.shape(C.win, archShape(.085, .34, 8, u, Y1 + .13), F, .018);
        k.slab(C.trim, rect(u - .13, u + .13, Y1 + .1, Y1 + .13), F, 0, .03);
      }
      for (let i = 0; i <= n; i++) {
        const u = -L + i * du, z = (ZF + ZB) / 2 - u * side;
        if (inner && z > -.75) continue;
        k.slab(C.trim, rect(u - .045, u + .045, Y0, Y2 - .1), F, 0, .025);
      }
    }
    // the back
    {
      const F = backAt(ZB, cx);
      for (const u of [-.75, -.25, .25, .75]) {
        k.slab(C.trim, archShape(.11, .3, 8, u, Y0 + .2), F, 0, .015); k.shape(C.win, archShape(.08, .3, 8, u, Y0 + .23), F, .018);
        k.slab(C.trim, archShape(.11, .34, 8, u, Y1 + .1), F, 0, .015); k.shape(C.win, archShape(.08, .34, 8, u, Y1 + .13), F, .018);
      }
    }
  }
  // linking corridor between the halls, arcaded at the front, balustraded on top
  {
    k.box(C.wall, -.8, .8, Y0, Y2 - .25, -.75, 1.0);
    k.box(C.base, -.8, .8, 0, Y0, -.75, 1.03);
    k.box(C.trim, -.82, .82, Y2 - .25, Y2 - .18, -.77, 1.04);
    const F = frontAt(1.0);
    for (const sg of [-1, 1]) {
      const u = sg * .61;
      k.slab(C.trim, archShape(.13, .36, 10, u, Y0), F, 0, .015); k.shape(C.door, archShape(.105, .36, 10, u, Y0), F, .018);
      k.slab(C.trim, archShape(.1, .26, 8, u, Y1), F, 0, .015); k.shape(C.win, archShape(.075, .26, 8, u, Y1 + .03), F, .018);
      for (let x = sg * .44; Math.abs(x) <= .79; x += sg * .055) k.lathe(C.trim, [[.012, 0], [.02, .045], [.012, .09]], x, .98, 5, 0, Y2 - .18);
      k.box(C.trim, Math.min(sg * .43, sg * .81), Math.max(sg * .43, sg * .81), Y2 - .09, Y2 - .06, .94, 1.02);
    }
  }
  // the clock tower
  const TZ = .62, TH = .43;
  {
    k.box(C.base, -TH - .03, TH + .03, 0, Y0, TZ - TH - .03, TZ + TH + .03);
    k.box(C.wall, -TH, TH, Y0, 1.72, TZ - TH, TZ + TH);
    const fr = h => [frontAt(TZ + h), backAt(TZ - h), sideAt(h, 1, TZ), sideAt(-h, -1, TZ)];
    fr(TH).forEach((F, i) => {
      for (const sg of [-1, 1]) for (let v = Y0, j = 0; v < 1.6; v += .09, j++) k.slab(C.trim, rect(sg * (TH - .06) - (j % 2 ? .05 : .07), sg * (TH - .06) + (j % 2 ? .05 : .07), v + .006, v + .084), F, 0, .022);
      if (i === 0) {
        k.slab(C.trim, archShape(.17, .4, 10, 0, Y0), F, 0, .03); k.shape(C.door, archShape(.13, .4, 10, 0, Y0), F, .034);
        k.slab(C.trim, rect(-.04, .04, Y0 + .48, Y0 + .6), F, 0, .045);
      } else if (i === 1) {k.shape(C.win, archShape(.1, .3, 8, 0, Y0 + .2), F, .004);}
      if (i !== 3 && i !== 2) {k.slab(C.trim, archShape(.1, .3, 8, 0, Y1 + .1), F, 0, .015); k.shape(C.win, archShape(.075, .3, 8, 0, Y1 + .13), F, .018);}
      if (i >= 2) {k.slab(C.trim, archShape(.1, .3, 8, 0, Y2 - .02), F, 0, .015); k.shape(C.win, archShape(.075, .3, 8, 0, Y2 + .01), F, .018);}
    });
    k.box(C.shade, -TH - .03, TH + .03, Y1 - .04, Y1 + .03, TZ - TH - .03, TZ + TH + .03);
    k.box(C.trim, -TH - .06, TH + .06, 1.72, 1.8, TZ - TH - .06, TZ + TH + .06);
    // shaft
    const SH = .38;
    k.box(C.wall, -SH, SH, 1.8, 3.3, TZ - SH, TZ + SH);
    fr(SH).forEach(F => {
      for (const sg of [-1, 1]) k.slab(C.trim, rect(sg * (SH - .05) - .05, sg * (SH - .05) + .05, 1.8, 3.3), F, 0, .03);
      for (const u of [-.1, .1]) {
        k.slab(C.trim, archShape(.075, .55, 8, u, 2.0), F, 0, .012); k.shape(C.win, archShape(.055, .55, 8, u, 2.02), F, .016);
        k.slab(C.trim, archShape(.06, .2, 8, u, 2.82), F, 0, .012); k.shape(C.win, archShape(.042, .2, 8, u, 2.84), F, .016);
      }
      k.slab(C.trim, rect(-.2, .2, 1.96, 2.0), F, 0, .035);
      k.slab(C.trim, rect(-.24, .24, 2.7, 2.76), F, 0, .025);
    });
    k.box(C.trim, -SH - .06, SH + .06, 3.3, 3.38, TZ - SH - .06, TZ + SH + .06);
    // clock stage: four dials under pediments
    const CH = .36;
    k.box(C.wall, -CH, CH, 3.38, 3.98, TZ - CH, TZ + CH);
    fr(CH).forEach(F => {
      for (const sg of [-1, 1]) k.slab(C.trim, rect(sg * (CH - .04) - .04, sg * (CH - .04) + .04, 3.38, 3.98), F, 0, .04);
      const cv = 3.66;
      k.slab(C.gold, ring(.215, 24, 0, cv), F, 0, .03);
      k.shape(C.dial, ring(.19, 24, 0, cv), F, .034);
      for (let n = 0; n < 12; n++) {const a = n * PI / 6, r0 = n % 3 ? .15 : .13; k.shape(C.hand, [[Math.sin(a - .03) * r0, cv + Math.cos(a - .03) * r0], [Math.sin(a + .03) * r0, cv + Math.cos(a + .03) * r0], [Math.sin(a + .02) * .175, cv + Math.cos(a + .02) * .175], [Math.sin(a - .02) * .175, cv + Math.cos(a - .02) * .175]], F, .037);}
      k.shape(C.hand, [[-.012, cv], [.012, cv], [.004, cv + .15], [-.004, cv + .15]], F, .04);
      k.shape(C.hand, [[0, cv - .012], [0, cv + .012], [.1, cv + .056], [.1, cv + .044]].map(([u, v]) => [u * .9 + .0, v]), F, .041);
      k.slab(C.trim, [[-.3, 3.98], [.3, 3.98], [0, 4.13]], F, -.02, .045);
      k.shape(C.shade, [[-.22, 4.0], [.22, 4.0], [0, 4.1]], F, .047);
    });
    k.box(C.trim, -CH - .05, CH + .05, 3.96, 4.03, TZ - CH - .05, TZ + CH + .05);
    // balustrade round the belfry
    for (const sg of [-1, 1]) for (let t = -CH + .04; t <= CH - .03; t += .06) {
      k.lathe(C.trim, [[.011, 0], [.018, .04], [.011, .08]], t, TZ + sg * (CH + .01), 5, 0, 4.03);
      k.lathe(C.trim, [[.011, 0], [.018, .04], [.011, .08]], sg * (CH + .01), TZ + t, 5, 0, 4.03);
    }
    for (const sg of [-1, 1]) {
      k.box(C.trim, -CH - .03, CH + .03, 4.11, 4.14, TZ + sg * (CH + .01) - .025, TZ + sg * (CH + .01) + .025);
      k.box(C.trim, sg * (CH + .01) - .025, sg * (CH + .01) + .025, 4.11, 4.14, TZ - CH - .03, TZ + CH + .03);
      for (const sz of [-1, 1]) k.block(C.trim, .07, .14, .07, sg * (CH + .01), 4.03, TZ + sz * (CH + .01));
    }
    // open belfry, cornice, cupola and finial
    const BH = .24;
    k.box(C.wall, -BH, BH, 4.03, 4.52, TZ - BH, TZ + BH);
    fr(BH).forEach(F => {
      k.shape(C.win, archShape(.11, .22, 10, 0, 4.1), F, .004);
      for (const sg of [-1, 1]) k.slab(C.trim, rect(sg * .2 - .035, sg * .2 + .035, 4.03, 4.52), F, 0, .03);
    });
    k.box(C.trim, -BH - .05, BH + .05, 4.52, 4.58, TZ - BH - .05, TZ + BH + .05);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      k.lathe(C.trim, [[.025, 0], [.035, .03], [.025, .06], [.008, .08], [.016, .1], [0, .13]], sx * (BH + .02), TZ + sz * (BH + .02), 8, 0, 4.58);
      k.lathe(C.trim, [[.03, 0], [.045, .04], [.035, .08], [.01, .11], [.02, .13], [0, .17]], sx * (CH + .01), TZ + sz * (CH + .01), 8, 0, 4.17);
    }
    k.lathe(C.trim, [[.2, 0], [.2, .06], [.17, .06], [.17, .1]], 0, TZ, 16, 0, 4.58);
    k.lathe(C.roof, [[.19, 0], [.18, .07], [.15, .14], [.1, .2], [.04, .24], [0, .25]], 0, TZ, 16, 0, 4.68);
    k.lathe(C.trim, [[.04, 0], [.04, .1], [.055, .11], [.0, .15]], 0, TZ, 8, 0, 4.9);
    k.lathe(C.gold, [[.012, 0], [.012, .14], [.03, .16], [0, .2]], 0, TZ, 6, 0, 5.04);
  }
  // Raffles' statue before the Concert Hall
  {
    const x = 1.95, z = 1.98;
    k.block(C.base, .36, .06, .36, x, .02, z); k.block(C.wall, .26, .36, .26, x, .08, z); k.block(C.trim, .32, .05, .32, x, .44, z);
    k.lathe(C.bronze, [[.07, 0], [.08, .06], [.06, .2], [.055, .3], [.06, .36], [.03, .4]], x, z, 8, 0, .49);
    k.lathe(C.bronze, [[0, 0], [.03, .01], [.035, .04], [.025, .07], [0, .08]], x, z, 8, 0, .89);
    k.tube(C.bronze, [[x - .055, .84, z], [x - .03, .72, z + .05], [x + .03, .72, z + .05]], .018, 5);
    k.tube(C.bronze, [[x + .055, .84, z], [x + .05, .7, z + .03]], .018, 5);
  }
  return {
    baseWidth: 6.6, detail: [0, 2.4, 1.1], overview: [0, 2.3, 0], distance: 13.4, elevation: .2,
    front: ZF + PZ + .1, back: ZB - .08,
    anchors: {
      'left-wing': {position: [-1.95, 1.21, ZF + PZ + .16], scale: .58},
      'central-hall': {position: [0, 2.42, TZ + .38 + .06], scale: .5},
      'right-wing': {position: [1.95, 1.21, ZF + PZ + .16], scale: .58},
      'back-envelope': {position: [0, 1.3, ZB - .12]}, 'front-envelope': {position: [0, 1.3, ZF + PZ + .3]},
    },
  };
}

/* ===== Tan Kim Seng Fountain (1882), Esplanade Park =====
 * Andrew Handyside's Victorian cast-iron fountain, put up to remember Tan Kim Seng's 1857 gift towards a public water
 * supply. An octagonal basin; in it the pedestal with four faces of Poseidon spouting water; above them the four Muses
 * seated round the column (Calliope with her tablet, Clio a scroll, Erato a lyre, Melpomene a wreath) under the wide
 * lower bowl; two smaller tiers above, water falling from every rim, and a robed figure crowning the top. Painted cream
 * with green and gilt. The commemorative tablet is set in the front of the basin kerb. */
function tanKimSengFountain(k, M) {
  const C = {cream: mat('#efe4c8', .6, {metalness: .1}), green: mat('#46695a', .55, {metalness: .2}), gold: M.gold, gran: mat('#a7a296', .95),
    granL: mat('#c4bfb2', .92), water: mat('#5d9497', .3, {metalness: .05}), fall: mat('#b9dbd9', .2, {transparent: true, opacity: .8}),
    dark: mat('#2c2a26', .8), pave: mat('#d3cab6', .95), grass: mat('#7d9b5f', .95), bronze: mat('#5a4a33', .5, {metalness: .5})};
  const A = 1.78, T8 = Math.tan(PI / 8), oct = (r, ph = 0) => Array.from({length: 8}, (_, i) => {const a = ph + PI / 8 + i * PI / 4, R = r / Math.cos(PI / 8); return [Math.sin(a) * R, Math.cos(a) * R];});
  // park apron, lawns, basin kerb with coping, the water
  k.prism(C.pave, oct(2.12), 0, .02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.triangles(C.grass, [[[sx * 2.75, .012, sz * 2.2], [sx * .6, .012, sz * 2.2], [sx * 2.75, .012, sz * .6]]]);
  for (let i = 0; i < 8; i++) {
    const a = i * PI / 4, len = 2 * A * T8;
    k.block(C.gran, len + .02, .3, .16, Math.sin(a) * (A - .08), .0, Math.cos(a) * (A - .08), a);
    k.block(C.granL, (A + .05) * 2 * T8 + .02, .05, .26, Math.sin(a) * (A - .06), .3, Math.cos(a) * (A - .06), a);
    k.block(C.gran, (A + .06) * 2 * T8, .04, .06, Math.sin(a) * (A + .02), .02, Math.cos(a) * (A + .02), a);
  }
  k.prism(C.water, oct(A - .14), 0, .22);
  for (let i = 0; i < 4; i++) {const a = i * PI / 2; k.lathe(C.fall, [[.11, 0], [.07, 0]], Math.sin(a) * 1.18, Math.cos(a) * 1.18, 12, 0, .222);}
  // the memorial tablet in the front of the kerb
  {
    const F = frontAt(A + .0);
    k.slab(C.gold, rect(-.34, .34, .05, .27), F, 0, .012);
    k.shape(C.bronze, rect(-.31, .31, .07, .25), F, .015);
    for (let i = 0; i < 4; i++) k.shape(C.gold, rect(-.24 + (i === 0 ? .06 : 0), .24 - (i === 0 ? .06 : 0), .2 - i * .04, .21 - i * .04), F, .017);
  }
  // pedestal: octagonal, green panels, four faces of Poseidon spouting into the basin
  const PA = .52, face = a => (u, v, w = 0) => turn(0, 0, 0, a)(u, v, PA + w);
  k.lathe(C.cream, [[.74, 0], [.74, .24], [.66, .28], [.6, .32], [.56, .34], [.56, .72], [.62, .74], [.66, .8], [.66, .84]], 0, 0, 8, PI / 8, 0);
  for (let i = 0; i < 8; i++) {
    const a = i * PI / 4, F = face(a);
    k.slab(C.green, rect(-.17, .17, .38, .68), F, 0, .008);
    if (i % 2 === 0) {
      k.slab(C.gold, ring(.085, 14, 0, .55).map(([u, v]) => [u, v + (v > .55 ? (v - .55) * .3 : 0)]), F, .008, .03);
      k.slab(C.gold, [[-.075, .52], [.075, .52], [.03, .4], [0, .37], [-.03, .4]], F, .008, .026);
      k.shape(C.dark, ring(.022, 8, 0, .5), F, .032);
      for (const sg of [-1, 1]) {k.shape(C.dark, ring(.012, 6, sg * .03, .58), F, .032); k.slab(C.gold, rect(sg * .01, sg * .065, .6, .615).map(([u, v]) => [u, v + Math.abs(u) * .25]), F, .02, .036);}
      const jet = []; for (let j = 0; j <= 8; j++) {const t = j / 8; jet.push(turn(0, 0, 0, a)(0, .5 + .06 * t - .34 * t * t, PA + .04 + t * .62));}
      k.tube(C.fall, jet, t => .02 + t * .012, 6);
    } else k.slab(C.cream, ring(.05, 10, 0, .53), F, .008, .02);
  }
  // the ledge, the column, and the four seated Muses at the diagonals
  k.lathe(C.cream, [[.62, 0], [.74, .04], [.74, .09], [.66, .1]], 0, 0, 24, 0, .84);
  k.lathe(C.green, [[.22, 0], [.2, .06], [.17, .1], [.17, .78], [.2, .82], [.24, .86]], 0, 0, 12, 0, .94);
  for (const y of [1.15, 1.45]) k.lathe(C.gold, [[.18, 0], [.185, .03], [.18, .06]], 0, 0, 12, 0, y);
  for (let i = 0; i < 4; i++) muse(k, C, PI / 4 + i * PI / 2, i);
  // lower bowl: green underside, cream lip, gilt rim and drops; water falling from the rim
  const B1 = 1.74;
  k.lathe(C.green, [[.24, 0], [.42, .05], [.72, .13], [.98, .24], [1.06, .29]], 0, 0, 32, 0, B1);
  k.lathe(C.cream, [[1.06, .29], [1.1, .33], [1.1, .37], [1.04, .38], [.98, .33], [.5, .3], [.24, .3]], 0, 0, 32, 0, B1);
  hoop(k, C.gold, 1.1, B1 + .35, .018, 40);
  for (let i = 0; i < 16; i++) {const a = i * PI / 8; k.tube(C.gold, [[.24, 0], [.42, .05], [.72, .13], [.99, .24]].map(([r, h]) => [Math.sin(a) * (r + .012), B1 + h - .012, Math.cos(a) * (r + .012)]), .011, 4);}
  k.lathe(C.water, [[1.0, 0], [0, 0]], 0, 0, 32, 0, B1 + .34);
  for (let i = 0; i < 16; i++) {const a = i * PI / 8; k.lathe(C.gold, [[0, 0], [.03, .015], [.022, .05], [0, .07]], Math.sin(a) * 1.06, Math.cos(a) * 1.06, 6, 0, B1 + .21);}
  for (let i = 0; i < 16; i++) {
    const a = PI / 16 + i * PI / 8, pts = [];
    for (let j = 0; j <= 8; j++) {const t = j / 8, r = 1.11 + .04 * t + .16 * t * t; pts.push([Math.sin(a) * r, B1 + .37 - (B1 + .15) * t * t, Math.cos(a) * r]);}
    k.tube(C.fall, pts, t => .008 + t * .012, 4);
  }
  // middle tier: baluster stem with scroll brackets, the second bowl
  k.lathe(C.cream, [[.2, 0], [.14, .08], [.11, .2], [.16, .32], [.1, .46], [.09, .58], [.14, .64]], 0, 0, 12, 0, B1 + .34);
  k.lathe(C.gold, [[.2, 0], [.24, .04], [.2, .06]], 0, 0, 16, 0, B1 + .34);
  k.lathe(C.gold, [[.13, 0], [.2, .05], [.26, .14], [.22, .15], [.14, .1]], 0, 0, 16, 0, B1 + .82);
  const B2 = B1 + .98;
  k.lathe(C.green, [[.14, 0], [.32, .06], [.52, .15], [.57, .19]], 0, 0, 24, 0, B2);
  k.lathe(C.cream, [[.57, .19], [.59, .22], [.55, .24], [.3, .2], [.14, .2]], 0, 0, 24, 0, B2);
  hoop(k, C.gold, .59, B2 + .21, .013, 28);
  for (let i = 0; i < 12; i++) {const a = i * PI / 6; k.tube(C.gold, [[.14, 0], [.32, .06], [.52, .15]].map(([r, h]) => [Math.sin(a) * (r + .01), B2 + h - .01, Math.cos(a) * (r + .01)]), .008, 4);}
  k.lathe(C.water, [[.53, 0], [0, 0]], 0, 0, 24, 0, B2 + .225);
  for (let i = 0; i < 8; i++) {
    const a = i * PI / 4, pts = [];
    for (let j = 0; j <= 6; j++) {const t = j / 6, r = .6 + .1 * t + .12 * t * t; pts.push([Math.sin(a) * r, B2 + .22 - (B2 + .22 - B1 - .36) * t * t, Math.cos(a) * r]);}
    k.tube(C.fall, pts, t => .008 + t * .01, 4);
  }
  // upper tier and the crowning figure
  k.lathe(C.cream, [[.11, 0], [.08, .1], [.06, .22], [.1, .3], [.07, .38], [.1, .42]], 0, 0, 10, 0, B2 + .22);
  const B3 = B2 + .62;
  k.lathe(C.green, [[.08, 0], [.2, .05], [.3, .1]], 0, 0, 18, 0, B3);
  k.lathe(C.cream, [[.3, .1], [.31, .13], [.27, .14], [.08, .12]], 0, 0, 18, 0, B3);
  hoop(k, C.gold, .31, B3 + .12, .01, 20);
  k.lathe(C.water, [[.27, 0], [0, 0]], 0, 0, 18, 0, B3 + .13);
  for (let i = 0; i < 6; i++) {
    const a = PI / 6 + i * PI / 3, pts = [];
    for (let j = 0; j <= 5; j++) {const t = j / 5, r = .32 + .06 * t + .06 * t * t; pts.push([Math.sin(a) * r, B3 + .13 - (B3 + .13 - B2 - .23) * t * t, Math.cos(a) * r]);}
    k.tube(C.fall, pts, t => .01 + t * .008, 4);
  }
  k.lathe(C.cream, [[.1, 0], [.08, .06], [.07, .14], [.11, .17], [.11, .2]], 0, 0, 10, 0, B3 + .13);
  k.lathe(C.gold, [[.115, 0], [.115, .03]], 0, 0, 10, 0, B3 + .33);
  {
    const y = B3 + .36, P = turn(0, y, 0, 0);
    k.lathe(C.cream, [[.1, 0], [.09, .06], [.07, .2], [.055, .3], [.06, .36], [.045, .41], [.02, .43]], 0, 0, 10, 0, y);
    k.lathe(C.cream, [[0, 0], [.035, .006], [.045, .04], [.036, .075], [0, .09]], 0, 0, 10, 0, y + .43);
    k.tube(C.cream, [P(-.05, .37, 0), P(-.09, .28, .03), P(-.06, .2, .07)], .016, 5);
    k.tube(C.cream, [P(.05, .37, 0), P(.1, .48, .02), P(.11, .6, .02)], .016, 5);
    k.tube(C.gold, [P(.11, .58, .02), P(.11, .7, .02)], .012, 5);
    k.lathe(C.gold, [[0, 0], [.03, .02], [.035, .05], [0, .08]], ...(p => [p[0], p[2]])(P(.11, 0, .02)), 8, 0, y + .7);
  }
  return {
    baseWidth: 5.5, detail: [0, 1.4, 1.2], overview: [0, 1.9, 0], distance: 11.6, elevation: .22,
    front: A + .1, back: -A - .1,
    anchors: {
      'front-envelope': {position: [0, 1.5, A + .3]}, 'back-envelope': {position: [0, 1.4, -A - .25]},
    },
  };
}
/** a seated Muse on the fountain ledge, facing outward along angle a, with her attribute (sizes in units of S) */
function muse(k, C, a, which) {
  const S = 1.22, y = .94, r0 = .36, P = turn(0, y, 0, a), at = (x, yy, z) => P(x * S, yy * S, r0 + z * S);
  const b = (m, w, h, d, x, yy, z, ry = 0) => {const p = at(x, 0, z); k.block(m, w * S, h * S, d * S, p[0], y + yy * S, p[2], a + ry);};
  const L = (m, prof, x, z, seg, yy) => {const p = at(x, 0, z); k.lathe(m, prof.map(([r, h]) => [r * S, h * S]), p[0], p[2], seg, a, y + yy * S);};
  b(C.cream, .17, .08, .24, 0, 0, .1);
  b(C.cream, .16, .3, .07, 0, -.24, .25);
  b(C.cream, .2, .04, .1, 0, -.27, .27);
  L(C.cream, [[.08, 0], [.075, .08], [.06, .17], [.035, .21]], 0, 0, 8, .07);
  L(C.cream, [[0, 0], [.032, .006], [.042, .04], [.034, .075], [0, .09]], 0, 0, 10, .28);
  L(C.cream, [[0, 0], [.025, .01], [.02, .04], [0, .05]], 0, -.03, 6, .35);
  for (const sg of [-1, 1]) k.tube(C.cream, [at(sg * .065, .25, 0), at(sg * .085, .15, .06), at(sg * .045, .13, .15)], .017 * S, 5);
  if (which === 0) b(C.gold, .13, .1, .015, 0, .1, .17, -.2);
  else if (which === 1) k.tube(C.gold, [at(-.09, .14, .16), at(.09, .14, .16)], .022 * S, 8);
  else if (which === 2) {
    const U = []; for (let i = 0; i <= 8; i++) {const t = PI * i / 8; U.push(at(Math.cos(t) * .055, .2 - Math.sin(t) * .09, .17));}
    k.tube(C.gold, U, .009 * S, 4); k.tube(C.gold, [at(-.055, .2, .17), at(.055, .2, .17)], .008 * S, 4);
    k.tube(C.gold, [at(0, .11, .17), at(0, .2, .17)], .006 * S, 4);
  } else {const R = []; for (let i = 0; i <= 12; i++) {const t = i / 12 * 2 * PI; R.push(at(Math.cos(t) * .06, .16 + Math.sin(t) * .06, .17));} k.tube(C.gold, R, .013 * S, 5);}
}

export const CIVIC_B_STOPS = {'civic-f1-04': cavenaghBridge, 'civic-f1-06': victoriaHalls, 'civic-f1-08': tanKimSengFountain};
