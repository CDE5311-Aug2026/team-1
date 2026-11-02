import {createStage} from '../native/NativeKit.js';
import {createNativeRoomBuilder} from '../rooms/RoomWorld.js';
import {buildFieldModel} from '../field/field-models.js';
import {drawAlignPart, stopAlignPart} from '../field/field-stops.js';
import {createQuestState, reduceQuest, isQuestSolved, isQuestItemFacing, questTarget, lockCode} from './quest-logic.js';
import {stopAssembly, partPalette, ghostPalette} from '../field/field-parts.js';

const PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const normalizedYaw = value => ((value + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
const normalizedAngle = value => ((value % 360) + 360) % 360;
const vec = (value, fallback) => Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every(Number.isFinite) ? value.slice(0, 3) : fallback.slice();
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => a.map((n, i) => n - b[i]);
const add = (a, b) => a.map((n, i) => n + b[i]);
const mul = (a, v) => a.map(n => n * v);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => mul(a, 1 / (Math.hypot(...a) || 1));
const worldPoint = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const copyPose = pose => ({...pose, target: pose.target.slice()});

const FRONT = {shophouse: .84, temple: 1.32, roof: 1.48, tower: .85, arch: 1.1, gate: .54, elephant: 1.02, bridge: 1.62, obelisk: .99, clock: 1.1, fountain: 1.98, press: 1.5, film: 1.25, letter: 1.75};
const BACK = {shophouse: -1.16, temple: -1.16, roof: -1.16, tower: -.72, arch: -.99, gate: -.48, elephant: -.99, bridge: -1.53, obelisk: -.99, clock: -.95, fountain: -1.92, press: -1.43, film: -1.4, letter: -1.73};

/** Position helpers are deliberately semantic. No renderer-node indexes or
 * claims of a surveyed architectural reconstruction are used. */
export function questAnchor(modelKind, item, index = 0, count = 1, model = null) {
  const own = model?.anchors?.[item?.anchor];
  if (own && !Array.isArray(item?.position)) return own.position.slice();
  const z = model?.front ?? (FRONT[modelKind] || 1.2), rear = model?.back ?? (BACK[modelKind] || -1.4);
  const y = modelKind === 'letter' ? .65 : 1.55;
  const anchors = {
    'back-envelope': [0, y, rear], 'front-envelope': [0, y, z + .2],
    'front-door': [0, 1.05, z], 'high-window': [0, 2.45, z],
    'left-tower': [-1.5, 2.45, z], 'right-tower': [1.5, 2.45, z],
    'entry-arch': [0, 1.45, z + .06], arcade: [0, .7, z + .2],
    'square-base': [0, .49, z + .06], 'octagon-body': [0, 3.12, .9],
    roof: [0, modelKind === 'roof' ? 4.0 : 3.08, z * .55],
    'roof-ridge': [0, 3.1, z * .55], 'clock-face': [0, 3.75, .92], 'central-hall': [0, 1.65, z + .12],
    plaque: [0, 1.03, z], 'left-wing': [-1.6, 1.3, z], 'right-wing': [1.6, 1.3, z],
    'bridge-mark': [-2.35, 1.1, 1.53], 'water-basin': [0, .6, z],
  };
  return vec(item?.position, anchors[item?.anchor] || [(index - (count - 1) / 2) * 1.23, y, z + .12]);
}

function rayForPoint(x, y, rect, camera) {
  const forward = unit(sub(camera.target, camera.position));
  const right = unit(cross(forward, [0, 1, 0])), up = cross(right, forward);
  const extent = Math.tan(camera.fov * PI / 360), aspect = rect.width / Math.max(1, rect.height);
  const sx = ((x - rect.left) / Math.max(1, rect.width) * 2 - 1) * extent * aspect;
  const sy = (1 - (y - rect.top) / Math.max(1, rect.height) * 2) * extent;
  return {origin: camera.position.slice(), direction: unit(add(forward, add(mul(right, sx), mul(up, sy))))};
}

function rayPlane(ray, plane) {
  const d = dot(ray.direction, plane.normal); if (Math.abs(d) < 1e-5) return null;
  const t = dot(sub(plane.point, ray.origin), plane.normal) / d; return t > 0 ? add(ray.origin, mul(ray.direction, t)) : null;
}

export function projectQuestPoint(point, camera, rect) {
  const forward = unit(sub(camera.target, camera.position)), right = unit(cross(forward, [0, 1, 0])), up = cross(right, forward);
  const offset = sub(point, camera.position), depth = dot(offset, forward);
  if (depth <= .01) return null;
  const extent = Math.tan(camera.fov * PI / 360), aspect = rect.width / Math.max(1, rect.height);
  return {x: rect.left + (dot(offset, right) / (depth * extent * aspect) * .5 + .5) * rect.width, y: rect.top + (.5 - dot(offset, up) / (depth * extent) * .5) * rect.height, depth};
}

const boundsCache = new WeakMap();
function geometryBounds(geometry) {
  if (boundsCache.has(geometry)) return boundsCache.get(geometry);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  geometry.positions.forEach((v, i) => {min[i % 3] = Math.min(min[i % 3], v); max[i % 3] = Math.max(max[i % 3], v);});
  const result = {min, max}; boundsCache.set(geometry, result); return result;
}
function intersectsBounds(ray, node, nearest) {
  const {min, max} = geometryBounds(node.geometry), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let mask = 0; mask < 8; mask++) {
    const p = worldPoint(node.world, [mask & 1 ? max[0] : min[0], mask & 2 ? max[1] : min[1], mask & 4 ? max[2] : min[2]]);
    for (let n = 0; n < 3; n++) {lo[n] = Math.min(lo[n], p[n]); hi[n] = Math.max(hi[n], p[n]);}
  }
  let near = 0, far = nearest;
  for (let n = 0; n < 3; n++) {
    if (Math.abs(ray.direction[n]) < .0000001) {if (ray.origin[n] < lo[n] - .001 || ray.origin[n] > hi[n] + .001) return false; continue;}
    let a = (lo[n] - ray.origin[n]) / ray.direction[n], b = (hi[n] - ray.origin[n]) / ray.direction[n];
    if (a > b) [a, b] = [b, a]; near = Math.max(near, a); far = Math.min(far, b); if (near > far) return false;
  }
  return far > .01;
}
function triangleDistance(ray, a, b, c, doubleSided) {
  const e1 = sub(b, a), e2 = sub(c, a), p = cross(ray.direction, e2), det = dot(e1, p);
  if (doubleSided ? Math.abs(det) < .0000001 : det < .0000001) return Infinity;
  const inv = 1 / det, t = sub(ray.origin, a), u = dot(t, p) * inv;
  if (u < 0 || u > 1) return Infinity;
  const q = cross(t, e1), v = dot(ray.direction, q) * inv;
  if (v < 0 || u + v > 1) return Infinity;
  const distance = dot(e2, q) * inv; return distance > .01 ? distance : Infinity;
}

/** Exact triangle hit-test shared by the GPU and CPU render paths. It includes
 * noninteractive architecture as occluders, so an envelope cannot be clicked
 * through a building. World matrices are refreshed by draw before querying. */
export function hitQuestScene(roots, ray) {
  let nearest = Infinity, result = null;
  function walk(node) {
    if (node.visible === false) return;
    if (node.geometry && (node.material?.opacity ?? 1) >= .05 && !node.userData?.questIgnorePick && intersectsBounds(ray, node, nearest)) {
      const geometry = node.geometry, positions = geometry.positions, vertices = new Map();
      const vertex = id => {if (!vertices.has(id)) vertices.set(id, worldPoint(node.world, [positions[id * 3], positions[id * 3 + 1], positions[id * 3 + 2]])); return vertices.get(id);};
      const indices = geometry.indices || Array.from({length: positions.length / 3}, (_, n) => n);
      for (let n = 0; n < indices.length; n += 3) {
        const distance = triangleDistance(ray, vertex(indices[n]), vertex(indices[n + 1]), vertex(indices[n + 2]), node.material?.doubleSided);
        if (distance < nearest) {nearest = distance; result = node;}
      }
    }
    node.children?.forEach(walk);
  }
  roots.forEach(walk);
  let target = result; while (target && !target.userData?.questTargetId) target = target.parent;
  return result ? {node: result, target, distance: nearest, id: target?.userData?.questTargetId || null, role: target?.userData?.questRole || null} : null;
}

function makeMaterials() {
  return {
    stone: {color: '#d7c6a2', roughness: .9}, ivory: {color: '#f0dfb8', roughness: .88},
    green: {color: '#244d41', roughness: .6}, brass: {color: '#bc9253', roughness: .35, metalness: .7},
    orange: {color: '#dc7c3c', roughness: .5}, copper: {color: '#9f6147', roughness: .65, metalness: .2},
    ink: {color: '#243d35', roughness: .7}, paper: {color: '#f4e9cc', roughness: .96},
    ghost: {color: '#d0ae6a', roughness: .72, opacity: .3, doubleSided: true},
  };
}
function tag(node, id, role) {node.userData.questTargetId = id; node.userData.questRole = role; return node;}
function pyramid(w, d, h) {return {positions: [-w / 2, 0, -d / 2, w / 2, 0, -d / 2, w / 2, 0, d / 2, -w / 2, 0, d / 2, 0, h, 0], indices: [0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0, 3, 2, 1, 3, 1, 0]};}
function buildPart(c, parent, anchor, mat, metal) {
  if (/roof/.test(anchor)) {
    c.box(1.48, .11, 1.24, metal, parent, [0, .08, 0]); c.mesh(pyramid(1.54, 1.3, .62), mat, parent, [0, .13, 0]);
    for (const x of [-.76, .76]) c.line([[x * .7, .3, 0], [x, .27, 0], [x * 1.12, .45, 0]], .035, metal, parent);
  } else if (/octagon/.test(anchor)) {
    c.cyl(.57, .62, mat, parent, [0, .34, 0], null, 8); c.cyl(.64, .08, metal, parent, [0, .68, 0], null, 8);
    for (let n = 0; n < 8; n++) {const a = n * PI / 4; c.box(.035, .57, .035, metal, parent, [Math.sin(a) * .54, .35, Math.cos(a) * .54]);}
  } else if (/left-wing|right-wing/.test(anchor)) {
    c.box(1.15, .66, .9, mat, parent, [0, .36, 0]); c.box(1.3, .08, 1.02, metal, parent, [0, .72, 0]);
    for (const x of [-.3, .3]) {c.box(.25, .33, .035, metal, parent, [x, .38, .47]); c.box(.025, .31, .05, mat, parent, [x, .38, .5]);}
    c.mesh(pyramid(1.34, 1.04, .25), mat, parent, [0, .77, 0]);
  } else if (/arcade|arch|central-hall/.test(anchor)) {
    for (const x of [-.54, .54]) c.box(.16, .8, .85, mat, parent, [x, .4, 0]);
    const points = []; for (let n = 0; n <= 12; n++) {const a = n * PI / 12; points.push([Math.cos(a) * .54, .8 + Math.sin(a) * .36, .32]);}
    c.line(points, .085, metal, parent); c.box(1.34, .1, .99, mat, parent, [0, 1.18, 0]);
  } else {
    c.box(1.38, .25, 1.18, mat, parent, [0, .15, 0]); c.box(1.48, .08, 1.27, metal, parent, [0, .31, 0]);
    for (const x of [-.54, .54]) c.box(.06, .17, .03, metal, parent, [x, .15, .61]);
  }
}
function buildEnvelope(c, parent, position, normal, id, M) {
  const root = tag(c.group(parent, position, [0, Math.atan2(normal[0], normal[2]), 0]), id, 'collectible');
  c.box(1.3, .94, .09, M.brass, root); c.box(1.17, .82, .06, M.ivory, root, [0, 0, .075]);
  const page = c.group(root, [0, 0, .08]); c.box(1.02, .72, .025, M.paper, page);
  for (let n = 0; n < 4; n++) c.box(.7 - n % 2 * .13, .015, .01, M.brass, page, [0, .18 - n * .11, .022]);
  const flap = c.group(root, [0, .4, .125]);
  c.mesh({positions: [-.58, 0, 0, .58, 0, 0, 0, -.5, .03], indices: [0, 2, 1]}, {...M.paper, doubleSided: true}, flap);
  c.line([[-.58, -.39, .13], [0, .02, .15], [.58, -.39, .13]], .012, M.brass, root);
  const seal = c.group(flap, [0, -.33, .035]); c.cyl(.135, .045, M.copper, seal, [0, 0, 0], [PI / 2, 0, 0], 18);
  c.torus(.086, .015, M.brass, seal, [0, 0, .035]);
  return {root, page, flap, position, normal};
}
function featureFrame(c, root, anchor, M) {
  const highlight = {...M.brass};
  c.box(.65, .63, .08, M.green, root);
  if (/arch|arcade/.test(anchor)) {
    const points = [[-.23, -.23, .08], [-.23, .04, .08]];
    for (let n = 0; n <= 10; n++) {const a = PI - n * PI / 10; points.push([Math.cos(a) * .23, .04 + Math.sin(a) * .2, .08]);}
    points.push([.23, -.23, .08]); c.line(points, .043, highlight, root);
  } else if (/roof/.test(anchor)) c.line([[-.26, -.08, .08], [0, .22, .08], [.26, -.08, .08], [.32, .01, .08]], .043, highlight, root);
  else if (/tower/.test(anchor)) {
    c.box(.2, .39, .08, highlight, root, [0, -.02, .09]); c.mesh(pyramid(.3, .16, .17), highlight, root, [0, .2, .06]);
  } else {
    c.box(.39, .39, .04, highlight, root, [0, 0, .075]); c.box(.24, .24, .055, M.green, root, [0, 0, .1]);
  }
  c.torus(.43, .025, highlight, root, [0, 0, .02], null, 24);
  return highlight;
}

/* Hunt (2 Nov 2026): what a finger can do with each kind of part, said where the part is, when the view comes near it */
const VERBS = {collectible: 'Tap to open', detail: 'Tap', dial: 'Turn', slider: 'Slide', piece: 'Drag up', slot: 'Drop here', wheel: 'Swipe to spin', cell: 'Lay it here'};

/** A torn piece of one page: the whole page is drawn (ruled lines, margin, the words in reading order, a stamp across
 * the middle) and each piece keeps its own square of it, so edges and lines only meet when pieces sit right. */
function pieceTexture(doc, quest, item, index) {
  const cols = quest.cols || 2, rows = Math.ceil((quest.items || []).length / cols), S = 256;
  const canvas = doc.createElement('canvas'); canvas.width = canvas.height = S;
  const c = canvas.getContext('2d'); if (!c) return canvas;
  const col = item.cell % cols, row = Math.floor(item.cell / cols), W = cols * S, H = rows * S;
  c.translate(-col * S, -row * S);
  c.fillStyle = '#f1e6cc'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(70, 92, 110, .28)'; c.lineWidth = 2;
  for (let y = 46; y < H; y += 34) {c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();}
  c.strokeStyle = 'rgba(155, 44, 28, .55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(34, 0); c.lineTo(34, H); c.stroke();
  // a round stamp where the pieces meet, and one ink stroke across the page
  c.strokeStyle = 'rgba(124, 31, 18, .5)'; c.lineWidth = 6; c.beginPath(); c.arc(W / 2, H / 2, Math.min(W, H) * .2, 0, 2 * PI); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H / 2, Math.min(W, H) * .16, 0, 2 * PI); c.stroke();
  c.strokeStyle = 'rgba(44, 33, 23, .55)'; c.lineWidth = 4; c.beginPath(); c.moveTo(W * .12, H * .9); c.bezierCurveTo(W * .4, H * .62, W * .62, H * .98, W * .9, H * .7); c.stroke();
  (quest.items || []).forEach(other => {
    const x = (other.cell % cols + .5) * S, y = (Math.floor(other.cell / cols) + .5) * S, words = String(other.text || '').toUpperCase();
    let size = 58; c.font = `600 ${size}px Oswald, 'Arial Narrow', sans-serif`;
    while (size > 22 && c.measureText(words).width > S * .82) {size -= 2; c.font = `600 ${size}px Oswald, 'Arial Narrow', sans-serif`;}
    c.fillStyle = '#2c2117'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(words, x, y);
  });
  c.setTransform(1, 0, 0, 1, 0, 0);
  // the torn rim of this piece
  const g = c.createLinearGradient(0, 0, 0, 14); g.addColorStop(0, 'rgba(90, 60, 30, .35)'); g.addColorStop(1, 'rgba(90, 60, 30, 0)');
  c.fillStyle = 'rgba(90, 60, 30, .22)';
  for (let n = 0; n < S; n += 9) {const k = ((index + 1) * 37 + n * 13) % 7; c.fillRect(n, 0, 9, 2 + k); c.fillRect(n, S - 2 - k, 9, 2 + k); c.fillRect(0, n, 2 + k, 9); c.fillRect(S - 2 - k, n, 2 + k, 9);}
  return canvas;
}
function digitTexture(doc, digit) {
  const canvas = doc.createElement('canvas'); canvas.width = 128; canvas.height = 96;
  const c = canvas.getContext('2d'); if (!c) return canvas;
  c.fillStyle = '#efe3c4'; c.fillRect(0, 0, 128, 96);
  c.fillStyle = '#2c2117'; c.font = "600 74px Oswald, 'Arial Narrow', sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(digit), 64, 52);
  return canvas;
}

/** Real local scene graph, rendered by native WebGL when available and by the
 * same interactive geometry in the CPU renderer when a GPU is unavailable. */
export function createQuestWorld(container, {
  routeId, stopId, modelKind = 'shophouse', quest, enabled = false, progress,
  reducedMotion = false, onAction = () => {}, onComplete = () => {}, onStatus = () => {}, onReady = () => {},
} = {}) {
  // The first Telok Ayer stop is a Chinese shrine; the generic iron gate is a
  // different architectural vocabulary. This miniature uses the temple form.
  if (routeId === 'telok-ayer' && stopId === 'telok-ayer-01' && modelKind === 'gate') modelKind = 'temple';
  const doc = container.ownerDocument, win = doc.defaultView, now = () => win.performance.now();
  let disposed = false, failed = false, raf = null, reduced = Boolean(reducedMotion), active = Boolean(enabled), activated = false;
  let state = progress || createQuestState(quest), authoritativeSolved = isQuestSolved(quest, state), completedSent = authoritativeSolved;
  let message = active ? quest?.instruction || 'Look at the building and touch the clue.' : 'The mechanism lights up once you check in and observe the site.';
  let stage, model, canvas, builder, snapshotKey = '', currentTime = now(), focusId = null, lastDraw = -Infinity;
  const motions = new Map(), values = {intro: active ? 1 : .35, unlock: authoritativeSolved ? 1 : 0, value: state.value || 0};
  const targets = new Map(), envelopes = new Map(), features = new Map(), pieces = new Map(), slots = new Map(), listeners = [], pointers = new Map();
  const items = (quest?.items || []).filter(item => item?.id && item.role !== 'decoration');
  let front = FRONT[modelKind] || 1.2;
  const M = makeMaterials();
  let gesture = null, cameraTween = null, dial = null, slider = null, propsRoot, reward, rewardPage, assembly = null, partColors = null, trayZ = 0;
  let lock = null, jig = null, lastStamp = 0, settling = false, hint = null;
  let pose = {target: [0, 1.65, .3], yaw: .28, elevation: .25, distance: 10.7};
  const camera = {position: [0, 4, 10], target: pose.target.slice(), fov: 44, near: .1, far: 80};
  const cameraPresets = {};

  function animate(key, to, duration = 480) {
    const from = values[key] ?? 0;
    if (reduced || duration <= 0 || Math.abs(from - to) < .0001) {values[key] = to; motions.delete(key);} else motions.set(key, {from, to, start: now(), duration});
    schedule();
  }
  function updateCamera(stamp) {
    if (cameraTween) {
      const t = clamp((stamp - cameraTween.start) / cameraTween.duration, 0, 1), e = 1 - (1 - t) ** 3;
      pose = {target: cameraTween.from.target.map((v, n) => mix(v, cameraTween.to.target[n], e)), yaw: mix(cameraTween.from.yaw, cameraTween.to.yaw, e), elevation: mix(cameraTween.from.elevation, cameraTween.to.elevation, e), distance: mix(cameraTween.from.distance, cameraTween.to.distance, e)};
      if (t === 1) cameraTween = null;
    }
    const rect = canvas.getBoundingClientRect(), aspect = rect.width / Math.max(1, rect.height);
    const fit = clamp(.96 / Math.max(.5, aspect), 1, 1.18), distance = pose.distance * fit, ce = Math.cos(pose.elevation);
    camera.target = pose.target.slice(); camera.position = [pose.target[0] + Math.sin(pose.yaw) * ce * distance, pose.target[1] + Math.sin(pose.elevation) * distance, pose.target[2] + Math.cos(pose.yaw) * ce * distance];
    camera.fov = 44;
  }
  function moveCamera(next, duration = 580) {
    if (disposed) return;
    const goal = {...pose, ...next, target: (next.target || pose.target).slice()};
    goal.elevation = clamp(goal.elevation, .1, 1.15); goal.distance = clamp(goal.distance, 4.2, 18);
    if (reduced || duration === 0) {pose = goal; cameraTween = null;} else cameraTween = {from: copyPose(pose), to: goal, start: now(), duration};
    schedule();
  }
  function targetEligible(id) {
    if (!active || authoritativeSolved) return false;
    if (id === '$dial' || id === '$slider' || id.startsWith('wheel:')) return Math.cos(pose.yaw) > .2;
    if (id.startsWith('cell:')) return Math.cos(pose.yaw) > .1 && Boolean(state.selected) && !Number.isInteger(state.cells?.[state.selected]);
    if (id.startsWith('slot:')) return Boolean(state.selected) && !state.placed.includes(id.slice(5));
    const item = items.find(value => value.id === id); if (!item) return false;
    if (quest.type === 'rotate-find') return !state.found.includes(id) && isQuestItemFacing(item, normalizedYaw(pose.yaw));
    if (quest.type === 'slide') return state.opened && !state.found.includes(id);
    if (quest.type === 'assemble') return !state.placed.includes(id);
    if (quest.type === 'jigsaw') return Math.cos(pose.yaw) > .1;
    return Math.cos(pose.yaw) > .2;
  }
  /* the one part the view has come near: in front, near the middle of the frame and not hidden behind anything */
  function nearTarget() {
    if (!active || authoritativeSolved || !canvas || (gesture && gesture.mode !== 'orbit') || gesture?.moved) return null;
    const rect = canvas.getBoundingClientRect(); let best = null;
    for (const [id, target] of targets) {
      if (!targetEligible(id)) continue;
      const screen = projectQuestPoint(worldPoint(target.root.world, target.center), camera, rect); if (!screen) continue;
      const x = screen.x - rect.left, y = screen.y - rect.top;
      if (x < 12 || y < 12 || x > rect.width - 12 || y > rect.height - 12) continue;
      const d = Math.hypot(x - rect.width / 2, y - rect.height * .55) / Math.max(1, Math.min(rect.width, rect.height));
      if (d < .46 && (!best || d < best.d)) best = {id, x, y, d, role: target.role, screen};
    }
    if (!best || pickPoint(best.screen.x, best.screen.y)?.id !== best.id) return null;
    let verb = VERBS[best.role] || 'Tap';
    if (best.role === 'piece' && quest.type === 'jigsaw') verb = Number.isInteger(state.cells?.[best.id]) ? 'Tap to turn' : 'Drag to the frame';
    return {id: best.id, x: Math.round(best.x / 6) * 6, y: Math.round(best.y / 6) * 6, verb};
  }
  function status(force = false) {
    if (disposed) return;
    const visibleIds = [...targets.keys()].filter(targetEligible);
    const value = Math.round(values.value || 0), yaw = Math.round(normalizedYaw(pose.yaw) * 1000) / 1000;
    const phase = failed ? 'error' : !active ? 'locked' : authoritativeSolved ? values.unlock >= 1 ? 'solved' : 'opening' : 'ready';
    hint = phase === 'ready' ? nearTarget() : null;
    const data = {engine: stage?.engine || 'loading', status: phase, message, yaw, visibleIds, value, selectedId: state.selected || focusId, hint};
    // Camera pose is queryable, but React need not rerender for every degree.
    const key = JSON.stringify([phase, message, visibleIds, value, state.selected, focusId, hint]);
    if (force || key !== snapshotKey) {snapshotKey = key; onStatus(data);}
    return data;
  }
  function schedule() {if (!disposed && !failed && !doc.hidden && raf === null) raf = win.requestAnimationFrame(frame);}
  function transforms(stamp) {
    for (const [key, motion] of motions) {
      const t = clamp((stamp - motion.start) / motion.duration, 0, 1), e = 1 - (1 - t) ** 3;
      values[key] = mix(motion.from, motion.to, e); if (t === 1) motions.delete(key);
    }
    const intro = values.intro ?? 1, unlock = values.unlock || 0;
    builder.transform(propsRoot, {scale: [mix(.93, 1, intro), mix(.93, 1, intro), mix(.93, 1, intro)]});
    const baseProgress = ['temple', 'roof'].includes(modelKind) ? 100 : unlock * 100;
    model.update({progress: baseProgress, highlight: unlock >= 1});
    for (const [id, entry] of envelopes) {
      const open = values['found:' + id] || 0;
      builder.transform(entry.flap, {rotation: [-open * 2.2, 0, 0]});
      builder.transform(entry.page, {position: [0, open * .54, .08 + open * .04]});
    }
    for (const [id, entry] of features) {
      const accepted = state.sequence.includes(id), pulse = values['pulse:' + id] || 0;
      entry.material.color = accepted ? '#f6c673' : active ? '#bc9253' : '#8c8065';
      const k = entry.size * (1 + pulse * .1); builder.transform(entry.root, {scale: [k, k, entry.size], position: entry.position.map((v, n) => v + (n === 2 ? pulse * .17 : 0))});
    }
    if (dial) {
      builder.transform(dial.wheel, {rotation: [0, 0, -(values.value || 0) * PI / 180]});
      if (dial.architecturalPart) {const v = (values.value || 0) * PI / 180; builder.transform(dial.architecturalPart, {rotation: quest.axis === 'x' && dial.ownPart ? [v, 0, 0] : [0, v, 0]});}
    }
    if (slider) {
      const position = [0, 0, .22]; position[quest.axis === 'y' ? 1 : 0] = (values.value || 0) / 100 * slider.travel;
      builder.transform(slider.panel, {position});
    }
    for (const [id, piece] of pieces) {
      const p = values['placed:' + id] || 0, lift = values['pick:' + id] || 0, back = values['back:' + id] ?? 1;
      let position, scale, turn = 0;
      if (piece.drag) {position = piece.drag; scale = piece.dragScale;}
      else if (p > 0) {
        const from = piece.from || piece.tray, s0 = piece.from ? piece.fromScale : piece.scale;
        position = from.map((v, n) => mix(v, piece.destination[n], p)); position[1] += Math.sin(p * PI) * (piece.from ? .22 : .6);
        scale = mix(s0, 1, p);
      } else if (piece.from && back < 1) {
        position = piece.from.map((v, n) => mix(v, piece.tray[n], back)); position[1] += Math.sin(back * PI) * .35;
        scale = mix(piece.fromScale, piece.scale, back); turn = Math.sin(back * PI * 3) * .12 * (1 - back);
      } else {
        position = piece.tray.slice(); position[1] += lift * .2; scale = piece.scale * (1 + lift * .06); turn = -.1 * (1 - lift);
      }
      builder.transform(piece.root, {position, rotation: [0, turn, 0], scale: [scale, scale, scale]});
      builder.transform(slots.get(id).root, {visible: p < .98});
    }
    if (lock) {
      lock.drums.forEach((drum, n) => builder.transform(drum, {rotation: [(values['wheel:' + n] || 0) * PI / 5, 0, 0]}));
      builder.transform(lock.lid, {rotation: [-unlock * 1.15, 0, 0]});
      builder.transform(lock.shackle, {position: [0, lock.shackleY + unlock * .16, lock.shackleZ]});
    }
    if (jig) {
      const dt = clamp((stamp - (lastStamp || stamp)) / 1000, 0, .05), k = reduced ? 1 : 1 - Math.exp(-dt * 14);
      settling = false;
      for (const [id, piece] of jig.pieces) {
        const cell = state.cells?.[id], placed = Number.isInteger(cell), lifted = state.selected === id && !placed;
        let goal;
        if (piece.drag) goal = {p: piece.drag, rx: -jig.tilt, rz: piece.rz, s: 1};
        else if (placed) goal = {p: jig.cellWorld(cell, .045), rx: -jig.tilt, s: 1};
        else goal = {p: add(piece.tray, [0, lifted ? .3 : 0, lifted ? .12 : 0]), rx: -PI / 2 + (lifted ? .9 : .38), s: lifted ? .85 : jig.S};
        let rz = -(state.turns?.[id] || 0) * PI / 2; while (rz - piece.rz > PI) rz -= 2 * PI; while (piece.rz - rz > PI) rz += 2 * PI;
        piece.p = piece.p.map((v, n) => mix(v, goal.p[n], k)); piece.rx = mix(piece.rx, goal.rx, k); piece.rz = mix(piece.rz, rz, k); piece.s = mix(piece.s, goal.s, k);
        if (Math.hypot(...sub(piece.p, goal.p)) > .002 || Math.abs(piece.rx - goal.rx) > .002 || Math.abs(piece.rz - rz) > .002 || Math.abs(piece.s - goal.s) > .002) settling = true;
        builder.transform(piece.root, {position: piece.p, rotation: [piece.rx, 0, 0], scale: [piece.s, piece.s, piece.s]});
        builder.transform(piece.inner, {rotation: [0, 0, piece.rz]});
      }
      for (const [n, cell] of jig.cells) builder.transform(cell, {visible: !Object.values(state.cells || {}).includes(n)});
    }
    lastStamp = stamp;
    if (partColors) {
      const glow = authoritativeSolved ? Math.sin(Math.min(1, unlock * 1.4) * PI) * .55 : 0;
      for (const material of partColors) {material.emissive = '#ffcf7a'; material.emissiveIntensity = glow;}
    }
    builder.transform(reward, {visible: unlock > .005, position: quest.type === 'assemble' ? [0, .5 + unlock * .5, trayZ - .1] : lock || jig ? [0, 1.3 + unlock * .7, front + 1.1] : [0, .6 + unlock * .58, front + .58], scale: [unlock, unlock, unlock], rotation: [-.1, Math.sin(unlock * PI) * .15, 0]});
    builder.transform(rewardPage, {position: [0, unlock * .63, .07]});
  }
  function drawNow(stamp = now()) {
    if (disposed || failed) return;
    try {currentTime = stamp; transforms(stamp); updateCamera(stamp); stage.draw(camera); lastDraw = stamp;} catch (error) {failed = true; message = 'The model could not be shown. Reopen this stop.'; onReady({ok: false, engine: stage?.engine, message: error?.message}); status(true);}
  }
  function frame(stamp) {
    raf = null; if (disposed || failed) return;
    drawNow(stamp); status();
    if (authoritativeSolved && values.unlock >= 1 && !completedSent) {completedSent = true; status(true); onComplete();}
    if (motions.size || cameraTween || settling) schedule();
  }
  function pickPoint(clientX, clientY) {return hitQuestScene(stage.root, rayForPoint(clientX, clientY, canvas.getBoundingClientRect(), camera));}
  function emit(action) {
    if (!active || authoritativeSolved) return false;
    const result = reduceQuest(quest, state, action); message = result.message;
    if (!result.ok) {status(true); return false;}
    // Predict only the tangible response. Reward delivery waits for setProgress
    // to receive the parent's independently validated state.
    syncState(result.state, false); onAction(action); status(true); return true;
  }
  function activate(hit) {
    if (!hit?.id) {message = 'Rotate the building to find a raised part or a hidden clue.'; status(true); return;}
    const {id, role} = hit;
    if (!targetEligible(id)) {message = !active ? 'This part lights up after you observe the site.' : 'Turn to face this part, then try again.'; status(true); return;}
    focusId = id;
    if (role === 'detail') {values['pulse:' + id] = 1; animate('pulse:' + id, 0, 540); emit({type: 'select', id});}
    else if (role === 'collectible') emit({type: quest.type === 'rotate-find' ? 'find' : 'collect', id, ...(quest.type === 'rotate-find' ? {yaw: normalizedYaw(pose.yaw)} : {})});
    else if (role === 'wheel') {const n = Number(id.slice(6)); emit({type: 'spin', wheel: n, value: (state.wheels[n] + 1) % 10});}
    else if (role === 'cell') emit({type: 'put', id: state.selected, cell: Number(id.slice(5))});
    else if (role === 'piece' && quest.type === 'jigsaw') {
      const at = state.cells?.[id], held = state.selected && !Number.isInteger(state.cells?.[state.selected]) ? state.selected : null;
      if (Number.isInteger(at)) emit(held && held !== id ? {type: 'put', id: held, cell: at} : {type: 'turn', id});
      else emit({type: 'pick', id});
    }
    else if (role === 'piece') emit({type: 'pick', id});
    else if (role === 'slot') {const held = pieces.get(state.selected); if (held) held.from = null; emit({type: 'place', id: state.selected, slotId: id.slice(5)});}
    else {message = role === 'dial' ? 'Hold the brass dial and turn it until the pointer meets the gold mark.' : 'Hold the panel by its handle and slide it along the track.'; status(true);}
  }
  /* Drag a tray piece: it follows the finger on a plane facing the camera and grows toward full size as it is
   * lifted toward the building. Dropped near an outline it is proposed for that outline; otherwise it flies home. */
  function dragPiece(g, x, y) {
    const id = g.hit.id, piece = pieces.get(id), rect = canvas.getBoundingClientRect();
    if (!g.dragging) {
      if (state.selected !== id && !emit({type: 'pick', id})) {g.mode = 'orbit'; return;}
      g.dragging = true; focusId = id; piece.from = null; motions.delete('back:' + id); values['back:' + id] = 1;
      const centre = worldPoint(piece.root.world, piece.mid);
      g.plane = {point: centre, normal: unit(sub(camera.target, camera.position))};
      const grabbed = rayPlane(rayForPoint(g.start[0], g.start[1], rect, camera), g.plane);
      g.offset = grabbed ? sub(centre, grabbed) : [0, 0, 0];
    }
    const q = rayPlane(rayForPoint(x, y, rect, camera), g.plane); if (!q) return;
    piece.dragScale = mix(piece.scale, 1, clamp((g.start[1] - y) / (rect.height * .4), 0, 1));
    piece.drag = sub(add(q, g.offset), mul(piece.mid, piece.dragScale));
    schedule();
  }
  function dropPiece(g, cancelled = false) {
    const id = g.hit.id, piece = pieces.get(id), rect = canvas.getBoundingClientRect();
    if (!piece?.drag) return;
    let best = null;
    const held = projectQuestPoint(add(piece.drag, mul(piece.mid, piece.dragScale)), camera, rect);
    if (!cancelled && held) for (const item of items) {
      if (state.placed.includes(item.id)) continue;
      const other = pieces.get(item.id), centre = add(other.destination, other.mid), sc = projectQuestPoint(centre, camera, rect);
      if (!sc) continue;
      const edge = projectQuestPoint(add(centre, [other.size[0] / 2, other.size[1] / 2, 0]), camera, rect);
      const radius = edge ? Math.max(46, Math.hypot(edge.x - sc.x, edge.y - sc.y)) : 60, d = Math.hypot(held.x - sc.x, held.y - sc.y) / radius;
      if (d < 1.1 && (!best || d < best.d)) best = {d, slotId: item.id};
    }
    piece.from = piece.drag; piece.fromScale = piece.dragScale; piece.drag = null;
    const landed = best && emit({type: 'place', id, slotId: best.slotId}) && state.placed.includes(id);
    if (!landed) {
      if (!best && !cancelled) {message = 'Drop it on the outline it fits.'; status(true);}
      values['back:' + id] = 0; animate('back:' + id, 1, 520);
    }
    schedule();
  }
  /* A torn piece follows the finger on a plane facing the camera; let go over a square and it is laid there (whatever
   * lay there goes back to the tray); let go of a laid piece away from the frame and it goes back to the tray. */
  function dragJig(g, x, y) {
    const piece = jig.pieces.get(g.hit.id), rect = canvas.getBoundingClientRect();
    if (!g.dragging) {
      g.dragging = true; focusId = g.hit.id;
      g.plane = {point: piece.p.slice(), normal: unit(sub(camera.target, camera.position))};
      const grabbed = rayPlane(rayForPoint(g.start[0], g.start[1], rect, camera), g.plane);
      g.offset = grabbed ? sub(piece.p, grabbed) : [0, 0, 0];
    }
    const q = rayPlane(rayForPoint(x, y, rect, camera), g.plane); if (!q) return;
    piece.drag = add(q, g.offset); schedule();
  }
  function dropJig(g, cancelled = false) {
    const id = g.hit.id, piece = jig.pieces.get(id), rect = canvas.getBoundingClientRect();
    if (!piece?.drag) return;
    const held = projectQuestPoint(piece.drag, camera, rect); piece.drag = null;
    if (cancelled || !held) {schedule(); return;}
    let best = null;
    for (const n of jig.cells.keys()) {
      const sc = projectQuestPoint(jig.cellWorld(n), camera, rect), edge = projectQuestPoint(jig.cellWorld(n).map((v, k) => k === 0 ? v + jig.C / 2 : v), camera, rect);
      if (!sc || !edge) continue;
      const d = Math.hypot(held.x - sc.x, held.y - sc.y) / Math.max(24, Math.abs(edge.x - sc.x));
      if (d < 1.15 && (!best || d < best.d)) best = {d, n};
    }
    if (best) emit({type: 'put', id, cell: best.n});
    else if (Number.isInteger(state.cells?.[id])) emit({type: 'put', id, cell: -1});
    schedule();
  }
  function syncState(next, authoritative = true) {
    const before = state; state = next || createQuestState(quest);
    if (!gesture || gesture.mode !== 'handle') animate('value', state.value || 0, 300);
    if (lock) (state.wheels || []).forEach((v, n) => {
      if (gesture?.mode === 'spin' && gesture.wheel === n) return;
      const now = values['wheel:' + n] || 0, step = ((v - now) % 10 + 15) % 10 - 5; animate('wheel:' + n, now + step, 260);
    });
    for (const item of items) {
      animate('found:' + item.id, state.found.includes(item.id) ? 1 : 0, 650);
      animate('placed:' + item.id, state.placed.includes(item.id) ? 1 : 0, 680);
      animate('pick:' + item.id, state.selected === item.id ? 1 : 0, 260);
    }
    if (authoritative) {
      const solved = isQuestSolved(quest, state);
      if (solved && !authoritativeSolved) {
        authoritativeSolved = true; message = quest.foundText || 'Mechanism solved. The clue is appearing.'; animate('unlock', 1, 1250);
        // a short turn of the model marks the moment it gives up its clue
        if (activated && !reduced) moveCamera({...cameraPresets.overview, target: cameraPresets.overview.target.slice(), yaw: pose.yaw + .32, elevation: clamp(pose.elevation - .05, .1, 1.15)}, 1600);
      }
      else if (!solved && authoritativeSolved) {authoritativeSolved = false; completedSent = false; animate('unlock', 0, 0);}
    }
    if (before.selected !== state.selected) focusId = state.selected;
    schedule();
  }

  try {
    stage = createStage(container, {background: '#e7ddc6', reducedMotion: true, shadows: true, shadowRange: 9, softwareQuality: {maxWidth: 1024, maxHeight: 800, pixels: 640000, pixelRatio: 1.2}, onPick: () => {}, onReady: result => {if (!disposed) onReady({...result, engine: stage?.engine});}});
    if (!stage?.ok) throw new Error('Quest renderer unavailable'); canvas = stage.canvas; canvas.className = 'quest-canvas'; canvas.style.touchAction = 'none'; canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Place mechanism model: drag empty space to rotate; tap or drag the parts. Arrow keys rotate, plus and minus zoom. Keyboard controls are below.');
    canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home + -');
    builder = createNativeRoomBuilder(stage, doc); if (stage.shadow) stage.shadow.target = [0, 1.4, .3];
    const modelRoot = builder.group();
    const modelBuilder = {
      ...builder, root: modelRoot,
      group(parent = modelRoot, p, r) {return builder.group(parent, p, r);},
      // Existing model labels are visual placeholders, not verified monument
      // inscriptions. Keep an unlettered plaque in this location-based game.
      label(_text, w, h, parent, p, r) {return builder.box(w, h, .018, M.stone, parent, p, r);},
    };
    if (quest.type === 'assemble') {assembly = stopAssembly(stopId); builder.transform(modelRoot, {visible: false});}
    model = buildFieldModel(modelBuilder, {routeId, stopId, modelKind, document: doc});
    if (Number.isFinite(model.front)) front = model.front;
    propsRoot = builder.group();
    pose = {target: quest.type === 'assemble' ? [0, 1.1, .5] : model.overview.map((v, n) => n === 2 ? .35 : v), yaw: .24, elevation: quest.type === 'assemble' ? .46 : model.elevation ?? .23, distance: Math.max(model.distance * .87, 8.9)};
    cameraPresets.overview = copyPose(pose);
    cameraPresets.detail = {...copyPose(pose), target: quest.type === 'assemble' ? [0, 1.1, 1.25] : quest.type === 'sequence' ? [0, 1.9, front] : [0, 1.55, quest.type === 'rotate-find' ? 0 : front + .45], distance: quest.type === 'sequence' ? 7.6 : 6.7};

    if (quest.type === 'rotate-find') {
      items.forEach((item, index) => {
        const position = questAnchor(modelKind, item, index, items.length, model), normal = vec(item.normal, [0, 0, -1]);
        const entry = buildEnvelope(builder, propsRoot, position, normal, item.id, M); envelopes.set(item.id, entry); targets.set(item.id, {root: entry.root, center: [0, 0, .13], item, role: 'collectible'});
      });
    } else if (quest.type === 'sequence') {
      items.forEach((item, index) => {
        const position = questAnchor(modelKind, item, index, items.length, model), root = tag(builder.group(propsRoot, position), item.id, 'detail');
        const size = model.anchors?.[item.anchor]?.scale || 1;
        const material = featureFrame(builder, builder.group(root, [0, 0, 0]), item.anchor || '', M); features.set(item.id, {root, position, material, size}); targets.set(item.id, {root, center: [0, 0, .17], item, role: 'detail'});
      });
    } else if (quest.type === 'align') {
      // The dial is an instrument on its own brass stand at the front corner of the plinth, tipped back toward the
      // viewer, so the building it refers to stays in full view instead of hiding behind a disc.
      const mount = [1.32, 1.02, front + .9], stand = {color: '#4a3326', roughness: .8};
      builder.cyl(.3, .08, stand, propsRoot, [mount[0], .04, mount[2] - .1], null, 24);
      builder.cyl(.055, .9, M.brass, propsRoot, [mount[0], .5, mount[2] - .1], null, 12);
      const root = tag(builder.group(propsRoot, mount, [-.42, -.18, 0]), '$dial', 'dial');
      builder.transform(root, {scale: [.66, .66, .66]});
      builder.cyl(.9, .15, M.green, root, [0, 0, 0], [PI / 2, 0, 0], 32);
      builder.torus(.87, .045, M.brass, root, [0, 0, .1]);
      for (let n = 0; n < 24; n++) {const a = n * PI / 12; builder.box(.025, n % 3 ? .07 : .12, .03, M.brass, root, [Math.sin(a) * .78, Math.cos(a) * .78, .12], [0, 0, -a]);}
      const wheel = builder.group(root, [0, 0, .14]); builder.cyl(.65, .09, M.ivory, wheel, [0, 0, 0], [PI / 2, 0, 0], 24);
      builder.box(.075, .52, .07, M.orange, wheel, [0, .22, .09]); builder.sphere(.105, M.brass, wheel, [0, .55, .13]); builder.cyl(.13, .12, M.brass, wheel, [0, 0, .11], [PI / 2, 0, 0], 20);
      const a = questTarget(quest) * PI / 180;
      builder.line([[Math.sin(a) * .94 - Math.cos(a) * .11, Math.cos(a) * .94 + Math.sin(a) * .11, .13], [Math.sin(a) * .82, Math.cos(a) * .82, .13], [Math.sin(a) * .94 + Math.cos(a) * .11, Math.cos(a) * .94 - Math.sin(a) * .11, .13]], .04, M.orange, root);
      let architecturalPart = null;
      const ownPart = stopAlignPart(stopId, model);
      if (ownPart) {
        // The stop's own piece, drawn as it looks when solved and turned back by the target angle, so it is edge-on
        // or lying flat at the start and only reads properly once the dial is lined up.
        const t = questTarget(quest) * PI / 180, flat = quest.axis === 'x';
        architecturalPart = builder.group(root, [0, flat ? 1.42 : 1.22, -.12]); builder.transform(architecturalPart, {scale: [1.15, 1.15, 1.15]});
        drawAlignPart(builder, builder.group(architecturalPart, [0, 0, 0], flat ? [-t, 0, 0] : [0, -t, 0]), ownPart.draw);
      } else if (['roof', 'temple'].includes(modelKind)) {architecturalPart = builder.group(root, [0, 1.14, -.12]); builder.transform(architecturalPart, {scale: [.65, .65, .65]}); buildPart(builder, architecturalPart, 'roof', M.copper, M.brass);}
      dial = {root, wheel, architecturalPart, ownPart: Boolean(ownPart)}; targets.set('$dial', {root, center: [0, 0, .24], item: {label: items[0]?.label || 'brass dial'}, role: 'dial'});
    } else if (quest.type === 'slide') {
      // A self-contained brass-framed case standing on the plinth: the cover runs in a closed track and parks inside
      // the frame, so nothing pokes out across the building. Horizontal cases run left to right; the window panel lifts.
      const travel = quest.axis === 'y' ? 1.19 : 1.55, vertical = quest.axis === 'y', S = vertical ? .8 : .74;
      const W = vertical ? 1.66 : travel + 1.66, H = vertical ? travel + 1.24 : 1.3, cx = vertical ? 0 : travel / 2, cy = vertical ? travel / 2 : 0;
      const root = builder.group(propsRoot, [vertical ? 0 : -cx * S, (H / 2 - cy) * S + .06, front + .74]); builder.transform(root, {scale: [S, S, S]});
      const wood = {color: '#4a3326', roughness: .8}, felt = {color: '#203d33', roughness: .95};
      builder.box(W + .16, H + .16, .1, wood, root, [cx, cy, -.04]);
      builder.box(W - .1, H - .1, .04, felt, root, [cx, cy, .03]);
      for (const side of [-1, 1]) {
        builder.box(W + .2, .07, .2, M.brass, root, [cx, cy + side * (H / 2 + .04), .1]);
        builder.box(.07, H + .2, .2, M.brass, root, [cx + side * (W / 2 + .04), cy, .1]);
        builder.box(vertical ? .035 : W - .1, vertical ? H - .1 : .035, .05, M.brass, root, [vertical ? cx + side * .76 : cx, vertical ? cy : cy + side * .56, .12]);
      }
      for (const side of [-1, 1]) builder.box(.16, .08, .5, wood, root, [cx + side * (W / 2 - .2), cy - H / 2 - .1, .02]);
      builder.box(vertical ? 1.2 : .9, vertical ? .9 : 1.0, .02, {color: '#2b4a3e', roughness: .9}, root, vertical ? [0, travel, .06] : [travel, 0, .06]);
      for (let n = 0; n < 4; n++) builder.box(vertical ? .9 : .6, .02, .02, M.brass, root, vertical ? [0, travel - .3 + n * .2, .08] : [travel, -.3 + n * .2, .08]);
      const panel = tag(builder.group(root, [0, 0, .22]), '$slider', 'slider');
      builder.box(1.43, 1.02, .16, M.copper, panel);
      for (let n = -3; n <= 3; n++) builder.box(1.28, .025, .035, M.brass, panel, [0, n * .12, .1]);
      builder.box(vertical ? .42 : .09, vertical ? .09 : .44, .15, M.green, panel, [0, 0, .18]);
      builder.box(vertical ? .46 : .13, vertical ? .13 : .49, .06, M.brass, panel, [0, 0, .27]);
      items.forEach((item, index) => {
        const local = [(index - (items.length - 1) / 2) * .45, 0, .11];
        const entry = buildEnvelope(builder, root, local, [0, 0, 1], item.id, M); builder.transform(entry.root, {scale: [.72, .72, .72]}); envelopes.set(item.id, entry); targets.set(item.id, {root: entry.root, center: [0, 0, .15], item, role: 'collectible'});
      });
      slider = {root, panel, travel, worldTravel: travel * S}; targets.set('$slider', {root: panel, center: [0, 0, .29], item: {label: vertical ? 'lifting window panel' : 'sliding cover'}, role: 'slider'});
    } else if (quest.type === 'assemble') {
      // The pieces are the building: the stop's own parts when it has them, generic blocks otherwise. Each part is
      // drawn twice, a translucent outline where it belongs and a solid piece in the tray, so a placed piece lands
      // exactly on its outline. The tray is sized so no two pieces ever overlap at any stage width.
      const P = partPalette(), G = ghostPalette({color: '#b88d4a', roughness: .7, opacity: .17, doubleSided: true, castShadow: false});
      partColors = Object.values(P);
      const n = Math.max(1, items.length), flat = Boolean(assembly?.flat);
      trayZ = assembly ? (flat ? 2.0 : assembly.front + 1.5) : 2.4;
      const trayW = Math.min(4.6, 1.42 * n + .32), cell = trayW / n;
      builder.box(7.4, .12, 6.4, M.stone, propsRoot, [0, -.07, .55]);
      builder.box(7.54, .07, 6.54, M.green, propsRoot, [0, -.15, .55]);
      const wood = {color: '#5b3f2c', roughness: .82};
      builder.box(trayW + .3, .06, 1.34, wood, propsRoot, [0, .0, trayZ]);
      for (const side of [-1, 1]) {builder.box(trayW + .42, .12, .06, M.brass, propsRoot, [0, .03, trayZ + side * .7]); builder.box(.06, .12, 1.46, M.brass, propsRoot, [side * (trayW / 2 + .18), .03, trayZ]);}
      for (let k = 1; k < n; k++) builder.box(.025, .05, 1.2, M.brass, propsRoot, [-trayW / 2 + k * cell, .03, trayZ]);
      if (assembly) assembly.scenery(builder, propsRoot, P);
      const stacked = items.every(item => /^(square-base|octagon-body|roof|arcade|entry-arch)$/.test(item.anchor || ''));
      const GENERIC = {roof: [[-.77, 0, -.65], [.77, .75, .65]], octagon: [[-.64, 0, -.64], [.64, .72, .64]], wing: [[-.67, 0, -.51], [.67, 1.0, .52]], arch: [[-.67, 0, -.5], [.67, 1.23, .5]], base: [[-.74, 0, -.64], [.74, .35, .64]]};
      items.forEach((item, index) => {
        const anchor = item.anchor || 'square-base', own = Boolean(assembly?.has(anchor));
        const destination = own ? assembly.at[anchor].slice() : stacked ? [0, /roof/.test(anchor) ? 1.08 : /octagon/.test(anchor) ? .35 : 0, 0] : [(index - (n - 1) / 2) * 1.6, 0, 0];
        const slot = tag(builder.group(propsRoot, destination), 'slot:' + item.id, 'slot');
        const root = tag(builder.group(propsRoot, [0, 0, 0]), item.id, 'piece');
        let bounds;
        if (own) {assembly.draw(builder, slot, anchor, G); bounds = assembly.draw(builder, root, anchor, P).bounds;}
        else {
          buildPart(builder, slot, anchor, M.ghost, {...M.brass, opacity: .5}); buildPart(builder, root, anchor, M.ivory, M.copper);
          const g = GENERIC[/roof/.test(anchor) ? 'roof' : /octagon/.test(anchor) ? 'octagon' : /wing/.test(anchor) ? 'wing' : /arcade|arch|hall/.test(anchor) ? 'arch' : 'base'];
          bounds = {min: g[0], max: g[1]};
        }
        const size = bounds.max.map((v, k) => v - bounds.min[k]), mid = bounds.min.map((v, k) => (v + bounds.max[k]) / 2);
        const scale = Math.min(1, cell * .78 / Math.max(.2, size[0]), 1.3 / Math.max(.2, size[1]), 1.0 / Math.max(.2, size[2]));
        const x = -trayW / 2 + (index + .5) * cell, tray = [x - mid[0] * scale, .03 - bounds.min[1] * scale, trayZ - mid[2] * scale];
        pieces.set(item.id, {root, tray, destination, scale, mid, size, drag: null, dragScale: scale, from: null, fromScale: scale});
        slots.set(item.id, {root: slot});
        const center = [mid[0], mid[1], bounds.max[2] - .02];
        targets.set(item.id, {root, center, item, role: 'piece'}); targets.set('slot:' + item.id, {root: slot, center, item, role: 'slot'});
      });
    }

    if (quest.type === 'lock') {
      // a strongbox on the plinth in front of the building: number wheels in a brass plate, a padlock on the hasp
      const code = lockCode(quest), n = Math.max(1, code.length), W = .44 * n + .56, H = .92, D = .78;
      const wood = {color: '#4a3326', roughness: .8}, dark = {color: '#1d1610', roughness: .9};
      const root = builder.group(propsRoot, [0, .02, front + 1.05]); builder.transform(root, {scale: [1.2, 1.2, 1.2]});
      builder.box(W, H, D, wood, root, [0, H / 2, 0]);
      for (const y of [.08, H - .08]) builder.box(W + .04, .06, D + .04, M.brass, root, [0, y, 0]);
      for (const x of [-1, 1]) builder.box(.06, H, .06, M.brass, root, [x * W / 2, H / 2, D / 2]);
      const lid = builder.group(root, [0, H, -D / 2]); builder.box(W + .06, .14, D + .06, wood, lid, [0, .07, D / 2]); builder.box(W + .08, .04, D + .08, M.brass, lid, [0, .15, D / 2]);
      builder.box(.44 * n + .18, .5, .04, M.brass, root, [0, .44, D / 2 + .02]);
      builder.box(.44 * n + .02, .3, .03, dark, root, [0, .44, D / 2 + .045]);
      for (const x of [-1, 1]) builder.mesh(pyramid(.08, .05, .08), M.orange, root, [x * (.22 * n + .14), .44, D / 2 + .06], [0, 0, x * PI / 2]);
      const drums = code.map((_, i) => {
        const at = tag(builder.group(root, [(i - (n - 1) / 2) * .44, .44, D / 2 - .04]), 'wheel:' + i, 'wheel');
        const drum = builder.group(at);
        builder.cyl(.2, .34, M.ivory, drum, [0, 0, 0], [0, 0, PI / 2], 20);
        for (let k = 0; k < 10; k++) {const a = k * PI / 5; builder.label('', .3, .12, drum, [0, Math.sin(a) * .205, Math.cos(a) * .205], [-a, 0, 0], {texture: digitTexture(doc, k)});}
        for (const x of [-.18, .18]) builder.cyl(.215, .02, M.brass, drum, [x, 0, 0], [0, 0, PI / 2], 20);
        targets.set('wheel:' + i, {root: at, center: [0, 0, .24], item: {label: `wheel ${i + 1}`}, role: 'wheel'});
        return drum;
      });
      const shackleY = H + .3, shackleZ = D / 2 + .14, shackle = builder.group(root, [0, shackleY, shackleZ]);
      const arc = []; for (let k = 0; k <= 12; k++) {const a = k * PI / 12; arc.push([Math.cos(a) * .14, Math.sin(a) * .16, 0]);}
      builder.line([[.14, -.2, 0], ...arc, [-.14, -.2, 0]], .035, M.brass, shackle);
      builder.box(.38, .3, .14, M.brass, root, [0, H + .12, D / 2 + .14]); builder.box(.06, .1, .02, dark, root, [0, H + .1, D / 2 + .22]);
      lock = {root, drums, lid, shackle, shackleY, shackleZ};
      code.forEach((_, i) => {values['wheel:' + i] = state.wheels?.[i] || 0;});
    } else if (quest.type === 'jigsaw') {
      // a page frame on an easel in front of the building; the torn pieces lie in a tray at its foot
      const cols = quest.cols || 2, rows = Math.ceil(items.length / cols), C = .78, tilt = .5, B = [0, 1.25, front + 1.0];
      const wood = {color: '#4a3326', roughness: .8}, felt = {color: '#203d33', roughness: .95};
      const board = builder.group(propsRoot, B, [-tilt, 0, 0]);
      builder.box(cols * C + .26, rows * C + .26, .08, wood, board, [0, 0, -.05]);
      builder.box(cols * C + .04, rows * C + .04, .03, felt, board, [0, 0, .005]);
      for (const side of [-1, 1]) {builder.box(cols * C + .32, .05, .1, M.brass, board, [0, side * (rows * C / 2 + .14), -.01]); builder.box(.05, rows * C + .32, .1, M.brass, board, [side * (cols * C / 2 + .14), 0, -.01]);}
      for (const x of [-1, 1]) builder.box(.07, B[1] + .1, .07, wood, propsRoot, [x * (cols * C / 2 + .05), (B[1] + .1) / 2 - .05, B[2] - .32]);
      const local = (cell, z = 0) => [(cell % cols - (cols - 1) / 2) * C, ((rows - 1) / 2 - Math.floor(cell / cols)) * C, z];
      const cellWorld = (cell, z = 0) => {const [x, y, zz] = local(cell, z); return [B[0] + x, B[1] + y * Math.cos(tilt) + zz * Math.sin(tilt), B[2] - y * Math.sin(tilt) + zz * Math.cos(tilt)];};
      const cells = new Map();
      items.forEach((_, n) => {
        const cell = tag(builder.group(board, local(n, .025)), 'cell:' + n, 'cell');
        builder.box(C - .06, C - .06, .012, {color: '#2b4a3e', roughness: .9}, cell); builder.box(C - .1, .012, .014, M.brass, cell, [0, -(C / 2 - .05), .006]);
        cells.set(n, cell); targets.set('cell:' + n, {root: cell, center: [0, 0, .02], item: {label: `square ${n + 1}`}, role: 'cell'});
      });
      // the tray holds the pieces smaller (they grow to size when lifted); six lie in two rows of three
      const S = .7, gap = C * S + .1, perRow = items.length > 4 ? Math.ceil(items.length / 2) : items.length, trayRows = Math.ceil(items.length / perRow);
      const trayZ2 = B[2] + .85 + (trayRows - 1) * gap / 2, trayW = perRow * gap + .16, trayD = trayRows * gap + .12;
      builder.box(trayW, .05, trayD, wood, propsRoot, [0, .02, trayZ2]);
      for (const side of [-1, 1]) {builder.box(trayW + .1, .1, .05, M.brass, propsRoot, [0, .05, trayZ2 + side * trayD / 2]); builder.box(.05, .1, trayD + .02, M.brass, propsRoot, [side * trayW / 2, .05, trayZ2]);}
      const pieces = new Map();
      items.forEach((item, n) => {
        const root = tag(builder.group(propsRoot), item.id, 'piece'), inner = builder.group(root);
        builder.box(C - .08, C - .08, .022, M.paper, inner);
        builder.label('', C - .09, C - .09, inner, [0, 0, .013], null, {texture: pieceTexture(doc, quest, item, n)});
        const row = Math.floor(n / perRow), col = n % perRow, inRow = Math.min(perRow, items.length - row * perRow);
        const tray = [(col - (inRow - 1) / 2) * gap, .09, trayZ2 + (row - (trayRows - 1) / 2) * gap];
        const cell = state.cells?.[item.id], placed = Number.isInteger(cell);
        pieces.set(item.id, {root, inner, tray, drag: null, p: placed ? cellWorld(cell, .045) : tray.slice(), rx: placed ? -tilt : -PI / 2 + .38, rz: -(state.turns?.[item.id] || 0) * PI / 2, s: placed ? 1 : S});
        targets.set(item.id, {root, center: [0, 0, .02], item, role: 'piece'});
      });
      jig = {board, cells, pieces, tilt, cellWorld, C, S, reach: Math.max(cols * C + .4, trayW), mid: [0, (B[1] + .1) / 2, (B[2] + trayZ2) / 2]};
    }

    if (quest.type === 'lock' || quest.type === 'jigsaw') {
      // the hands' work fills the frame; the building stands behind it
      const box = lock ? [0, .75, front + 1.3] : jig.mid, reach = lock ? 0 : jig.reach;
      pose = {target: box, yaw: lock ? .14 : .06, elevation: lock ? .3 : .62, distance: lock ? 6.2 : Math.max(4.4, reach * 1.55)};
      cameraPresets.overview = copyPose(pose);
      cameraPresets.detail = {...copyPose(pose), yaw: 0, elevation: lock ? .2 : .55, distance: lock ? 4.2 : pose.distance * .82};
    }

    if (quest.type === 'assemble') {
      if (assembly) front = assembly.front;
      const height = assembly?.height || 2.2;
      pose = {target: [0, Math.max(.8, height * .4), trayZ * .4], yaw: .05, elevation: assembly?.flat ? .5 : .4, distance: 7.6 + height * .78};
      cameraPresets.overview = copyPose(pose);
      cameraPresets.detail = {...copyPose(pose), target: [0, height * .45, 0], elevation: .3, distance: 5.8 + height * .7};
    }

    reward = builder.group(); rewardPage = builder.group(reward, [0, .63, .07]);
    builder.box(1.6, .88, .09, M.green, reward); builder.box(1.45, .76, .05, M.brass, reward, [0, 0, .06]);
    builder.box(1.3, .9, .025, M.paper, rewardPage); builder.label(quest.rewardLabel || 'CLUE UNLOCKED', 1.1, .2, rewardPage, [0, .23, .02], null, {background: '#f1e6c9', color: '#244d41', fontSize: 44});
    for (let n = 0; n < 4; n++) builder.box(.87 - n % 2 * .14, .012, .02, M.brass, rewardPage, [0, .02 - n * .11, .02]);
    reward.userData.questIgnorePick = true; builder.transform(reward, {visible: false});
    for (const item of items) {values['found:' + item.id] = state.found.includes(item.id) ? 1 : 0; values['placed:' + item.id] = state.placed.includes(item.id) ? 1 : 0; values['pick:' + item.id] = state.selected === item.id ? 1 : 0;}

    function listen(type, handler, options) {canvas.addEventListener(type, handler, options); listeners.push(() => canvas.removeEventListener(type, handler, options));}
    function cancelGesture() {if (gesture?.mode === 'handle') {values.value = state.value; schedule();} if (gesture?.mode === 'piece' && gesture.dragging) dropPiece(gesture, true); if (gesture?.mode === 'jig' && gesture.dragging) dropJig(gesture, true); gesture = null;}
    listen('pointerdown', event => {
      if (event.button !== 0 && event.button !== 2) return;
      // Hunt: a first finger starts afresh. A lift the page never heard (an interrupted touch) must not leave a ghost
      // pointer behind, or every later one-finger drag reads as a pinch and the mechanism stops answering.
      if (event.isPrimary && pointers.size) {cancelGesture(); pointers.clear();}
      canvas.focus({preventScroll: true, focusVisible: false}); pointers.set(event.pointerId, [event.clientX, event.clientY]);
      try {canvas.setPointerCapture(event.pointerId);} catch {}
      if (pointers.size > 1) {cancelGesture(); const ps = [...pointers.values()]; gesture = {mode: 'pinch', span: Math.hypot(ps[0][0] - ps[1][0], ps[0][1] - ps[1][1])}; return;}
      cameraTween = null; drawNow(); const hit = pickPoint(event.clientX, event.clientY), handle = active && !authoritativeSolved && hit && ['dial', 'slider'].includes(hit.role) && targetEligible(hit.id);
      const grab = active && !authoritativeSolved && hit?.role === 'piece' && targetEligible(hit.id);
      const spin = active && !authoritativeSolved && hit?.role === 'wheel' && targetEligible(hit.id);
      if (spin) {gesture = {mode: 'spin', hit, wheel: Number(hit.id.slice(6)), base: values['wheel:' + Number(hit.id.slice(6))] || 0, start: [event.clientX, event.clientY], last: [event.clientX, event.clientY], moved: false, pointerId: event.pointerId}; return;}
      if (grab && jig) {gesture = {mode: 'jig', hit, start: [event.clientX, event.clientY], last: [event.clientX, event.clientY], moved: false, pointerId: event.pointerId}; return;}
      gesture = {mode: handle ? 'handle' : grab ? 'piece' : 'orbit', hit, start: [event.clientX, event.clientY], last: [event.clientX, event.clientY], moved: false, value: values.value, pointerId: event.pointerId};
      if (handle) {
        focusId = hit.id; const target = targets.get(hit.id), center = worldPoint(target.root.world, target.center), screen = projectQuestPoint(center, camera, canvas.getBoundingClientRect());
        gesture.center = screen; gesture.startAngle = Math.atan2(event.clientY - screen.y, event.clientX - screen.x);
        if (hit.role === 'slider') {const axis = quest.axis === 'y' ? [0, slider.worldTravel, 0] : [slider.worldTravel, 0, 0], end = projectQuestPoint(add(center, axis), camera, canvas.getBoundingClientRect()); gesture.track = [end.x - screen.x, end.y - screen.y];}
        message = hit.role === 'dial' ? 'Turn the pointer to the fixed mark.' : 'Slide along the track to move the panel away.'; status(true);
      }
    }, true);
    listen('pointermove', event => {
      if (!pointers.has(event.pointerId) || !gesture) return;
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      if (pointers.size > 1) {
        const ps = [...pointers.values()], span = Math.hypot(ps[0][0] - ps[1][0], ps[0][1] - ps[1][1]);
        if (gesture.span && span > 3) moveCamera({distance: pose.distance * gesture.span / span}, 0); gesture.span = span; event.preventDefault(); return;
      }
      const dx = event.clientX - gesture.start[0], dy = event.clientY - gesture.start[1]; if (Math.hypot(dx, dy) > 5) gesture.moved = true;
      if (gesture.mode === 'spin') {if (gesture.moved) {values['wheel:' + gesture.wheel] = gesture.base + dy / 38; motions.delete('wheel:' + gesture.wheel); schedule();} event.preventDefault();}
      else if (gesture.mode === 'jig') {if (gesture.moved) dragJig(gesture, event.clientX, event.clientY); event.preventDefault();}
      else if (gesture.mode === 'piece') {if (gesture.moved) dragPiece(gesture, event.clientX, event.clientY); event.preventDefault();}
      else if (gesture.mode === 'handle') {
        if (gesture.hit.role === 'dial') {const angle = Math.atan2(event.clientY - gesture.center.y, event.clientX - gesture.center.x); values.value = normalizedAngle(gesture.value + normalizedYaw(angle - gesture.startAngle) * 180 / PI);}
        else {const track = gesture.track, lengthSquared = Math.max(2000, dot([track[0], track[1], 0], [track[0], track[1], 0])); values.value = clamp(gesture.value + (dx * track[0] + dy * track[1]) / lengthSquared * 100, 0, 100);}
        motions.delete('value'); schedule(); event.preventDefault();
      } else if (gesture.moved) {moveCamera({yaw: pose.yaw - (event.clientX - gesture.last[0]) * .008, elevation: pose.elevation + (event.clientY - gesture.last[1]) * .005}, 0); event.preventDefault();}
      gesture.last = [event.clientX, event.clientY];
    }, {capture: true, passive: false});
    const release = (event, cancelled = false) => {
      if (!pointers.has(event.pointerId)) return;
      const finished = gesture, single = pointers.size === 1; pointers.delete(event.pointerId);
      try {if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);} catch {}
      if (single) {
        gesture = null;
        if (finished?.mode === 'spin') {
          if (cancelled) animate('wheel:' + finished.wheel, finished.base, 200);
          else if (finished.moved) {const v = Math.round(values['wheel:' + finished.wheel]); animate('wheel:' + finished.wheel, v, 180); emit({type: 'spin', wheel: finished.wheel, value: ((v % 10) + 10) % 10});}
          else activate(finished.hit);
        }
        else if (finished?.mode === 'jig') {if (finished.dragging) dropJig(finished, cancelled); else if (!cancelled) activate(finished.hit);}
        else if (finished?.mode === 'piece') {if (finished.dragging) dropPiece(finished, cancelled); else if (!cancelled) activate(finished.hit);}
        else if (!cancelled && finished?.mode === 'handle') {
          if (finished.moved) emit({type: finished.hit.role === 'dial' ? 'align' : 'slide', value: Math.round(values.value * 10) / 10});
          else activate(finished.hit);
        } else if (!cancelled && finished?.mode === 'orbit' && !finished.moved && event.button !== 2) {drawNow(); activate(pickPoint(event.clientX, event.clientY));}
        else if (cancelled) {values.value = state.value; schedule();}
      } else gesture = {mode: 'orbit', start: [...pointers.values()][0], last: [...pointers.values()][0], moved: true};
      status(true); event.stopImmediatePropagation();
    };
    listen('pointerup', event => release(event), true); listen('pointercancel', event => release(event, true), true);
    listen('wheel', event => {event.preventDefault(); moveCamera({distance: pose.distance * Math.exp(clamp(event.deltaY, -180, 180) * .0015)}, 0);}, {passive: false});
    listen('contextmenu', event => event.preventDefault());
    listen('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const action = {ArrowLeft: () => moveCamera({yaw: pose.yaw + PI / 12}, 0), ArrowRight: () => moveCamera({yaw: pose.yaw - PI / 12}, 0), ArrowUp: () => moveCamera({elevation: pose.elevation + .08}, 0), ArrowDown: () => moveCamera({elevation: pose.elevation - .08}, 0), Home: () => setView('overview'), '+': () => moveCamera({distance: pose.distance * .9}, 0), '=': () => moveCamera({distance: pose.distance * .9}, 0), '-': () => moveCamera({distance: pose.distance * 1.1}, 0)}[event.key];
      if (action) {event.preventDefault(); action();}
    });
    const visibility = () => {if (doc.hidden) {if (raf !== null) win.cancelAnimationFrame(raf); raf = null; cancelGesture(); pointers.clear();} else schedule();};
    doc.addEventListener('visibilitychange', visibility); listeners.push(() => doc.removeEventListener('visibilitychange', visibility));
    const resize = () => {if (!disposed) {stage.resize(); schedule();}};
    const observer = win.ResizeObserver ? new win.ResizeObserver(resize) : null; observer?.observe(container);
    if (!observer) win.addEventListener('resize', resize); listeners.push(() => observer ? observer.disconnect() : win.removeEventListener('resize', resize));
    if (active) activateScene(); else schedule();
  } catch (error) {disposed = true; model?.dispose?.(); stage?.dispose?.(); throw error;}

  function activateScene() {
    if (activated) {schedule(); return;} activated = true;
    message = quest.instruction || 'Look at the building and touch the clue.'; values.intro = .35; animate('intro', 1, 780);
    if (!reduced) {pose = {...cameraPresets.overview, target: cameraPresets.overview.target.slice(), yaw: -.18, elevation: .38, distance: cameraPresets.overview.distance * 1.14}; moveCamera(cameraPresets.overview, 850);}
    schedule(); status(true);
  }
  function setView(name) {if (cameraPresets[name]) {const next = {...cameraPresets[name], yaw: name === 'detail' ? pose.yaw : cameraPresets[name].yaw}; moveCamera(next);}}
  function activateTarget(id) {
    if (!targetEligible(id)) {message = 'Turn to the side where you can see this part.'; status(true); return false;}
    drawNow(); const target = targets.get(id); if (!target) return false;
    const point = worldPoint(target.root.world, target.center), screen = projectQuestPoint(point, camera, canvas.getBoundingClientRect());
    if (!screen) return false; const hit = pickPoint(screen.x, screen.y);
    // a square with a piece on it answers through the piece (a held piece swaps in, an empty hand turns it)
    if (hit?.id !== id && !(target.role === 'cell' && jig && state.cells?.[hit?.id] === Number(id.slice(5)))) {message = 'This part is still blocked. Change the angle, or move the cover first.'; status(true); return false;}
    activate(hit); return true;
  }
  return {
    engine: stage.engine,
    setProgress(next) {if (!disposed) {syncState(next, true); status(true);}},
    setEnabled(next) {if (disposed) return; const previous = active; active = Boolean(next); if (active && !previous) activateScene(); if (!active) message = 'The mechanism lights up once you check in and observe the site.'; schedule(); status(true);},
    setMotion(next) {reduced = Boolean(next); if (reduced) {for (const [key, value] of motions) values[key] = value.to; motions.clear(); if (cameraTween) {pose = copyPose(cameraTween.to); cameraTween = null;}} schedule();},
    setView,
    rotate(delta) {moveCamera({yaw: pose.yaw + delta}, reduced ? 0 : 320);},
    zoom(factor) {moveCamera({distance: pose.distance * factor}, reduced ? 0 : 240);},
    activateTarget,
    adjust(value) {
      const id = quest.type === 'align' ? '$dial' : '$slider';
      if (!targetEligible(id)) {message = 'Turn to the front of the mechanism, then adjust the part.'; status(true); return;}
      if (!activateTarget(id)) return;
      emit({type: quest.type === 'align' ? 'align' : 'slide', value: quest.type === 'align' ? normalizedAngle(value) : clamp(value, 0, 100)});
    },
    getStatus: () => status(true),
    resize() {if (!disposed) {stage.resize(); schedule();}},
    dispose() {if (disposed) return; disposed = true; if (raf !== null) win.cancelAnimationFrame(raf); listeners.forEach(fn => fn()); pointers.clear(); motions.clear(); targets.clear(); model?.dispose?.(); stage?.dispose?.();},
  };
}

export default createQuestWorld;
