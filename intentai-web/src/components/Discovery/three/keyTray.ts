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

/** A key's outline, each corner with its own radius. Shape +y is the far edge (the top of the key on screen). */
function rounded(w: number, d: number, [tl, tr, br, bl]: [number, number, number, number]) {
  const lim = (r: number) => Math.max(0.5, Math.min(r, w / 2, d / 2));
  const [a, b, c, e] = [lim(tl), lim(tr), lim(br), lim(bl)];
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + e, y);
  s.lineTo(x + w - c, y);
  s.absarc(x + w - c, y + c, c, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + d - b);
  s.absarc(x + w - b, y + d - b, b, 0, Math.PI / 2, false);
  s.lineTo(x + a, y + d);
  s.absarc(x + a, y + d - a, a, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + e);
  s.absarc(x + e, y + e, e, Math.PI, Math.PI * 1.5, false);
  return s;
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
    // a soft, domed edge all round (a pebble more than a block)
    const bevel = 4;
    const outline = rounded(spec.w - bevel * 2, this.depth - bevel * 2, spec.corners.map((c) => c - bevel) as [number, number, number, number]);
    const geo = new THREE.ExtrudeGeometry(outline, {
      depth: KEY_H - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 6,
      curveSegments: 10,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, bevel, 0);
    const canvas = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    // caps map x, y of the shape: one texture over the top, edge to edge
    tex.repeat.set(1 / spec.w, 1 / this.depth);
    tex.offset.set(0.5, 0.5);
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
    g.save();
    g.scale(dpr, dpr);
    g.font = '600 12.5px Inter, system-ui, -apple-system, sans-serif';
    const tw = s.label ? g.measureText(s.label).width : 0;
    const iw = 16;
    const gap = s.label ? 6 : 0;
    const x0 = (s.w - (iw + gap + tw)) / 2;
    const cy = this.depth / 2;
    g.translate(x0, cy - iw / 2);
    g.scale(iw / 24, iw / 24);
    g.strokeStyle = ink;
    g.lineWidth = 2.1;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke(new Path2D(s.icon));
    g.restore();
    if (s.label) {
      g.save();
      g.scale(dpr, dpr);
      g.font = '600 12.5px Inter, system-ui, -apple-system, sans-serif';
      g.fillStyle = ink;
      g.textBaseline = 'middle';
      g.fillText(s.label, x0 + iw + gap, cy + 0.5);
      g.restore();
    }
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
