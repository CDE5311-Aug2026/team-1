// A sharp street map under Home's 3D map card (owner, 31 Oct 2026: "why isn't the base map a precise one like Google
// Maps? it looks blurry"). The painted picture of Singapore (4096 px over 56 km, about 14 m a pixel) stays underneath;
// over it lie OneMap's street tiles (Singapore Land Authority, the government's own map: every road, its name, MRT
// stations), as many as the view needs at the detail the camera's distance calls for. A finer set only replaces the
// coarser one once it has loaded, so the ground never goes blank; without a network the painted picture shows.
// Google's tiles need a paid key and may not be drawn into another 3D scene, so they are not used.
import * as THREE from 'three';

const url = (z: number, x: number, y: number) => `https://www.onemap.gov.sg/maps/tiles/Default_HD/${z}/${x}/${y}.png`;

// the map's metre frame (projection.ts): x = (lng − 103.845) · 111290.5, y = (lat − 1.315) · 110574
const LON0 = 103.845;
const LAT0 = 1.315;
const KX = 111290.5;
const KY = 110574;
// OneMap covers Singapore only
const BOUNDS = { west: 103.56, east: 104.13, south: 1.13, north: 1.5 };
const MIN_Z = 11;
const MAX_Z = 18;
const MAX_TILES = 110; // in view at once
const KEEP = 260; // in memory

const tileLon = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const tileLat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;
const lonTile = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const latTile = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

interface Tile {
  mesh: THREE.Mesh;
  z: number;
  loaded: boolean;
  used: number;
}

export class TileGround {
  private readonly group = new THREE.Group();
  private readonly tiles = new Map<string, Tile>();
  private readonly loader = new THREE.TextureLoader();
  private wanted = '';
  private clock = 0;

  constructor(
    scene: THREE.Scene,
    private readonly anisotropy: number,
    private readonly onLoad: () => void,
  ) {
    this.loader.setCrossOrigin('anonymous');
    scene.add(this.group);
  }

  /**
   * The ground the camera sees: `cx`, `cy` its centre in map metres, `distKm` the camera's distance, `viewPx` the
   * canvas height in CSS pixels, `fovDeg` the vertical field of view.
   */
  update(cx: number, cy: number, distKm: number, viewPx: number, fovDeg: number) {
    // metres a screen pixel covers at the centre; a tile pixel about half that is sharp on a 2× screen
    const mpp = (2 * distKm * 1000 * Math.tan((fovDeg * Math.PI) / 360)) / Math.max(1, viewPx);
    let z = Math.round(Math.log2(156543 / (mpp * 0.6)));
    z = Math.max(MIN_Z, Math.min(MAX_Z, z));
    // the tilted camera sees further ahead (north) than behind
    const r = distKm * 1000 * 1.15;
    const box = { w: cx - r * 1.15, e: cx + r * 1.15, s: cy - r * 0.7, n: cy + r * 1.35 };
    let range = this.range(box, z);
    while (z > MIN_Z && (range.x1 - range.x0 + 1) * (range.y1 - range.y0 + 1) > MAX_TILES) range = this.range(box, --z);
    const key = `${z}:${range.x0}:${range.x1}:${range.y0}:${range.y1}`;
    if (key === this.wanted) return;
    this.wanted = key;
    this.clock++;

    const need = new Set<string>();
    for (let x = range.x0; x <= range.x1; x++)
      for (let y = range.y0; y <= range.y1; y++) {
        const id = `${z}/${x}/${y}`;
        need.add(id);
        const t = this.tiles.get(id) ?? this.add(z, x, y);
        t.used = this.clock;
        t.mesh.visible = t.loaded;
      }
    this.settle(z, need);
  }

  private range(b: { w: number; e: number; s: number; n: number }, z: number) {
    const lon = (x: number) => Math.min(BOUNDS.east, Math.max(BOUNDS.west, x / KX + LON0));
    const lat = (y: number) => Math.min(BOUNDS.north, Math.max(BOUNDS.south, y / KY + LAT0));
    return { x0: lonTile(lon(b.w), z), x1: lonTile(lon(b.e), z), y0: latTile(lat(b.n), z), y1: latTile(lat(b.s), z) };
  }

  private add(z: number, x: number, y: number): Tile {
    const w = (tileLon(x, z) - LON0) * KX;
    const e = (tileLon(x + 1, z) - LON0) * KX;
    const n = (tileLat(y, z) - LAT0) * KY;
    const s = (tileLat(y + 1, z) - LAT0) * KY;
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff7ea, depthWrite: false }); // a touch warm, to sit with the paper round it
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry((e - w) / 1000, (n - s) / 1000), mat);
    mesh.rotation.x = -Math.PI / 2;
    // finer tiles a hair above coarser ones; all under the area tiles, over the painted picture
    mesh.position.set((w + e) / 2000, -0.0095 + (z - MIN_Z) * 0.0004, -(n + s) / 2000);
    mesh.visible = false;
    mesh.renderOrder = -30 + z; // coarse first, fine over it (see mapScene's ground)
    const tile: Tile = { mesh, z, loaded: false, used: this.clock };
    this.tiles.set(`${z}/${x}/${y}`, tile);
    this.group.add(mesh);
    this.loader.load(
      url(z, x, y),
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = this.anisotropy;
        mat.map = tex;
        mat.needsUpdate = true;
        tile.loaded = true;
        mesh.visible = tile.used === this.clock;
        this.settle(Number(this.wanted.split(':')[0]), null);
        this.onLoad();
      },
      undefined,
      () => {
        tile.loaded = false; // no network or no tile there: the picture below shows
      },
    );
    return tile;
  }

  /** Once the wanted set is all in, other detail levels go; the least recently used beyond KEEP are freed. */
  private settle(z: number, need: Set<string> | null) {
    const current = [...this.tiles.values()].filter((t) => t.used === this.clock && t.z === z);
    const complete = current.every((t) => t.loaded);
    for (const t of this.tiles.values()) if (t.used !== this.clock || t.z !== z) t.mesh.visible = !complete && t.loaded && t.used >= this.clock - 1;
    if (need && this.tiles.size > KEEP) {
      const old = [...this.tiles.entries()].filter(([id]) => !need.has(id)).sort((a, b) => a[1].used - b[1].used);
      for (const [id, t] of old.slice(0, this.tiles.size - KEEP)) {
        const m = t.mesh.material as THREE.MeshBasicMaterial;
        m.map?.dispose();
        m.dispose();
        t.mesh.geometry.dispose();
        this.group.remove(t.mesh);
        this.tiles.delete(id);
      }
    }
  }

  dispose() {
    for (const t of this.tiles.values()) {
      const m = t.mesh.material as THREE.MeshBasicMaterial;
      m.map?.dispose();
      m.dispose();
      t.mesh.geometry.dispose();
    }
    this.tiles.clear();
  }
}
