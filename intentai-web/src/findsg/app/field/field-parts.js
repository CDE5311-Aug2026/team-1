/* Hunt (2 Nov 2026): the "fit the parts" stops rebuild the real thing, not generic blocks.
 * Each assembly lists its parts (drawn at a local origin, bottom at y = 0) and where each one belongs. The quest
 * engine draws every part twice: a translucent outline in its place, and a solid piece in the tray in front. Placing
 * a piece lands it exactly on its outline, so the finished stop is the building (or the page, or the postcard).
 * `rests` names the part a piece stands on: a roof cannot go up before the storey under it. */
import {createKit, rect, archShape, ring, onion, frontAt, sideAt} from './field-kit.js';

const PI = Math.PI;
const mat = (color, roughness = .86, extra = {}) => ({color, roughness, ...extra});
export function partPalette() {
  return {
    wall: mat('#efe6d2', .88), trim: mat('#faf5e9', .82), stone: mat('#d2c9b5', .92), granite: mat('#a9a397', .95),
    red: mat('#8f2f22', .7), maroon: mat('#6c2a22', .72), green: mat('#3f6a58', .7), jade: mat('#4d7b60', .55), dark: mat('#2f2a26', .8),
    gold: mat('#c9a35a', .38, {metalness: .7}), tile: mat('#9b4535', .9), white: mat('#f5f1e6', .78), glass: mat('#46524d', .45),
    wood: mat('#8a6446', .85), paper: mat('#efe3c4', .95), ink: mat('#2c3a33', .7), iron: mat('#3b3f3a', .55, {metalness: .5}),
    type: mat('#6d6a62', .5, {metalness: .55}), water: mat('#79aaa5', .25, {metalness: .2}), copper: mat('#6f8c76', .6, {metalness: .5}), blue: mat('#5d7c88', .7),
  };
}
/** every key resolves to the one outline material */
export const ghostPalette = ghost => new Proxy({}, {get: () => ghost});

const faceAt = (a, ap) => (u, v, w = 0) => [Math.sin(a) * (ap + w) + Math.cos(a) * u, v, Math.cos(a) * (ap + w) - Math.sin(a) * u];

/* ---------- Former Keng Teck Whay / Yu Huang Gong, 150 Telok Ayer: square storey, octagonal storey, roof ---------- */
const kengTeck = {
  'square-base'(k, P) {
    k.box(P.granite, -1.28, 1.28, 0, .12, -1.18, 1.18);
    k.box(P.wall, -1.16, 1.16, .12, 1.25, -1.06, 1.06);
    const F = frontAt(1.06);
    k.slab(P.trim, archShape(.34, .5, 12, 0, .12), F, 0, .03);
    k.shape(P.red, archShape(.28, .48, 12, 0, .12), F, .035);
    for (const x of [-.14, .14]) for (const y of [.35, .55, .75]) k.block(P.gold, .035, .035, .012, x, y, 1.1);
    for (const s of [-1, 1]) {
      k.slab(P.trim, ring(.21, 18, s * .7, .74), F, 0, .03);
      k.shape(P.dark, ring(.16, 18, s * .7, .74), F, .034);
      k.shape(P.trim, rect(s * .7 - .01, s * .7 + .01, .58, .9), F, .038); k.shape(P.trim, rect(s * .7 - .16, s * .7 + .16, .73, .75), F, .038);
      const S = sideAt(s * 1.16, s);
      for (const u of [-.45, .45]) {k.slab(P.trim, rect(u - .26, u + .26, .38, .98), S, 0, .025); k.shape(P.green, rect(u - .2, u + .2, .43, .93), S, .03);}
    }
    for (const x of [-1.1, 1.1]) for (const z of [-1, 1]) k.lathe(P.maroon, [[.07, 0], [.07, 1.13]], x, z, 10, 0, .12);
    k.box(P.trim, -1.2, 1.2, 1.2, 1.28, -1.1, 1.1);
    k.hip(P.jade, 0, 0, 2.78, 2.62, 2.2, 2.04, 1.28, .2);
    k.box(P.stone, -1.1, 1.1, 1.42, 1.5, -1.02, 1.02);
    for (let i = -4; i <= 4; i++) for (const z of [-.97, .97]) k.block(P.trim, .04, .12, .04, i * .25, 1.5, z);
    for (let i = -3; i <= 3; i++) for (const x of [-1.05, 1.05]) k.block(P.trim, .04, .12, .04, x, 1.5, i * .27);
    for (const z of [-.97, .97]) k.box(P.trim, -1.07, 1.07, 1.62, 1.66, z - .03, z + .03);
    for (const x of [-1.05, 1.05]) k.box(P.trim, x - .03, x + .03, 1.62, 1.66, -.99, .99);
  },
  'octagon-body'(k, P) {
    const r = .8, ap = r * Math.cos(PI / 8);
    k.lathe(P.stone, [[r + .08, 0], [r + .08, .08]], 0, 0, 8, PI / 8);
    k.lathe(P.wall, [[r, 0], [r, .86]], 0, 0, 8, PI / 8, .08);
    k.lathe(P.trim, [[r + .06, 0], [r + .06, .1]], 0, 0, 8, PI / 8, .9);
    for (let i = 0; i < 8; i++) {
      const F = faceAt(i * PI / 4, ap);
      k.slab(P.trim, archShape(.16, .3, 10, 0, .24), F, 0, .025);
      k.shape(i % 2 ? P.green : P.red, archShape(.12, .3, 10, 0, .27), F, .03);
      const a = PI / 8 + i * PI / 4; k.lathe(P.maroon, [[.045, 0], [.045, .84]], Math.sin(a) * (r + .01), Math.cos(a) * (r + .01), 8, 0, .08);
    }
  },
  roof(k, P) {
    k.lathe(P.trim, [[1.2, 0], [1.2, .06]], 0, 0, 8, PI / 8);
    k.lathe(P.jade, [[1.24, .06], [1.12, .13], [.92, .26], [.6, .46], [.3, .64], [.08, .78]], 0, 0, 8, PI / 8);
    for (let i = 0; i < 8; i++) {const a = PI / 8 + i * PI / 4; k.block(P.gold, .06, .1, .06, Math.sin(a) * 1.22, .08, Math.cos(a) * 1.22, -a);}
    k.lathe(P.gold, [[.1, 0], [.14, .08], [.07, .17], [.12, .25], [.0, .44]], 0, 0, 12, 0, .76);
  },
};

/* ---------- Dalhousie Obelisk, Empress Place: stepped base and pedestal, shaft, pyramidion ---------- */
const obelisk = {
  'square-base'(k, P) {
    [[1.22, 0, .14], [1.0, .14, .28], [.82, .28, .42]].forEach(([h, y0, y1], i) => k.box(i ? P.stone : P.granite, -h, h, y0, y1, -h, h));
    k.box(P.white, -.62, .62, .42, 1.32, -.62, .62);
    k.box(P.trim, -.72, .72, 1.32, 1.42, -.72, .72);
    k.box(P.white, -.52, .52, 1.42, 1.56, -.52, .52);
    for (let i = 0; i < 4; i++) {
      const F = faceAt(i * PI / 2, .62);
      k.slab(P.stone, rect(-.42, .42, .58, 1.18), F, 0, .012);
      for (let j = 0; j < 5; j++) k.shape(P.ink, rect(-.3 + (j % 2) * .04, .3 - (j % 3) * .05, .74 + j * .09, .755 + j * .09), F, .015);
    }
  },
  'octagon-body'(k, P) {
    k.hip(P.white, 0, 0, .9, .9, .5, .5, 0, 3.0);
    k.box(P.trim, -.47, .47, .12, .2, -.47, .47);
  },
  roof(k, P) {
    k.hip(P.white, 0, 0, .5, .5, 0, 0, 0, .44);
    k.box(P.gold, -.255, .255, 0, .03, -.255, .255);
  },
};

/* ---------- Telok Ayer Chinese Methodist Church, 235 Telok Ayer: arcaded block and the Chinese pavilion on its roof ---------- */
const methodist = {
  arcade(k, P) {
    k.box(P.granite, -1.68, 1.68, 0, .1, -1.12, 1.18);
    k.box(P.wall, -1.6, 1.6, .1, 2.0, -1.05, 1.08);
    const F = frontAt(1.08);
    for (const u of [-1.2, -.6, 0, .6, 1.2]) {
      k.slab(P.trim, archShape(.24, .48, 12, u, .1), F, 0, .03);
      k.shape(P.dark, archShape(.19, .46, 12, u, .1), F, .035);
      k.slab(P.trim, archShape(.17, .3, 10, u, 1.25), F, 0, .025);
      k.shape(P.green, archShape(.13, .3, 10, u, 1.28), F, .03);
      k.shape(P.trim, rect(u - .006, u + .006, 1.28, 1.58), F, .034);
    }
    for (const u of [-1.5, -.9, -.3, .3, .9, 1.5]) k.slab(P.trim, rect(u - .05, u + .05, .1, 2.0), F, 0, .045);
    k.box(P.trim, -1.64, 1.64, 1.04, 1.12, -1.09, 1.13);
    for (const s of [-1, 1]) {
      const S = sideAt(s * 1.6, s);
      for (const u of [-.55, 0, .55]) {k.slab(P.trim, archShape(.17, .3, 10, u, 1.25), S, 0, .025); k.shape(P.green, archShape(.13, .3, 10, u, 1.28), S, .03); k.shape(P.dark, archShape(.17, .4, 10, u, .1), S, .02);}
    }
    k.box(P.trim, -1.66, 1.66, 2.0, 2.08, -1.1, 1.14);
    for (let x = -1.56; x <= 1.57; x += .13) k.block(P.trim, .045, .14, .045, x, 2.08, 1.07);
    for (let z = -.98; z <= 1.0; z += .14) for (const x of [-1.56, 1.56]) k.block(P.trim, .045, .14, .045, x, 2.08, z);
    k.box(P.trim, -1.62, 1.62, 2.22, 2.26, 1.03, 1.11);
    for (const x of [-1.6, 1.6]) k.box(P.trim, x - .04, x + .04, 2.22, 2.26, -1.02, 1.1);
    k.box(P.stone, -1.55, 1.55, 2.08, 2.1, -1.0, 1.02);
  },
  roof(k, P) {
    k.box(P.stone, -.72, .72, 0, .1, -.56, .56);
    for (const x of [-.58, -.2, .2, .58]) for (const z of [-.44, .44]) k.lathe(P.red, [[.045, 0], [.045, .55]], x, z, 8, 0, .1);
    k.box(P.red, -.64, .64, .6, .68, -.5, .5);
    k.hip(P.jade, 0, 0, 1.78, 1.48, 1.0, .74, .66, .26);
    k.box(P.wall, -.42, .42, .9, 1.12, -.3, .3);
    for (const u of [-.2, .2]) k.shape(P.red, rect(u - .08, u + .08, .94, 1.08), frontAt(.3), .005);
    k.hip(P.jade, 0, 0, 1.12, .86, .3, 0, 1.1, .42);
    for (const s of [-1, 1]) {k.block(P.gold, .1, .14, .06, s * .16, 1.48, 0); k.block(P.jade, .08, .05, .7, s * .82, .66, 0, s * .4);}
    k.lathe(P.gold, [[.05, 0], [.07, .06], [.03, .12], [.0, .2]], 0, 0, 8, 0, 1.52);
  },
};

/* ---------- Aliwal Arts Centre, former Chong Cheng and Chong Pun schools: two different wings and a shared hall ---------- */
const aliwal = {
  'left-wing'(k, P) {
    k.box(P.granite, -.68, .68, 0, .08, -.86, .86);
    k.box(P.white, -.62, .62, .08, 1.62, -.8, .8);
    const F = frontAt(.8);
    for (const y of [.3, .98]) for (const u of [-.36, 0, .36]) {k.slab(P.trim, rect(u - .13, u + .13, y, y + .44), F, 0, .025); k.shape(P.blue, rect(u - .1, u + .1, y + .03, y + .41), F, .03); k.shape(P.trim, rect(u - .1, u + .1, y + .2, y + .22), F, .034);}
    k.box(P.trim, -.66, .66, .86, .92, -.84, .84);
    k.box(P.trim, -.66, .66, 1.62, 1.72, -.84, .84);
    k.box(P.white, -.86, -.52, .08, 2.02, -.3, .3);
    k.box(P.trim, -.9, -.48, 2.02, 2.1, -.34, .34);
    k.shape(P.blue, rect(-.06, .06, 1.1, 1.8), sideAt(-.86, -1), .005);
  },
  'central-hall'(k, P) {
    k.box(P.granite, -.8, .8, 0, .08, -.98, 1.02);
    k.box(P.wall, -.74, .74, .08, 1.3, -.92, .96);
    const F = frontAt(.96);
    k.slab(P.trim, archShape(.26, .44, 12, 0, .08), F, 0, .03); k.shape(P.dark, archShape(.21, .42, 12, 0, .08), F, .035);
    for (const s of [-1, 1]) {k.slab(P.trim, archShape(.12, .5, 10, s * .48, .25), F, 0, .025); k.shape(P.blue, archShape(.09, .5, 10, s * .48, .28), F, .03);}
    k.slab(P.trim, ring(.13, 16, 0, 1.02), F, 0, .025); k.shape(P.blue, ring(.09, 16, 0, 1.02), F, .03);
    k.triangles(P.wall, [[[-.78, 1.3, .98], [.78, 1.3, .98], [0, 1.72, .98]]]);
    k.triangles(P.trim, [[[-.82, 1.28, 1.0], [.82, 1.28, 1.0], [.82, 1.34, 1.0], [-.82, 1.34, 1.0]]]);
    k.gable(P.tile, 0, .02, 1.62, 2.06, 1.3, .42);
  },
  'right-wing'(k, P) {
    k.box(P.granite, -.68, .68, 0, .08, -.86, .96);
    k.box(P.white, -.62, .62, .08, 1.62, -.8, .6);
    const F = frontAt(.6);
    for (const y of [.3, .98]) for (const u of [-.3, .3]) {k.slab(P.trim, archShape(.13, .26, 10, u, y), F, 0, .025); k.shape(P.green, archShape(.1, .26, 10, u, y + .03), F, .03);}
    for (const x of [-.56, 0, .56]) k.lathe(P.trim, [[.045, 0], [.045, .78]], x, .86, 8, 0, .08);
    k.box(P.trim, -.66, .66, .86, .94, -.84, .94);
    for (let x = -.56; x <= .57; x += .08) k.block(P.trim, .025, .14, .025, x, .94, .9);
    k.box(P.trim, -.66, .66, 1.08, 1.11, .86, .94);
    k.hip(P.tile, 0, -.1, 1.42, 1.62, .5, .7, 1.62, .4);
  },
};

/* ---------- Kampong Gelam press: seven columns locked into a forme ---------- */
const PAGE = {x0: -1.6, x1: 1.6, top: 2.75, mast: 2.25, cw: 3.2 / 7, row: .6, z: .07};
function typeBlock(k, P, w, h, seed) {
  k.box(P.type, -w / 2, w / 2, 0, h, -.06, .06);
  const F = frontAt(.06);
  k.slab(P.ink, rect(-w / 2 + .06, w / 2 - .06, h - .2, h - .08), F, 0, .025);
  let y = h - .28, n = seed;
  while (y > .08) {
    const cols = Math.max(1, Math.round(w / PAGE.cw));
    for (let c = 0; c < cols; c++) {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      const x0 = -w / 2 + .04 + c * (w - .08) / cols, x1 = x0 + (w - .08) / cols - .05 - (n % 5) * .012;
      k.slab(P.iron, rect(x0, x1, y, y + .028), F, 0, .016);
    }
    y -= .062;
  }
}
const press = {
  scenery(k, P) {
    k.box(P.wood, -2.0, 2.0, 0, .1, -.5, .45);
    for (const s of [-1, 1]) k.block(P.wood, .1, 1.4, .1, s * 1.5, .1, -.42, 0);
    k.box(P.iron, -1.78, 1.78, .3, 2.92, -.08, .02);
    k.box(P.paper, PAGE.x0 - .04, PAGE.x1 + .04, .4, PAGE.top + .04, .02, .05);
    k.box(P.ink, PAGE.x0 + .3, PAGE.x1 - .3, PAGE.mast + .18, PAGE.mast + .38, .05, .075);
    k.box(P.ink, PAGE.x0 + .05, PAGE.x1 - .05, PAGE.mast + .06, PAGE.mast + .09, .05, .07);
    for (let c = 1; c < 7; c++) k.box(P.stone, PAGE.x0 + c * PAGE.cw - .006, PAGE.x0 + c * PAGE.cw + .006, .45, PAGE.mast, .05, .058);
    const ad = {x0: PAGE.x0 + 5 * PAGE.cw, x1: PAGE.x1, y0: PAGE.mast - 3 * PAGE.row, y1: PAGE.mast - 2 * PAGE.row};
    k.box(P.type, ad.x0 + .03, ad.x1 - .03, ad.y0 + .03, ad.y1 - .03, .05, .1);
    k.box(P.red, ad.x0 + .14, ad.x1 - .14, ad.y0 + .14, ad.y1 - .14, .1, .12);
  },
  // street life: 3 columns, full depth; schooling: 2 columns, full depth; printing: 2 columns, two rows (an ad sits under it)
  'left-wing'(k, P) {typeBlock(k, P, 3 * PAGE.cw - .03, 3 * PAGE.row - .03, 7);},
  'central-hall'(k, P) {typeBlock(k, P, 2 * PAGE.cw - .03, 3 * PAGE.row - .03, 19);},
  'right-wing'(k, P) {typeBlock(k, P, 2 * PAGE.cw - .03, 2 * PAGE.row - .03, 31);},
};

/* ---------- Burmese Buddhist Temple: three records on a timeline board ---------- */
const burmese = {
  scenery(k, P) {
    k.box(P.wood, -2.35, 2.35, 0, .12, -.55, .4);
    k.box(P.wood, -2.25, 2.25, .12, 1.95, -.16, -.04);
    k.box(P.gold, -2.1, 2.1, .3, .34, -.04, .02);
    for (const x of [-1.45, 0, 1.45]) {k.box(P.paper, x - .62, x + .62, .4, 1.82, -.04, -.02); k.lathe(P.gold, [[.05, 0], [.05, .06]], x, 0, 12, 0, .28);}
    k.box(P.wood, -2.2, 2.2, .36, .42, -.04, .12);
  },
  'left-wing'(k, P) {
    k.box(P.stone, -.42, .42, 0, .08, -.24, .24);
    k.box(P.wall, -.34, .34, .08, .58, -.18, .18);
    k.shape(P.red, archShape(.1, .18, 10, 0, .08), frontAt(.18), .005);
    k.gable(P.tile, 0, 0, .86, .5, .58, .26);
    k.block(P.gold, .05, .12, .05, 0, .84, 0);
  },
  'central-hall'(k, P) {
    k.lathe(P.gold, [[.42, 0], [.42, .08], [.34, .12], [.4, .2], [.26, .26]], 0, 0, 16);
    k.slab(P.gold, ring(.38, 28, 0, .78), frontAt(-.1), 0, .03);
    k.lathe(P.white, [[.24, 0], [.25, .22], [.16, .4], [.06, .56], [.0, .64]], 0, 0, 16, 0, .26);
    k.lathe(P.gold, [[.03, 0], [.03, .1], [.0, .16]], 0, 0, 8, 0, .9);
  },
  'right-wing'(k, P) {
    k.box(P.stone, -.52, .52, 0, .08, -.26, .26);
    k.box(P.white, -.46, .46, .08, .52, -.2, .2);
    for (const u of [-.28, 0, .28]) k.shape(P.red, archShape(.07, .16, 8, u, .12), frontAt(.2), .005);
    let y = .52, w = .98;
    for (let i = 0; i < 4; i++) {k.hip(P.gold, 0, 0, w, .5 - i * .06, w * .7, .36 - i * .05, y, .1); k.box(P.white, -w * .3, w * .3, y + .1, y + .17, -.12, .12); y += .17; w *= .7;}
    k.lathe(P.gold, [[.05, 0], [.02, .22], [.0, .3]], 0, 0, 8, 0, y);
  },
};

/* ---------- Esplanade waterfront: the destination postcard with three cut-outs ---------- */
function drop(r) {const pts = []; for (let i = 0; i < 28; i++) {const t = i / 28 * 2 * PI; pts.push([r * Math.sin(t) * Math.sin(t / 2) * 1.05, r * 1.3 * (Math.cos(t) + 1)]);} return pts;}
const postcard = {
  scenery(k, P) {
    k.box(P.wood, -2.1, 2.1, 0, .1, -.55, .4);
    for (const s of [-1, 1]) k.block(P.wood, .08, 1.5, .08, s * 1.4, .1, -.45, 0);
    k.box(P.paper, -1.9, 1.9, .3, 2.5, -.08, -.02);
    k.box(P.red, -1.9, 1.9, 2.36, 2.44, -.02, .0);
    k.box(P.blue, -1.9, 1.9, 2.3, 2.34, -.02, .0);
    k.box(P.white, 1.28, 1.72, 1.86, 2.22, -.02, .005);
    k.box(P.blue, 1.33, 1.67, 1.91, 2.17, .005, .012);
    for (let i = 0; i < 3; i++) k.box(P.ink, -1.65, -.6 - i * .25, .5 + i * .1, .515 + i * .1, -.02, .0);
    for (const x of [-1.15, 0, 1.15]) k.box(P.stone, x - .5, x + .5, .62, 1.98, -.02, .0);
  },
  'left-wing'(k, P) {
    const oval = ring(.36, 28).map(([u, v]) => [u * .8, v + .5]);
    k.slab(P.gold, oval, frontAt(0), -.04, .02);
    k.slab(P.white, oval.map(([u, v]) => [u * .84, .5 + (v - .5) * .86]), frontAt(0), .02, .035);
    k.slab(P.copper, [[-.1, .2], [.12, .2], [.1, .36], [.17, .44], [.15, .56], [.1, .7], [-.02, .76], [-.13, .66], [-.15, .48], [-.12, .36]], frontAt(0), .035, .06);
  },
  'central-hall'(k, P) {k.slab(P.water, drop(.3).map(([u, v]) => [u, v + .1]), frontAt(0), -.04, .05);},
  'right-wing'(k, P) {
    k.slab(P.stone, rect(-.36, .36, 0, .1), frontAt(0), -.04, .04);
    k.slab(P.copper, rect(-.1, .1, .1, .5), frontAt(0), -.03, .03);
    k.slab(P.copper, [[-.34, .5], [.34, .5], [.24, .6], [-.24, .6]], frontAt(0), -.04, .04);
    k.slab(P.copper, rect(-.06, .06, .6, .86), frontAt(0), -.03, .03);
    k.slab(P.copper, [[-.2, .86], [.2, .86], [.12, .94], [-.12, .94]], frontAt(0), -.035, .035);
    k.slab(P.gold, [[-.05, .94], [.05, .94], [0, 1.12]], frontAt(0), -.02, .02);
    k.slab(P.water, rect(-.3, .3, .1, .16), frontAt(0), .04, .05);
  },
};

const ASSEMBLIES = {
  'telok-ayer-04': {parts: kengTeck, at: {'square-base': [0, 0, 0], 'octagon-body': [0, 1.5, 0], roof: [0, 2.44, 0]}, rests: {'octagon-body': 'square-base', roof: 'octagon-body'}, front: 1.2, height: 3.3},
  'civic-f1-05': {parts: obelisk, at: {'square-base': [0, 0, 0], 'octagon-body': [0, 1.56, 0], roof: [0, 4.56, 0]}, rests: {'octagon-body': 'square-base', roof: 'octagon-body'}, front: 1.25, height: 5.0},
  'telok-ayer-08': {parts: methodist, at: {arcade: [0, 0, 0], roof: [0, 2.1, -.12]}, rests: {roof: 'arcade'}, front: 1.2, height: 3.8},
  'kampong-gelam-03': {parts: aliwal, at: {'left-wing': [-1.48, 0, 0], 'central-hall': [0, 0, .1], 'right-wing': [1.48, 0, 0]}, front: 1.15, height: 2.2},
  'kampong-gelam-07': {parts: press, at: {'left-wing': [PAGE.x0 + 1.5 * PAGE.cw, PAGE.mast - 3 * PAGE.row + .015, PAGE.z], 'central-hall': [PAGE.x0 + 4 * PAGE.cw, PAGE.mast - 3 * PAGE.row + .015, PAGE.z], 'right-wing': [PAGE.x0 + 6 * PAGE.cw, PAGE.mast - 2 * PAGE.row + .015, PAGE.z]}, front: .2, height: 3.0, flat: true},
  'balestier-06': {parts: burmese, at: {'left-wing': [-1.45, .42, .02], 'central-hall': [0, .42, .02], 'right-wing': [1.45, .42, .02]}, front: .2, height: 2.0, flat: true},
  'civic-f1-07': {parts: postcard, at: {'left-wing': [-1.15, .8, .02], 'central-hall': [0, .8, .02], 'right-wing': [1.15, .8, .02]}, front: .2, height: 2.6, flat: true},
};

/** The assembly for a stop, or null to use the generic blocks. Draws one part with a palette into its own kit. */
export function stopAssembly(stopId) {
  const spec = ASSEMBLIES[stopId];
  if (!spec) return null;
  return {
    ...spec,
    has: anchor => typeof spec.parts[anchor] === 'function',
    draw(c, parent, anchor, P) {const k = createKit(); spec.parts[anchor](k, P); const bounds = k.bounds(); const nodes = k.flush(c, parent); return {nodes, bounds};},
    scenery(c, parent, P) {if (!spec.parts.scenery) return []; const k = createKit(); spec.parts.scenery(k, P); return k.flush(c, parent);},
  };
}
