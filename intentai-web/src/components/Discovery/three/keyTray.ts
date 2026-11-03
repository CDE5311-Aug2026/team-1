// The map card's keys in Three.js (owner, 31 Oct 2026: "like a phone keyboard, in Three.js, you can see the depth; the
// keys press down with a smooth transition; tuck them into the phone's big rounded bottom"). Each key is a rounded,
// bevelled block standing on the tray; the camera looks down at it from the front, so its top and front face show.
// A pressed key sinks into the tray (its front face disappears) and springs back; a key that is on (Picks) stays down
// and turns orange. The real buttons are HTML laid over the canvas: they take the taps and the keyboard, and their
// boxes say where each key is drawn.
import * as THREE from 'three';

export interface TrayKey {
  /** The HTML button's box in the canvas, px. */
  x: number;
  w: number;
  label: string;
  /** SVG path data (24 × 24 box), drawn on the key top. */
  icon: string;
  on: boolean;
  disabled: boolean;
  /** Corner radii on screen, px: top left, top right, bottom right, bottom left. The outer keys' bottom corners follow
   *  the card's big rounded bottom. */
  corners: [number, number, number, number];
}

const KEY_H = 11; // px the key stands above the tray
const PITCH = (54 * Math.PI) / 180; // camera looks down this far from level
const DEPTH_PRESS = 8;

interface Key {
  spec: TrayKey;
  group: THREE.Group;
  body: THREE.Mesh;
  top: THREE.MeshStandardMaterial;
  side: THREE.MeshStandardMaterial;
  canvas: HTMLCanvasElement;
  tex: THREE.CanvasTexture;
  shadow: THREE.Mesh;
  y: number;
  v: number;
  held: boolean;
  hover: boolean;
  drawn: string;
}

const BEVEL = 4; // the key's rounded top edge, px
const ARC = 8; // segments per corner
const RIM = 7; // rings round the top edge

/**
 * A ring round the key at `inset` px in from its outline, at height y: the outline's corners (each with its own
 * radius) shrink with the inset. Every ring has the same number of points and no point twice, so rings join into a
 * clean skin (three's ExtrudeGeometry bevel folded over where an arc met a straight edge: the bitten corners).
 * Corner order: far left, far right, near right, near left (z grows towards the camera).
 */
function ring(w: number, d: number, corners: [number, number, number, number], inset: number, y: number): THREE.Vector3[] {
  const hw = w / 2 - inset;
  const hd = d / 2 - inset;
  const lim = (r: number) => Math.max(0.6, Math.min(r - inset, hw - 0.01, hd - 0.01));
  const [tl, tr, br, bl] = corners.map(lim);
  // centre of each corner's arc and the angle it starts at (x right, z towards the camera)
  const arcs: [number, number, number, number][] = [
    [-hw + tl, -hd + tl, tl, Math.PI], // far left: from the left edge round to the far edge
    [hw - tr, -hd + tr, tr, Math.PI * 1.5],
    [hw - br, hd - br, br, 0],
    [-hw + bl, hd - bl, bl, Math.PI * 0.5],
  ];
  const pts: THREE.Vector3[] = [];
  for (const [cx, cz, r, a0] of arcs)
    for (let i = 0; i <= ARC; i++) {
      const a = a0 + (i / ARC) * (Math.PI / 2);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
    }
  return pts;
}

/**
 * The key: straight walls up from the tray, a quarter-round edge, a flat top. Group 0 (the top and its rounded edge)
 * takes the key-top picture, mapped from above; group 1 (the walls) the side colour.
 */
function keyGeometry(w: number, d: number, corners: [number, number, number, number]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const put = (p: THREE.Vector3) => {
    pos.push(p.x, p.y, p.z);
    uv.push(p.x / w + 0.5, 0.5 - p.z / d);
    return pos.length / 3 - 1;
  };
  const skin = (rings: THREE.Vector3[][]) => {
    const ids = rings.map((r) => r.map(put));
    const n = ids[0].length;
    for (let j = 0; j < ids.length - 1; j++)
      for (let i = 0; i < n; i++) {
        const a = ids[j][i];
        const b = ids[j][(i + 1) % n];
        const c = ids[j + 1][i];
        const e = ids[j + 1][(i + 1) % n];
        index.push(a, c, b, b, c, e);
      }
    return ids;
  };
  const geo = new THREE.BufferGeometry();
  // walls
  const wallStart = index.length;
  skin([ring(w, d, corners, 0, 0), ring(w, d, corners, 0, KEY_H - BEVEL)]);
  const wallCount = index.length - wallStart;
  // the rounded edge and the top
  const capStart = index.length;
  const rims: THREE.Vector3[][] = [];
  for (let j = 0; j <= RIM; j++) {
    const t = (j / RIM) * (Math.PI / 2);
    rims.push(ring(w, d, corners, BEVEL * (1 - Math.cos(t)), KEY_H - BEVEL + BEVEL * Math.sin(t)));
  }
  const ids = skin(rims);
  const top = rims[RIM];
  const tris = THREE.ShapeUtils.triangulateShape(
    top.map((p) => new THREE.Vector2(p.x, -p.z)),
    [],
  );
  const last = ids[RIM];
  for (const [a, b, c] of tris) {
    // face up: (b − a) × (c − a) must point up (+y)
    const [pa, pb, pc] = [top[a], top[b], top[c]];
    const up = (pb.z - pa.z) * (pc.x - pa.x) - (pb.x - pa.x) * (pc.z - pa.z);
    index.push(...(up > 0 ? [last[a], last[b], last[c]] : [last[a], last[c], last[b]]));
  }
  geo.setIndex(index);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.addGroup(capStart, index.length - capStart, 0);
  geo.addGroup(wallStart, wallCount, 1);
  geo.computeVertexNormals();
  return geo;
}

const keyFont = (px: number) => `600 ${px}px Inter, system-ui, -apple-system, sans-serif`;

/** The largest word size (11 px down to 8.5) at which every key's icon and word fit its flat top with room each side. */
function fitLabelSize(specs: readonly TrayKey[]): number {
  const g = document.createElement('canvas').getContext('2d');
  if (!g) return 11;
  for (let size = 11; size > 8.5; size -= 0.5) {
    g.font = keyFont(size);
    const fits = specs.every((s) => !s.label || size + 2 + 5 + g.measureText(s.label).width <= s.w - BEVEL * 2 - 12);
    if (fits) return size;
  }
  return 8.5;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class KeyTrayScene {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  private keys: Key[] = [];
  private width = 1;
  private height = 1;
  private depth = 36; // key top, front to back, px
  private frame = 0;
  private last = 0;
  private readonly shadowTex = shadowTexture();
  private labelSize = 11;
  reduced = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x5a544a, 1.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-0.4, 1, 0.9);
    this.scene.add(sun);
    // the tray's surface: draws nothing, but hides what is below it (a pressed key sinks into it)
    const tray = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ colorWrite: false }));
    tray.rotation.x = -Math.PI / 2;
    tray.renderOrder = -1;
    this.scene.add(tray);
  }

  /** The tray's size in px; keys are placed in the same px. */
  resize(w: number, h: number) {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.renderer.setSize(this.width, this.height, false);
    // the key top (depth) and its front face fill the height, with a little room
    this.depth = Math.max(24, (this.height - KEY_H * Math.cos(PITCH) - 8) / Math.sin(PITCH));
    const c = this.camera;
    c.left = -this.width / 2;
    c.right = this.width / 2;
    c.top = this.height / 2;
    c.bottom = -this.height / 2;
    c.position.set(0, Math.sin(PITCH) * 100, Math.cos(PITCH) * 100);
    c.lookAt(0, KEY_H / 2, 0);
    c.updateProjectionMatrix();
    for (const k of this.keys) this.dispose(k);
    this.keys = [];
    this.kick();
  }

  setKeys(specs: TrayKey[]) {
    const same =
      specs.length === this.keys.length &&
      specs.every(
        (s, i) =>
          Math.abs(s.x - this.keys[i].spec.x) < 0.5 && Math.abs(s.w - this.keys[i].spec.w) < 0.5 && s.corners.join() === this.keys[i].spec.corners.join(),
      );
    if (!same) {
      for (const k of this.keys) this.dispose(k);
      this.keys = specs.map((s) => this.make(s));
    } else specs.forEach((s, i) => (this.keys[i].spec = s));
    const size = fitLabelSize(specs);
    if (size !== this.labelSize) for (const k of this.keys) k.drawn = '';
    this.labelSize = size;
    for (const k of this.keys) this.paint(k);
    this.kick();
  }

  press(i: number, down: boolean) {
    const k = this.keys[i];
    if (!k || k.spec.disabled) return;
    k.held = down;
    // a quick tap still shows the key going all the way down
    if (down) k.v -= 260;
    this.kick();
  }

  hover(i: number, on: boolean) {
    const k = this.keys[i];
    if (!k) return;
    k.hover = on;
    this.kick();
  }

  private make(spec: TrayKey): Key {
    const geo = keyGeometry(spec.w, this.depth, spec.corners);
    const canvas = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 });
    const side = new THREE.MeshStandardMaterial({ color: 0xd8c39c, roughness: 0.6, metalness: 0 });
    const body = new THREE.Mesh(geo, [top, side]);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.w + 14, this.depth + 14),
      new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.2, 3);
    const group = new THREE.Group();
    group.add(body);
    group.position.x = spec.x + spec.w / 2 - this.width / 2;
    // the tray: anything below it is hidden (a pressed key sinks into it)
    const k: Key = { spec, group, body, top, side, canvas, tex, shadow, y: 0, v: 0, held: false, hover: false, drawn: '' };
    this.scene.add(group, shadow);
    shadow.position.x = group.position.x;
    return k;
  }

  private paint(k: Key) {
    const s = k.spec;
    const key = `${s.label}|${s.icon}|${s.on}|${s.disabled}|${s.w}`;
    if (key === k.drawn) return;
    k.drawn = key;
    const dpr = Math.min(2, window.devicePixelRatio || 1) * 2;
    const W = Math.round(s.w * dpr);
    const H = Math.round(this.depth * dpr);
    k.canvas.width = W;
    k.canvas.height = H;
    const g = k.canvas.getContext('2d')!;
    // ivory keys with brown ink, like an old instrument's; rust when on
    const base = s.on ? '#b9502a' : '#eadcc1';
    const ink = s.on ? '#fff6e8' : s.disabled ? 'rgba(59,38,20,0.35)' : '#3b2614';
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, s.on ? '#d2683a' : '#fbf4e6');
    grd.addColorStop(1, base);
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    // The camera sees the key top at a slant, which squashes it to sin(PITCH) of its height: drawn that much taller,
    // the icon and the word look their normal shape (owner, 1 Nov 2026: "the words look stretched").
    const tall = 1 / Math.sin(PITCH);
    // one size for every key's word (the one the tightest key needs), so the row reads evenly
    const size = this.labelSize;
    const iw = size + 2;
    g.font = keyFont(size);
    const tw = s.label ? g.measureText(s.label).width : 0;
    const gap = () => (s.label ? 5 : 0);
    const x0 = (s.w - (iw + gap() + tw)) / 2;
    const cy = this.depth / 2;
    g.save();
    g.scale(dpr, dpr);
    g.translate(0, cy);
    g.scale(1, tall);
    g.save();
    g.translate(x0, -iw / 2);
    g.scale(iw / 24, iw / 24);
    g.strokeStyle = ink;
    g.lineWidth = 2.1;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke(new Path2D(s.icon));
    g.restore();
    if (s.label) {
      g.font = keyFont(size);
      g.fillStyle = ink;
      g.textBaseline = 'middle';
      g.fillText(s.label, x0 + iw + gap(), 0.5);
    }
    g.restore();
    k.tex.needsUpdate = true;
    k.side.color.set(s.on ? 0x8f3c1b : 0xd8c39c);
  }

  private dispose(k: Key) {
    this.scene.remove(k.group, k.shadow);
    k.body.geometry.dispose();
    k.top.dispose();
    k.side.dispose();
    k.tex.dispose();
    k.shadow.geometry.dispose();
    (k.shadow.material as THREE.Material).dispose();
  }

  /** Starts the animation loop (it stops by itself once every key is at rest). */
  kick() {
    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    let moving = false;
    for (const k of this.keys) {
      const goal = k.held || k.spec.on ? -DEPTH_PRESS : k.hover && !k.spec.disabled ? 1.5 : 0;
      if (this.reduced) {
        k.y = goal;
        k.v = 0;
      } else {
        // a spring: quick down, a soft bounce back up
        const a = (goal - k.y) * 900 - k.v * 38;
        k.v += a * dt;
        k.y += k.v * dt;
        if (k.y < -KEY_H + 1) {
          k.y = -KEY_H + 1;
          k.v = 0;
        }
        if (Math.abs(goal - k.y) > 0.02 || Math.abs(k.v) > 0.05) moving = true;
        else {
          k.y = goal;
          k.v = 0;
        }
      }
      k.group.position.y = k.y;
      const lift = (k.y + DEPTH_PRESS) / (DEPTH_PRESS + 1.5);
      (k.shadow.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.6 * Math.max(0, Math.min(1, lift));
      k.shadow.scale.setScalar(0.9 + 0.12 * Math.max(0, lift));
    }
    this.renderer.render(this.scene, this.camera);
    if (moving) this.frame = requestAnimationFrame(this.tick);
  };

  destroy() {
    cancelAnimationFrame(this.frame);
    for (const k of this.keys) this.dispose(k);
    this.shadowTex.dispose();
    this.renderer.dispose();
  }
}
