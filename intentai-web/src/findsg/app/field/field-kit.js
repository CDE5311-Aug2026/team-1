/* Hunt (2 Nov 2026): a small solid-modelling kit for the bespoke stop buildings.
 * Every call adds triangles to one batch per material, so a building of a few thousand faces is drawn in a dozen
 * calls and hit-tested as a dozen nodes. Shapes are authored the way the Earth Online landmark replicas are: facade
 * outlines (arches, cusped arches, rectangles) pushed out of a wall, lathed shafts and domes, prisms and hipped roofs.
 * Units are model units (about 1 : 3.3 of the real building). Winding does not matter: the renderer draws both sides
 * and flips normals to the viewer, but normals are always computed from the winding so the two stay consistent. */
const PI = Math.PI;

function normals(p, ix) {
  const n = new Float32Array(p.length);
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    for (const v of [a, b, c]) {n[v] += x; n[v + 1] += y; n[v + 2] += z;}
  }
  for (let i = 0; i < n.length; i += 3) {const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;}
  return n;
}

/* ---- 2D outlines (u across the wall, v up) ---- */
export const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
/** round-headed opening: straight jambs to `spring`, then a semicircle */
export function archShape(hw, spring, n = 12, cu = 0, v0 = 0) {
  const pts = [[cu - hw, v0], [cu + hw, v0]];
  for (let i = 0; i <= n; i++) {const a = i / n * PI; pts.push([cu + Math.cos(a) * hw, v0 + spring + Math.sin(a) * hw]);}
  return pts;
}
/** pointed (two-centred) arch */
export function pointedShape(hw, spring, n = 8, cu = 0, v0 = 0) {
  // equilateral arch: each side is an arc of radius 2hw centred on the opposite springing point
  const pts = [[cu - hw, v0], [cu + hw, v0]];
  for (let i = 0; i <= n; i++) {const a = i / n * PI / 3; pts.push([cu - hw + 2 * hw * Math.cos(a), v0 + spring + 2 * hw * Math.sin(a)]);}
  for (let i = n - 1; i >= 0; i--) {const a = i / n * PI / 3; pts.push([cu + hw - 2 * hw * Math.cos(a), v0 + spring + 2 * hw * Math.sin(a)]);}
  return pts;
}
/** multifoil (cusped) arch, as on Indo-Saracenic entrances */
export function foilShape(hw, spring, lobes = 4, n = 22, cu = 0, v0 = 0) {
  const pts = [[cu - hw, v0], [cu + hw, v0], [cu + hw, v0 + spring]];
  for (let i = 1; i < n; i++) {const t = PI * i / n, r = hw * (.84 + .16 * Math.abs(Math.cos(lobes * t))); pts.push([cu + Math.cos(t) * r, v0 + spring + Math.sin(t) * r * 1.08]);}
  pts.push([cu - hw, v0 + spring]);
  return pts;
}
export const ring = (r, n = 16, cu = 0, cv = 0) => Array.from({length: n}, (_, i) => [cu + Math.cos(i / n * 2 * PI) * r, cv + Math.sin(i / n * 2 * PI) * r]);
/** onion dome profile [[radius, height]] from the drum (r at 0) to the tip */
export function onion(r, h = r * 2.3) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {const t = i / 12, bulge = Math.sin(Math.min(1, t * 1.55) * PI) * .32, taper = (1 - t) ** 1.35; pts.push([r * Math.max(.02, taper * (1 + bulge)), h * t]);}
  return pts;
}

/* ---- frames: map (u, v, w) on a wall to model space. w is the outward offset. ---- */
export const frontAt = (z, cx = 0) => (u, v, w = 0) => [cx + u, v, z + w];
export const backAt = (z, cx = 0) => (u, v, w = 0) => [cx - u, v, z - w];
export const sideAt = (x, dir = 1, cz = 0) => (u, v, w = 0) => [x + w * dir, v, cz - u * dir];

export function createKit() {
  const batches = new Map();
  const bucket = mat => {let b = batches.get(mat); if (!b) {b = {p: [], n: [], i: []}; batches.set(mat, b);} return b;};
  function append(mat, p, ix) {
    const b = bucket(mat), base = b.p.length / 3, n = normals(p, ix);
    for (let k = 0; k < p.length; k++) {b.p.push(p[k]); b.n.push(n[k]);}
    for (const k of ix) b.i.push(base + k);
  }
  /** flat-shaded polygon list: each face is its own vertices */
  function faces(mat, list) {
    const p = [], ix = [];
    for (const face of list) {
      const start = p.length / 3;
      face.forEach(v => p.push(v[0], v[1], v[2]));
      for (let k = 1; k < face.length - 1; k++) ix.push(start, start + k, start + k + 1);
    }
    append(mat, p, ix);
  }
  /** fan-triangulated cap from the centroid; fine for convex and star-shaped outlines (arches, foils, domes) */
  function cap(points3) {
    const c = [0, 0, 0]; points3.forEach(v => {c[0] += v[0]; c[1] += v[1]; c[2] += v[2];});
    c[0] /= points3.length; c[1] /= points3.length; c[2] /= points3.length;
    return points3.map((v, k) => [c, v, points3[(k + 1) % points3.length]]);
  }
  const kit = {
    /** axis-aligned box from corner coordinates */
    box(mat, x0, x1, y0, y1, z0, z1) {
      faces(mat, [
        [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
        [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
        [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
      ]);
    },
    /** centred box standing on y0, optionally turned about y */
    block(mat, w, h, d, cx, y0, cz, ry = 0) {
      if (!ry) return kit.box(mat, cx - w / 2, cx + w / 2, y0, y0 + h, cz - d / 2, cz + d / 2);
      const c = Math.cos(ry), s = Math.sin(ry), P = (x, y, z) => [cx + x * c + z * s, y, cz - x * s + z * c];
      const x = w / 2, z = d / 2, y1 = y0 + h;
      faces(mat, [
        [P(-x, y0, z), P(x, y0, z), P(x, y1, z), P(-x, y1, z)], [P(x, y0, -z), P(-x, y0, -z), P(-x, y1, -z), P(x, y1, -z)],
        [P(x, y0, z), P(x, y0, -z), P(x, y1, -z), P(x, y1, z)], [P(-x, y0, -z), P(-x, y0, z), P(-x, y1, z), P(-x, y1, -z)],
        [P(-x, y1, z), P(x, y1, z), P(x, y1, -z), P(-x, y1, -z)], [P(-x, y0, -z), P(x, y0, -z), P(x, y0, z), P(-x, y0, z)],
      ]);
    },
    /** a facade outline pushed out of a wall between offsets w0 and w1 */
    slab(mat, pts, frame, w0, w1) {
      const a = pts.map(([u, v]) => frame(u, v, w0)), b = pts.map(([u, v]) => frame(u, v, w1)), list = [];
      list.push(...cap(b), ...cap(a).map(t => t.slice().reverse()));
      for (let k = 0; k < pts.length; k++) {const j = (k + 1) % pts.length; list.push([a[k], a[j], b[j], b[k]]);}
      faces(mat, list);
    },
    /** a flat shape laid on a wall (a recess, glass, a painted panel) */
    shape(mat, pts, frame, w) {faces(mat, cap(pts.map(([u, v]) => frame(u, v, w))));},
    /** vertical prism over an xz outline */
    prism(mat, outline, y0, y1) {
      const a = outline.map(([x, z]) => [x, y0, z]), b = outline.map(([x, z]) => [x, y1, z]), list = [...cap(b), ...cap(a)];
      for (let k = 0; k < outline.length; k++) {const j = (k + 1) % outline.length; list.push([a[k], a[j], b[j], b[k]]);}
      faces(mat, list);
    },
    /** revolve a [[radius, y]] profile about a vertical axis; smooth around, creased at each profile vertex */
    lathe(mat, profile, cx = 0, cz = 0, segments = 16, phase = 0, y = 0) {
      const p = [], ix = [];
      for (let s = 0; s < profile.length - 1; s++) {
        const start = p.length / 3;
        for (const [r, h] of [profile[s], profile[s + 1]]) for (let k = 0; k <= segments; k++) {
          const a = phase + k / segments * 2 * PI; p.push(cx + Math.sin(a) * r, y + h, cz + Math.cos(a) * r);
        }
        for (let k = 0; k < segments; k++) {const q = start + k, r = start + segments + 1 + k; ix.push(q, q + 1, r + 1, q, r + 1, r);}
      }
      const last = profile[profile.length - 1], first = profile[0];
      for (const [r, h] of [last, first]) if (r > .001) {
        const start = p.length / 3; p.push(cx, y + h, cz);
        for (let k = 0; k <= segments; k++) {const a = phase + k / segments * 2 * PI; p.push(cx + Math.sin(a) * r, y + h, cz + Math.cos(a) * r);}
        for (let k = 0; k < segments; k++) ix.push(start, start + 1 + k, start + 2 + k);
      }
      append(mat, p, ix);
    },
    /** frustum / hipped roof: a w0 x d0 rectangle at y0 rising h to a w1 x d1 rectangle (a ridge when one is 0) */
    hip(mat, cx, cz, w0, d0, w1, d1, y0, h) {
      const A = [[-w0 / 2, -d0 / 2], [w0 / 2, -d0 / 2], [w0 / 2, d0 / 2], [-w0 / 2, d0 / 2]].map(([x, z]) => [cx + x, y0, cz + z]);
      const B = [[-w1 / 2, -d1 / 2], [w1 / 2, -d1 / 2], [w1 / 2, d1 / 2], [-w1 / 2, d1 / 2]].map(([x, z]) => [cx + x, y0 + h, cz + z]);
      const list = [A.slice().reverse()];
      for (let k = 0; k < 4; k++) {const j = (k + 1) % 4, f = [A[k], A[j], B[j], B[k]]; list.push(f.filter((v, i) => i < 2 || Math.hypot(v[0] - f[i - 1][0], v[2] - f[i - 1][2]) > 1e-5 || i === 2));}
      if (w1 > 1e-4 && d1 > 1e-4) list.push(B);
      faces(mat, list);
    },
    /** gabled roof along x: eaves at y0, ridge at y0 + h, overhang included in w and d */
    gable(mat, cx, cz, w, d, y0, h, thick = .05) {
      const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
      faces(mat, [
        [[x0, y0, z1], [x1, y0, z1], [x1, y0 + h, cz], [x0, y0 + h, cz]], [[x1, y0, z0], [x0, y0, z0], [x0, y0 + h, cz], [x1, y0 + h, cz]],
        [[x0, y0 - thick, z1], [x1, y0 - thick, z1], [x1, y0, z1], [x0, y0, z1]], [[x1, y0 - thick, z0], [x0, y0 - thick, z0], [x0, y0, z0], [x1, y0, z0]],
        [[x0, y0, z0], [x0, y0, z1], [x0, y0 + h, cz]], [[x1, y0, z1], [x1, y0, z0], [x1, y0 + h, cz]],
      ]);
    },
    triangles(mat, list) {faces(mat, list);},
    /** a swept tube (ridge rolls, swallowtails, rails) through 3D points */
    tube(mat, points, r, sides = 6) {
      const p = [], ix = [];
      points.forEach((q, j) => {
        const a = points[Math.max(0, j - 1)], b = points[Math.min(points.length - 1, j + 1)];
        let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const tl = Math.hypot(...t) || 1; t = t.map(v => v / tl);
        const ref = Math.abs(t[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
        let u = [ref[1] * t[2] - ref[2] * t[1], ref[2] * t[0] - ref[0] * t[2], ref[0] * t[1] - ref[1] * t[0]]; const ul = Math.hypot(...u) || 1; u = u.map(v => v / ul);
        const w = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
        const rr = typeof r === 'function' ? r(j / (points.length - 1)) : r;
        for (let k = 0; k <= sides; k++) {const ang = k / sides * 2 * PI + PI / sides, c = Math.cos(ang) * rr, s = Math.sin(ang) * rr; p.push(q[0] + u[0] * c + w[0] * s, q[1] + u[1] * c + w[1] * s, q[2] + u[2] * c + w[2] * s);}
        if (j < points.length - 1) for (let k = 0; k < sides; k++) {const m = j * (sides + 1) + k, n = m + sides + 1; ix.push(m, m + 1, n + 1, m, n + 1, n);}
      });
      append(mat, p, ix);
    },
    /** bounds of everything drawn so far (before flush) */
    bounds() {
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (const b of batches.values()) for (let i = 0; i < b.p.length; i++) {const a = i % 3; if (b.p[i] < min[a]) min[a] = b.p[i]; if (b.p[i] > max[a]) max[a] = b.p[i];}
      return {min, max};
    },
    /** emit one mesh per material under `parent` and return the nodes */
    flush(c, parent, tag) {
      const nodes = [];
      for (const [mat, b] of batches) if (b.i.length) {
        const node = c.mesh({positions: b.p, indices: b.i, normals: b.n}, mat, parent);
        if (tag) tag(node, mat); nodes.push(node);
      }
      batches.clear(); return nodes;
    },
  };
  return kit;
}
