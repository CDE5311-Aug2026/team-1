/* Hunt (2 Nov 2026): bespoke stop miniatures for the Kampong Gelam route (see field-stops.js for the contract).
 * Interpretive miniatures after public photographs (Roots.gov.sg, URA conservation portal, Wikimedia Commons), not
 * surveys. Front (+z) is the street each stop is observed from. Every palette is built once per model so each colour
 * is a single draw call. */
import {rect, archShape, pointedShape, onion, frontAt, backAt, sideAt} from '../field-kit.js';
import {PI, mat, semi, crescent} from '../field-stop-shapes.js';

/* ---------- local helpers ---------- */

/** clip a convex polygon to a rectangle (Sutherland-Hodgman) */
function clipRect(poly, u0, u1, v0, v1) {
  const edges = [[p => p[0] >= u0, (a, b) => {const t = (u0 - a[0]) / (b[0] - a[0]); return [u0, a[1] + t * (b[1] - a[1])];}],
    [p => p[0] <= u1, (a, b) => {const t = (u1 - a[0]) / (b[0] - a[0]); return [u1, a[1] + t * (b[1] - a[1])];}],
    [p => p[1] >= v0, (a, b) => {const t = (v0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), v0];}],
    [p => p[1] <= v1, (a, b) => {const t = (v1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), v1];}]];
  let out = poly;
  for (const [inside, cut] of edges) {
    const src = out; out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length], ia = inside(a), ib = inside(b);
      if (ia) out.push(a); if (ia !== ib) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
}
/** the diagonal lozenge grid of glazed tiles laid over a wall rectangle */
function lattice(k, m, F, u0, u1, v0, v1, step, w = .004, lw = .011) {
  const H = v1 - v0, list = [];
  for (const dir of [1, -1]) {
    const lo = dir > 0 ? u0 - H : u0, hi = dir > 0 ? u1 : u1 + H;
    for (let c = Math.ceil(lo / step) * step; c <= hi; c += step) {
      const p = clipRect([[c - lw, v0], [c + lw, v0], [c + lw + dir * H, v1], [c - lw + dir * H, v1]], u0, u1, v0, v1);
      if (p.length > 2) list.push(p.map(([u, v]) => F(u, v, w)));
    }
  }
  k.triangles(m, list);
}
/** the same lattice wound round a cylinder */
function helixLattice(k, m, cx, cz, r, y0, y1, step, lw = .011) {
  const n = Math.max(6, Math.round(2 * PI * r / step)), turns = (y1 - y0) / (2 * PI * r), seg = Math.max(4, Math.ceil((y1 - y0) / .08)), list = [];
  for (const dir of [1, -1]) for (let i = 0; i < n; i++) {
    const a0 = i / n * 2 * PI, P = (t, du) => {const a = a0 + dir * t * turns * 2 * PI + du / r; return [cx + Math.sin(a) * r, y0 + (y1 - y0) * t, cz + Math.cos(a) * r];};
    for (let s = 0; s < seg; s++) list.push([P(s / seg, -lw), P(s / seg, lw), P((s + 1) / seg, lw), P((s + 1) / seg, -lw)]);
  }
  k.triangles(m, list);
}
/** spandrels over a round arch: fills [u-hw, u+hw] x [spring, top] outside the semicircle, with the soffit */
function archFrame(k, m, F, u, hw, cv, top, w0, w1, n = 10) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const a0 = PI - i / n * PI, a1 = PI - (i + 1) / n * PI, p0 = [u + Math.cos(a0) * hw, cv + Math.sin(a0) * hw], p1 = [u + Math.cos(a1) * hw, cv + Math.sin(a1) * hw];
    for (const w of [w0, w1]) list.push([F(p0[0], p0[1], w), F(p1[0], p1[1], w), F(p1[0], top, w), F(p0[0], top, w)]);
    list.push([F(p0[0], p0[1], w0), F(p1[0], p1[1], w0), F(p1[0], p1[1], w1), F(p0[0], p0[1], w1)]);
  }
  k.triangles(m, list);
}
/** a window with louvred timber shutters; head 'flat' | 'arch' | 'pediment' | 'hood' */
function louvred(k, C, F, u, v0, hw, h, w = 0, head = 'flat', shut = C.shut, trim = C.trim) {
  const top = head === 'arch' ? v0 + h - hw : v0 + h;
  k.slab(trim, head === 'arch' ? archShape(hw + .045, h - hw, 10, u, v0 - .03) : rect(u - hw - .045, u + hw + .045, v0 - .03, v0 + h + .045), F, w, w + .018);
  if (head === 'arch') {
    k.shape(C.dark, archShape(hw, h - hw, 10, u, v0), F, w + .02);
    for (let i = 1; i < 4; i++) {const a = i / 4 * PI; k.shape(trim, [[u, top], [u + Math.cos(a - .05) * hw, top + Math.sin(a - .05) * hw], [u + Math.cos(a + .05) * hw, top + Math.sin(a + .05) * hw]], F, w + .024);}
    k.slab(trim, rect(u - hw, u + hw, top - .006, top + .014), F, w + .018, w + .03);
  }
  for (const s of [-1, 1]) k.shape(shut, rect(s < 0 ? u - hw : u + .006, s < 0 ? u - .006 : u + hw, v0, top - .01), F, w + .022);
  for (let v = v0 + .035; v < top - .03; v += .046) k.slab(shut, rect(u - hw + .012, u + hw - .012, v, v + .013), F, w + .022, w + .034);
  k.slab(trim, rect(u - hw - .07, u + hw + .07, v0 - .065, v0 - .025), F, w, w + .05);
  if (head === 'pediment') k.slab(trim, [[u - hw - .09, v0 + h + .045], [u + hw + .09, v0 + h + .045], [u, v0 + h + .17]], F, w, w + .04);
  if (head === 'hood') k.slab(trim, rect(u - hw - .08, u + hw + .08, v0 + h + .045, v0 + h + .085), F, w, w + .06);
}
/** posts between two rails along a wall */
function balustrade(k, m, F, u0, u1, v0, h, w, step = .07, t = .015) {
  k.slab(m, rect(u0, u1, v0, v0 + .035), F, w - .03, w + .03);
  k.slab(m, rect(u0, u1, v0 + h - .03, v0 + h), F, w - .035, w + .035);
  const n = Math.max(1, Math.round((u1 - u0) / step));
  for (let i = 1; i < n; i++) {const u = u0 + i * (u1 - u0) / n; k.slab(m, rect(u - t, u + t, v0 + .035, v0 + h - .03), F, w - t, w + t);}
}
/** a party wall standing proud of a gable roof, in the plane x = const */
function partyWall(k, m, x, zFront, zBack, y0, ridge, t = .05) {
  const zc = (zFront + zBack) / 2;
  k.slab(m, [[-zFront - .03, y0], [-zBack + .03, y0], [-zBack + .03, y0 + .06], [-zc, ridge + .08], [-zFront - .03, y0 + .06]], sideAt(x, 1, 0), -t / 2, t / 2);
}
/** a palm: ringed trunk, green crownshaft, drooping pinnate fronds as V-section ribbons */
function palm(k, trunk, leaf, x, z, h, turn = 0, fronds = 10) {
  k.lathe(trunk, [[.08, 0], [.068, .2], [.058, h * .55], [.052, h - .12], [.058, h]], x, z, 7);
  for (let y = .35; y < h - .2; y += .32) k.lathe(trunk, [[.064 - y / h * .012, 0], [.066 - y / h * .012, .025]], x, z, 7, 0, y);
  k.lathe(leaf, [[.058, 0], [.068, .2], [.04, .36]], x, z, 7, 0, h);
  const list = [];
  for (let i = 0; i < fronds; i++) {
    const a = turn + i / fronds * 2 * PI + (i % 2) * .25, L = .78 + (i % 3) * .14, lift = i % 2 ? .18 : .4, droop = lift + .5 + (i % 3) * .12;
    const dx = Math.sin(a), dz = Math.cos(a), sx = -dz, sz = dx, y0 = h + .3;
    const P = t => [x + dx * L * t, y0 + lift * t - droop * t * t, z + dz * L * t], W = t => .17 * Math.sin(PI * Math.min(.96, .06 + t * .94)) ** .7;
    for (let j = 0; j < 6; j++) {
      const t0 = j / 6, t1 = (j + 1) / 6, p0 = P(t0), p1 = P(t1), w0 = W(t0), w1 = W(t1);
      for (const s of [-1, 1]) list.push([p0, p1, [p1[0] + s * sx * w1, p1[1] - w1 * .45, p1[2] + s * sz * w1], [p0[0] + s * sx * w0, p0[1] - w0 * .45, p0[2] + s * sz * w0]]);
    }
  }
  k.triangles(leaf, list);
}
/** a full Mughal bulb: swells past the drum, then draws in to a short point */
const bulb = (r, h) => [[.94, 0], [1.05, .07], [1.13, .18], [1.15, .3], [1.1, .43], [.97, .56], [.78, .68], [.55, .79], [.34, .87], [.17, .93], [.07, .97], [0, 1]].map(([a, b]) => [a * r, b * h]);
/** frames on the faces of an n-sided drum whose lathe used phase PI/n */
const drumFrame = (cx, cz, ap, a) => (u, v, w = 0) => [cx + Math.sin(a) * (ap + w) + Math.cos(a) * u, v, cz + Math.cos(a) * (ap + w) - Math.sin(a) * u];
/** gold finial with a crescent on top */
function finial(k, gold, x, z, y, s = 1) {
  k.lathe(gold, [[.03 * s, 0], [.03 * s, .05 * s], [.055 * s, .09 * s], [.02 * s, .14 * s], [.035 * s, .18 * s], [.012 * s, .26 * s]], x, z, 8, 0, y);
  crescent(k, gold, frontAt(z, 0), x, y + .33 * s, .075 * s, .008 * s);
  crescent(k, gold, sideAt(x, 1, z), 0, y + .33 * s, .075 * s, .008 * s);
}
/** small open kiosk (chhatri): posts, a slab and an onion dome */
function kiosk(k, post, dome, gold, x, z, y, r, lift = r * 1.1) {
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.block(post, r * .22, lift, r * .22, x + dx * r * .72, y, z + dz * r * .72);
  k.block(post, r * 2.2, r * .2, r * 2.2, x, y + lift, z);
  k.lathe(dome, onion(r, r * 2.1), x, z, 12, 0, y + lift + r * .2);
  k.lathe(gold, [[.012, 0], [.012, r * .5], [.028, r * .62], [0, r * .85]], x, z, 6, 0, y + lift + r * .2 + r * 2.1 - .02);
}
/** a Singapore street-name blade: green with a white border, on its own pole */
function streetSign(k, C, x, z, y, L = .5, H = .11, ry = 0) {
  const F = (u, v, w = 0) => [x + Math.cos(ry) * u + Math.sin(ry) * w, v, z - Math.sin(ry) * u + Math.cos(ry) * w];
  const blade = (l, hh) => [[-l, y], [-l + hh * .6, y - hh], [l - hh * .6, y - hh], [l, y], [l - hh * .6, y + hh], [-l + hh * .6, y + hh]];
  k.slab(C.white, blade(L, H), F, -.012, .012);
  k.slab(C.shut, blade(L - .025, H - .022), F, -.018, .018);
  for (const s of [-1, 1]) k.shape(C.white, rect(-L * .62, L * .62, y - .012, y + .012), F, s * .02);
}

/* ===== Bussorah Street, the old Kampong Kaji stretch (shophouses c.1910s-1920s, pedestrianised 1980s) =====
 * The north row of two-storey conservation shophouses in Bussorah's pastels: piers carrying the upper floor over the
 * five-foot way, timber door and casements below, two louvred windows per bay above between pilasters, cornice,
 * clay-tile gable roofs between party walls, kitchen wings and the back lane behind. Royal palms stand in the paved
 * street; the green street-name blade is at its mouth (front right). At the far end (-x) Sultan Mosque closes the
 * street, its gold dome on the drum with the black band, corner minarets and the domed porch facing down the street.
 * Front (+z) is the street. */
function bussorah(k, M) {
  const C = {pink: mat('#e6b4a5', .88), mint: mat('#b9d5c1', .88), butter: mat('#ecd290', .88), sky: mat('#aac6dc', .88), trim: mat('#f3ebd8', .84),
    dark: mat('#2f2b28', .75), shut: mat('#3d6b53', .7), wood: mat('#7d4b31', .78), tile: mat('#a9563b', .9), pave: mat('#b98e72', .95),
    gran: mat('#a8a296', .95), leaf: mat('#4e7d3b', .8), sand: mat('#e8d6b0', .88), white: mat('#fbf7ee', .7), gold: M.gold};
  const W = 1.3, X0 = -1.45, ZF = .42, ZG = .02, ZB = -1.6, ZK = -2.02, Y1 = 1.18, Y2 = 2.42, walls = [C.pink, C.mint, C.butter, C.sky];
  // the paved street, its stripes of darker pavers, and the five-foot way
  k.box(C.pave, -1.62, 3.78, 0, .03, ZF, 2.18);
  for (let x = -1.3; x < 3.75; x += .55) k.box(C.gran, x, x + .05, .03, .034, ZF + .02, 2.16);
  k.box(C.gran, -1.62, 3.78, 0, .06, ZF - .02, ZF + .1);
  k.box(C.trim, X0, X0 + 4 * W, 0, .06, ZG, ZF);
  for (let x = X0 + .08; x < X0 + 4 * W; x += .16) k.box(x % .32 < .16 ? C.wood : C.trim, x, x + .07, .06, .063, ZG + .05, ZF - .05);
  for (let i = 0; i < 4; i++) {
    const cx = X0 + (i + .5) * W, x0 = cx - W / 2, x1 = cx + W / 2, wall = walls[i], F = frontAt(ZF, cx), G = frontAt(ZG, cx), B = backAt(ZB, cx);
    k.box(wall, x0, x1, .06, Y1, ZB, ZG);
    k.box(wall, x0, x1, Y1, Y2, ZB, ZF);
    k.box(C.trim, x0, x1, Y1 - .07, Y1 + .02, ZG, ZF + .03);
    // ground floor in the five-foot way: double-leaf timber door between two casement windows, fanlight vents above
    k.slab(C.trim, rect(-.2, .2, .06, .92), G, 0, .02);
    k.shape(C.wood, rect(-.16, .16, .06, .86), G, .022);
    for (const s of [-1, 1]) {k.slab(C.wood, rect(s * .08 - .055, s * .08 + .055, .2, .4), G, .022, .032); k.slab(C.wood, rect(s * .08 - .055, s * .08 + .055, .5, .78), G, .022, .032);}
    k.shape(C.dark, rect(-.006, .006, .06, .86), G, .036);
    for (const s of [-1, 1]) {louvred(k, C, G, s * .42, .34, .11, .5, 0, 'flat', i % 2 ? C.shut : C.wood); k.shape(C.dark, rect(s * .42 - .1, s * .42 + .1, .95, 1.03), G, .01);}
    // piers to the street, then the upper floor: pilasters, two louvred windows, panel, cornice
    for (const s of [-1, 1]) {
      const px = cx + s * (W / 2 - .07);
      k.block(wall, .14, Y1 - .06, .16, px, .06, ZF - .08);
      k.block(C.trim, .18, .06, .2, px, .06, ZF - .08); k.block(C.trim, .18, .08, .2, px, Y1 - .2, ZF - .08);
      k.slab(C.trim, rect(s * (W / 2 - .07) - .06, s * (W / 2 - .07) + .06, Y1 + .02, Y2 - .02), F, 0, .025);
      k.slab(C.trim, rect(s * (W / 2 - .07) - .08, s * (W / 2 - .07) + .08, Y2 - .2, Y2 - .1), F, 0, .045);
    }
    const head = ['arch', 'pediment', 'hood', 'arch'][i];
    for (const s of [-1, 1]) louvred(k, C, F, s * .27, Y1 + .22, .15, head === 'arch' ? .8 : .7, 0, head, i === 2 ? C.wood : C.shut);
    k.slab(C.trim, rect(-.08, .08, Y1 + .4, Y1 + .78), F, 0, .012);
    k.slab(C.trim, rect(-W / 2, W / 2, Y2 - .02, Y2 + .05), F, 0, .07);
    k.slab(C.trim, rect(-W / 2, W / 2, Y2 + .05, Y2 + .12), F, 0, .11);
    for (let u = -W / 2 + .06; u < W / 2 - .03; u += .075) k.block(C.trim, .03, .035, .03, cx + u, Y2 - .055, ZF + .085);
    // the clay-tile gable roof between party walls, ridge along the street
    k.gable(C.tile, cx, (ZF + ZB) / 2, W + .02, ZF - ZB + .32, Y2 + .1, .62);
    k.tube(C.tile, [[x0, Y2 + .72, (ZF + ZB) / 2], [x1, Y2 + .72, (ZF + ZB) / 2]], .035, 5);
    partyWall(k, wall, x0, ZF + .16, ZB - .16, Y2 + .08, Y2 + .72);
    // behind: rear wall windows, the kitchen wing with its lean-to roof, a back door
    for (const s of [-1, 1]) louvred(k, C, B, s * .3, 1.45, .12, .55, 0, 'flat', C.wood);
    k.box(wall, x0 + .12, x1 - .12, .06, 1.02, ZK, ZB);
    k.triangles(C.tile, [[[x0 + .06, 1.02, ZK - .1], [x1 - .06, 1.02, ZK - .1], [x1 - .06, 1.32, ZB], [x0 + .06, 1.32, ZB]]]);
    k.slab(C.trim, rect(-.15, .15, .06, .78), backAt(ZK, cx), 0, .015); k.shape(C.wood, rect(-.12, .12, .06, .74), backAt(ZK, cx), .018);
    k.shape(C.dark, rect(.25, .45, .55, .75), backAt(ZK, cx), .01);
  }
  partyWall(k, C.sky, X0 + 4 * W, ZF + .16, ZB - .16, Y2 + .08, Y2 + .72);
  for (const [x, dir, wall] of [[X0 + 4 * W, 1, C.sky], [X0, -1, C.pink]]) {
    const Fs = sideAt(x, dir, (ZF + ZB) / 2);
    for (const u of [-.55, .35]) louvred(k, C, Fs, u, Y1 + .25, .13, .6, 0, 'hood', C.shut);
    louvred(k, C, Fs, -.2, .3, .12, .55, 0, 'hood', C.wood);
    k.slab(C.trim, rect(-(ZF - ZB) / 2, (ZF - ZB) / 2, Y1 - .06, Y1 + .02), Fs, 0, .03);
    k.slab(C.trim, rect(-(ZF - ZB) / 2, (ZF - ZB) / 2, Y2 - .02, Y2 + .08), Fs, 0, .05);
  }
  partyWall(k, C.pink, X0, ZF + .16, ZB - .16, Y2 + .08, Y2 + .72);
  // shop signs on the fascia, a canvas awning, a bench and two street lamps
  for (const [i, m] of [[0, C.shut], [3, C.wood]]) k.box(m, X0 + i * W + .2, X0 + (i + 1) * W - .2, Y1 - .3, Y1 - .12, ZF + .02, ZF + .05);
  {const x0 = X0 + W + .05, x1 = X0 + 2 * W - .05; k.triangles(C.shut, [[[x0, Y1 - .05, ZF + .05], [x1, Y1 - .05, ZF + .05], [x1, .9, ZF + .55], [x0, .9, ZF + .55]]]); k.box(C.white, x0, x1, .86, .9, ZF + .53, ZF + .57);}
  k.box(C.wood, .9, 1.6, .2, .24, 1.08, 1.3); for (const x of [.95, 1.55]) k.box(C.dark, x - .02, x + .02, .03, .2, 1.1, 1.28); k.box(C.wood, .9, 1.6, .24, .4, 1.06, 1.1);
  for (const x of [-.25, 2.95]) {
    k.lathe(C.dark, [[.05, 0], [.05, .08], [.025, .12], [.02, 1.5], [.035, 1.55]], x, 1.95, 8, 0, .03);
    k.block(C.dark, .12, .03, .12, x, 1.58, 1.95); k.block(C.white, .09, .14, .09, x, 1.61, 1.95); k.lathe(C.dark, [[.075, 0], [0, .07]], x, 1.95, 4, PI / 4, 1.75);
  }
  // royal palms down the middle of the street, in granite tree rings
  for (const [x, z, h, t] of [[-.95, 1.42, 3.5, .2], [1.95, 1.48, 3.75, 1.1], [3.15, 1.05, 3.3, 2.2]]) {k.lathe(C.gran, [[.2, 0], [.2, .07], [.15, .07]], x, z, 12, 0, .02); palm(k, C.gran, C.leaf, x, z, h, t);}
  // the street-name blade at the mouth of the street
  k.lathe(C.dark, [[.03, 0], [.03, 1.7]], 3.35, 1.98, 8, 0, .03);
  streetSign(k, C, 3.35, 1.98, 1.62, .46, .1, 0);
  streetSign(k, C, 3.35, 1.98, 1.4, .4, .09, PI / 2);

  // ---- Sultan Mosque closing the street (-x), its front facing down the street (+x) ----
  const MX = -1.66, MB = -3.78, MZ0 = -.95, MZ1 = 2.06, mz = (MZ0 + MZ1) / 2, Gm = sideAt(MX, 1, mz), hz = (MZ1 - MZ0) / 2;
  k.box(C.pave, MB, MX + .04, 0, .03, MZ0, 2.18);
  k.box(C.wood, MB + .02, MX + .02, .03, .2, MZ0 - .02, MZ1 + .02);
  k.box(C.sand, MB + .04, MX, .2, 2.3, MZ0, MZ1);
  for (const y of [1.18, 2.22]) k.box(C.wood, MB + .02, MX + .02, y, y + .08, MZ0 - .02, MZ1 + .02);
  k.box(C.sand, MB + .02, MX + .02, 2.3, 2.42, MZ0 - .02, MZ1 + .02);
  for (let u = -hz + .1; u < hz - .05; u += .15) k.slab(C.sand, [[u - .045, 2.42], [u + .045, 2.42], [u, 2.56]], Gm, -.05, .0);
  // the front: corner bays with pointed windows in two tiers; the tall centre bay with its pink arch and gallery
  for (const s of [-1, 1]) for (const du of [.78, 1.12]) {
    const u = s * du;
    for (const [v0, hh] of [[.42, .58], [1.42, .58]]) {k.slab(C.wood, pointedShape(.09, hh - .12, 6, u, v0 - .03), Gm, 0, .02); k.shape(C.dark, pointedShape(.065, hh - .12, 6, u, v0), Gm, .024);}
  }
  const Gc = sideAt(MX + .22, 1, mz);
  k.box(C.sand, MX, MX + .22, .2, 2.85, mz - .58, mz + .58);
  k.box(C.wood, MX - .02, MX + .25, 2.75, 2.85, mz - .61, mz + .61);
  for (let u = -.52; u <= .53; u += .13) k.slab(C.sand, [[u - .04, 2.85], [u + .04, 2.85], [u, 2.98]], Gc, -.05, .0);
  k.shape(C.pink, pointedShape(.36, 1.3, 8, 0, .92), Gc, .004);
  k.slab(C.wood, pointedShape(.4, 1.3, 8, 0, .9), Gc, -.01, .002);
  for (const u of [-.2, 0, .2]) {k.slab(C.trim, pointedShape(.075, .4, 6, u, 1.55), Gc, .004, .02); k.shape(C.dark, pointedShape(.055, .38, 6, u, 1.57), Gc, .024);}
  balustrade(k, C.trim, Gc, -.34, .34, 1.32, .16, .06, .06, .012);
  k.slab(C.trim, rect(-.36, .36, 1.28, 1.32), Gc, 0, .1);
  for (const s of [-1, 1]) k.slab(C.wood, rect(s * .52 - .05, s * .52 + .05, .2, 2.75), Gc, 0, .02);
  // the domed porch on columns over the entrance
  {
    const px = MX + .58;
    for (const dz of [-.36, .36]) for (const dx of [-.3, .3]) k.lathe(C.white, [[.045, 0], [.045, .7], [.065, .74]], px + dx, mz + dz, 8, 0, .03);
    k.box(C.white, px - .4, px + .4, .77, .86, mz - .46, mz + .46);
    for (let u = -.4; u <= .41; u += .1) k.lathe(C.white, [[.02, 0], [.0, .07]], px + .4, mz + u, 4, 0, .86);
    k.lathe(C.white, [[.36, 0], [.37, .08], [.33, .2], [.24, .32], [.12, .39], [0, .41]], px, mz, 16, 0, .86);
    k.lathe(C.gold, [[.02, 0], [.02, .12], [.04, .15], [0, .2]], px, mz, 6, 0, 1.26);
    k.slab(C.trim, archShape(.27, .45, 10, 0, .03), Gc, 0, .015); k.shape(C.wood, archShape(.22, .43, 10, 0, .03), Gc, .018);
  }
  // corner minarets: octagonal shafts banded in brown, gallery, kiosk with a gilded dome
  for (const z of [MZ0 + .08, MZ1 - .08]) {
    const x = MX - .02;
    k.lathe(C.sand, [[.2, 0], [.2, 2.95], [.18, 3.0], [.17, 3.5]], x, z, 8, PI / 8, .2);
    for (const y of [1.18, 2.22, 2.9]) k.lathe(C.wood, [[.215, 0], [.215, .08]], x, z, 8, PI / 8, y);
    k.lathe(C.trim, [[.17, 0], [.27, .06], [.27, .1], [.2, .12]], x, z, 8, PI / 8, 3.16);
    for (let i = 0; i < 8; i++) k.shape(C.dark, pointedShape(.04, .16, 4, 0, 2.48), drumFrame(x, z, .2 * Math.cos(PI / 8), i * PI / 4), .004);
    kiosk(k, C.sand, C.gold, C.gold, x, z, 3.7, .16, .2);
    finial(k, C.gold, x, z, 4.43, .6);
  }
  // the side to the street (+z) and the rear: pointed windows in two tiers
  for (const [F, L] of [[frontAt(MZ1, (MB + MX) / 2), (MX - MB) / 2], [backAt(MZ0, (MB + MX) / 2), (MX - MB) / 2], [sideAt(MB + .04, -1, mz), hz]]) {
    const n = Math.round(2 * L / .55);
    for (let j = 0; j < n; j++) {const u = -L + (j + .5) * 2 * L / n; for (const v0 of [.45, 1.42]) {k.slab(C.wood, pointedShape(.09, .46, 6, u, v0 - .03), F, 0, .02); k.shape(C.dark, pointedShape(.065, .46, 6, u, v0), F, .024);}}
  }
  // the great dome: octagonal drum with windows, the black band, the gilded onion, finial and crescent
  {
    const dx = (MB + MX) / 2 - .05, dz = mz;
    k.lathe(C.sand, [[.8, 0], [.8, .5], [.86, .54], [.86, .6]], dx, dz, 8, PI / 8, 2.42);
    for (let i = 0; i < 8; i++) k.shape(C.dark, pointedShape(.07, .2, 4, 0, 2.55), drumFrame(dx, dz, .8 * Math.cos(PI / 8), i * PI / 4), .004);
    k.lathe(C.dark, [[.8, 0], [.8, .2], [.76, .22]], dx, dz, 20, 0, 3.02);
    k.lathe(C.gold, bulb(.76, 1.3), dx, dz, 24, 0, 3.2);
    finial(k, C.gold, dx, dz, 4.46, 1.1);
    for (const [ox, oz] of [[-.7, -1.2], [-.7, 1.2]]) kiosk(k, C.sand, C.gold, C.gold, dx + ox, dz + oz, 2.42, .13, .16);
  }

  return {
    baseWidth: 7.6, detail: [.9, 1.5, ZF], overview: [0, 2.1, .1], distance: 12.4, elevation: .2, front: ZF + .1, back: ZK - .05,
    anchors: {'back-envelope': {position: [1.15, 1.62, ZB - .12]}, 'front-envelope': {position: [1.15, 1.6, ZF + .3]}},
  };
}

/* ===== Gedung Kuning, the Yellow Mansion (c.1850s), 73 Sultan Gate =====
 * Two-storey Palladian house in ochre yellow with incised horizontal banding and white trim: the centre bay steps
 * forward and rises higher under its own hipped roof, a flat-roofed porch on two white columns before the entrance,
 * two tall pedimented windows over it; in each wing round-arched windows below and pedimented windows above between
 * pilasters; broad hipped clay-tile roofs with white fascias. The gate piers with eagles and the white boundary wall
 * stand on the Sultan Gate edge. Front (+z) is Sultan Gate. */
function gedungKuning(k, M) {
  const C = {yellow: mat('#dcb04c', .86), groove: mat('#b68c32', .9), trim: mat('#f6f2e6', .82), dark: mat('#2c2b28', .75), shut: mat('#263a33', .7),
    tile: mat('#a9563a', .9), base: mat('#a7a196', .95), pave: mat('#c9c3b6', .95), brick: mat('#b2664a', .92), leaf: mat('#4f7c3d', .8), gold: M.gold, white: mat('#fbfaf5', .65)};
  const X = 2.62, ZF = .82, ZB = -1.25, CX = .9, CF = 1.06, Y0 = .14, Y1 = 1.36, Y2 = 2.5, YC = 2.72;
  k.box(C.pave, -3.75, 3.75, 0, .03, ZF, 2.18);
  k.box(C.brick, -3.75, -1.2, .03, .04, ZF + .7, 2.18); k.box(C.brick, 1.2, 3.75, .03, .04, ZF + .7, 2.18);
  k.box(C.base, -X - .06, X + .06, 0, Y0, ZB - .06, ZF + .06);
  k.box(C.base, -CX - .06, CX + .06, 0, Y0, ZF, CF + .06);
  k.box(C.yellow, -X, X, Y0, Y2, ZB, ZF);
  k.box(C.yellow, -CX, CX, Y0, YC, ZB + .3, CF);
  // incised banding on every face, broken by the trim that is laid over it
  const faces = [[frontAt(ZF, 0), -X, X], [backAt(ZB, 0), -X, X], [sideAt(X, 1, (ZF + ZB) / 2), -(ZF - ZB) / 2, (ZF - ZB) / 2], [sideAt(-X, -1, (ZF + ZB) / 2), -(ZF - ZB) / 2, (ZF - ZB) / 2]];
  for (const [F, u0, u1] of faces) for (let v = Y0 + .14; v < Y2 - .12; v += .11) if (Math.abs(v - Y1) > .08) k.shape(C.groove, rect(u0, u1, v, v + .014), F, .003);
  const FC = frontAt(CF, 0);
  for (let v = Y0 + .14; v < YC - .12; v += .11) if (Math.abs(v - Y1) > .08) k.shape(C.groove, rect(-CX, CX, v, v + .014), FC, .003);
  for (const s of [-1, 1]) for (let v = Y0 + .14; v < YC - .12; v += .11) if (Math.abs(v - Y1) > .08) k.shape(C.groove, rect(-.12, .12, v, v + .014), sideAt(s * CX, s, ZF + .12), .003);
  // string course and cornices
  k.box(C.trim, -X - .04, X + .04, Y1 - .05, Y1 + .05, ZB - .04, ZF + .04);
  k.box(C.trim, -CX - .04, CX + .04, Y1 - .05, Y1 + .05, ZF, CF + .04);
  k.box(C.trim, -X - .05, X + .05, Y2 - .14, Y2, ZB - .05, ZF + .05);
  k.box(C.trim, -CX - .05, CX + .05, YC - .16, YC, ZB + .25, CF + .05);
  // wings: pilasters at the corners and between the bays, arched windows below, pedimented windows above
  const F = frontAt(ZF, 0);
  for (const s of [-1, 1]) {
    for (const u of [s * (X - .07), s * (CX + .08), s * 1.72]) {
      k.slab(C.trim, rect(u - .065, u + .065, Y0, Y1 - .05), F, 0, .03);
      k.slab(C.trim, rect(u - .06, u + .06, Y1 + .05, Y2 - .14), F, 0, .03);
      k.slab(C.trim, rect(u - .085, u + .085, Y2 - .3, Y2 - .2), F, 0, .05);
    }
    for (const u of [s * 1.3, s * 2.17]) {
      louvred(k, C, F, u, .36, .16, .78, 0, 'arch');
      louvred(k, C, F, u, Y1 + .22, .16, .68, 0, 'pediment');
    }
  }
  // centre bay: quoins, two tall pedimented windows, the entrance behind the porch
  for (const s of [-1, 1]) {
    k.slab(C.trim, rect(s * CX - .08 * s - .07, s * CX - .08 * s + .07, Y0, YC - .16), FC, 0, .035);
    louvred(k, C, FC, s * .36, Y1 + .2, .17, .82, 0, 'pediment');
  }
  k.slab(C.trim, rect(-.34, .34, Y0, 1.08), FC, 0, .02); k.shape(C.dark, rect(-.28, .28, Y0, 1.02), FC, .022);
  for (const u of [-.14, .14]) k.slab(C.trim, rect(u - .006, u + .006, Y0, 1.02), FC, .022, .03);
  for (let i = 0; i < 4; i++) k.slab(C.trim, rect(-.28, .28, .3 + i * .2, .31 + i * .2), FC, .022, .028);
  // the porch: two white Tuscan columns, pilasters, a flat roof with cornice and balustrade, steps
  {
    const z1 = CF + .62;
    k.box(C.base, -.78, .78, 0, Y0 + .04, CF, z1 + .08); k.box(C.base, -.6, .6, 0, .08, z1 + .08, z1 + .22);
    for (const s of [-1, 1]) {
      k.block(C.trim, .17, .06, .17, s * .62, Y0 + .04, z1 - .06);
      k.lathe(C.white, [[.07, 0], [.062, 1.0], [.075, 1.03], [.075, 1.06]], s * .62, z1 - .06, 12, 0, Y0 + .1);
      k.block(C.trim, .17, .05, .17, s * .62, Y0 + 1.16, z1 - .06);
      k.slab(C.trim, rect(s * .62 - .07, s * .62 + .07, Y0, Y1 - .1), FC, 0, .03);
    }
    k.box(C.trim, -.8, .8, Y1 - .16, Y1 - .02, CF, z1 + .06);
    k.box(C.white, -.84, .84, Y1 - .02, Y1 + .04, CF, z1 + .1);
    balustrade(k, C.white, frontAt(z1 + .02, 0), -.76, .76, Y1 + .04, .22, 0, .08, .014);
    for (const s of [-1, 1]) balustrade(k, C.white, sideAt(s * .76, s, (CF + z1) / 2), -(z1 - CF) / 2, (z1 - CF) / 2, Y1 + .04, .22, 0, .08, .014);
    // the house emblem disc over the porch
    const E = frontAt(z1 + .08, 0); k.slab(C.shut, Array.from({length: 18}, (_, i) => [Math.sin(i / 18 * 2 * PI) * .12, Y1 - .09 + Math.cos(i / 18 * 2 * PI) * .12]), E, 0, .02);
    for (let i = 0; i < 8; i++) {const a = i / 8 * PI; k.shape(C.gold, [[Math.cos(a) * .07, Y1 - .09 + Math.sin(a) * .07], [-Math.cos(a) * .07, Y1 - .09 - Math.sin(a) * .07], [-Math.cos(a) * .07 + .006, Y1 - .09 - Math.sin(a) * .07 + .006]], E, .024);}
    for (const s of [-1, 1]) {k.lathe(C.dark, [[.07, 0], [.09, .12], [.07, .16]], s * 1.05, z1, 10, 0, .03); k.lathe(C.leaf, [[.09, 0], [.13, .1], [.08, .24], [0, .28]], s * 1.05, z1, 8, 0, .19);}
  }
  // sides and back: two storeys of windows, a rear service wing
  for (const [Fs, L] of [[sideAt(X, 1, (ZF + ZB) / 2), (ZF - ZB) / 2], [sideAt(-X, -1, (ZF + ZB) / 2), (ZF - ZB) / 2]]) {
    for (const u of [-.5, .5]) {louvred(k, C, Fs, u, .36, .15, .78, 0, 'arch'); louvred(k, C, Fs, u, Y1 + .22, .15, .68, 0, 'pediment');}
    for (const u of [-L + .07, L - .07]) k.slab(C.trim, rect(u - .065, u + .065, Y0, Y2 - .14), Fs, 0, .03);
  }
  const Bk = backAt(ZB, 0);
  for (const u of [-2.1, -1.3, 1.3, 2.1]) louvred(k, C, Bk, u, Y1 + .22, .15, .68, 0, 'hood');
  for (const u of [-2.1, 2.1]) louvred(k, C, Bk, u, .36, .15, .7, 0, 'hood');
  k.box(C.yellow, -1.1, 1.1, Y0, 1.3, ZB - .75, ZB);
  k.box(C.trim, -1.14, 1.14, 1.22, 1.3, ZB - .79, ZB);
  k.hip(C.tile, 0, ZB - .4, 2.42, .95, 1.6, .2, 1.3, .32);
  for (const u of [-.6, 0, .6]) louvred(k, C, backAt(ZB - .75, 0), u, .35, .12, .55, 0, 'hood');
  // roofs: broad hipped roofs on white fascias; the centre bay's own roof stands higher
  const roof = (cx, cz, w, d, y, h, ridge) => {
    k.box(C.trim, cx - w / 2, cx + w / 2, y - .07, y, cz - d / 2, cz + d / 2);
    k.hip(C.tile, cx, cz, w, d, ridge ? w - d : 0, ridge ? 0 : .2, y, h);
  };
  roof(0, (ZF + ZB) / 2, 2 * X + .5, ZF - ZB + .5, Y2, .62, true);
  roof(0, (CF + ZB + .3) / 2 + .02, 2 * CX + .42, CF - ZB + .15, YC, .62, false);
  k.tube(C.tile, [[-(2 * X + .5 - (ZF - ZB + .5)) / 2, Y2 + .62, (ZF + ZB) / 2], [(2 * X + .5 - (ZF - ZB + .5)) / 2, Y2 + .62, (ZF + ZB) / 2]], .03, 5);
  // the gate: white piers with eagles, the "73" plate, the white boundary wall along Sultan Gate
  const GZ = 1.98;
  for (const s of [-1, 1]) {
    const x = s * 1.18;
    k.block(C.white, .34, .1, .34, x, 0, GZ); k.block(C.white, .28, 1.0, .28, x, .1, GZ);
    k.block(C.trim, .36, .07, .36, x, 1.1, GZ); k.block(C.white, .3, .05, .3, x, 1.17, GZ);
    for (const [u, v] of [[-.07, .45], [.07, .45]]) k.slab(C.trim, rect(u - .035, u + .035, v, v + .4), frontAt(GZ + .14, x), 0, .012);
    // eagle with spread wings
    const ey = 1.22;
    k.lathe(C.white, [[.0, 0], [.07, .04], [.08, .12], [.05, .2], [.0, .24]], x, GZ, 8, 0, ey);
    k.lathe(C.white, [[.0, 0], [.04, .02], [.035, .07], [0, .09]], x, GZ + .03, 6, 0, ey + .22);
    k.triangles(C.white, [[[x, ey + .18, GZ], [x + .26, ey + .38, GZ - .06], [x + .2, ey + .2, GZ - .03], [x + .06, ey + .1, GZ]], [[x, ey + .18, GZ], [x - .26, ey + .38, GZ - .06], [x - .2, ey + .2, GZ - .03], [x - .06, ey + .1, GZ]]]);
    k.box(C.white, s * 1.33, s * 3.75, 0, .5, GZ - .07, GZ + .07);
    k.box(C.trim, s * 1.33, s * 3.75, .5, .55, GZ - .09, GZ + .09);
    for (const x2 of [2.5, 3.68]) k.block(C.white, .16, .6, .2, s * x2, 0, GZ);
  }
  k.slab(C.dark, rect(-.08, .08, .74, .86), frontAt(GZ + .145, 1.18), 0, .008);
  for (const u of [-.035, .035]) k.shape(C.trim, rect(u - .012, u + .012, .77, .83), frontAt(GZ + .145, 1.18), .01);
  // the forecourt: grey stone path, red brick, low hedges along the house
  for (const s of [-1, 1]) k.box(C.leaf, s * 1.05, s * 2.55, 0, .16, ZF + .1, ZF + .3);

  return {
    baseWidth: 7.6, detail: [0, 1.5, CF], overview: [0, 1.7, .2], distance: 11.6, elevation: .2, front: CF + .62, back: ZB - .8,
    anchors: {'front-envelope': {position: [0, 1.0, CF + .9]}, 'back-envelope': {position: [-1.7, 1.95, ZB - .14]}},
  };
}

/* ===== 101 Jalan Sultan, former Al-Ahmadiah / HARMY press, now The Sultan (1920s; restored 2012) =====
 * The white two-storey front of the press: five round arches on paired piers carry the five-foot way, with keystones,
 * impost bands and the hotel name over the right arch; above it an open loggia of seven arches on slender columns with
 * balustrades and fanlights, a heavy cornice and the scalloped parapet crest with urns. Pitched roof behind; the
 * neighbouring shophouses continue the row on both sides. The street number plate is on the left pier.
 * Front (+z) is Jalan Sultan. */
function sultanPress(k, M) {
  const C = {white: mat('#f7f5ef', .78), trim: mat('#e4e0d6', .8), dark: mat('#33393a', .55), shut: mat('#5d7a6e', .7), tile: mat('#a65a3e', .9),
    floor: mat('#2e3533', .8), navy: mat('#24406e', .6), gold: M.gold, ochre: mat('#e9d39b', .88), red: mat('#b4503a', .85), pave: mat('#bfb8a9', .95), gran: mat('#9d978b', .95)};
  const X = 2.6, ZF = 1.02, ZG = .52, ZL = .5, ZB = -1.55, Y1 = 1.5, Y2 = 2.62, A = 5, aw = 2 * X / A;
  k.box(C.pave, -3.78, 3.78, 0, .03, ZF, 2.18); k.box(C.gran, -3.78, 3.78, 0, .07, ZF + .12, ZF + .2);
  k.box(C.white, -X, X, 0, Y2, ZB, ZG);
  k.box(C.white, -X, X, Y1 - .1, Y1, ZG, ZF);
  // five-foot way floor: patterned cement tiles
  k.box(C.white, -X, X, 0, .06, ZG, ZF);
  for (let x = -X + .05, i = 0; x < X - .1; x += .12, i++) for (let z = ZG + .05, j = 0; z < ZF - .1; z += .12, j++) if ((i + j) % 2) k.box(C.floor, x, x + .1, .06, .063, z, z + .1);
  // ground arcade: piers, arches with keystones, frieze and the hotel name, number plate
  const F = frontAt(ZF, 0), FW = frontAt(ZG, 0);
  for (let i = 0; i <= A; i++) {
    const u = -X + i * aw, pw = i === 0 || i === A ? .2 : .26;
    k.block(C.white, pw, 1.12, .26, u + (i === 0 ? pw / 2 : i === A ? -pw / 2 : 0), .06, ZF - .13);
    k.block(C.trim, pw + .05, .08, .3, u + (i === 0 ? pw / 2 : i === A ? -pw / 2 : 0), .06, ZF - .13);
    k.block(C.trim, pw + .06, .07, .3, u + (i === 0 ? pw / 2 : i === A ? -pw / 2 : 0), .76, ZF - .13);
    const pu = u + (i === 0 ? pw / 2 : i === A ? -pw / 2 : 0);
    for (const s of [-1, 1]) k.slab(C.trim, rect(pu + s * pw * .28 - .03, pu + s * pw * .28 + .03, .14, .74), F, 0, .012);
  }
  for (let i = 0; i < A; i++) {
    const u = -X + (i + .5) * aw, hw = aw / 2 - .13;
    archFrame(k, C.white, F, u, hw, .83, 1.4, -.26, 0, 12);
    archFrame(k, C.trim, F, u, hw + .055, .83, .83 + hw + .055, .0, .02, 12);
    k.slab(C.white, rect(u - hw - .055, u + hw + .055, .83 + hw + .055, 1.4), F, 0, .005);
    k.slab(C.trim, [[u - .05, .83 + hw - .02], [u + .05, .83 + hw - .02], [u + .07, .83 + hw + .12], [u - .07, .83 + hw + .12]], F, 0, .04);
    // behind the arch: glazed timber doors with a sunburst fanlight
    k.slab(C.trim, archShape(hw - .08, .77, 12, u, .06), FW, 0, .015);
    k.shape(C.dark, archShape(hw - .13, .77, 12, u, .06), FW, .018);
    for (let j = 1; j < 6; j++) {const a = j / 6 * PI; k.shape(C.white, [[u, .83], [u + Math.cos(a - .04) * (hw - .13), .83 + Math.sin(a - .04) * (hw - .13)], [u + Math.cos(a + .04) * (hw - .13), .83 + Math.sin(a + .04) * (hw - .13)]], FW, .022);}
    k.slab(C.white, rect(u - hw + .13, u + hw - .13, .81, .845), FW, .015, .03);
    for (const du of [-.16, 0, .16]) k.slab(C.white, rect(u + du - .012, u + du + .012, .06, .82), FW, .018, .03);
    for (const v of [.3, .55]) k.slab(C.white, rect(u - hw + .13, u + hw - .13, v, v + .02), FW, .018, .028);
    // hanging lantern
    k.box(C.dark, u - .006, u + .006, 1.2, 1.4, ZF - .25, ZF - .24);
    k.lathe(C.dark, [[.0, 0], [.06, .02], [.07, .1], [.05, .16], [0, .2]], u, ZF - .245, 6, 0, 1.0);
    k.lathe(C.gold, [[.045, 0], [.05, .1], [0, .11]], u, ZF - .245, 6, 0, 1.03);
  }
  k.slab(C.trim, rect(-X, X, 1.38, 1.42), F, 0, .05);
  k.slab(C.white, rect(-X, X, 1.42, Y1 + .03), F, -.02, .03);
  k.slab(C.trim, rect(-X - .02, X + .02, Y1 + .03, Y1 + .08), F, -.02, .06);
  for (const [du, wd] of [[0, .05], [.1, .06], [.21, .05], [.36, .06], [.47, .05], [.58, .06], [.69, .05], [.81, .06], [.92, .05], [1.03, .06]]) k.slab(C.dark, rect(.62 + du, .62 + du + wd, 1.27, 1.37), F, .005, .02);
  k.slab(C.navy, rect(-X + .03, -X + .17, .9, 1.02), F, .012, .022);
  for (const du of [.05, .09, .12]) k.shape(C.white, rect(-X + du, -X + du + .018, .93, .99), F, .024);
  // upper loggia: seven arches on slender columns, balustrades, fanlights, French windows on the back wall
  const L = 7, lw = 2 * X / L, FU = frontAt(ZF - .06, 0), FB = frontAt(ZL, 0);
  k.box(C.white, -X, X, Y2 - .02, Y2 + .02, ZL, ZF - .06);
  for (let i = 0; i <= L; i++) {
    const u = -X + i * lw, cw = i === 0 || i === L ? .14 : .12, uu = u + (i === 0 ? cw / 2 : i === L ? -cw / 2 : 0);
    k.block(C.white, cw, Y2 - Y1 - .08, .14, uu, Y1 + .08, ZF - .13);
    k.block(C.trim, cw + .05, .05, .18, uu, Y1 + .08, ZF - .13); k.block(C.trim, cw + .05, .06, .18, uu, 2.14, ZF - .13);
  }
  for (let i = 0; i < L; i++) {
    const u = -X + (i + .5) * lw, hw = lw / 2 - .06;
    archFrame(k, C.white, FU, u, hw, 2.2, Y2, -.14, 0, 10);
    archFrame(k, C.trim, FU, u, hw + .04, 2.2, 2.2 + hw + .04, .0, .015, 10);
    balustrade(k, C.white, FU, u - hw, u + hw, Y1 + .08, .3, -.07, .06, .012);
    k.slab(C.trim, archShape(hw - .07, .5, 10, u, Y1 + .08), FB, 0, .015); k.shape(C.dark, archShape(hw - .11, .5, 10, u, Y1 + .1), FB, .018);
    k.slab(C.white, rect(u - .006, u + .006, Y1 + .1, Y1 + .6), FB, .018, .028);
    for (let j = 1; j < 5; j++) {const a = j / 5 * PI; k.shape(C.white, [[u, Y1 + .6], [u + Math.cos(a - .05) * (hw - .11), Y1 + .6 + Math.sin(a - .05) * (hw - .11)], [u + Math.cos(a + .05) * (hw - .11), Y1 + .6 + Math.sin(a + .05) * (hw - .11)]], FB, .022);}
    for (const s of [-1, 1]) k.shape(C.shut, rect(u + s * (hw - .1) - .045, u + s * (hw - .1) + .045, Y1 + .1, Y1 + .6), FB, .02);
  }
  // cornice, then the scalloped parapet crest with urns over every column
  k.slab(C.trim, rect(-X - .03, X + .03, Y2, Y2 + .06), F, -.08, .07);
  k.slab(C.white, rect(-X - .03, X + .03, Y2 + .06, Y2 + .14), F, -.08, .04);
  k.slab(C.trim, rect(-X - .05, X + .05, Y2 + .14, Y2 + .2), F, -.08, .1);
  for (let u = -X + .04; u < X; u += .09) k.slab(C.trim, rect(u, u + .04, Y2 + .08, Y2 + .13), F, .04, .06);
  k.slab(C.white, rect(-X, X, Y2 + .2, Y2 + .3), F, -.1, -.02);
  for (let i = 0; i < L; i++) {
    const u = -X + (i + .5) * lw, b = Y2 + .3, hw = lw / 2 - .04, mid = i === 3;
    const crest = [[u - hw, b], [u + hw, b], [u + hw, b + .08]];
    for (let j = 0; j <= 8; j++) {const t = j / 8, a = t * PI; crest.push([u + Math.cos(a) * hw * (.55 + .2 * Math.abs(Math.cos(a))), b + .08 + Math.sin(a) * (mid ? .4 : .28) + (j % 2 ? 0 : .025)]);}
    crest.push([u - hw, b + .08]);
    k.slab(C.white, crest, F, -.09, -.03);
    k.slab(C.trim, semi(hw * .3, u, b + .1, 6), F, -.03, -.015);
    k.slab(C.trim, rect(u - hw * .5, u + hw * .5, b + .08, b + .1), F, -.03, -.015);
  }
  for (let i = 0; i <= L; i++) {
    const u = -X + i * lw, x = Math.max(-X + .07, Math.min(X - .07, u));
    k.block(C.white, .12, .3, .12, x, Y2 + .2, ZF - .14);
    k.lathe(C.white, [[.05, 0], [.07, .05], [.045, .1], [.02, .14], [.035, .17], [0, .22]], x, ZF - .14, 8, 0, Y2 + .5);
  }
  // pitched roof behind the parapet; plain flank walls with windows; the back
  k.gable(C.tile, 0, (ZL + ZB) / 2, 2 * X - .1, ZL - ZB + .2, Y2 + .2, .65);
  k.tube(C.tile, [[-X + .05, Y2 + .85, (ZL + ZB) / 2], [X - .05, Y2 + .85, (ZL + ZB) / 2]], .035, 5);
  for (const s of [-1, 1]) {const Fs = sideAt(s * X, s, (ZB + ZG) / 2); for (const u of [-.6, .6]) louvred(k, C, Fs, u, 1.85, .14, .55, 0, 'hood');}
  const Bk = backAt(ZB, 0);
  for (const u of [-1.95, -.65, .65, 1.95]) {louvred(k, C, Bk, u, 1.8, .15, .6, 0, 'hood'); louvred(k, C, Bk, u, .4, .15, .6, 0, 'hood');}
  // neighbouring shophouses that continue the row
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -3.78 : X, x1 = s < 0 ? -X : 3.78, cx = (x0 + x1) / 2, w = x1 - x0, wall = s < 0 ? C.ochre : C.white, acc = s < 0 ? C.shut : C.red;
    k.box(wall, x0, x1, 0, Y1 - .1, ZB + .2, ZG);
    k.box(wall, x0, x1, Y1 - .1, 2.45, ZB + .2, ZF - .02);
    k.box(C.white, x0, x1, 0, .06, ZG, ZF);
    k.block(wall, .16, Y1 - .16, .2, s < 0 ? x0 + .08 : x1 - .08, .06, ZF - .12);
    k.box(C.trim, x0, x1, Y1 - .22, Y1 - .08, ZG, ZF);
    const Fn = frontAt(ZF - .02, cx), Gn = frontAt(ZG, cx);
    for (const u of [-w * .24, w * .24]) louvred(k, C, Fn, u, Y1 + .15, .14, .6, 0, 'arch', acc);
    k.slab(acc, rect(-w / 2, w / 2, 2.3, 2.38), Fn, 0, .04);
    k.slab(C.trim, rect(-.22, .22, .06, 1.0), Gn, 0, .015); k.shape(acc, rect(-.18, .18, .06, .95), Gn, .018);
    k.gable(C.tile, cx, (ZF + ZB) / 2, w, ZF - ZB + .2, 2.45, .58);
    const Fo = sideAt(s < 0 ? x0 : x1, s, (ZF + ZB) / 2 + .1), half = (ZF - ZB) / 2 - .1;
    for (const u of [-.75, 0, .75]) louvred(k, C, Fo, u, 1.65, .13, .55, 0, 'hood', acc);
    for (const u of [-.75, .75]) louvred(k, C, Fo, u, .35, .13, .55, 0, 'hood', acc);
    k.slab(C.trim, rect(-half, half, Y1 - .16, Y1 - .08), Fo, 0, .03);
    const Bn = backAt(ZB + .2, cx);
    louvred(k, C, Bn, 0, 1.75, .14, .5, 0, 'hood', acc);
    k.box(wall, x0 + .1, x1 - .1, 0, 1.0, ZB - .2, ZB + .2);
    k.triangles(C.tile, [[[x0 + .05, 1.0, ZB - .28], [x1 - .05, 1.0, ZB - .28], [x1 - .05, 1.25, ZB + .2], [x0 + .05, 1.25, ZB + .2]]]);
    k.slab(C.trim, rect(-.13, .13, 0, .72), backAt(ZB - .2, cx), 0, .015); k.shape(acc, rect(-.1, .1, 0, .68), backAt(ZB - .2, cx), .018);
  }
  k.box(C.white, -1.6, 1.6, 0, 1.0, ZB - .45, ZB);
  k.hip(C.tile, 0, ZB - .25, 3.4, .6, 2.8, 0, 1.0, .25);
  for (const u of [-1.1, -.37, .37, 1.1]) louvred(k, C, backAt(ZB - .45, 0), u, .3, .1, .45, 0, 'hood');

  return {
    baseWidth: 7.6, detail: [0, 1.5, ZF], overview: [0, 1.75, .1], distance: 11.2, elevation: .16, front: ZF + .05, back: ZB - .05,
    anchors: {
      'left-tower': {position: [-X + .1, .96, ZF + .1], scale: .5},
      'entry-arch': {position: [0, .72, ZF + .16], scale: .62},
      'right-tower': {position: [1.13, 1.32, ZF + .12], scale: .5},
      'back-envelope': {position: [0, 1.4, ZB - .12]}, 'front-envelope': {position: [0, 1.5, ZF + .3]},
    },
  };
}

/* ===== Madrasah Alsagoff Al-Arabiah (1912), 111 Jalan Sultan =====
 * Cream brick-and-plaster school with brown dressings: the centre block under a scrolled Dutch gable with the founding
 * crest and the school's name band, two round-arched windows over a pillared porch; the wings with tall arches on
 * pillars over two tiers of verandahs with balustrades; hipped clay-tile roofs. A forecourt with palms runs to the
 * low wall and railings on Jalan Sultan, where the school gate opens between two capped piers. Front (+z) is Jalan Sultan. */
function madrasah(k, M) {
  const C = {cream: mat('#eee6d2', .86), brown: mat('#6c4430', .78), dark: mat('#2b2a28', .7), tile: mat('#a85a3b', .9), pave: mat('#9c5a4c', .93),
    grey: mat('#b9b3a6', .95), iron: mat('#2f3432', .5), leaf: mat('#4d7c3c', .8), trunk: mat('#a49d90', .95), gold: M.gold, white: mat('#fbf8f0', .6)};
  const CX = .95, ZF = .45, ZW = .15, ZV = -.32, ZB = -1.65, Y1 = 1.2, Y2 = 2.32;
  k.box(C.pave, -3.78, 3.78, 0, .03, ZW, 1.86);
  for (let x = -3.6; x < 3.7; x += .6) k.box(C.grey, x, x + .3, .03, .034, .7, 1.6);
  k.box(C.grey, -3.78, 3.78, 0, .05, 1.86, 2.18);
  k.box(C.brown, -3.5, 3.5, 0, .12, ZB - .05, ZW + .03);
  k.box(C.brown, -CX - .03, CX + .03, 0, .12, ZW, ZF + .03);
  // centre block
  k.box(C.cream, -CX, CX, .12, Y2, ZB + .3, ZF);
  const F = frontAt(ZF, 0);
  for (const u of [-.55, 0, .55]) k.shape(C.dark, rect(u - .2, u + .2, .12, .95), F, .004);
  for (const u of [-CX + .1, -.275, .275, CX - .1]) {k.slab(C.cream, rect(u - .09, u + .09, .12, Y1 - .05), F, 0, .06); k.slab(C.brown, rect(u - .1, u + .1, .12, .22), F, 0, .07);}
  for (const u of [-.55, 0, .55]) archFrame(k, C.cream, F, u, .19, .95, 1.17, .0, .06, 8);
  k.slab(C.brown, rect(-CX, CX, Y1 - .06, Y1 + .02), F, 0, .08);
  for (const s of [-1, 1]) louvred(k, C, F, s * .36, Y1 + .18, .2, .85, 0, 'arch', C.brown, C.brown);
  k.slab(C.brown, rect(-CX, CX, Y2 - .08, Y2), F, 0, .07);
  // the scrolled Dutch gable with crest and name band, brown coping
  {
    const g = [[-CX, Y2], [CX, Y2]], top = Y2 + 1.18, prof = [];
    for (let i = 0; i <= 16; i++) {const t = i / 16; prof.push([CX - t * (CX - .32) + .1 * Math.sin(t * PI * 2), Y2 + t * (top - Y2 - .24) + .12 * Math.sin(t * PI)]);}
    for (const p of prof) g.push(p);
    for (let i = 0; i <= 8; i++) {const a = i / 8 * PI; g.push([Math.cos(a) * .32, top - .24 + Math.sin(a) * .24]);}
    for (const p of prof.slice().reverse()) g.push([-p[0], p[1]]);
    k.slab(C.cream, g, F, -.12, .01);
    const edge = g.slice(2).map(([u, v]) => F(u, v + .02, .02));
    k.tube(C.brown, edge, .035, 5);
    k.slab(C.brown, rect(-.5, .5, Y2 + .2, Y2 + .27), F, .01, .025);
    k.slab(C.cream, rect(-.36, .36, Y2 + .35, Y2 + .48), F, .01, .02);
    for (let i = 0; i < 9; i++) k.shape(C.brown, rect(-.32 + i * .075, -.32 + i * .075 + .045, Y2 + .38, Y2 + .45), F, .022);
    k.slab(C.brown, Array.from({length: 16}, (_, i) => [Math.sin(i / 16 * 2 * PI) * .2, Y2 + .78 + Math.cos(i / 16 * 2 * PI) * .2]), F, .01, .025);
    k.slab(C.cream, Array.from({length: 16}, (_, i) => [Math.sin(i / 16 * 2 * PI) * .15, Y2 + .78 + Math.cos(i / 16 * 2 * PI) * .15]), F, .025, .035);
    k.slab(C.brown, [[-.12, Y2 + .58], [.12, Y2 + .58], [.2, Y2 + .66], [-.2, Y2 + .66]], F, .01, .03);
    k.slab(C.brown, [[-.07, Y2 + .98], [.07, Y2 + .98], [.0, Y2 + 1.1]], F, .01, .03);
    k.hip(C.tile, 0, (ZB + .3 + ZF) / 2, 2 * CX + .2, ZF - ZB - .1, 0, .2, Y2, .62);
  }
  // wings: tall arches on pillars over two verandah tiers, brown balustrades
  const zw = (ZW + ZV) / 2;
  for (const s of [-1, 1]) {
    const x0 = s * CX, x1 = s * 3.45, cx = (x0 + x1) / 2, w = Math.abs(x1 - x0), Fw = frontAt(ZW, cx), Fv = frontAt(ZV, cx), n = 3;
    k.box(C.cream, Math.min(x0, x1), Math.max(x0, x1), .12, Y2, ZB, ZV);
    k.box(C.cream, Math.min(x0, x1), Math.max(x0, x1), Y1 - .08, Y1 + .02, ZV, ZW);
    k.box(C.cream, Math.min(x0, x1), Math.max(x0, x1), Y2 - .1, Y2, ZV, ZW + .04);
    for (let i = 0; i <= n; i++) {
      const u = -w / 2 + i * w / n, x = cx + u;
      k.block(C.cream, .2, Y2 - .22, .2, x, .12, ZW - .1);
      k.block(C.brown, .24, .12, .24, x, .12, ZW - .1);
      k.block(C.brown, .24, .05, .24, x, Y1 - .12, ZW - .1);
    }
    for (let i = 0; i < n; i++) {
      const u = -w / 2 + (i + .5) * w / n, hw = w / n / 2 - .1;
      archFrame(k, C.cream, Fw, u, hw, Y1 - .25 - hw + hw, Y1 - .08, -.2, 0, 8);
      archFrame(k, C.cream, Fw, u, hw, Y2 - .1 - hw - .06, Y2 - .1, -.2, 0, 10);
      archFrame(k, C.brown, Fw, u, hw + .03, Y2 - .1 - hw - .06, Y2 - .16, .0, .012, 10);
      balustrade(k, C.brown, Fw, u - hw, u + hw, Y1 + .02, .3, -.08, .06, .012);
      louvred(k, C, Fv, u, .2, .17, .75, 0, 'flat', C.brown, C.cream);
      louvred(k, C, Fv, u, Y1 + .15, .17, .75, 0, 'arch', C.brown, C.cream);
    }
    k.hip(C.tile, cx + s * .05, (ZB + ZW) / 2, w + .3, ZW - ZB + .3, w + .3 - (ZW - ZB + .3) * .6, .0, Y2, .55);
    k.box(C.brown, Math.min(x0, x1) - .02, Math.max(x0, x1) + .14 * (s > 0 ? 1 : 0) + .02, Y2 - .02, Y2 + .02, ZB - .15, ZW + .15);
    // flank and back windows
    const Fs = sideAt(x1, s, (ZB + ZW) / 2);
    for (const u of [-.55, .35]) {louvred(k, C, Fs, u, .3, .14, .6, 0, 'hood', C.brown, C.cream); louvred(k, C, Fs, u, Y1 + .2, .14, .6, 0, 'hood', C.brown, C.cream);}
    const Bk = backAt(ZB, cx);
    for (let i = 0; i < n; i++) {const u = -w / 2 + (i + .5) * w / n; louvred(k, C, Bk, u, .3, .14, .6, 0, 'hood', C.brown, C.cream); louvred(k, C, Bk, u, Y1 + .2, .14, .6, 0, 'hood', C.brown, C.cream);}
  }
  for (const s of [-1, 1]) louvred(k, C, backAt(ZB + .3, 0), s * .4, Y1 + .2, .15, .65, 0, 'arch', C.brown, C.cream);
  // forecourt palms, flag pole
  for (const [x, z, h, t] of [[-2.45, 1.15, 3.1, .4], [2.35, 1.2, 3.3, 1.5]]) {k.lathe(C.grey, [[.2, 0], [.2, .07], [.15, .07]], x, z, 12, 0, .02); palm(k, C.trunk, C.leaf, x, z, h, t, 9);}
  k.lathe(C.white, [[.02, 0], [.015, 2.6]], -1.3, .75, 6, 0, .03);
  // boundary wall, railings and the school gate on Jalan Sultan
  const GZ = 1.86;
  for (const s of [-1, 1]) {
    k.box(C.cream, s * .78, s * 3.78, .03, .38, GZ - .07, GZ + .07);
    k.box(C.brown, s * .78, s * 3.78, .38, .43, GZ - .09, GZ + .09);
    for (let x = .95; x < 3.75; x += .09) k.box(C.iron, s * x - .01, s * x + .01, .43, .82, GZ - .01, GZ + .01);
    k.box(C.iron, s * .78, s * 3.78, .78, .8, GZ - .015, GZ + .015);
    for (let x = 1.7; x < 3.75; x += .95) k.block(C.cream, .16, .9, .16, s * x, .03, GZ);
    const x = s * .66;
    k.block(C.brown, .3, .1, .3, x, .03, GZ); k.block(C.cream, .24, 1.06, .24, x, .13, GZ);
    k.block(C.brown, .3, .06, .3, x, 1.19, GZ); k.block(C.cream, .2, .1, .2, x, 1.25, GZ);
    k.lathe(C.white, [[.0, 0], [.06, .03], [.08, .1], [.06, .17], [0, .2]], x, GZ, 10, 0, 1.35);
    for (const v of [.3, .7]) k.slab(C.brown, rect(-.08, .08, v, v + .2), frontAt(GZ + .12, x), 0, .01);
    // the gate leaves, one half drawn back
    const gx0 = s < 0 ? -.54 : .54, gx1 = s < 0 ? -.03 : .03;
    for (let i = 0; i <= 8; i++) {const xx = gx0 + (gx1 - gx0) * i / 8; k.box(C.iron, xx - .011, xx + .011, .06, .95 - Math.abs(i - 4) * -.01, GZ - .012 + (s > 0 ? .06 : 0), GZ + .012 + (s > 0 ? .06 : 0));}
    for (const y of [.1, .5, .9]) k.box(C.iron, Math.min(gx0, gx1), Math.max(gx0, gx1), y, y + .025, GZ - .015 + (s > 0 ? .06 : 0), GZ + .015 + (s > 0 ? .06 : 0));
  }
  k.slab(C.brown, rect(-.36, .36, .0, .14), frontAt(GZ + .145, -1.6), 0, .01);
  k.box(C.white, -2.1, -1.1, .48, .66, GZ + .1, GZ + .12);
  for (let i = 0; i < 8; i++) k.box(C.brown, -2.04 + i * .12, -1.97 + i * .12, .53, .61, GZ + .12, GZ + .125);

  return {
    baseWidth: 7.6, detail: [0, 1.2, GZ], overview: [0, 1.7, 0], distance: 11.8, elevation: .2, front: GZ + .1, back: ZB - .05,
    anchors: {'back-envelope': {position: [0, 1.5, ZB - .12]}, 'front-envelope': {position: [0, 1.3, GZ + .3]}},
  };
}

/* ===== Masjid Malabar (1956-63; tiles 1995), 471 Victoria Street at Jalan Sultan =====
 * Sky-blue walls under a white lozenge grid of glazed tiles, deep-blue pilasters and bands. To the left the round
 * minaret on its square base with a gallery, an open lantern stage and a gilded onion; the three-storey entrance block
 * with the moulded arch, columns, the balcony with the mosque's name board and the arched gallery under a hood, crowned
 * by the great gold onion dome and its tiered spire and crescent; a domed corner turret; then the two-storey prayer
 * hall with tiers of arched windows under a red hipped roof and corner pinnacles, the mihrab bay on the back. Blue
 * boundary wall with white railings and globe lamps. Front (+z) is the street. */
function malabar(k, M) {
  const C = {sky: mat('#8db6dc', .7), grid: mat('#f2f5f4', .6), blue: mat('#2f68aa', .65), dark: mat('#283139', .6), gold: M.gold, tile: mat('#c0603f', .88),
    gran: mat('#a9a59c', .95), white: mat('#fbfbf6', .6), green: mat('#2f6a4a', .7), red: mat('#a7453a', .7), pave: mat('#c4beb1', .95)};
  const ST = .2;
  const tiled = (x0, x1, y0, y1, z0, z1, sides = [1, 1, 1, 1]) => {
    k.box(C.sky, x0, x1, y0, y1, z0, z1);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
    [[frontAt(z1, cx), hx], [backAt(z0, cx), hx], [sideAt(x1, 1, cz), hz], [sideAt(x0, -1, cz), hz]].forEach(([F, L], i) => {if (sides[i]) lattice(k, C.grid, F, -L, L, y0, y1, ST);});
  };
  const pil = (F, u, v0, v1, w = .06) => k.slab(C.blue, rect(u - w, u + w, v0, v1), F, 0, .025);
  k.box(C.pave, -3.78, 3.78, 0, .03, -2.15, 2.18);
  // ---- the prayer hall (right) ----
  const HX0 = .02, HX1 = 3.5, HZ1 = .86, HZ0 = -1.85, H1 = 1.22, H2 = 2.42, hc = (HX0 + HX1) / 2, hw = (HX1 - HX0) / 2;
  k.box(C.gran, HX0 - .03, HX1 + .03, 0, .12, HZ0 - .03, HZ1 + .03);
  tiled(HX0, HX1, .12, H2, HZ0, HZ1);
  for (const y of [H1, H2 - .06]) k.box(C.blue, HX0 - .03, HX1 + .03, y - .05, y + .05, HZ0 - .03, HZ1 + .03);
  const hallFaces = [[frontAt(HZ1, hc), hw, 5], [backAt(HZ0, hc), hw, 5], [sideAt(HX1, 1, (HZ0 + HZ1) / 2), (HZ1 - HZ0) / 2, 4]];
  for (const [F, L, n] of hallFaces) {
    for (let i = 0; i <= n; i++) pil(F, -L + i * 2 * L / n + (i === 0 ? .06 : i === n ? -.06 : 0), .12, H2);
    for (let i = 0; i < n; i++) {
      const u = -L + (i + .5) * 2 * L / n;
      for (const [v0, h] of [[.36, .66], [H1 + .2, .7]]) {
        k.slab(C.white, archShape(.17, h - .17, 10, u, v0 - .04), F, 0, .02);
        k.shape(C.dark, archShape(.13, h - .17, 10, u, v0), F, .022);
        for (const du of [-.045, .045]) k.slab(C.white, rect(u + du - .007, u + du + .007, v0, v0 + h - .17), F, .022, .03);
        k.slab(C.white, rect(u - .13, u + .13, v0 + h - .19, v0 + h - .17), F, .022, .03);
        k.slab(C.blue, rect(u - .2, u + .2, v0 - .1, v0 - .05), F, 0, .05);
        for (let b = -2; b <= 2; b++) k.slab(C.white, rect(u + b * .07 - .02, u + b * .07 + .02, v0 - .19, v0 - .1), F, 0, .012);
      }
    }
  }
  // parapet balustrade, corner pinnacles, red hipped roof inside it
  k.box(C.blue, HX0, HX1, H2, H2 + .05, HZ0, HZ1);
  for (const [F, L] of hallFaces) balustrade(k, C.white, F, -L + .08, L - .08, H2 + .05, .17, -.02, .07, .012);
  for (const [x, z] of [[HX1 - .06, HZ1 - .06], [HX1 - .06, HZ0 + .06], [HX0 + .9, HZ0 + .06]]) {k.block(C.blue, .13, .3, .13, x, H2, z); k.lathe(C.gold, [[.06, 0], [.06, .03]].concat(onion(.06, .16).map(([r, y]) => [r, y + .03])), x, z, 8, 0, H2 + .3);}
  k.hip(C.tile, hc + .05, (HZ0 + HZ1) / 2, 2 * hw - .25, HZ1 - HZ0 - .25, 2 * hw - .25 - (HZ1 - HZ0 - .25), 0, H2 + .03, .62);
  // the blue lean-to canopy over the hall's side door
  k.box(C.blue, 1.75, 3.5, 1.0, 1.05, HZ1, HZ1 + .55);
  for (const x of [1.8, 2.65, 3.45]) k.block(C.blue, .04, 1.0, .04, x, .03, HZ1 + .52);
  // the mihrab bay on the back, with its little dome
  tiled(hc - .38, hc + .38, .12, 1.7, HZ0 - .38, HZ0, [0, 1, 1, 1]);
  k.box(C.blue, hc - .41, hc + .41, 1.7, 1.78, HZ0 - .41, HZ0);
  k.lathe(C.gold, bulb(.22, .46), hc, HZ0 - .19, 14, 0, 1.78);
  // ---- the corner turret between hall and entrance ----
  const TX0 = -.62, TX1 = .02, TZ0 = -.05, TZ1 = 1.08, TH = 2.95, tc = (TX0 + TX1) / 2;
  tiled(TX0, TX1, .12, TH, TZ0, TZ1);
  const FT = frontAt(TZ1, tc);
  for (const s of [-1, 1]) pil(FT, s * .26, .12, TH);
  for (const [v0, h] of [[1.0, .5], [1.82, .5]]) {k.slab(C.white, pointedShape(.08, h - .16, 6, 0, v0 - .03), FT, 0, .02); k.shape(C.green, pointedShape(.06, h - .16, 6, 0, v0), FT, .024);}
  k.slab(C.white, rect(-.1, .1, 2.48, 2.62), FT, 0, .02); k.shape(C.dark, rect(-.08, .08, 2.5, 2.6), FT, .022);
  k.box(C.blue, TX0 - .04, TX1 + .04, TH, TH + .07, TZ0 - .04, TZ1 + .04);
  balustrade(k, C.white, FT, -.3, .3, TH + .07, .14, -.02, .07, .012);
  for (const [x, z] of [[TX0 + .04, TZ1 - .04], [TX1 - .04, TZ1 - .04]]) {k.block(C.blue, .08, .2, .08, x, TH + .07, z); k.lathe(C.white, [[.04, 0], [.0, .12]], x, z, 6, 0, TH + .27);}
  k.lathe(C.blue, [[.24, 0], [.24, .14], [.27, .17]], tc, (TZ0 + TZ1) / 2, 12, 0, TH + .07);
  k.lathe(C.gold, bulb(.24, .52), tc, (TZ0 + TZ1) / 2, 16, 0, TH + .24);
  finial(k, C.gold, tc, (TZ0 + TZ1) / 2, TH + .78, .7);
  // ---- the entrance block ----
  const EX0 = -2.22, EX1 = -.62, EZ1 = 1.28, EZ0 = -.55, EH = 2.72, ec = (EX0 + EX1) / 2, eh = (EX1 - EX0) / 2, FE = frontAt(EZ1, ec);
  k.box(C.gran, EX0 - .03, EX1 + .03, 0, .12, EZ0, EZ1 + .03);
  tiled(EX0, EX1, .12, EH, EZ0, EZ1, [1, 1, 0, 1]);
  for (const u of [-eh + .07, eh - .07]) pil(FE, u, .12, EH, .07);
  for (const u of [-eh + .07, eh - .07]) k.slab(C.blue, rect(u - .1, u + .1, EH - .2, EH), FE, 0, .05);
  // the moulded entrance arch, steps inside, green columns
  k.slab(C.white, archShape(.4, .58, 14, 0, .12), FE, 0, .04);
  k.slab(C.sky, archShape(.33, .58, 14, 0, .12), FE, .0, .045);
  k.shape(C.dark, archShape(.3, .58, 14, 0, .12), FE, .05);
  for (let i = 0; i < 5; i++) k.box(C.gran, ec - .28, ec + .28, .12 + i * .09, .21 + i * .09, EZ1 - .1 - i * .12, EZ1 + .055 - i * .12);
  for (const s of [-1, 1]) {
    const x = ec + s * .5, z = EZ1 + .18;
    k.block(C.gran, .16, .12, .16, x, .03, z);
    k.lathe(C.green, [[.05, 0], [.05, .62]], x, z, 10, 0, .15);
    for (const y of [.3, .55]) k.lathe(C.red, [[.056, 0], [.056, .04]], x, z, 10, 0, y);
    k.lathe(C.red, [[.05, 0], [.09, .08], [.09, .12]], x, z, 10, 0, .77);
  }
  k.box(C.blue, ec - .62, ec + .62, .89, .95, EZ1, EZ1 + .28);
  // balcony with the name board, the arched gallery under a hood
  k.box(C.blue, ec - .62, ec + .62, 1.18, 1.25, EZ1, EZ1 + .32);
  k.box(C.sky, ec - .6, ec + .6, 1.25, 1.5, EZ1 + .24, EZ1 + .3);
  k.box(C.blue, ec - .62, ec + .62, 1.5, 1.54, EZ1 + .22, EZ1 + .32);
  const FS = frontAt(EZ1 + .3, ec);
  k.slab(C.blue, rect(-.42, .42, 1.28, 1.47), FS, 0, .01);
  for (let i = 0; i < 12; i++) k.slab(C.gold, rect(-.36 + i * .062, -.36 + i * .062 + .036, 1.33 + (i < 7 ? .06 : 0), 1.38 + (i < 7 ? .06 : 0)), FS, .01, .016);
  for (const s of [-1, 1]) {k.block(C.sky, .06, .25, .3, ec + s * .59, 1.25, EZ1 + .15);}
  for (const u of [-.3, 0, .3]) {k.slab(C.white, archShape(.11, .3, 10, u, 1.5), FE, 0, .02); k.shape(C.dark, archShape(.085, .3, 10, u, 1.52), FE, .022); k.slab(C.white, rect(u - .005, u + .005, 1.52, 1.82), FE, .022, .03);}
  k.box(C.blue, ec - .58, ec + .58, 2.02, 2.07, EZ1, EZ1 + .3);
  k.triangles(C.blue, [[[ec - .58, 2.07, EZ1 + .3], [ec + .58, 2.07, EZ1 + .3], [ec + .5, 2.16, EZ1], [ec - .5, 2.16, EZ1]]]);
  k.slab(C.white, rect(-.5, .5, 2.3, 2.4), FE, 0, .02); for (let u = -.45; u < .46; u += .1) k.shape(C.blue, rect(u - .02, u + .02, 2.32, 2.38), FE, .022);
  // parapet with balustrade and corner pinnacles
  k.box(C.blue, EX0 - .04, EX1 + .04, EH, EH + .07, EZ0 - .04, EZ1 + .04);
  for (const [F, L] of [[FE, eh], [backAt(EZ0, ec), eh], [sideAt(EX0, -1, (EZ0 + EZ1) / 2), (EZ1 - EZ0) / 2]]) balustrade(k, C.white, F, -L + .08, L - .08, EH + .07, .16, -.02, .07, .012);
  for (const x of [EX0 + .05, EX1 - .05]) for (const z of [EZ0 + .05, EZ1 - .05]) {k.block(C.blue, .1, .26, .1, x, EH + .07, z); k.lathe(C.gold, onion(.055, .14), x, z, 8, 0, EH + .33);}
  // side and back windows of the entrance block
  for (const [F, L] of [[sideAt(EX0, -1, (EZ0 + EZ1) / 2), (EZ1 - EZ0) / 2], [backAt(EZ0, ec), eh]]) for (const u of [-L * .45, L * .45]) for (const v0 of [.5, 1.5]) {k.slab(C.white, archShape(.12, .32, 8, u, v0 - .03), F, 0, .02); k.shape(C.dark, archShape(.09, .32, 8, u, v0), F, .022);}
  // the great dome: blue drum, gold onion, tiered spire and crescent
  {
    const dx = ec, dz = .25;
    k.lathe(C.blue, [[.6, 0], [.6, .2], [.64, .22], [.64, .27]], dx, dz, 20, 0, EH);
    k.lathe(C.gold, bulb(.6, 1.2), dx, dz, 24, 0, EH + .27);
    const y = EH + .27 + 1.2 - .06;
    k.lathe(C.gold, [[.05, 0], [.05, .06], [.075, .08], [.04, .14], [.06, .17], [.03, .26], [.045, .29], [.018, .4], [.0, .46]], dx, dz, 10, 0, y);
    for (const yy of [.05, .15, .27]) k.lathe(C.blue, [[.05, 0], [.05, .02]], dx, dz, 10, 0, y + yy);
    crescent(k, C.gold, frontAt(dz, 0), dx, y + .56, .085, .009);
    crescent(k, C.gold, sideAt(dx, 1, dz), 0, y + .56, .085, .009);
  }
  // ---- the minaret on its annex ----
  const AX0 = -3.55, AX1 = -2.22, AZ0 = -.4, AZ1 = .95, AH = 1.55, ac = (AX0 + AX1) / 2, FA = frontAt(AZ1, ac);
  k.box(C.gran, AX0 - .03, AX1, 0, .12, AZ0 - .03, AZ1 + .03);
  tiled(AX0, AX1, .12, AH, AZ0, AZ1, [1, 1, 0, 1]);
  k.box(C.blue, AX0 - .04, AX1, AH, AH + .07, AZ0 - .04, AZ1 + .04);
  pil(FA, -(AX1 - AX0) / 2 + .07, .12, AH);
  for (const u of [-.4, .15]) {k.slab(C.white, archShape(.13, .52, 10, u, .3), FA, 0, .02); k.shape(C.dark, archShape(.1, .52, 10, u, .32), FA, .022);}
  for (const u of [-.4, .15, .5]) {k.slab(C.white, rect(u - .1, u + .1, 1.08, 1.36), FA, 0, .02); k.shape(C.dark, rect(u - .075, u + .075, 1.1, 1.34), FA, .022);}
  balustrade(k, C.white, FA, -(AX1 - AX0) / 2 + .06, (AX1 - AX0) / 2 - .06, AH + .07, .14, -.02, .07, .012);
  for (const [F, L] of [[sideAt(AX0, -1, (AZ0 + AZ1) / 2), (AZ1 - AZ0) / 2], [backAt(AZ0, ac), (AX1 - AX0) / 2]]) {
    balustrade(k, C.white, F, -L + .06, L - .06, AH + .07, .14, -.02, .07, .012);
    for (const u of [-L * .4, L * .4]) {k.slab(C.white, archShape(.11, .4, 8, u, .45), F, 0, .02); k.shape(C.dark, archShape(.08, .4, 8, u, .47), F, .022);}
  }
  // the round minaret rising from the annex roof
  {
    const mx = -2.58, mz = .55, r = .25;
    k.box(C.blue, mx - .3, mx + .3, AH + .07, AH + .2, mz - .3, mz + .3);
    k.lathe(C.sky, [[r, 0], [r, 1.9]], mx, mz, 16, 0, AH + .2);
    helixLattice(k, C.grid, mx, mz, r + .004, AH + .2, AH + 2.1, ST);
    for (const y of [AH + .7, AH + 1.4]) {k.lathe(C.blue, [[r + .015, 0], [r + .015, .05]], mx, mz, 16, 0, y); for (let i = 0; i < 4; i++) {const a = i * PI / 2 + PI / 4; k.shape(C.blue, archShape(.035, .07, 4, 0, y + .14), drumFrame(mx, mz, r + .005, a), .004);}}
    // gallery
    k.lathe(C.blue, [[r, 0], [.37, .06], [.37, .12], [.3, .14]], mx, mz, 16, 0, AH + 2.1);
    for (let i = 0; i < 16; i++) {const a = i / 16 * 2 * PI; k.block(C.white, .025, .16, .025, mx + Math.sin(a) * .35, AH + 2.24, mz + Math.cos(a) * .35);}
    k.lathe(C.white, [[.36, 0], [.36, .025]], mx, mz, 16, 0, AH + 2.4);
    // open lantern stage, cornice, onion
    k.lathe(C.white, [[.2, 0], [.2, .48]], mx, mz, 12, 0, AH + 2.24);
    for (let i = 0; i < 6; i++) k.shape(C.dark, archShape(.05, .16, 6, 0, AH + 2.36), drumFrame(mx, mz, .2 * Math.cos(PI / 12), i * PI / 3), .006);
    k.lathe(C.blue, [[.2, 0], [.26, .05], [.26, .09], [.21, .11]], mx, mz, 12, 0, AH + 2.72);
    k.lathe(C.gold, bulb(.2, .46), mx, mz, 16, 0, AH + 2.83);
    finial(k, C.gold, mx, mz, AH + 3.3, .75);
  }
  // ---- boundary wall: blue dwarf wall, white railings, globe lamps on the piers; open before the entrance ----
  const BZ = 1.92;
  for (const [x0, x1] of [[-3.78, ec - .7], [ec + .7, 3.78]]) {
    k.box(C.blue, x0, x1, .03, .32, BZ - .06, BZ + .06);
    k.box(C.white, x0, x1, .32, .35, BZ - .07, BZ + .07);
    for (let x = x0 + .06; x < x1 - .03; x += .08) k.box(C.white, x - .008, x + .008, .35, .66, BZ - .008, BZ + .008);
    k.box(C.white, x0, x1, .64, .67, BZ - .015, BZ + .015);
    const n = Math.max(1, Math.round((x1 - x0) / 1.05));
    for (let i = 0; i <= n; i++) {const x = x0 + .07 + i * (x1 - x0 - .14) / n; k.block(C.blue, .14, .78, .14, x, .03, BZ); k.lathe(C.white, [[.0, 0], [.055, .02], [.07, .07], [.055, .13], [0, .15]], x, BZ, 10, 0, .81);}
  }
  for (const s of [-1, 1]) {const x = ec + s * .7; k.block(C.blue, .2, 1.05, .2, x, .03, BZ); k.lathe(C.white, [[.0, 0], [.07, .03], [.09, .09], [.07, .16], [0, .19]], x, BZ, 10, 0, 1.08);}

  const domeTop = EH + .27 + 1.2;
  return {
    baseWidth: 7.6, detail: [ec, 2.5, EZ1], overview: [0, 2.1, 0], distance: 12.4, elevation: .18, front: EZ1 + .05, back: HZ0 - .42,
    anchors: {roof: {position: [ec, domeTop - .55, .25 + .75]}, 'back-envelope': {position: [hc, 1.6, HZ0 - .45]}, 'front-envelope': {position: [ec, 1.6, EZ1 + .5]}},
    alignPart(kk) {
      kk.box(C.gold, -.56, .56, -.08, 1.32, -.06, -.02); kk.box(C.grid, -.5, .5, -.02, 1.26, -.05, .0);
      kk.box(C.sky, -.4, .4, .02, .22, -.02, .3); lattice(kk, C.grid, frontAt(.3, 0), -.4, .4, .02, .22, .12, .003, .008);
      kk.box(C.blue, -.43, .43, .22, .26, -.03, .33);
      kk.lathe(C.blue, [[.27, 0], [.27, .08], [.29, .1]], 0, .15, 18, 0, .26);
      kk.lathe(C.gold, bulb(.27, .58), 0, .15, 20, 0, .36);
      kk.lathe(C.gold, [[.025, 0], [.035, .05], [.018, .14], [.0, .2]], 0, .15, 8, 0, .96);
      crescent(kk, C.gold, frontAt(.15, 0), 0, 1.2, .06, .008);
      kk.box(C.dark, -.44, .44, -.05, -.03, -.01, .01);
    },
  };
}

export const KAMPONG_STOPS = {'kampong-gelam-01': bussorah, 'kampong-gelam-02': gedungKuning, 'kampong-gelam-04': sultanPress, 'kampong-gelam-05': madrasah, 'kampong-gelam-06': malabar};
