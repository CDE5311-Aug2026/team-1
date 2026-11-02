/* Hunt (2 Nov 2026): bespoke miniatures for stops whose real building must not share a generic model.
 * Each builder draws into a field-kit batch and returns its framing and the semantic anchors the stop puzzles use
 * (positions in model space, the facade normal, and how large a marker the detail can carry).
 * They are interpretive miniatures after public photographs and the Earth Online replicas, not surveys. */
import {createKit, rect, archShape, foilShape, onion, ring, frontAt, backAt, sideAt} from './field-kit.js';
import {PI, mat, semi, crescent, towerFrames, curvedRoof, swallowRidge} from './field-stop-shapes.js';
import {TELOK_STOPS} from './stops/telok.js';
import {KAMPONG_STOPS} from './stops/kampong.js';
import {BALESTIER_A_STOPS} from './stops/balestier-a.js';
import {BALESTIER_B_STOPS} from './stops/balestier-b.js';
import {CIVIC_A_STOPS} from './stops/civic-a.js';
import {CIVIC_B_STOPS} from './stops/civic-b.js';
export {curvedRoof, swallowRidge};


/* ===== Nagore Dargah (1828-30), 140 Telok Ayer Street =====
 * Four fourteen-tier minarets with onion domes at the corners; between the front pair the pierced "miniature
 * palace" facade rising above the flat roof, crowned by domed kiosks; the cusped entrance arch below it;
 * French windows with fanlights between pilasters on the other faces. Front (+z) is Telok Ayer Street. */
function nagore(k, M) {
  const C = {wall: mat('#ece2c6', .9), trim: mat('#f8f4ea', .82), base: mat('#b5ac9a', .95), dark: mat('#3d3530', .8), shut: mat('#6f8f6a', .7), dome: mat('#f4efe2', .55), roof: mat('#c4bba8', .95), acc: mat('#b9cdb5', .8), gold: M.gold};
  const HX = 1.9, HZ = 1.8, T = .37, Y0 = .12, Y1 = 1.58, Y2 = 2.85, YP = 4.3, YT = 5.1;
  k.box(C.base, -HX - .1, HX + .1, 0, Y0, -HZ - .1, HZ + .1);
  k.box(C.wall, -HX + .02, HX - .02, Y0, Y2, -HZ + .02, HZ - .02);
  k.box(C.roof, -HX + .1, HX - .1, Y2 + .17, Y2 + .19, -HZ + .1, HZ - .1);
  const walls = [[frontAt(HZ - .02), HX], [backAt(-HZ + .02), HX], [sideAt(HX - .02, 1), HZ], [sideAt(-HX + .02, -1), HZ]];
  walls.forEach(([F, L], i) => {
    k.slab(C.trim, rect(-L, L, Y1 - .09, Y1 + .05), F, 0, .07);
    k.slab(C.trim, rect(-L, L, Y2, Y2 + .17), F, 0, .14);
    if (i === 0) return;
    k.slab(C.wall, rect(-L + .55, L - .55, Y2 + .17, Y2 + .36), F, -.06, .02);
    for (let u = -L + .78; u <= L - .78 + 1e-6; u += (2 * L - 1.56) / Math.round((2 * L - 1.56) / .33)) {
      k.slab(C.trim, rect(u - .045, u + .045, Y2 + .36, Y2 + .47), F, -.05, .0);
      const p = F(u, 0, -.025); k.lathe(C.dome, [[.045, 0], [.055, .04], [.026, .09], [.004, .135]], p[0], p[2], 8, 0, Y2 + .47);
    }
    // French windows with fanlights in three bays between fluted pilasters
    const span = L - T * 2 - .08, bays = 3, bw = span * 2 / bays;
    for (let b = 0; b < bays; b++) {
      const u = -span + (b + .5) * bw;
      for (const [v0, spring] of [[Y0 + .22, .7], [Y1 + .16, .58]]) {
        k.slab(C.trim, archShape(.22, spring, 10, u, v0 - .04), F, 0, .025);
        k.shape(C.shut, archShape(.17, spring, 10, u, v0), F, .03);
        k.shape(C.dark, semi(.12, u, v0 + spring, 8), F, .034);
        k.shape(C.trim, rect(u - .006, u + .006, v0, v0 + spring), F, .036);
      }
    }
    for (let b = 0; b <= bays; b++) {
      const u = -span + b * bw;
      k.slab(C.trim, rect(u - .055, u + .055, Y0, Y2), F, 0, .045);
      for (const v of [Y1 - .26, Y2 - .2]) k.slab(C.trim, rect(u - .085, u + .085, v, v + .14), F, 0, .075);
    }
  });
  // the front: cusped entrance, flanking doors and pilasters, then the miniature palace above
  {
    const F = frontAt(HZ - .02), w0 = -HX + 2 * T + .02, w1 = -w0;
    k.slab(C.trim, foilShape(.56, .7, 4, 26, 0, Y0), F, 0, .05);
    k.shape(C.dark, foilShape(.45, .66, 4, 26, 0, Y0), F, .055);
    k.shape(C.shut, rect(-.28, .28, Y0, Y0 + .66), F, .06);
    k.shape(C.dark, rect(-.006, .006, Y0, Y0 + .66), F, .065);
    for (const s of [-1, 1]) {
      k.slab(C.trim, archShape(.14, .66, 8, s * .8, Y0 + .16), F, 0, .025);
      k.shape(C.shut, archShape(.1, .66, 8, s * .8, Y0 + .2), F, .03);
      for (const u of [s * .62, s * .98]) {
        k.slab(C.trim, rect(u - .055, u + .055, Y0, Y1 - .09), F, 0, .07);
        k.slab(C.trim, rect(u - .085, u + .085, Y1 - .3, Y1 - .12), F, 0, .095);
      }
    }
    k.slab(C.wall, rect(w0, w1, Y2, YP - .33), F, -.1, .0);
    k.slab(C.acc, rect(w0 + .05, w1 - .05, Y1 + .05, Y1 + .11), F, 0, .08);
    const rows = [[Y1 + .16, .44, 7, 0], [Y1 + .74, .36, 9, 0], [Y2 + .3, .3, 9, 0], [Y2 + .76, .26, 7, 0]];
    for (const [yb, h, n, w] of rows) {
      const span = (w1 - w0) - .16, du = span / n;
      for (let i = 0; i < n; i++) {
        const u = w0 + .08 + (i + .5) * du;
        k.shape(C.dark, foilShape(du * .27, h - du * .3, 3, 12, u, yb), F, w + .006);
        if (i < n - 1) k.slab(C.trim, rect(u + du * .5 - .018, u + du * .5 + .018, yb, yb + h + .03), F, w, w + .035);
      }
      k.slab(C.trim, rect(w0 + .02, w1 - .02, yb - .07, yb - .02), F, w, w + .1);
    }
    k.slab(C.trim, rect(w0 - .02, w1 + .02, YP - .33, YP - .22), F, -.14, .08);
    for (let i = 0; i < 5; i++) {
      const u = w0 + .14 + i * (w1 - w0 - .28) / 4, big = i === 2, r = big ? .17 : .1, p = F(u, 0, -.06), lift = big ? .28 : .2, y0 = YP - .22;
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.block(C.trim, .025, lift, .025, p[0] + dx * r * .72, y0, p[2] + dz * r * .72);
      k.block(C.trim, r * 2.1, .035, r * 2.1, p[0], y0 + lift - .035, p[2]);
      k.lathe(C.dome, onion(r), p[0], p[2], 12, 0, y0 + lift);
      k.lathe(C.gold, [[.012, 0], [.012, .1], [.022, .12], [.0, .15]], p[0], p[2], 6, 0, y0 + lift + r * 2.3);
    }
  }
  // the four minarets
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * (HX - T + .03), cz = sz * (HZ - T + .03), th = (YT - Y0) / 14;
    for (let i = 0; i < 14; i++) {
      const y = Y0 + i * th, hw = T * (1 - .013 * i);
      k.block(i % 2 ? C.wall : C.trim, hw * 2, th - .05, hw * 2, cx, y, cz);
      k.block(C.trim, hw * 2 + .07, .05, hw * 2 + .07, cx, y + th - .05, cz);
      if (i > 0) for (const f of towerFrames(cx, cz, hw)) k.shape(C.dark, archShape(.075, .12, 6, 0, y + .06), f, .004);
    }
    k.lathe(C.trim, [[T * .92, 0], [T * .98, .08], [T * .7, .14]], cx, cz, 8, PI / 8, YT);
    k.lathe(C.dome, onion(T * .78), cx, cz, 16, 0, YT + .14);
    k.lathe(C.gold, [[.02, 0], [.02, .16], [.045, .2], [.0, .27]], cx, cz, 6, 0, YT + .14 + T * .78 * 2.3);
  }
  const zf = HZ - T + .03 + T + .02;
  return {
    baseWidth: 5.5, detail: [0, 2.6, HZ], overview: [0, 2.85, 0], distance: 12.2,
    front: HZ + .02, back: -HZ - .02,
    anchors: {
      'left-tower': {position: [-(HX - T + .03), 2.95, zf + .02], scale: .62},
      'entry-arch': {position: [0, .55, HZ + .1], scale: .7},
      'right-tower': {position: [HX - T + .03, 2.95, zf + .02], scale: .62},
      'back-envelope': {position: [0, 1.6, -HZ - .12]}, 'front-envelope': {position: [0, 1.6, HZ + .22]},
    },
  };
}

/* ===== Masjid Al-Abrar (1850-55, rebuilt 1986), 192 Telok Ayer Street =====
 * The mosque built into the shophouse row: two slender octagonal minarets on square piers framing the centre bay,
 * the five-foot way with two round columns before three round-arched doors, frieze, fretwork balcony and pointed
 * merlons, round-arched louvred windows, red-tiled roofs. The neighbouring shophouses are cut in at both ends,
 * because the five-foot way runs on through them. */
function alAbrar(k, M) {
  const C = {wall: mat('#f1ecdc', .88), trim: mat('#e3dbc4', .85), cream: mat('#ece2c4', .88), back: mat('#d8c69e', .9), door: mat('#26302d', .7),
    roof: mat('#9b4535', .9), roof2: mat('#8a3d2f', .9), gran: mat('#a9a397', .95), pave: mat('#bdb5a5', .95), win: mat('#2c2f2e', .6), gold: M.gold,
    lamp: mat('#fff2cc', .4, {emissive: '#ffd890', emissiveIntensity: .55})};
  const X = 2.35, ZF = 1.7, ZU = 1.31, ZW = 1.19, ZB = -1.6, MX = .93, MZ = ZF - .186;
  k.box(C.pave, -3.75, 3.75, 0, .055, ZW - .02, ZF + .16);
  k.box(C.gran, -X, X, 0, .075, ZB, ZW);
  k.box(C.wall, -X, X, .075, 1.27, ZB, ZW);
  k.box(C.wall, -X, X, 1.27, 2.88, ZB, ZU);
  for (const x of [-X, X - .15]) k.box(C.wall, x, x + .15, .055, 1.27, ZW, ZF);
  for (const s of [-1, 1]) {
    const x = s * .345;
    k.block(C.trim, .21, .14, .21, x, .055, 1.6);
    k.lathe(C.trim, [[.1, 0], [.1, .04], [.075, .07], [.07, .97], [.1, 1.02], [.11, 1.08]], x, 1.6, 12, 0, .195);
  }
  {
    const G = frontAt(ZW);
    for (const [u, hw, spring] of [[0, .255, .78], [-.6, .18, .7], [.6, .18, .7]]) {
      k.slab(C.cream, archShape(hw + .055, spring, 12, u, .075), G, 0, .018);
      k.shape(C.door, archShape(hw, spring, 12, u, .075), G, .022);
      k.shape(C.cream, rect(u - .006, u + .006, .075, .075 + spring), G, .026);
    }
    for (const s of [-1, 1]) {
      const u = s * 1.72;
      k.shape(C.back, rect(u - .52, u + .52, .075, 1.25), G, .006);
      k.shape(C.door, rect(u - .22, u + .22, .075, .85), G, .012);
    }
    for (const x of [-1.68, -.6, .6, 1.68]) k.block(C.lamp, .11, .035, .11, x, 1.205, 1.55);
  }
  {
    const F = frontAt(ZF), U = frontAt(ZU);
    k.box(C.trim, -X, X, 1.245, 1.38, ZW, ZF + .015);
    k.box(C.wall, -X, X, 1.38, 1.725, ZU, ZF);
    for (const [u0, u1] of [[-2.25, -1.17], [-.72, .72], [1.17, 2.25]]) k.slab(C.cream, rect(u0, u1, 1.43, 1.67), F, 0, .012);
    for (const u of [-.96, -.87, .87, .96]) k.block(C.gold, .036, .036, .02, u, 1.53, ZF + .012);
    for (const u of [-.3, .3]) for (const [du, dv] of [[0, .045], [0, -.045], [.045, 0], [-.045, 0]]) k.block(C.gold, .04, .04, .02, u + du, 1.535 + dv, ZF + .015);
    k.box(C.gold, -X, X, 1.374, 1.392, ZF, ZF + .024);
    k.box(C.trim, -X, X, 1.725, 1.8, ZF - .05, ZF + .045);
    const z = ZF + .03;
    k.box(C.door, -X + .09, X - .09, 1.83, 2.025, z - .015, z);
    for (let x = -X + .14; x <= X - .12; x += .078) k.block(C.wall, .027, .195, .036, x, 1.815, z);
    for (const x of [-X + .09, -1.38, -.54, .54, 1.38, X - .09]) k.block(C.wall, .105, .375, .105, x, 1.8, z);
    k.box(C.wall, -X, X, 2.025, 2.07, z - .036, z + .024);
    for (let x = -X + .075; x <= X - .06; x += .15) {k.block(C.wall, .09, .054, .03, x, 2.07, z); k.lathe(C.wall, [[.045, 0], [.033, .036], [.006, .09]], x, z, 4, PI / 4, 2.124);}
    for (const u of [-1.95, -1.47, -.48, 0, .48, 1.47, 1.95]) {
      k.slab(C.cream, archShape(.186, .37, 10, u, 2.09), U, 0, .015);
      k.shape(C.win, archShape(.144, .36, 10, u, 2.12), U, .02);
      for (let j = 0; j < 5; j++) k.slab(C.wall, rect(u - .138, u + .138, 2.17 + j * .066, 2.182 + j * .066), U, .02, .03);
    }
    k.box(C.trim, -X, X, 2.835, 2.88, ZU - .03, ZU + .1);
  }
  k.gable(C.roof, 0, .62, X * 2 + .02, 1.62, 2.86, .58);
  k.gable(C.roof2, 0, -.82, X * 2, 1.6, 2.86, .5);
  for (const x of [-1.05, .06, 1.08]) k.lathe(C.trim, [[.02, 0], [.02, .36]], x, .9, 6, 0, 3.12);
  for (const s of [-1, 1]) {
    const x = s * MX, z = MZ;
    k.block(C.trim, .43, .135, .43, x, .055, z);
    k.block(C.wall, .372, 1.995, .372, x, .075, z);
    for (const y of [1.236, 1.785]) k.block(C.gold, .408, .042, .408, x, y, z);
    k.lathe(C.gold, [[.2, 0], [.2, .045], [.158, .054]], x, z, 8, PI / 8, 2.07);
    k.lathe(C.wall, [[.158, 0], [.138, .81]], x, z, 8, PI / 8, 2.115);
    k.lathe(C.gold, [[.138, 0], [.176, .018], [.176, .078], [.132, .096]], x, z, 8, PI / 8, 2.91);
    k.lathe(C.wall, [[.132, 0], [.102, .74]], x, z, 8, PI / 8, 3.0);
    k.lathe(C.gold, [[.102, 0], [.132, .024], [.132, .075], [.099, .093]], x, z, 8, PI / 8, 3.74);
    k.lathe(C.wall, [[.099, 0], [.075, .105], [.036, .225], [.006, .31]], x, z, 8, PI / 8, 3.833);
    k.lathe(C.gold, [[.011, 0], [.011, .12], [.03, .14], [.006, .17]], x, z, 6, 0, 4.12);
    crescent(k, C.gold, frontAt(z, 0), x, 4.37, .085, .008);
    k.block(C.lamp, .054, .054, .03, x, 2.7, z + .15);
  }
  // the neighbouring shophouses, cut at the edge of the miniature: the five-foot way runs straight through
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -3.75 : X, x1 = s < 0 ? -X : 3.75, cx = (x0 + x1) / 2, w = x1 - x0;
    const wall = mat(s < 0 ? '#d9c49b' : '#bccbb4', .9), trim = mat('#efe6d0', .85), shut = mat(s < 0 ? '#3f6a58' : '#7a5a3c', .7);
    k.box(wall, x0, x1, .055, 1.2, ZB + .25, ZW - .02);
    k.box(wall, x0, x1, 1.2, 2.62, ZB + .25, ZF - .02);
    k.box(trim, x0, x1, 1.13, 1.24, ZF - .14, ZF + .02);
    k.box(trim, x0, x1, 2.55, 2.62, ZF - .06, ZF + .03);
    for (const x of [x0 + .07, cx, x1 - .07]) k.block(trim, .13, 1.08, .13, x, .055, ZF - .07);
    const F = frontAt(ZF - .02);
    for (const u of [cx - w * .25, cx + w * .25]) {
      k.slab(trim, rect(u - .2, u + .2, 1.48, 2.36), F, 0, .02);
      k.shape(shut, rect(u - .16, u + .16, 1.52, 2.32), F, .026);
      k.shape(trim, rect(u - .008, u + .008, 1.52, 2.32), F, .03);
    }
    const G = frontAt(ZW - .02);
    k.shape(shut, rect(cx - .28, cx + .28, .055, .95), G, .01);
    k.gable(mat('#a95a3e', .9), cx, .1, w, 3.6, 2.6, .55);
  }
  return {
    baseWidth: 7.6, detail: [0, 1.6, ZF], overview: [0, 2.0, .3], distance: 11.6, elevation: .12,
    front: ZF + .05, back: ZB - .05,
    anchors: {
      'left-tower': {position: [-MX, 2.62, MZ + .2], scale: .55},
      arcade: {position: [0, .5, ZF + .2], scale: .62},
      'right-tower': {position: [MX, 2.62, MZ + .2], scale: .55},
      'back-envelope': {position: [0, 1.5, ZB - .12]}, 'front-envelope': {position: [0, 1.5, ZF + .24]},
    },
  };
}

/* ===== Thian Hock Keng (1839-42), 158 Telok Ayer Street =====
 * Hokkien temple to Mazu on a granite platform: the entrance hall with its three-section roof (raised centre, lower
 * sides), granite columns before red doors, then the main hall behind with a double-eaved roof. Red tiles, green
 * glazed ridges sagging to the middle and splitting into swallowtails that curl high at both ends. */
function thianHockKeng(k, M) {
  const C = {gran: mat('#a29c91', .95), pave: mat('#c6bfb2', .95), red: mat('#8e2c21', .7), tile: mat('#8a4433', .92), green: mat('#3f7b54', .55), white: mat('#e9e3d6', .9),
    dark: mat('#3a302a', .8), gold: M.gold, lantern: mat('#d8382a', .6, {emissive: '#ff4a22', emissiveIntensity: .35}), blue: mat('#3d6fd0', .6), yellow: mat('#e9c33b', .6)};
  k.box(C.gran, -2.6, 2.6, 0, .25, -2.1, 2.05);
  k.box(C.gran, -.95, .95, 0, .14, 2.05, 2.35);
  k.box(C.pave, -2.2, 2.2, .25, .27, -.1, .85);
  // entrance hall
  k.box(C.white, -2.3, 2.3, .25, 1.45, .9, 1.55);
  k.box(C.gran, -2.32, 2.32, .25, .52, .88, 1.57);
  const F = frontAt(1.55);
  k.slab(C.gran, rect(-.62, .62, .25, 1.3), F, 0, .02);
  k.shape(C.red, rect(-.48, .48, .25, 1.18), F, .025);
  for (const u of [-.24, .24]) {k.shape(C.gold, rect(u - .2, u + .2, .5, 1.1), F, .03); k.shape(C.red, rect(u - .17, u + .17, .53, 1.07), F, .034); k.shape(C.yellow, rect(u - .06, u + .06, .7, .9), F, .036);}
  for (const s of [-1, 1]) {
    k.slab(C.gran, rect(s * 1.2 - .36, s * 1.2 + .36, .25, 1.1), F, 0, .02);
    k.shape(C.red, rect(s * 1.2 - .26, s * 1.2 + .26, .25, 1.0), F, .025);
    k.shape(C.green, ring(.14, 14, s * 1.95, .95), F, .01); k.shape(C.dark, ring(.1, 14, s * 1.95, .95), F, .014);
    for (const x of [s * .78, s * 1.72]) {k.lathe(C.gran, [[.075, 0], [.075, 1.12]], x, 1.85, 10, 0, .25); k.block(C.gran, .18, .08, .18, x, .25, 1.85);}
  }
  for (const x of [-.4, .4]) k.lathe(C.lantern, [[.02, 0], [.09, .05], [.1, .14], [.06, .2], [.0, .21]], x, 1.8, 12, 0, 1.12);
  k.box(C.green, -2.4, 2.4, 1.4, 1.46, 1.55, 2.0);
  curvedRoof(k, C.tile, 0, 1.3, 1.9, 1.7, 1.62, .55, .14, C.white);
  curvedRoof(k, C.tile, -1.6, 1.3, 1.5, 1.6, 1.45, .42, .1, C.white);
  curvedRoof(k, C.tile, 1.6, 1.3, 1.5, 1.6, 1.45, .42, .1, C.white);
  k.box(C.white, -.9, .9, 1.45, 1.66, 1.0, 1.6);
  swallowRidge(k, C.green, 0, 1.3, .78, 2.2, -.05, .34, .042);
  for (const s of [-1, 1]) swallowRidge(k, C.green, s * 1.6, 1.3, .6, 1.9, -.04, .24, .034);
  k.lathe(C.gold, [[.0, 0], [.07, .05], [.0, .13]], 0, 1.3, 12, 0, 2.18);
  [[-.5, C.blue], [-.25, C.yellow], [.25, C.yellow], [.5, C.blue]].forEach(([x, m]) => k.block(m, .07, .09, .05, x, 2.18 + .05 * (x / .78) ** 2, 1.3));
  // main hall behind the courtyard: red columns, double eaves
  k.box(C.white, -1.9, 1.9, .25, 1.6, -1.85, -.35);
  for (const x of [-1.6, -.9, -.3, .3, .9, 1.6]) k.lathe(C.red, [[.06, 0], [.06, 1.35]], x, -.15, 10, 0, .27);
  k.box(C.red, -.5, .5, .27, 1.2, -.36, -.33);
  curvedRoof(k, C.tile, 0, -1.1, 4.5, 2.5, 1.62, .32, .12);
  k.box(C.white, -1.55, 1.55, 1.9, 2.15, -1.6, -.6);
  k.box(C.green, -1.95, 1.95, 1.6, 1.66, -.12, -.06);
  curvedRoof(k, C.tile, 0, -1.1, 3.6, 1.7, 2.15, .62, .16, C.white);
  swallowRidge(k, C.green, 0, -1.1, 1.5, 2.8, -.08, .4, .045);
  k.lathe(C.gold, [[.0, 0], [.1, .07], [.0, .18]], 0, -1.1, 12, 0, 2.76);
  return {
    baseWidth: 5.5, detail: [0, 1.4, 1.5], overview: [0, 1.35, .2], distance: 13.2, elevation: .2, front: 2.0, back: -2.0,
    anchors: {roof: {position: [0, 2.2, 1.3]}, 'back-envelope': {position: [0, 1.4, -2.15]}, 'front-envelope': {position: [0, 1.2, 2.2]}},
    alignPart(kk) {kk.box(C.red, -.6, .6, -.22, 0, -.3, .3); kk.box(C.green, -.68, .68, -.04, .01, -.42, .42); curvedRoof(kk, C.tile, 0, 0, 1.4, 1.0, 0, .32, .1, C.red); swallowRidge(kk, C.green, 0, 0, .58, .36, -.04, .3, .05);},
  };
}

const BUILDERS = {'telok-ayer-03': nagore, 'telok-ayer-05': thianHockKeng, 'telok-ayer-07': alAbrar,
  ...TELOK_STOPS, ...KAMPONG_STOPS, ...BALESTIER_A_STOPS, ...BALESTIER_B_STOPS, ...CIVIC_A_STOPS, ...CIVIC_B_STOPS};

/** Returns null when the stop uses a generic model kind. */
export function buildStopModel(c, parent, stopId, M) {
  const build = BUILDERS[stopId];
  if (!build) return null;
  const k = createKit(), info = build(k, M);
  k.flush(c, parent);
  return info;
}
/* ===== Dial pieces =====
 * The piece that turns with the brass dial, drawn facing the viewer (+z) as it looks when solved. The engine turns it
 * back by the target angle first, so at the start it is edge-on or lying flat and only reads properly when lined up. */
const ALIGN_PARTS = {
  // Malabar Mosque: the gold onion dome on its blue-tiled drum, as a sketch card.
  'kampong-gelam-06'(k) {
    const paper = mat('#efe3c4', .95), gold = mat('#c99b45', .4, {metalness: .6}), blue = mat('#3c6fa8', .6), white = mat('#f1ede2', .85), ink = mat('#2c2117', .8);
    k.box(gold, -.56, .56, -.08, 1.32, -.06, -.02); k.box(paper, -.5, .5, -.02, 1.26, -.05, .0);
    k.box(white, -.36, .36, .04, .24, .02, .3); for (let i = 0; i < 5; i++) k.box(blue, -.32 + i * .16, -.24 + i * .16, .08, .2, .3, .31);
    k.lathe(blue, [[.27, 0], [.27, .16]], 0, .16, 16, 0, .24); k.lathe(gold, [[.29, 0], [.29, .03]], 0, .16, 16, 0, .4);
    k.lathe(gold, onion(.26, .58), 0, .16, 18, 0, .43); k.lathe(gold, [[.025, 0], [.025, .16]], 0, .16, 6, 0, 1.0);
    k.tube(gold, Array.from({length: 9}, (_, i) => {const a = -2.3 + i * 4.6 / 8; return [Math.sin(a) * .07, 1.24 + Math.cos(a) * .07, .16];}), .014, 5);
    k.box(ink, -.44, .44, -.05, -.03, -.01, .01);
  },
  // Balestier: the corner shophouse block, facade with windows and a rounded corner pier; its flank is a blank wall.
  'balestier-04'(k) {
    const wall = mat('#e7d7b0', .88), mint = mat('#9cc4b0', .85), deep = mat('#244c43', .65), tile = mat('#9a5038', .9), ivory = mat('#efe7d4', .85), gold = mat('#bd9860', .4, {metalness: .6});
    k.box(wall, -.6, .1, 0, .95, -.3, .3); k.box(mint, .1, .6, 0, .95, -.3, .3);
    k.lathe(ivory, [[.08, 0], [.08, .95]], .6, .3, 12, 0, 0);
    for (const x of [-.25, .35]) {k.box(deep, x - .14, x + .14, .08, .5, .3, .32); k.box(ivory, x - .2, x + .2, .5, .56, .28, .34);
      for (const u of [-.08, .08]) {k.box(deep, x + u - .05, x + u + .05, .6, .86, .3, .32); k.box(gold, x + u - .005, x + u + .005, .6, .86, .32, .33);}}
    k.box(ivory, -.62, .62, .52, .58, .28, .36);
    k.hip(tile, 0, 0, 1.32, .72, .5, .1, .95, .26);
  },
  // Elgin Bridge benchmark: the broad arrow under a bar, cut in a granite plate.
  'civic-f1-04'(k) {
    const stone = mat('#b9b2a4', .95), cut = mat('#3a332c', .8), brass = mat('#c4a15e', .4, {metalness: .6});
    k.box(brass, -.52, .52, -.37, .37, -.06, -.02); k.box(stone, -.48, .48, -.33, .33, -.04, .04);
    k.box(cut, -.3, .3, .17, .23, .04, .055);
    k.box(cut, -.025, .025, -.25, .12, .04, .055);
    for (const s of [-1, 1]) k.triangles(cut, [[[0, .12, .055], [s * .2, -.18, .055], [s * .25, -.14, .055], [s * .045, .06, .055]]]);
  },
};
/** The dial piece for a stop: its own model's piece first, then the table above. Returns {draw} or null. */
export function stopAlignPart(stopId, model) {
  const draw = model?.alignPart || ALIGN_PARTS[stopId];
  return draw ? {draw} : null;
}
export function drawAlignPart(c, parent, draw) {const k = createKit(); draw(k); k.flush(c, parent);}
export const hasStopModel = stopId => Boolean(BUILDERS[stopId]);
