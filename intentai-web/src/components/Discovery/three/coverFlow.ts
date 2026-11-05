// Cover Flow in Three.js (owner sketch, 31 Oct 2026: "like Apple Music"): the card in the middle faces you, the cards
// beside it turn away and stack in depth, each with a soft reflection. Only the cards near the middle exist on the GPU
// (a pool of POOL slots), so a deck of 70 places costs the same as a deck of 5 (iPhone memory, see PlaceCarousel).
import * as THREE from 'three';

export const CARD_W = 1;
export const CARD_H = 1;
const POOL = 9;
const TEX_W = 512;
const TEX_H = Math.round((TEX_W * CARD_H) / CARD_W);
const FOV = 30;

export type DrawCard = (ctx: CanvasRenderingContext2D, index: number, w: number, h: number) => void;

interface Slot {
  index: number;
  group: THREE.Group;
  card: THREE.Mesh;
  mirror: THREE.Mesh;
  ring: THREE.Mesh;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 6);
}

/**
 * Where a card sits for its offset from the middle (o = index − scroll).
 * Past the second card on each side the cards fade, so the fan ends inside the screen instead of being cut by its edge.
 */
export function cardPose(o: number) {
  const a = Math.max(-1, Math.min(1, o));
  const sign = Math.sign(o);
  const ao = Math.abs(o);
  return {
    x: ao <= 1 ? o * 0.86 : sign * (0.86 + (ao - 1) * 0.27),
    z: -Math.abs(a) * 0.75 - Math.max(0, ao - 1) * 0.04,
    rotY: -a * 0.95,
    fade: ao > 2.4 ? Math.max(0, (3.4 - ao) / 1) : 1,
  };
}

export class CoverFlowScene {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  private readonly slots: Slot[] = [];
  private count = 0;
  private draw: DrawCard = () => {};
  scroll = 0;
  private target = 0;
  private velocity = 0;
  private dragging = false;
  private frame = 0;
  private last = 0;
  private width = 1;
  private height = 1;
  reduced = false;
  /** After each frame (overlays follow the cards). */
  onFrame: (() => void) | null = null;
  /** When the deck comes to rest on a card after a gesture. */
  onSettle: ((index: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const geom = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const ringGeom = roundedRect(CARD_W + 0.05, CARD_H + 0.05, 0.075);
    // on paper a cover casts a soft shadow (a mirrored reflection only reads on glass)
    const shadowMap = this.shadowTexture();
    for (let i = 0; i < POOL; i++) {
      const canvas2 = document.createElement('canvas');
      canvas2.width = TEX_W;
      canvas2.height = TEX_H;
      const texture = new THREE.CanvasTexture(canvas2);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      const card = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
      const mirror = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ map: shadowMap, color: 0x2a1a0c, transparent: true, opacity: 0.5, depthWrite: false }));
      mirror.scale.set(1.18, 0.2, 1);
      mirror.position.set(0.03, -CARD_H / 2 - 0.02, -0.01);
      const ring = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color: 0xb9502a, transparent: true, opacity: 0 }));
      ring.position.z = -0.002;
      const group = new THREE.Group();
      group.add(ring, card, mirror);
      group.visible = false;
      this.scene.add(group);
      this.slots.push({ index: -1, group, card, mirror, ring, canvas: canvas2, texture });
    }
  }

  private shadowTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 32;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 16, 2, 64, 16, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.setTransform(1, 0, 0, 0.25, 0, 12);
    g.fillStyle = grad;
    g.fillRect(0, -64, 128, 256);
    return new THREE.CanvasTexture(c);
  }


  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    // the middle card takes about 36% of the width, and card + a sliver of its reflection fit the height
    const v = Math.tan(((FOV / 2) * Math.PI) / 180);
    const byW = CARD_W / 0.36 / (2 * v * this.camera.aspect);
    const byH = (CARD_H * 1.14) / (2 * v);
    const d = Math.max(byW, byH);
    this.camera.position.set(0, -CARD_H * 0.04, d);
    this.camera.lookAt(0, -CARD_H * 0.04, 0);
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  setItems(count: number, draw: DrawCard) {
    this.count = count;
    this.draw = draw;
    for (const s of this.slots) s.index = -1;
    this.scroll = Math.min(this.scroll, Math.max(0, count - 1));
    this.target = Math.min(this.target, Math.max(0, count - 1));
    this.kick();
  }

  /** Redraw one card's face (its photo has loaded, its progress changed). */
  invalidate(index?: number) {
    for (const s of this.slots) if (index === undefined || s.index === index) s.index = -1;
    this.kick();
  }

  goTo(index: number, instant = false) {
    this.target = Math.max(0, Math.min(this.count - 1, index));
    this.velocity = 0;
    if (instant || this.reduced) this.scroll = this.target;
    this.kick();
  }

  /** Pixels on screen between the middle card and the next one (drag speed). */
  unitPx(): number {
    const a = this.toScreen(new THREE.Vector3(0, 0, 0));
    const p = cardPose(1);
    const b = this.toScreen(new THREE.Vector3(p.x, 0, p.z));
    return Math.max(40, Math.abs(b.x - a.x));
  }

  dragBy(dxPx: number) {
    this.dragging = true;
    this.scroll = Math.max(-0.4, Math.min(this.count - 0.6, this.scroll - dxPx / this.unitPx()));
    this.target = this.scroll;
    this.kick();
  }

  release(velocityPxPerS: number) {
    this.dragging = false;
    const v = -velocityPxPerS / this.unitPx();
    const projected = this.scroll + v * 0.22;
    this.target = Math.max(0, Math.min(this.count - 1, Math.round(projected)));
    this.velocity = 0;
    this.settleWanted = true;
    this.kick();
  }

  private settleWanted = false;

  private toScreen(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.width, y: ((1 - p.y) / 2) * this.height };
  }

  /** Screen rectangle of a card (index) and its four drawn corners, or null when it is not drawn. */
  rectOf(index: number): { left: number; top: number; width: number; height: number; quad: { x: number; y: number }[] } | null {
    const s = this.slots.find((x) => x.index === index && x.group.visible);
    if (!s) return null;
    s.group.updateMatrixWorld(true);
    const corners = [
      [-CARD_W / 2, -CARD_H / 2],
      [CARD_W / 2, -CARD_H / 2],
      [CARD_W / 2, CARD_H / 2],
      [-CARD_W / 2, CARD_H / 2],
    ].map(([x, y]) => this.toScreen(new THREE.Vector3(x, y, 0).applyMatrix4(s.card.matrixWorld)));
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top, quad: corners };
  }

  kick() {
    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    let moving = this.dragging;
    if (!this.dragging) {
      // critically damped spring towards the target card
      const k = 170;
      const c = 2 * Math.sqrt(k);
      const a = (this.target - this.scroll) * k - this.velocity * c;
      this.velocity += a * dt;
      this.scroll += this.velocity * dt;
      if (this.reduced || (Math.abs(this.target - this.scroll) < 0.0008 && Math.abs(this.velocity) < 0.002)) {
        this.scroll = this.target;
        this.velocity = 0;
        if (this.settleWanted) {
          this.settleWanted = false;
          this.onSettle?.(this.target);
        }
      } else moving = true;
    }
    this.layout();
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
    if (moving) this.kick();
  };

  private layout() {
    const centre = Math.round(this.scroll);
    const wanted = new Set<number>();
    for (let i = centre - Math.floor(POOL / 2); i <= centre + Math.floor(POOL / 2); i++) if (i >= 0 && i < this.count) wanted.add(i);
    // keep slots that still show a wanted card; reuse the others
    const free = this.slots.filter((s) => !wanted.has(s.index));
    for (const s of this.slots) if (wanted.has(s.index)) wanted.delete(s.index);
    for (const i of wanted) {
      const s = free.shift();
      if (!s) break;
      s.index = i;
      this.paint(s);
    }
    for (const s of free) {
      s.group.visible = false;
      s.index = -1;
    }
    for (const s of this.slots) {
      if (s.index < 0) continue;
      if (s.texture.userData.painted !== s.index) this.paint(s);
      const o = s.index - this.scroll;
      const p = cardPose(o);
      s.group.visible = p.fade > 0.01;
      s.group.position.set(p.x, 0, p.z);
      s.group.rotation.y = p.rotY;
      const order = 100 - Math.round(Math.abs(o) * 10);
      s.ring.renderOrder = order;
      s.card.renderOrder = order;
      s.mirror.renderOrder = order - 50;
      (s.card.material as THREE.MeshBasicMaterial).opacity = p.fade;
      (s.mirror.material as THREE.MeshBasicMaterial).opacity = 0.5 * p.fade;
      (s.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - Math.abs(o) * 3);
    }
  }

  private paint(s: Slot) {
    const ctx = s.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, TEX_W, TEX_H);
    this.draw(ctx, s.index, TEX_W, TEX_H);
    s.texture.needsUpdate = true;
    s.texture.userData.painted = s.index;
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    for (const s of this.slots) {
      s.texture.dispose();
      (s.card.material as THREE.Material).dispose();
      (s.mirror.material as THREE.Material).dispose();
      (s.ring.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
  }
}
