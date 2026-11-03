// The land round Singapore on Home's map (owner, 1 Nov 2026: "the empty band at the top is ugly; fill in Malaysia,
// no detail needed"). OneMap's tiles stop at Singapore's box and the painted picture is open sea beyond the island,
// so tilted towards the horizon the map ran out into grey. This layer paints Johor to the north and the Riau islands
// (Batam, Bintan, Karimun) to the south as plain land in OneMap's own colours, with OneMap's water round them. It
// lies under the street tiles: inside their box it only shows where a tile has not loaded, and its water stops at
// that box so the painted picture of Singapore stays visible there. Outlines are coarse on purpose.
import * as THREE from 'three';

const LON0 = 103.845;
const LAT0 = 1.315;
const KX = 111290.5;
const KY = 110574;

// what it covers, degrees
const W = 102.4;
const E = 105.3;
const S = 0.3;
const N = 2.6;
// OneMap's tiles (tileGround.ts BOUNDS): water inside this box is left to them and the painted picture
const TILES = { west: 103.56, east: 104.13, south: 1.13, north: 1.5 };

export const ONEMAP_LAND = 'rgb(251,248,243)';
export const ONEMAP_WATER = 'rgb(109,168,228)';

type LL = [number, number]; // lng, lat

// Johor and the peninsula to the north. Along the Strait of Johor it keeps north of Singapore's shore (Woodlands is
// at about 1.45°N), so even where no tile has loaded it never covers the island.
const JOHOR: LL[] = [
  [102.4, 2.6],
  [102.4, 2.13],
  [102.6, 2.03],
  [102.93, 1.84],
  [103.1, 1.7],
  [103.3, 1.55],
  [103.38, 1.47],
  [103.43, 1.38],
  [103.51, 1.265],
  [103.545, 1.3],
  [103.56, 1.34],
  [103.6, 1.375],
  [103.64, 1.4],
  [103.68, 1.452],
  [103.73, 1.468],
  [103.77, 1.47],
  [103.82, 1.472],
  [103.87, 1.478],
  [103.92, 1.465],
  // north of Pulau Ubin and Pulau Tekong (Tekong reaches 1.43°N, 104.08°E), then down the channel east of Tekong
  [103.97, 1.462],
  [104.02, 1.458],
  [104.06, 1.452],
  [104.095, 1.435],
  [104.11, 1.4],
  [104.12, 1.37],
  [104.15, 1.365],
  [104.22, 1.39],
  [104.27, 1.43],
  [104.29, 1.52],
  [104.27, 1.64],
  [104.22, 1.8],
  [104.13, 2.05],
  [104.0, 2.3],
  [103.88, 2.6],
];

const ISLANDS: { name: string; at: LL; outline: LL[] }[] = [
  {
    name: 'BATAM',
    at: [104.02, 1.08],
    outline: [
      [103.88, 1.11],
      [103.92, 1.16],
      [103.98, 1.175],
      [104.05, 1.17],
      [104.12, 1.18],
      [104.155, 1.14],
      [104.14, 1.06],
      [104.1, 1.02],
      [104.03, 0.99],
      [103.95, 1.01],
      [103.9, 1.05],
    ],
  },
  {
    name: 'BINTAN',
    at: [104.45, 1.02],
    outline: [
      [104.22, 1.12],
      [104.3, 1.19],
      [104.42, 1.2],
      [104.55, 1.16],
      [104.64, 1.06],
      [104.66, 0.95],
      [104.58, 0.86],
      [104.46, 0.83],
      [104.34, 0.88],
      [104.26, 0.95],
      [104.22, 1.04],
    ],
  },
  {
    name: '',
    at: [104.15, 0.88],
    outline: [
      [104.07, 0.97],
      [104.16, 0.96],
      [104.23, 0.9],
      [104.24, 0.78],
      [104.17, 0.72],
      [104.1, 0.78],
      [104.06, 0.88],
    ],
  },
  {
    name: 'KARIMUN',
    at: [103.4, 0.98],
    outline: [
      [103.33, 1.06],
      [103.39, 1.12],
      [103.45, 1.1],
      [103.47, 1.03],
      [103.43, 0.97],
      [103.36, 0.98],
    ],
  },
];

/** The layer, a plane in the map's km frame (x east, z south). */
export function surroundings(): THREE.Mesh {
  const PX = 2400; // canvas width
  const PY = Math.round((PX * ((N - S) * KY)) / ((E - W) * KX));
  const c = document.createElement('canvas');
  c.width = PX;
  c.height = PY;
  const g = c.getContext('2d');
  const at = ([lng, lat]: LL): [number, number] => [((lng - W) / (E - W)) * PX, ((N - lat) / (N - S)) * PY];
  if (g) {
    g.fillStyle = ONEMAP_WATER;
    g.fillRect(0, 0, PX, PY);
    const [x0, y0] = at([TILES.west, TILES.north]);
    const [x1, y1] = at([TILES.east, TILES.south]);
    g.clearRect(x0, y0, x1 - x0, y1 - y0);
    const land = (pts: LL[]) => {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(...at(p)) : g.moveTo(...at(p))));
      g.closePath();
      g.fill(); // no outline: where a tile meets this land the two are one colour, with no seam
    };
    g.fillStyle = ONEMAP_LAND;
    land(JOHOR);
    for (const i of ISLANDS) land(i.outline);
    // country names, faint, like the base map's
    g.fillStyle = 'rgba(120,112,100,0.75)';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const label = (text: string, p: LL, px: number) => {
      g.font = `600 ${px}px Inter, system-ui, sans-serif`;
      g.letterSpacing = `${px * 0.25}px`;
      g.fillText(text, ...at(p));
    };
    label('MALAYSIA', [103.75, 1.62], 14);
    for (const i of ISLANDS) if (i.name) label(i.name, i.at, 11);
    label('INDONESIA', [104.2, 0.62], 14);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const w = ((E - W) * KX) / 1000;
  const d = ((N - S) * KY) / 1000;
  // the tiles' warm tint (tileGround.ts), so this land and the tiles' land are one colour
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, color: 0xfff7ea, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((((W + E) / 2 - LON0) * KX) / 1000, -0.0098, (-((N + S) / 2 - LAT0) * KY) / 1000);
  mesh.renderOrder = -35; // over the painted picture (-40), under the street tiles (-30 + zoom)
  return mesh;
}

/** OneMap's water with the tiles' tint, for the open sea beyond this layer. */
export const SEA = new THREE.Color().setRGB((109 / 255) * 1, (168 / 255) * (0xf7 / 255), (228 / 255) * (0xea / 255), THREE.SRGBColorSpace);
