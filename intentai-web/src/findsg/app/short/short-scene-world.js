import {createStage} from '../native/NativeKit.js';
import {hitQuestScene, projectQuestPoint} from '../game/quest-engine.js';

const PI = Math.PI, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a + (b - a) * t;
const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, n) => a.map(v => v * n), dot = (a, b) => a.reduce((v, n, i) => v + n * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => mul(a, 1 / (Math.hypot(...a) || 1));
const copyPose = p => ({...p, target: p.target.slice()});
function rotate(p, r = [0, 0, 0]) {
  r = r || [0, 0, 0];
  const [x, y, z] = p, cz = Math.cos(r[2]), sz = Math.sin(r[2]), cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]);
  const xx = x * cz - y * sz, yy = x * sz + y * cz, y2 = yy * cx - z * sx, z2 = yy * sx + z * cx;
  return [xx * cy + z2 * sy, y2, -xx * sy + z2 * cy];
}
function tag(node, id, role = 'detail') {node.userData.questTargetId = id; node.userData.questRole = role; return node;}

/** Static detail is merged by material, leaving the actual selectable pieces
 * separate. Both native WebGL and software-3d draw the same exterior geometry. */
function batch(stage, parent) {
  const parts = new Map();
  const put = (geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) => {
    if (!parts.has(material)) parts.set(material, {positions: [], normals: [], indices: []});
    const out = parts.get(material), start = out.positions.length / 3;
    for (let i = 0; i < geometry.positions.length; i += 3) {
      out.positions.push(...add(rotate(Array.from(geometry.positions.slice(i, i + 3)), rotation), position));
      out.normals.push(...rotate(Array.from(geometry.normals.slice(i, i + 3)), rotation));
    }
    out.indices.push(...geometry.indices.map(index => index + start));
  };
  return {put,
    box(w, h, d, mat, p, r) {put(stage.box(w, h, d), mat, p, r);},
    cyl(radius, height, mat, p, r, segments = 16, bottom = radius) {put(stage.cylinder(radius, bottom, height, segments), mat, p, r);},
    line(points, radius, mat) {put(stage.tube(points, radius, 6), mat);},
    finish() {return [...parts].map(([material, data]) => stage.add(stage.geometry(data.positions, data.indices, data.normals), material, {parent}));},
  };
}
function lathe(stage, profile, segments = 40) {
  const p = [], n = [], ix = [];
  profile.forEach(([r, y], row) => {
    const before = profile[Math.max(0, row - 1)], after = profile[Math.min(profile.length - 1, row + 1)], dy = after[1] - before[1], dr = after[0] - before[0];
    for (let i = 0; i <= segments; i++) {const a = i * PI * 2 / segments; p.push(Math.sin(a) * r, y, Math.cos(a) * r); n.push(...unit([Math.sin(a) * dy, -dr, Math.cos(a) * dy])); if (row < profile.length - 1 && i < segments) {const k = row * (segments + 1) + i; ix.push(k, k + 1, k + segments + 1, k + 1, k + segments + 2, k + segments + 1);}}
  });
  return stage.geometry(p, ix, n);
}
function archFace(stage, radius, rise, drop, pointed = false) {
  const p = [0, 0, 0, -radius, -drop, 0, radius, -drop, 0], ix = [];
  for (let i = 0; i <= 24; i++) {const a = i * PI / 24; p.push(Math.cos(a) * radius, (pointed ? (1 - Math.abs(Math.cos(a))) ** .65 : Math.sin(a)) * rise, 0);}
  const count = p.length / 3; for (let i = 1; i < count; i++) ix.push(0, i, i === count - 1 ? 1 : i + 1);
  return stage.geometry(p, ix);
}
function archRim(stage, radius, rise, thickness = .10, depth = .11, pointed = false) {
  const p = [], ix = [], segments = 28;
  for (let i = 0; i <= segments; i++) {
    const a = i * PI / segments, archY = pointed ? (1 - Math.abs(Math.cos(a))) ** .65 : Math.sin(a);
    p.push(Math.cos(a) * (radius + thickness), archY * (rise + thickness), depth, Math.cos(a) * radius, archY * rise, depth, Math.cos(a) * (radius + thickness), archY * (rise + thickness), -depth, Math.cos(a) * radius, archY * rise, -depth);
    if (i < segments) {const k = i * 4; ix.push(k, k + 4, k + 1, k + 1, k + 4, k + 5, k + 2, k + 3, k + 6, k + 3, k + 7, k + 6, k, k + 2, k + 4, k + 2, k + 6, k + 4, k + 1, k + 5, k + 3, k + 3, k + 5, k + 7);}
  }
  return stage.geometry(p, ix);
}
function disc(stage, radius, segments = 12) {
  const p = [0, 0, .008], ix = []; for (let i = 0; i <= segments; i++) {const a = i * PI * 2 / segments; p.push(Math.cos(a) * radius, Math.sin(a) * radius, 0); if (i < segments) ix.push(0, i + 1, i + 2);} return stage.geometry(p, ix);
}
const materials = () => ({
  plaster: {color: '#eee6ce', roughness: .9}, cream: {color: '#fff4da', roughness: .82}, shade: {color: '#bdbaa2', roughness: .95},
  stone: {color: '#c8b99c', roughness: .95}, darkStone: {color: '#5e7165', roughness: .8}, shutter: {color: '#314e49', roughness: .74},
  slat: {color: '#597163', roughness: .74}, dark: {color: '#233c37', roughness: .7}, bronze: {color: '#82704b', roughness: .53, metalness: .35},
  gold: {color: '#d9aa49', roughness: .3, metalness: .72}, goldLight: {color: '#f2cb72', roughness: .32, metalness: .55},
  roof: {color: '#8f7960', roughness: .9}, paper: {color: '#f2e3ba', roughness: .98}, orange: {color: '#e7a154', roughness: .45, emissive: '#c68c42', emissiveIntensity: .08},
});
function ground(stage, parent, M, width, depth) {
  const b = batch(stage, parent); b.box(width + .5, .20, depth + .5, M.darkStone, [0, -.14, 0]); b.box(width, .16, depth, M.stone, [0, 0, 0]);
  for (let i = -Math.floor(width); i <= Math.floor(width); i++) b.box(.012, .012, depth - .04, M.shade, [i * .5, .088, 0]);
  for (let i = -Math.floor(depth); i <= Math.floor(depth); i++) b.box(width - .04, .012, .012, M.shade, [0, .089, i * .5]);
  b.finish();
}

function pressModel(stage, root, M) {
  const b = batch(stage, root), target = tag(stage.group({parent: root}), 'arch');
  ground(stage, root, M, 8.0, 5.3);
  b.box(6.6, 3.97, 2.8, M.plaster, [0, 2.16, -.13]);
  b.box(6.9, .22, 3.12, M.shade, [0, .26, -.05]); b.box(7.15, .10, 3.45, M.cream, [0, .40, .06]);
  for (const [y, h, d] of [[2.1, .16, 3.1], [2.28, .08, 3.23], [4.15, .15, 3.15], [4.31, .10, 3.32], [4.44, .12, 3.2]]) b.box(6.82, h, d, M.cream, [0, y, -.1]);
  b.put(lathe(stage, [[.25, 0], [.19, .05], [.10, .22], [.025, .33]], 16), M.cream, [0, 4.62, 1.48]);
  b.box(1.6, .27, .35, M.plaster, [0, 4.48, 1.4]); b.box(1.85, .08, .45, M.cream, [0, 4.65, 1.4]);
  b.box(6.2, .14, 2.5, M.roof, [0, 4.39, -.2]);
  const archMaterial = {...M.cream};
  for (const x of [-2.05, 0, 2.05]) {
    b.put(archFace(stage, .74, .69, 1.02), M.dark, [x, 1.18, 1.31]); b.put(archRim(stage, .74, .69, .105, .09), M.cream, [x, 1.18, 1.44]);
    for (const side of [-1, 1]) {b.box(.58, 1.13, .07, M.shutter, [x + side * .31, .96, 1.36]); b.box(.04, 1.13, .09, M.bronze, [x + side * .60, .96, 1.43]); for (let j = 0; j < 7; j++) b.box(.49, .055, .035, M.slat, [x + side * .31, .55 + j * .13, 1.41]);}
    b.put(archFace(stage, .69, .62, 1.1), M.dark, [x, 3.36, 1.31]);
    stage.add(archRim(stage, .69, .62, .12, .11), archMaterial, {parent: target, position: [x, 3.36, 1.45]});
    for (const side of [-1, 1]) {
      b.box(.54, 1.06, .075, M.shutter, [x + side * .295, 2.80, 1.38]);
      b.box(.055, 1.14, .105, M.cream, [x + side * .65, 2.81, 1.46]);
      for (let j = 0; j < 9; j++) b.box(.47, .052, .055, j % 3 ? M.slat : M.shutter, [x + side * .295, 2.35 + j * .11, 1.45], [-.17, 0, 0]);
      b.box(.025, 1.04, .07, M.bronze, [x + side * .036, 2.80, 1.44]);
    }
    for (let j = 1; j <= 5; j++) {const a = j * PI / 6; b.line([[x, 3.36, 1.4], [x + Math.cos(a) * .63, 3.36 + Math.sin(a) * .55, 1.4]], .015, M.bronze);}
    b.box(1.56, .12, .32, M.cream, [x, 2.19, 1.52]);
    for (let j = -3; j <= 3; j++) {b.cyl(.035, .22, M.cream, [x + j * .17, 2.34, 1.64], null, 8);}
    b.box(1.43, .045, .07, M.cream, [x, 2.48, 1.64]);
  }
  for (const x of [-3.17, -1.025, 1.025, 3.17]) {
    b.box(.29, 1.62, .28, M.cream, [x, 1.23, 1.45]); b.box(.43, .12, .42, M.cream, [x, .48, 1.49]);
    b.cyl(.115, 1.48, M.cream, [x, 3.10, 1.47], null, 16, .14);
    for (const y of [2.35, 3.87]) b.box(.39, .11, .37, M.cream, [x, y, 1.47]);
    b.box(.35, .10, .34, M.shade, [x, 3.98, 1.45]);
    for (let flute = 0; flute < 6; flute++) {const a = flute * PI / 5; b.cyl(.013, 1.36, M.shade, [x + Math.cos(a) * .119, 3.10, 1.47 + Math.sin(a) * .119], null, 6);}
  }
  // Side elevations remain exterior, with shuttered openings and masonry trim.
  for (const side of [-1, 1]) for (const z of [-.85, .5]) {
    b.box(.055, 1.25, .74, M.shutter, [side * 3.32, 2.91, z]);
    for (let j = 0; j < 9; j++) b.box(.075, .055, .65, M.slat, [side * 3.35, 2.45 + j * .11, z]);
    for (const y of [2.22, 3.62]) b.box(.16, .10, .94, M.cream, [side * 3.34, y, z]);
  }
  b.box(6.7, .12, .56, M.stone, [0, .16, 1.79]); b.box(7.0, .08, .44, M.cream, [0, .10, 2.10]); b.finish();
  const rubbing = stage.group({parent: root}); rubbing.visible = false; rubbing.userData.questIgnorePick = true;
  const rub = batch(stage, rubbing); rub.box(1.76, 1.76, .025, M.paper, [0, 0, 0]);
  rub.put(archRim(stage, .61, .57, .032, .012), M.bronze, [0, .06, .04]);
  for (const x of [-.61, .61]) rub.box(.027, .55, .015, M.bronze, [x, -.215, .04]);
  for (const x of [-.77, .77]) rub.box(.008, 1.54, .01, M.bronze, [x, 0, .027]);
  for (const y of [-.77, .77]) rub.box(1.54, .008, .01, M.bronze, [0, y, .027]);
  rub.finish().forEach(n => n.userData.questIgnorePick = true);
  return {kind: 'press', root, featureId: 'arch', featurePoint: [0, 4.025, 1.57], overview: {target: [0, 2.15, .1], yaw: .40, elevation: .23, distance: 11.9}, detail: {target: [0, 3.24, 1.38], yaw: .08, elevation: .11, distance: 5.15},
    update({inspect = 0}) {archMaterial.color = inspect ? '#e4b469' : '#fff4da'; archMaterial.emissive = '#bd782b'; archMaterial.emissiveIntensity = inspect * .16; rubbing.visible = inspect > .01; rubbing.position = [-.8 * inspect, 3.58 + inspect * 1.17, 1.6 + inspect * 1.02]; rubbing.rotation = [-.06 * inspect, -.22 * inspect, -.04 * inspect]; const scale = .05 + inspect * .55; rubbing.scale = [scale, scale, scale];},
  };
}

function mosqueModel(stage, root, M) {
  const b = batch(stage, root), band = tag(stage.group({parent: root}), 'bottle-band'), bands = [], bandMaterials = [];
  ground(stage, root, M, 8.4, 8.2);
  b.box(6.2, .44, 5.7, M.shade, [0, .36, 0]); b.box(6.42, .14, 5.9, M.cream, [0, .62, 0]); b.box(6.0, 2.35, 5.52, M.plaster, [0, 1.87, 0]);
  for (const y of [.8, 2.87, 3.06]) b.box(6.2, .105, 5.72, M.cream, [0, y, 0]);
  b.box(6.12, .1, 5.6, M.stone, [0, 3.18, 0]);
  const window = (x, y, z, width, rise, drop, side = 0) => {
    b.put(archFace(stage, width, rise, drop, true), M.dark, [x, y, z], [0, side, 0]);
    b.put(archRim(stage, width, rise, .075, .055, true), M.cream, [x, y, z + (side === 0 ? .05 : 0)], [0, side, 0]);
    for (let j = -2; j <= 2; j++) {const offset = rotate([j * width / 3.1, -drop * .36, .03], [0, side, 0]); b.box(side ? .04 : .019, drop * .78, side ? .019 : .04, M.bronze, add([x, y, z], offset));}
  };
  for (const x of [-2.4, -1.32, 1.32, 2.4]) window(x, 1.91, 2.78, .35, .54, .68);
  for (const side of [-1, 1]) for (const z of [-1.9, -.7, .5, 1.7]) window(side * 3.025, 1.9, z, .34, .55, .72, side * PI / 2);
  window(0, 1.9, 2.80, .72, .97, 1.12);
  b.box(2.4, .11, 1.4, M.cream, [0, 2.33, 3.27]); b.box(2.7, .09, 1.62, M.stone, [0, 2.42, 3.27]); b.box(2.86, .08, 1.75, M.cream, [0, 2.50, 3.27]);
  for (const x of [-1.07, 1.07]) for (const z of [2.75, 3.81]) {b.cyl(.07, 1.52, M.cream, [x, 1.50, z], null, 12); b.box(.22, .13, .22, M.shade, [x, .79, z]); b.box(.20, .11, .20, M.cream, [x, 2.22, z]);}
  for (let i = 0; i < 4; i++) b.box(2.55 + i * .08, .14, .36, M.cream, [0, .59 - i * .14, 3.79 + i * .23]);
  for (let i = -10; i <= 10; i++) {
    const x = i * .29; b.put(lathe(stage, [[.08, 0], [.075, .09], [.025, .20], [.0, .23]], 8), M.cream, [x, 3.20, 2.81]);
    b.put(lathe(stage, [[.08, 0], [.075, .09], [.025, .20], [.0, .23]], 8), M.cream, [x, 3.20, -2.81]);
  }
  for (const side of [-1, 1]) for (let i = -8; i <= 8; i++) b.put(lathe(stage, [[.075, 0], [.065, .08], [.0, .22]], 8), M.cream, [side * 3.04, 3.20, i * .31]);
  const domeProfile = [[1.18, 0], [1.33, .15], [1.48, .42], [1.49, .65], [1.38, .91], [1.18, 1.18], [.90, 1.46], [.58, 1.72], [.28, 1.98], [.10, 2.18], [.025, 2.24]];
  for (const z of [1.64, -1.64]) {
    b.put(lathe(stage, [[1.18, 0], [1.23, .10], [1.18, .16], [1.18, .73]], 48), M.cream, [0, 3.18, z]);
    b.put(lathe(stage, domeProfile, 48), M.gold, [0, 4.29, z]);
    b.put(lathe(stage, [[1.21, 0], [1.24, .045], [1.23, .09]], 48), M.goldLight, [0, 4.23, z]);
    b.cyl(.035, .54, M.goldLight, [0, 6.70, z], null, 10); b.cyl(.12, .045, M.goldLight, [0, 6.54, z], null, 16);
    const crescent = []; for (let i = 0; i <= 16; i++) {const a = -.73 * PI + i / 16 * 1.46 * PI; crescent.push([Math.cos(a) * .17, 6.99 + Math.sin(a) * .17, z]);} b.line(crescent, .035, M.goldLight);
    const darkBand = {...M.dark, color: '#303b31', roughness: .5, metalness: .1};
    stage.add(lathe(stage, [[1.235, 0], [1.235, .35]], 48), darkBand, {parent: band, position: [0, 3.91, z]}); bandMaterials.push(darkBand);
    // Three raised rows of glass discs remain geometry at every zoom level.
    for (let sector = 0; sector < 12; sector++) {
      const mat = {color: sector % 2 ? '#426353' : '#395549', roughness: .26, metalness: .35, emissive: '#bcd4a4', emissiveIntensity: 0}, glass = batch(stage, band);
      for (let local = 0; local < 5; local++) for (let row = 0; row < 3; row++) {const a = (sector * 5 + local + (row % 2) * .45) / 60 * PI * 2; glass.put(disc(stage, .047, 12), mat, [Math.sin(a) * 1.247, 3.967 + row * .11, z + Math.cos(a) * 1.247], [0, a, 0]);}
      glass.finish(); bands.push({mat, sector});
    }
  }
  for (const x of [-2.83, 2.83]) for (const z of [-2.46, 2.46]) {
    b.put(lathe(stage, [[.27, 0], [.25, .12], [.20, 1.20], [.19, 1.62]], 20), M.cream, [x, 2.85, z]);
    for (const y of [3.11, 4.25, 4.46]) b.cyl(.30, .075, M.cream, [x, y, z], null, 20);
    b.cyl(.35, .075, M.goldLight, [x, 4.53, z], null, 20);
    for (let i = 0; i < 6; i++) {const a = i * PI / 3; b.cyl(.025, .42, M.cream, [x + Math.sin(a) * .24, 4.77, z + Math.cos(a) * .24], null, 6);}
    b.cyl(.36, .075, M.cream, [x, 5.0, z], null, 20);
    b.put(lathe(stage, [[.27, 0], [.34, .12], [.28, .29], [.13, .46], [.02, .60]], 24), M.gold, [x, 5.04, z]);
    b.cyl(.022, .25, M.goldLight, [x, 5.73, z], null, 8);
  }
  b.finish();
  const bottle = tag(stage.group({parent: root}), 'bottle', 'piece'), prop = batch(stage, bottle);
  const glassMat = {color: '#4f7662', roughness: .22, metalness: .3};
  prop.cyl(.31, .11, glassMat, [0, 0, 0], null, 24); prop.cyl(.275, .018, {...M.dark, color: '#294e3c'}, [0, .068, 0], null, 24);
  prop.put(stage.torus(.266, .022, 32, 6), {...M.goldLight, color: '#a9bea0', metalness: .25}, [0, .085, 0], [PI / 2, 0, 0]);
  prop.put(stage.torus(.13, .012, 24, 5), glassMat, [0, .085, 0], [PI / 2, 0, 0]);
  prop.cyl(.055, .012, {...M.slat, color: '#6e9b7a'}, [0, .09, 0], null, 12); prop.finish();
  return {kind: 'mosque', root, bottle, featureId: 'bottle-band', featurePoint: [0, 4.11, 2.89], overview: {target: [0, 3.14, .4], yaw: .34, elevation: .21, distance: 15.9}, detail: {target: [0, 4.34, 1.64], yaw: .08, elevation: .12, distance: 6.1},
    update({inspect = 0, place = 0}) {bandMaterials.forEach(mat => {mat.emissive = '#75976b'; mat.emissiveIntensity = inspect * .075;}); bands.forEach(({mat, sector}) => {const lit = clamp(place * 1.5 - sector / 18, 0, 1); mat.emissiveIntensity = lit * .32; mat.color = lit > .5 ? '#91af87' : sector % 2 ? '#426353' : '#395549';});},
  };
}

export function createShortModel(stage, kind = 'press') {
  const root = stage.group(), M = materials();
  return kind === 'mosque' ? mosqueModel(stage, root, M) : pressModel(stage, root, M);
}
function rayForPoint(clientX, clientY, rect, camera) {
  const forward = unit(sub(camera.target, camera.position)), right = unit(cross(forward, [0, 1, 0])), up = cross(right, forward), extent = Math.tan(camera.fov * PI / 360);
  const sx = ((clientX - rect.left) / rect.width * 2 - 1) * extent * rect.width / rect.height, sy = (1 - (clientY - rect.top) / rect.height * 2) * extent;
  return {origin: camera.position.slice(), direction: unit(add(forward, add(mul(right, sx), mul(up, sy))))};
}

export function createShortSceneWorld(container, {kind = 'press', enabled = false, inspected = false, canPlace = false, placed = false, reducedMotion = false, onInspect = () => {}, onPlace = () => {}, onReady = () => {}, onStatus = () => {}} = {}) {
  const doc = container.ownerDocument, win = doc.defaultView, now = () => win.performance.now();
  let disposed = false, visible = true, raf = 0, cameraTween = null, selected = false, pendingAction = null, gesture = null, statusKey = '', lastFrame = 0;
  let state = {enabled, inspected, canPlace, placed, reducedMotion}, message = '', model, stage, canvas, pose;
  const pointers = new Map(), cleanups = [], motions = new Map(), values = {inspect: inspected ? 1 : 0, place: placed ? 1 : 0};
  const camera = {position: [0, 5, 14], target: [0, 2.6, 0], fov: 43, near: .1, far: 90};
  const reduced = () => state.reducedMotion;
  function report(force = false) {
    const next = {ready: Boolean(stage?.ok), renderer: stage?.engine || '', selected, dragging: gesture?.mode === 'bottle', cue: Boolean(message), message: message || (!state.enabled ? 'Check in at this stop before touching the building details.' : state.placed ? 'The glass band is lit. Every bottle end has its place.' : state.inspected ? kind === 'press' ? 'The window arch outline is traced. Take it to the next stop.' : state.canPlace ? 'Pick up the bottle end and drag it into the band, or select it and tap the band.' : 'You found the dark glass band below the golden dome.' : kind === 'press' ? 'Turn the building and find the curved upper window arch.' : 'Look up and find the dark band at the base of the golden dome.')};
    const key = JSON.stringify(next); if (force || statusKey !== key) {statusKey = key; onStatus(next);}
  }
  function schedule() {if (!disposed && visible && !doc.hidden && !raf) raf = win.requestAnimationFrame(frame);}
  function animate(key, to, duration = 700) {if (reduced()) {values[key] = to; motions.delete(key);} else motions.set(key, {from: values[key], to, start: now(), duration}); schedule();}
  function syncCamera(stamp) {
    if (cameraTween) {const t = clamp((stamp - cameraTween.start) / cameraTween.duration, 0, 1), e = 1 - (1 - t) ** 3; pose = {...cameraTween.to, target: cameraTween.from.target.map((v, i) => mix(v, cameraTween.to.target[i], e)), yaw: mix(cameraTween.from.yaw, cameraTween.to.yaw, e), elevation: mix(cameraTween.from.elevation, cameraTween.to.elevation, e), distance: mix(cameraTween.from.distance, cameraTween.to.distance, e)}; if (t === 1) cameraTween = null;}
    const r = canvas.getBoundingClientRect(), distance = pose.distance * clamp(.96 / Math.max(.6, r.width / Math.max(1, r.height)), 1, 1.32), ce = Math.cos(pose.elevation);
    camera.target = pose.target.slice(); camera.position = [pose.target[0] + Math.sin(pose.yaw) * distance * ce, pose.target[1] + Math.sin(pose.elevation) * distance, pose.target[2] + Math.cos(pose.yaw) * distance * ce];
  }
  function viewPoint(x, y, depth) {
    const forward = unit(sub(camera.target, camera.position)), right = unit(cross(forward, [0, 1, 0])), up = cross(right, forward), r = canvas.getBoundingClientRect(), extent = Math.tan(camera.fov * PI / 360) * depth;
    return add(camera.position, add(mul(forward, depth), add(mul(right, x * extent * r.width / Math.max(1, r.height)), mul(up, y * extent))));
  }
  function move(next, instant = false) {
    const goal = {...pose, ...next, target: (next.target || pose.target).slice()}; goal.distance = clamp(goal.distance, kind === 'mosque' ? 4.7 : 3.8, 22); goal.elevation = clamp(goal.elevation, .04, .85);
    if (instant || reduced()) {pose = goal; cameraTween = null;} else cameraTween = {from: copyPose(pose), to: goal, start: now(), duration: 650}; schedule();
  }
  function draw(stamp = now()) {
    if (disposed || !stage?.ok) return;
    for (const [key, motion] of motions) {const t = clamp((stamp - motion.start) / motion.duration, 0, 1); values[key] = mix(motion.from, motion.to, 1 - (1 - t) ** 3); if (t === 1) motions.delete(key);}
    syncCamera(stamp); model.update(values);
    if (model.bottle) {
      model.bottle.visible = state.canPlace || state.placed;
      const depth = Math.max(3.2, pose.distance * .58), floating = viewPoint(-.68, -.59, depth), source = gesture?.mode === 'bottle' ? viewPoint(gesture.ndc[0], gesture.ndc[1], depth) : floating;
      const to = [0, 4.11, 2.915], t = values.place; model.bottle.position = source.map((v, i) => mix(v, to[i], t)); model.bottle.rotation = [mix(PI / 2 - pose.elevation, PI / 2, t), mix(pose.yaw, 0, t), 0];
      const scale = mix(selected ? 1.16 : 1, .17, t); model.bottle.scale = [scale, scale, scale];
    }
    stage.draw(camera); container.dataset.renderer = stage.engine; container.dataset.feature = model.featureId; container.dataset.selected = String(selected);
  }
  function frame(stamp) {
    raf = 0; if (disposed || !visible || doc.hidden) return;
    const minStep = stage.engine === 'software-3d' ? Math.max(45, (stage.stats?.average_draw_ms || 18) * 1.25) : 16;
    if (stamp - lastFrame < minStep && lastFrame) {schedule(); return;} lastFrame = stamp; draw(stamp);
    if (!cameraTween && pendingAction) {const next = pendingAction; pendingAction = null; activateFeature(next);}
    report(); if (motions.size || cameraTween) schedule();
  }
  function hit(clientX, clientY, ignoreBottle = false) {
    const bottleVisible = model.bottle?.visible; if (ignoreBottle && model.bottle) model.bottle.visible = false;
    const result = hitQuestScene(stage.root, rayForPoint(clientX, clientY, canvas.getBoundingClientRect(), camera));
    if (model.bottle) model.bottle.visible = bottleVisible; return result;
  }
  // Hunt (1 Nov 2026): the arch rim and the glass band are only a few pixels wide on a phone, so a tap counts when the
  // feature is within ~14px of the finger (the direct hit first, then a ring of eight around it).
  function hitNear(clientX, clientY, ignoreBottle = false) {
    const direct = hit(clientX, clientY, ignoreBottle);
    if (direct?.id === model.featureId || direct?.id === 'bottle') return direct;
    for (const r of [7, 14]) for (let k = 0; k < 8; k++) {
      const a = k * PI / 4, near = hit(clientX + Math.cos(a) * r, clientY + Math.sin(a) * r, ignoreBottle);
      if (near?.id === model.featureId) return near;
    }
    return direct;
  }
  function inspectFeature() {
    if (!state.enabled || state.inspected) return false;
    message = kind === 'press' ? 'The curved window arch is lit. Tracing its outline.' : 'Found the glass band. Look closer at the repeating small discs.'; onInspect(model.featureId); report(); return true;
  }
  function placeFeature() {
    if (!state.enabled || !state.inspected || !state.canPlace || state.placed || !selected) return false;
    message = 'The bottle end is set in the virtual band.'; onPlace(); report(); return true;
  }
  function activate(hitResult) {
    if (!state.enabled) {message = 'Check in at this stop first, then work with the building details.'; report(); return false;}
    if (hitResult?.id === 'bottle' && state.canPlace && !state.placed) return selectBottle();
    if (hitResult?.id !== model.featureId) {message = kind === 'press' ? 'Try touching the curved frame of the upper window.' : 'Look below the golden dome for a ring of dark glass discs.'; report(); return false;}
    if (!state.inspected) return inspectFeature();
    if (kind === 'mosque' && selected) return placeFeature();
    message = kind === 'press' ? 'Window arch outline collected.' : 'This is the glass band below the dome.'; report(); return false;
  }
  function activateFeature(action) {
    if (!state.enabled) return false; draw();
    const projected = projectQuestPoint(model.featurePoint, camera, canvas.getBoundingClientRect());
    if (!projected || hit(projected.x, projected.y, true)?.id !== model.featureId) {message = 'This detail is hidden from here. Turn to the front of the building.'; report(); return false;}
    return action === 'place' ? placeFeature() : inspectFeature();
  }
  function selectBottle() {
    if (kind !== 'mosque' || !state.enabled || !state.canPlace || state.placed) return false;
    selected = !selected; message = selected ? 'Bottle end picked up. Drag it to the dark band, or tap the band to set it in place.' : 'Bottle end put back.'; schedule(); report(true); return selected;
  }
  function focus(action) {
    pendingAction = action || null; move(model.detail); message = action ? 'Moving closer to the detail…' : ''; report();
    if (reduced() && pendingAction) {const next = pendingAction; pendingAction = null; activateFeature(next);}
  }
  function cancel() {gesture = null; const ids = [...pointers.keys()]; pointers.clear(); for (const id of ids) {try {if (canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);} catch {}} pendingAction = null; schedule(); report();}
  function listen(target, name, listener, options) {target.addEventListener(name, listener, options); cleanups.push(() => target.removeEventListener(name, listener, options));}

  try {
    stage = createStage(container, {background: '#dce1d5', reducedMotion: true, shadows: true, shadowRange: 11, softwareQuality: {maxWidth: 980, maxHeight: 780, pixels: 560000, pixelRatio: 1.2}, onPick: () => {}, onReady: result => {if (!disposed) onReady({...result, ready: Boolean(result.ok), renderer: stage?.engine || result.engine});}});
    if (!stage?.ok) throw new Error('The building model could not start.');
    canvas = stage.canvas; canvas.className = 'short-scene-canvas'; canvas.style.touchAction = 'none'; canvas.setAttribute('aria-label', kind === 'press' ? 'Press building model: drag to rotate and tap the curved upper window arch. Arrow keys rotate, plus and minus zoom.' : 'Sultan Mosque model: tap the glass band below the dome; once you pick up the bottle end, drag it into the band. Arrow keys rotate, plus and minus zoom.');
    canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home + -'); model = createShortModel(stage, kind); pose = copyPose(model.overview); if (stage.shadow) stage.shadow.target = [0, 2.5, 0]; draw(); report(true);
    listen(canvas, 'pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false && pointers.size === 0) return;
      // Hunt: a first finger starts afresh, so a lift the page never heard cannot turn every later drag into a pinch
      if (event.isPrimary && pointers.size) {pointers.clear(); gesture = null;}
      pendingAction = null; cameraTween = null; canvas.focus({preventScroll: true}); pointers.set(event.pointerId, [event.clientX, event.clientY]);
      try {canvas.setPointerCapture(event.pointerId);} catch {}
      if (pointers.size > 1) {const p = [...pointers.values()]; gesture = {mode: 'pinch', span: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1])}; return;}
      draw(); const picked = hit(event.clientX, event.clientY), r = canvas.getBoundingClientRect(), bottle = picked?.id === 'bottle' && state.enabled && state.canPlace && !state.placed;
      gesture = {mode: bottle ? 'bottle' : 'orbit', start: [event.clientX, event.clientY], last: [event.clientX, event.clientY], moved: false, id: event.pointerId, ndc: [(event.clientX - r.left) / r.width * 2 - 1, 1 - (event.clientY - r.top) / r.height * 2]};
      if (bottle) {selected = true; message = 'Drag it to the dark band below the golden dome, then let go.'; report(); schedule();} event.preventDefault();
    }, true);
    listen(canvas, 'pointermove', event => {
      if (!pointers.has(event.pointerId) || !gesture) return; pointers.set(event.pointerId, [event.clientX, event.clientY]);
      if (pointers.size > 1) {const p = [...pointers.values()], span = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); if (gesture.span && span > 3) move({distance: pose.distance * gesture.span / span}, true); gesture.span = span; event.preventDefault(); return;}
      if (Math.hypot(event.clientX - gesture.start[0], event.clientY - gesture.start[1]) > 5) gesture.moved = true;
      if (gesture.mode === 'bottle') {const r = canvas.getBoundingClientRect(); gesture.ndc = [(event.clientX - r.left) / r.width * 2 - 1, 1 - (event.clientY - r.top) / r.height * 2]; schedule();}
      else if (gesture.moved) move({yaw: pose.yaw - (event.clientX - gesture.last[0]) * .007, elevation: pose.elevation + (event.clientY - gesture.last[1]) * .005}, true);
      gesture.last = [event.clientX, event.clientY]; event.preventDefault();
    }, {capture: true, passive: false});
    const release = (event, cancelled = false) => {
      if (!pointers.has(event.pointerId)) return; const previous = gesture, single = pointers.size === 1; pointers.delete(event.pointerId); gesture = null;
      try {if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);} catch {}
      if (single && !cancelled && previous) {draw(); if (previous.mode === 'bottle') {if (previous.moved && hitNear(event.clientX, event.clientY, true)?.id === model.featureId) placeFeature(); else {message = 'Bottle end picked up. Tap the dark band to set it in place.'; report();}} else if (previous.mode === 'orbit' && !previous.moved) activate(hitNear(event.clientX, event.clientY));}
      if (pointers.size) {const p = [...pointers.values()][0]; gesture = {mode: 'orbit', start: p.slice(), last: p.slice(), moved: true};} schedule(); report(); event.stopImmediatePropagation();
    };
    listen(canvas, 'pointerup', event => release(event), true); listen(canvas, 'pointercancel', event => release(event, true), true); listen(canvas, 'lostpointercapture', event => release(event, true), true);
    listen(canvas, 'wheel', event => {event.preventDefault(); pendingAction = null; move({distance: pose.distance * Math.exp(clamp(event.deltaY, -150, 150) * .0013)}, true);}, {passive: false});
    listen(canvas, 'keydown', event => {if (event.ctrlKey || event.metaKey || event.altKey) return; const action = {ArrowLeft: () => move({yaw: pose.yaw + .20}, true), ArrowRight: () => move({yaw: pose.yaw - .20}, true), ArrowUp: () => move({elevation: pose.elevation + .08}, true), ArrowDown: () => move({elevation: pose.elevation - .08}, true), '+': () => move({distance: pose.distance * .88}, true), '=': () => move({distance: pose.distance * .88}, true), '-': () => move({distance: pose.distance * 1.12}, true), Home: () => move(model.overview)}[event.key]; if (action) {event.preventDefault(); pendingAction = null; action();}});
    const resize = () => {if (!disposed) {stage.resize(); schedule();}}, observer = win.ResizeObserver ? new win.ResizeObserver(resize) : null; observer?.observe(container); if (!observer) listen(win, 'resize', resize); cleanups.push(() => observer?.disconnect());
    const intersection = win.IntersectionObserver ? new win.IntersectionObserver(entries => {visible = entries[0]?.isIntersecting !== false; if (visible) schedule(); else {if (raf) win.cancelAnimationFrame(raf); raf = 0; cancel();}}, {rootMargin: '60px'}) : null; intersection?.observe(container); cleanups.push(() => intersection?.disconnect());
    listen(doc, 'visibilitychange', () => {if (doc.hidden) {if (raf) win.cancelAnimationFrame(raf); raf = 0; cancel();} else schedule();}); listen(win, 'blur', cancel);
  } catch (error) {disposed = true; stage?.dispose(); throw error;}
  return {engine: stage.engine,
    setState(next) {
      if (disposed) return; const before = state; state = {...state, ...next};
      if (!state.enabled) {selected = false; cancel();} message = '';
      if (before.inspected !== state.inspected) animate('inspect', state.inspected ? 1 : 0, 900);
      if (before.placed !== state.placed) {animate('place', state.placed ? 1 : 0, 1500); if (state.placed) {selected = false; move(model.detail);}}
      if (!state.canPlace && !state.placed) selected = false;
      if (state.reducedMotion) {for (const [key, motion] of motions) values[key] = motion.to; motions.clear(); if (cameraTween) {pose = copyPose(cameraTween.to); cameraTween = null;}}
      schedule(); report();
    },
    focus: () => focus(), inspect: () => {if (state.enabled && !state.inspected) focus('inspect');}, selectBottle,
    place: () => {if (state.enabled && state.inspected && state.canPlace && selected && !state.placed) focus('place');},
    overview() {pendingAction = null; move(model.overview);}, rotate(delta) {pendingAction = null; move({yaw: pose.yaw + delta});}, zoom(factor) {pendingAction = null; move({distance: pose.distance * factor});},
    dispose() {if (disposed) return; disposed = true; if (raf) win.cancelAnimationFrame(raf); cleanups.forEach(cleanup => cleanup()); pointers.clear(); motions.clear(); stage.dispose();},
  };
}
