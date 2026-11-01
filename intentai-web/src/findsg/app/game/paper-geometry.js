import {PAPER_COLUMNS, PAPER_ROWS, PAPER_BASE_ASPECT, PAPER_FRAME_COUNT, PAPER_QUANTUM, PAPER_PACKED, PAPER_INDICES} from './paper-path-data.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = vector => {const length = Math.hypot(...vector) || 1; return vector.map(value => value / length);};
let decoded = null;
function unpack() {
  if (decoded) return decoded;
  const bytes = value => Uint8Array.from(atob(value), letter => letter.charCodeAt(0));
  const raw = bytes(PAPER_PACKED), data = new DataView(raw.buffer), floats = new Float32Array(raw.length / 2);
  for (let i = 0; i < floats.length; i++) floats[i] = data.getInt16(i * 2, true) / PAPER_QUANTUM;
  const rawIndices = bytes(PAPER_INDICES), indexData = new DataView(rawIndices.buffer), indices = new Uint16Array(rawIndices.length / 2);
  for (let i = 0; i < indices.length; i++) indices[i] = indexData.getUint16(i * 2, true);
  const size = (PAPER_COLUMNS + 1) * (PAPER_ROWS + 1) * 3;
  decoded = {rest: floats.slice(0, size), samples: Array.from({length: PAPER_FRAME_COUNT}, (_, index) => floats.subarray(size * (index + 1), size * (index + 2))), creased: floats.slice(size * (PAPER_FRAME_COUNT + 1)), indices};
  return decoded;
}

export function createPaperMesh({width = 300, height = 400, foldSharpness = .6, wrinkleDepth = .65, seed = 7} = {}) {
  const data = unpack(), count = data.rest.length / 3, aspect = height / width;
  const positions = new Float32Array(data.rest.length), uvs = new Float32Array(count * 2), expandedUvs = new Float32Array(data.indices.length * 2), renderPositions = new Float32Array(data.indices.length * 3), renderNormals = new Float32Array(data.indices.length * 3), faceNormals = new Float32Array(data.indices.length);
  const incident = Array.from({length: count}, () => []), edgeMap = new Map();
  for (let i = 0; i < count; i++) {uvs[i * 2] = data.rest[i * 3] + .5; uvs[i * 2 + 1] = data.rest[i * 3 + 1] / PAPER_BASE_ASPECT + .5;}
  for (let i = 0; i < data.indices.length; i++) {expandedUvs[i * 2] = uvs[data.indices[i] * 2]; expandedUvs[i * 2 + 1] = uvs[data.indices[i] * 2 + 1]; incident[data.indices[i]].push(Math.floor(i / 3) * 3);}
  for (let f = 0; f < data.indices.length; f += 3) for (let k = 0; k < 3; k++) {const a = data.indices[f + k], b = data.indices[f + (k + 1) % 3], key = Math.min(a, b) * count + Math.max(a, b); if (!edgeMap.has(key)) edgeMap.set(key, {a, b, faces: []}); edgeMap.get(key).faces.push(f);}
  return {data, positions, uvs, expandedUvs, renderPositions, renderNormals, faceNormals, incident, edges: [...edgeMap.values()], indices: data.indices, aspect, sharpness: clamp(foldSharpness, 0, 1), depth: clamp(wrinkleDepth, 0, 2), seed, lastAmount: -1, lastMemory: -1};
}

export function deformPaper(mesh, amount, memory = 0) {
  amount = clamp(amount, 0, 1); memory = clamp(memory, 0, 1);
  if (mesh.lastAmount === amount && mesh.lastMemory === memory) return false;
  mesh.lastAmount = amount; mesh.lastMemory = memory;
  const {data, positions, indices, faceNormals, renderPositions, renderNormals} = mesh;
  const sample = amount * (data.samples.length - 1), low = Math.floor(sample), high = Math.min(low + 1, data.samples.length - 1), blend = sample - low;
  const depth = .48 + mesh.depth * .8, yScale = mesh.aspect / PAPER_BASE_ASPECT;
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    let value = mix(data.samples[low][i], data.samples[high][i], blend) + (data.creased[i] - data.rest[i]) * memory * (1 - amount);
    if (axis === 1) value *= yScale;
    if (axis === 2) value *= depth;
    positions[i] = value;
  }
  for (let face = 0; face < indices.length; face += 3) {
    const a = indices[face] * 3, b = indices[face + 1] * 3, c = indices[face + 2] * 3;
    const bx = positions[b] - positions[a], by = positions[b + 1] - positions[a + 1], bz = positions[b + 2] - positions[a + 2];
    const cx = positions[c] - positions[a], cy = positions[c + 1] - positions[a + 1], cz = positions[c + 2] - positions[a + 2];
    const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx, length = Math.hypot(nx, ny, nz) || 1;
    faceNormals[face] = nx / length; faceNormals[face + 1] = ny / length; faceNormals[face + 2] = nz / length;
  }
  const lower = .88 - (1 - mesh.sharpness) * .18;
  for (let i = 0; i < indices.length; i++) {
    const source = indices[i] * 3, face = Math.floor(i / 3) * 3; let nx = 0, ny = 0, nz = 0;
    for (const neighbor of mesh.incident[indices[i]]) {
      const cosine = faceNormals[face] * faceNormals[neighbor] + faceNormals[face + 1] * faceNormals[neighbor + 1] + faceNormals[face + 2] * faceNormals[neighbor + 2];
      const t = clamp((cosine - lower) / (.98 - lower), 0, 1), weight = t * t * (3 - 2 * t);
      nx += faceNormals[neighbor] * weight; ny += faceNormals[neighbor + 1] * weight; nz += faceNormals[neighbor + 2] * weight;
    }
    const length = Math.hypot(nx, ny, nz) || 1;
    renderPositions.set(positions.subarray(source, source + 3), i * 3); renderNormals[i * 3] = nx / length; renderNormals[i * 3 + 1] = ny / length; renderNormals[i * 3 + 2] = nz / length;
  }
  return true;
}

export function rotatePaperPoint(p, pose) {
  const cx = Math.cos(pose.rx || 0), sx = Math.sin(pose.rx || 0), cy = Math.cos(pose.ry || 0), sy = Math.sin(pose.ry || 0), cz = Math.cos(pose.rz || 0), sz = Math.sin(pose.rz || 0);
  const y = p[1] * cx - p[2] * sx, z = p[1] * sx + p[2] * cx, x = p[0] * cy + z * sy, zz = -p[0] * sy + z * cy;
  return [x * cz - y * sz, x * sz + y * cz, zz];
}

export function projectPaper(mesh, pose, viewport) {
  const {width, height, scale} = viewport, focal = height / (2 * Math.tan(35 * Math.PI / 360)), points = [], triangles = [];
  const bounds = {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity};
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const p = rotatePaperPoint([mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]], pose).map(value => value * scale);
    p[0] += pose.x || 0; p[1] += pose.y || 0;
    const depth = Math.max(10, focal - p[2]), factor = focal / depth, x = width / 2 + p[0] * factor, y = height / 2 - p[1] * factor;
    points.push({x, y, depth, world: p}); bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x); bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
  }
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const ids = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]], p = ids.map(id => points[id]), normal = rotatePaperPoint([mesh.faceNormals[i], mesh.faceNormals[i + 1], mesh.faceNormals[i + 2]], pose);
    const center = [0, 1, 2].map(axis => (p[0].world[axis] + p[1].world[axis] + p[2].world[axis]) / 3), facing = dot(normal, [-center[0], -center[1], focal - center[2]]) >= 0;
    triangles.push({ids, points: p, normal: facing ? normal : normal.map(value => -value), front: facing, depth: (p[0].depth + p[1].depth + p[2].depth) / 3});
  }
  triangles.sort((a, b) => b.depth - a.depth);
  return {points, triangles, bounds, focal, viewport};
}

function barycentric(x, y, a, b, c) {
  const determinant = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y); if (Math.abs(determinant) < .00001) return null;
  const u = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / determinant, v = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / determinant, w = 1 - u - v;
  return u >= -.001 && v >= -.001 && w >= -.001 ? [u, v, w] : null;
}
export function hitPaper(frame, x, y) {
  if (!frame) return null; let result = null, nearest = Infinity;
  for (const triangle of frame.triangles) {
    const weights = barycentric(x, y, ...triangle.points); if (!weights) continue;
    const reciprocal = weights.reduce((sum, value, index) => sum + value / triangle.points[index].depth, 0), depth = 1 / reciprocal;
    if (depth < nearest) {nearest = depth; result = {ids: triangle.ids, weights: weights.map((value, index) => value / triangle.points[index].depth / reciprocal), front: triangle.front};}
  }
  return result;
}

function drawTriangle(context, texture, source, destination) {
  const [a, b, c] = source, [p, q, r] = destination;
  const determinant = a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]); if (Math.abs(determinant) < .00001) return;
  const solve = values => [(values[0] * (b[1] - c[1]) + values[1] * (c[1] - a[1]) + values[2] * (a[1] - b[1])) / determinant, (values[0] * (c[0] - b[0]) + values[1] * (a[0] - c[0]) + values[2] * (b[0] - a[0])) / determinant, (values[0] * (b[0] * c[1] - c[0] * b[1]) + values[1] * (c[0] * a[1] - a[0] * c[1]) + values[2] * (a[0] * b[1] - b[0] * a[1])) / determinant];
  const tx = solve([p.x, q.x, r.x]), ty = solve([p.y, q.y, r.y]);
  context.transform(tx[0], ty[0], tx[1], ty[1], tx[2], ty[2]); context.drawImage(texture, 0, 0);
}
function trianglePath(context, vertices, expand) {
  const [a, b, c] = vertices, orientation = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x), sign = orientation < 0 ? -1 : 1;
  // Offset each edge by the same physical-pixel distance. Radially expanding
  // vertices left near-zero coverage along the narrow triangles' long edges.
  context.beginPath();
  vertices.forEach((p, i) => {
    const before = vertices[(i + 2) % 3], after = vertices[(i + 1) % 3];
    const ax = p.x - before.x, ay = p.y - before.y, bx = after.x - p.x, by = after.y - p.y, al = Math.hypot(ax, ay) || 1, bl = Math.hypot(bx, by) || 1;
    const n1x = sign * ay / al, n1y = -sign * ax / al, n2x = sign * by / bl, n2y = -sign * bx / bl, denominator = Math.max(.025, 1 + n1x * n2x + n1y * n2y);
    let ox = (n1x + n2x) * expand / denominator, oy = (n1y + n2y) * expand / denominator;
    const length = Math.hypot(ox, oy), limit = expand * 4; if (length > limit) {ox *= limit / length; oy *= limit / length;}
    if (i) context.lineTo(p.x + ox, p.y + oy); else context.moveTo(p.x + ox, p.y + oy);
  });
  context.closePath();
}

export function createPaperCanvasRenderer(canvas, options = {}) {
  const context = canvas.getContext('2d', {alpha: true}); if (!context) throw new Error('Could not create the paper drawing canvas.');
  let pixelRatio = 1, disposed = false;
  return {
    engine: 'canvas2d-textured-mesh', canvas,
    resize(width, height) {pixelRatio = Math.min(canvas.ownerDocument.defaultView.devicePixelRatio || 1, 1.5); canvas.width = Math.max(1, Math.round(width * pixelRatio)); canvas.height = Math.max(1, Math.round(height * pixelRatio));},
    draw(mesh, frame, textures) {
      if (disposed) return; const {width, height} = frame.viewport; context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); context.clearRect(0, 0, width, height);
      if (options.shadow !== false) {
        const b = frame.bounds; context.save(); context.fillStyle = `rgba(38,31,20,${clamp(options.shadowOpacity ?? .11, 0, .4)})`; context.filter = 'blur(12px)'; context.beginPath(); context.ellipse((b.minX + b.maxX) / 2 + 6, (b.minY + b.maxY) / 2 + 17, Math.max(4, (b.maxX - b.minX) * .43), Math.max(6, (b.maxY - b.minY) * .46), 0, 0, Math.PI * 2); context.fill(); context.restore();
      }
      const angle = (options.lightAngle ?? -35) * Math.PI / 180, light = unit([Math.sin(angle) * .7, Math.cos(angle) * .7, 1]);
      for (const triangle of frame.triangles) {
        const texture = triangle.front ? textures.front : textures.back, source = triangle.ids.map(id => [(triangle.front ? mesh.uvs[id * 2] : 1 - mesh.uvs[id * 2]) * texture.width, (1 - mesh.uvs[id * 2 + 1]) * texture.height]);
        const lambert = Math.max(0, dot(triangle.normal, light)), shade = clamp(.47 + lambert * .58, .38, 1.06);
        context.save(); trianglePath(context, triangle.points, .65 / pixelRatio); context.clip();
        context.save(); drawTriangle(context, texture, source, triangle.points); context.restore();
        // Keep texture and face lighting under exactly the same coverage mask.
        // Restoring the nested transform puts this fill back in viewport pixels.
        context.fillStyle = shade < 1 ? `rgba(24,25,19,${(1 - shade).toFixed(3)})` : `rgba(255,244,216,${((shade - 1) * .7).toFixed(3)})`; context.fillRect(0, 0, width, height); context.restore();
      }
    },
    dispose() {disposed = true; context.clearRect(0, 0, canvas.width, canvas.height);},
  };
}

export function makePaperTexture(document, image, {width = 300, height = 400, imageFit = 'cover', paperColor = '#eee0bf', paperTexture = .08, seed = 7} = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.round(1024 * height / width); const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not draw the archive page.');
  context.fillStyle = paperColor; context.fillRect(0, 0, canvas.width, canvas.height);
  if (image) {
    const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height, scale = imageFit === 'contain' ? Math.min(canvas.width / iw, canvas.height / ih) : Math.max(canvas.width / iw, canvas.height / ih);
    context.drawImage(image, (canvas.width - iw * scale) / 2, (canvas.height - ih * scale) / 2, iw * scale, ih * scale);
  }
  let randomState = seed | 0; const random = () => {randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296;};
  const strength = clamp(paperTexture, 0, 1);
  for (let i = 0; i < 5000; i++) {context.fillStyle = i % 2 ? `rgba(78,55,20,${strength * random() * .4})` : `rgba(255,249,224,${strength * random() * .5})`; context.fillRect(random() * canvas.width, random() * canvas.height, 1, 1 + random() * 2);}
  return canvas;
}
