import { expect, test } from 'vitest';
import { spread } from './projection';

const pin = (key: string, x: number, y: number) => ({ key, x, y });
const at = (p: { x: number; y: number }) => p;

test('spread pushes close pins apart to the minimum distance and leaves far ones alone', () => {
  const out = spread([pin('a', 100, 100), pin('b', 110, 100), pin('c', 300, 300)], at, 38);
  const [a, b, c] = out;
  expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(37.9);
  // half each, along the line between them
  expect(a.x).toBeCloseTo(86);
  expect(b.x).toBeCloseTo(124);
  expect(a.y).toBe(100);
  expect(c).toMatchObject({ id: 'c', x: 300, y: 300 });
});

test('spread separates pins on the same spot and chains of three', () => {
  const out = spread([pin('a', 50, 50), pin('b', 50, 50), pin('c', 60, 50)], at, 38);
  for (let i = 0; i < out.length; i++)
    for (let j = i + 1; j < out.length; j++) expect(Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y)).toBeGreaterThanOrEqual(37.9);
});

test('tile maths: zoom from scale and screen density, corners round-trip, the view covered', async () => {
  const { tileAt, tileCorner, tileZoom, toXY, viewTiles, ONEMAP } = await import('./projection');
  expect(tileZoom(0.6)).toBe(17);
  expect(tileZoom(0.6, 2)).toBe(18);
  expect(tileZoom(3, 2)).toBe(ONEMAP.maxZoom);
  expect(tileZoom(0.001)).toBe(ONEMAP.minZoom);
  // Lim Chee Guan at zoom 18 is tile 206688 / 130136 (the tile checked by hand against OneMap)
  const t = tileAt({ lat: 1.28403, lng: 103.84363 }, 18);
  expect([Math.floor(t.x), Math.floor(t.y)]).toEqual([206688, 130136]);
  const c = tileCorner(206688, 130136, 18);
  expect(tileAt(c, 18).x).toBeCloseTo(206688, 6);

  const view = { center: toXY({ lat: 1.28403, lng: 103.84363 }), scale: 1, width: 390, height: 300 };
  const tiles = viewTiles(view, 18);
  expect(tiles.length).toBeGreaterThan(0);
  expect(tiles.map((x) => x.key)).toContain('18/206688/130136');
  expect(tiles[0].url).toBe(ONEMAP.url(18, ...(tiles[0].key.split('/').slice(1).map(Number) as [number, number])));
  // the tiles cover the whole view, and neighbours meet edge to edge
  expect(Math.min(...tiles.map((x) => x.left))).toBeLessThanOrEqual(0);
  expect(Math.max(...tiles.map((x) => x.left + x.width))).toBeGreaterThanOrEqual(390);
  const row = tiles.filter((x) => x.top === tiles[0].top).sort((p, q) => p.left - q.left);
  for (let i = 1; i < row.length; i++) expect(row[i].left).toBe(row[i - 1].left + row[i - 1].width);
  // a tile at zoom 18 is about 153 m across: about 153 px at 1 px per metre
  expect(tiles[0].width).toBeGreaterThan(145);
  expect(tiles[0].width).toBeLessThan(160);
  // outside OneMap's bounds (open sea far south): none
  expect(viewTiles({ ...view, center: toXY({ lat: 1.0, lng: 103.84 }) }, 18)).toEqual([]);
});
