// Home's map card as a Three.js scene (owner sketch, 31 Oct 2026): URA planning areas as raised tiles. The tiles in
// focus lift and brighten, the rest sink and dim; the camera glides to the focus. Rendering runs only while something
// moves, so an idle Home costs nothing.
import * as THREE from 'three';
import type { Rgba } from '../../../features/nearby/map/CityMap';

export interface SceneArea {
  id: string;
  rings: readonly (readonly (readonly [number, number])[])[];
}

/** What each tile should look like now. */
export interface TileLook {
  color: Rgba;
  /** Height of the tile's top, in km (the base sits on the sea). */
  lift: number;
  edge: Rgba;
}

/** Map metres (projection.ts frame) → scene units: km, x east, z south, y up. */
export const toScene = (x: number, y: number) => new THREE.Vector3(x / 1000, 0, -y / 1000);

const TILE_DEPTH = 0.12;
const TILT = (52 * Math.PI) / 180; // camera elevation above the horizon
const FOV = 32;

export class MapScene {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 400);
  private readonly tiles = new Map<string, { mesh: THREE.Mesh; edges: THREE.LineSegments; look: TileLook; shown: TileLook }>();
  private target = { center: new THREE.Vector3(0, 0, -2), dist: 60 };
  private shown = { center: new THREE.Vector3(0, 0, -2), dist: 60 };
  private frame = 0;
  private last = 0;
  private width = 1;
  private height = 1;
  /** Called after each rendered frame (labels and pins follow the camera). */
  onFrame: (() => void) | null = null;
  reduced = false;

  constructor(canvas: HTMLCanvasElement, areas: readonly SceneArea[], groundUrl?: string) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-20, 40, 25);
    this.scene.add(sun);
    // EARTH ONLINE's ground picture of Singapore (the same art as the 3D city), ±28 km around the map origin
    if (groundUrl) {
      const tex = new THREE.TextureLoader().load(groundUrl, () => this.kick());
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      // open sea (the picture's own sea colour) to the horizon, so the picture's edge never shows
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(77 / 255, 126 / 255, 162 / 255, THREE.SRGBColorSpace) }));
      sea.rotation.x = -Math.PI / 2;
      sea.position.y = -0.02;
      this.scene.add(sea);
      this.scene.fog = new THREE.Fog(0x9fbcd4, 60, 160);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), new THREE.MeshBasicMaterial({ map: tex }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.01;
      this.scene.add(ground);
    }
    for (const a of areas) {
      const shapes = a.rings.map((ring) => new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x / 1000, y / 1000))));
      const geom = new THREE.ExtrudeGeometry(shapes, { depth: TILE_DEPTH, bevelEnabled: false });
      geom.rotateX(-Math.PI / 2); // shape y (north) → -z; extrusion → +y
      const mat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.85, metalness: 0, transparent: true });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData.areaId = a.id;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom, 40),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
      );
      mesh.add(edges);
      this.scene.add(mesh);
      const look: TileLook = { color: [200, 200, 200, 1], lift: 0, edge: [255, 255, 255, 0.6] };
      this.tiles.set(a.id, { mesh, edges, look, shown: { ...look } });
    }
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.fit(this.lastBox, true);
  }

  setLooks(looks: ReadonlyMap<string, TileLook>) {
    for (const [id, t] of this.tiles) {
      const look = looks.get(id);
      if (look) t.look = look;
    }
    if (this.reduced) for (const t of this.tiles.values()) t.shown = { ...t.look };
    this.kick();
  }

  private lastBox: [number, number, number, number] = [-20000, -12000, 20000, 12000];

  private path: THREE.Line | null = null;

  /** A dashed line through these points (map metres), just above the tiles: a walk's order of stops. */
  setPath(points: readonly (readonly [number, number])[] | null) {
    if (this.path) {
      this.scene.remove(this.path);
      this.path.geometry.dispose();
      (this.path.material as THREE.Material).dispose();
      this.path = null;
    }
    if (points && points.length > 1) {
      const g = new THREE.BufferGeometry().setFromPoints(points.map(([x, y]) => new THREE.Vector3(x / 1000, 0.32, -y / 1000)));
      const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xe4671f, dashSize: 0.18, gapSize: 0.1, depthTest: false, transparent: true }));
      line.computeLineDistances();
      line.renderOrder = 20;
      this.scene.add(line);
      this.path = line;
    }
    this.kick();
  }

  /** Frame a box in map metres [minX, minY, maxX, maxY], leaving `pad` (0–1) around it. */
  fit(box: [number, number, number, number], instant = false, pad = 0.12) {
    this.lastBox = box;
    const a = toScene(box[0], box[1]);
    const b = toScene(box[2], box[3]);
    const center = new THREE.Vector3((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    const w = Math.abs(b.x - a.x) * (1 + pad * 2);
    const d = Math.abs(b.z - a.z) * (1 + pad * 2);
    const v = Math.tan(((FOV / 2) * Math.PI) / 180);
    // depth is foreshortened by the tilt; width by the aspect
    const dist = Math.max(w / (2 * v * this.camera.aspect), (d * Math.sin(TILT)) / (2 * v), 0.6);
    this.target = { center, dist };
    if (instant || this.reduced) this.shown = { center: center.clone(), dist };
    this.kick();
  }

  /** The area tile under a point in canvas pixels, if any. */
  pick(px: number, py: number): string | undefined {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1), this.camera);
    const hit = ray.intersectObjects([...this.tiles.values()].map((t) => t.mesh), false)[0];
    return hit?.object.userData.areaId as string | undefined;
  }

  /** Screen position (canvas px) of a point in map metres at a height in km; null when behind the camera. */
  project(x: number, y: number, h = 0): { x: number; y: number } | null {
    const p = toScene(x, y);
    p.y = h;
    p.project(this.camera);
    if (p.z > 1) return null;
    return { x: ((p.x + 1) / 2) * this.width, y: ((1 - p.y) / 2) * this.height };
  }

  /** Current top of a tile, in km (labels and pins sit on it). */
  topOf(id: string): number {
    const t = this.tiles.get(id);
    return t ? t.shown.lift + TILE_DEPTH : TILE_DEPTH;
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
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 7);
    let moving = false;
    const near = (a: number, b: number, eps: number) => Math.abs(a - b) < eps;
    // camera
    this.shown.center.lerp(this.target.center, k);
    this.shown.dist += (this.target.dist - this.shown.dist) * k;
    if (this.shown.center.distanceTo(this.target.center) > 0.002 || !near(this.shown.dist, this.target.dist, 0.002)) moving = true;
    // tiles
    for (const t of this.tiles.values()) {
      const s = t.shown;
      const l = t.look;
      const c = s.color.map((v, i) => v + (l.color[i] - v) * k) as unknown as Rgba;
      const e = s.edge.map((v, i) => v + (l.edge[i] - v) * k) as unknown as Rgba;
      const lift = s.lift + (l.lift - s.lift) * k;
      if (!near(lift, l.lift, 0.0005) || c.some((v, i) => !near(v, l.color[i], i === 3 ? 0.002 : 0.5))) moving = true;
      t.shown = { color: c, edge: e, lift };
      const m = t.mesh.material as THREE.MeshStandardMaterial;
      m.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
      m.opacity = c[3];
      t.mesh.position.y = lift;
      const em = t.edges.material as THREE.LineBasicMaterial;
      em.color.setRGB(e[0] / 255, e[1] / 255, e[2] / 255, THREE.SRGBColorSpace);
      em.opacity = e[3];
    }
    const cam = this.camera;
    cam.position.set(this.shown.center.x, this.shown.dist * Math.sin(TILT), this.shown.center.z + this.shown.dist * Math.cos(TILT));
    cam.lookAt(this.shown.center);
    this.renderer.render(this.scene, cam);
    this.onFrame?.();
    if (moving) this.kick();
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    for (const t of this.tiles.values()) {
      t.mesh.geometry.dispose();
      (t.mesh.material as THREE.Material).dispose();
      t.edges.geometry.dispose();
      (t.edges.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
  }
}
