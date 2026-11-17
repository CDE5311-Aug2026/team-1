import { describe, expect, test } from 'vitest';
import { layoutBadges, overlaps, type LaidBadge, type SafeRect } from './badgeLayout';

// A 320 px phone's map: 268 × 356, the rail's 50 px on the right, the crumb's bottom + 6 px at the top, the credit's
// 30 px at the foot (MapCard3D).
const W = 268;
const H = 356;
const SAFE: SafeRect = { left: 4, top: 46, right: W - 50, bottom: H - 30 };

const inside = (b: LaidBadge, s: SafeRect) =>
  b.x - b.w / 2 >= s.left - 0.01 && b.x + b.w / 2 <= s.right + 0.01 && b.y - b.h / 2 >= s.top - 0.01 && b.y + b.h / 2 <= s.bottom + 0.01;

const countOverlaps = (bs: LaidBadge[]) => {
  const shown = bs.filter((b) => !b.hidden);
  let n = 0;
  for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) if (overlaps(shown[i], shown[j])) n++;
  return n;
};

describe('layoutBadges', () => {
  test('a badge whose point is off the camera is hidden, not stacked at the edge', () => {
    const bs: LaidBadge[] = [
      { x: -40, y: 100, w: 60, h: 32 },
      { x: 120, y: H + 20, w: 60, h: 32 },
      { x: 120, y: 160, w: 60, h: 32 },
    ];
    layoutBadges(bs, W, H, SAFE);
    expect(bs.map((b) => !!b.hidden)).toEqual([true, true, false]);
  });

  test('a region badge (keep) off the camera is clamped in, never hidden', () => {
    const bs: LaidBadge[] = [{ x: -40, y: -10, w: 120, h: 36, keep: true }];
    layoutBadges(bs, W, H, SAFE);
    expect(bs[0].hidden).toBe(false);
    expect(inside(bs[0], SAFE)).toBe(true);
  });

  test('visible badges stay whole inside the map, clear of the rail (right) and below the crumb (top)', () => {
    // Downtown Core sits under the rail and an area near the crumb: both are pulled into the safe rectangle
    const bs: LaidBadge[] = [
      { x: 250, y: 200, w: 100, h: 36 },
      { x: 60, y: 20, w: 90, h: 36 },
      { x: 10, y: 340, w: 90, h: 36 },
    ];
    layoutBadges(bs, W, H, SAFE);
    for (const b of bs) {
      expect(b.hidden).toBe(false);
      expect(inside(b, SAFE)).toBe(true);
    }
    // the top limit is the crumb's real bottom + 6 px, passed in, not a fixed 44 px
    expect(bs[1].y - bs[1].h / 2).toBeCloseTo(SAFE.top);
  });

  test('a dozen named badges crowded into the top half step apart, sideways as well as down', () => {
    // West at 320 px: 12 areas, their points bunched in a band
    const bs: LaidBadge[] = Array.from({ length: 12 }, (_, i) => ({
      x: 60 + (i % 4) * 40,
      y: 120 + Math.floor(i / 4) * 18,
      w: 92,
      h: 34,
      bare: 34,
      on: i === 0,
    }));
    const start = bs.map((b) => b.x);
    layoutBadges(bs, W, H, SAFE);
    expect(countOverlaps(bs)).toBe(0);
    for (const b of bs) expect(inside(b, SAFE)).toBe(true);
    // some moved sideways (not only up and down)
    expect(bs.some((b, i) => Math.abs(b.x - start[i]) > 10)).toBe(true);
    // the selected one held its place and kept its name; most of the others are still named
    expect(bs[0].x).toBe(Math.max(60, SAFE.left + 46));
    expect(bs[0].squeezed).toBe(false);
    expect(bs.filter((b) => !b.squeezed).length).toBeGreaterThanOrEqual(8);
  });

  test('a badge that cannot be named for want of room keeps its number only, rather than overlapping', () => {
    // room for two named badges, one above the other, and a round one beside them
    const tiny: SafeRect = { left: 0, top: 0, right: 140, bottom: 80 };
    const bs: LaidBadge[] = [
      { x: 50, y: 18, w: 100, h: 36, bare: 36, on: true },
      { x: 60, y: 40, w: 100, h: 36, bare: 36 },
      { x: 60, y: 40, w: 100, h: 36, bare: 36 },
    ];
    layoutBadges(bs, 140, 80, tiny);
    expect(countOverlaps(bs)).toBe(0);
    expect(bs.map((b) => !!b.squeezed)).toEqual([false, false, true]);
  });

  test('West at 320 px as the map drew it (12 named badges, most in one column): all apart and inside', () => {
    // projected points and measured sizes taken from the running app (Clementi selected)
    const raw: [number, number, number, boolean?][] = [
      [165, 188, 98, true], [168, 140, 106], [150, 150, 98], [159, 148, 98], [125, 160, 103], [152, 120, 106],
      [115, 108, 106], [112, 170, 88], [101, 300, 106], [56, 188, 81], [140, 130, 79], [37, 268, 66],
    ];
    const bs: LaidBadge[] = raw.map(([x, y, w, on]) => ({ x, y, w, h: 36, on, bare: 36 }));
    layoutBadges(bs, W, H, SAFE);
    expect(countOverlaps(bs)).toBe(0);
    for (const b of bs) expect(inside(b, SAFE)).toBe(true);
    expect([bs[0].x, bs[0].y]).toEqual([165, 188]);
  });

  test("Central's 22 number-only badges on a 320 px map, all on the camera: all shown, none overlapping", () => {
    const bs: LaidBadge[] = Array.from({ length: 22 }, (_, i) => ({
      x: 70 + ((i * 37) % 130),
      y: 110 + ((i * 53) % 170),
      w: 36,
      h: 36,
    }));
    layoutBadges(bs, W, H, SAFE);
    expect(bs.every((b) => !b.hidden)).toBe(true);
    expect(countOverlaps(bs)).toBe(0);
    for (const b of bs) expect(inside(b, SAFE)).toBe(true);
  });

  test('the room under the rail is used when the rail is a blocked rectangle, never the rail itself', () => {
    const full: SafeRect = { left: 4, top: 46, right: W - 4, bottom: H - 30 };
    const rail: SafeRect = { left: W - 50, top: 0, right: W, bottom: 216 };
    // a badge whose point is beside the rail, one under it
    const bs: LaidBadge[] = [
      { x: W - 20, y: 120, w: 36, h: 36 },
      { x: W - 20, y: 280, w: 36, h: 36 },
    ];
    layoutBadges(bs, W, H, full, [rail]);
    expect(bs[0].x + bs[0].w / 2).toBeLessThanOrEqual(rail.left);
    expect(bs[1].x).toBeGreaterThan(rail.left);
    expect(bs[1].y - bs[1].h / 2).toBeGreaterThanOrEqual(rail.bottom);
  });

  test('the five regions at 320 px as the built app projected them (West had no gap left): stacked apart', () => {
    // projected points and measured sizes from the production build, Central selected (its counts on two lines)
    const bs: LaidBadge[] = [
      { x: 144, y: 182, w: 125, h: 50, keep: true, on: true },
      { x: 255, y: 151, w: 103, h: 36, keep: true },
      { x: 100, y: 98, w: 109, h: 36, keep: true },
      { x: 175, y: 123, w: 123, h: 36, keep: true },
      { x: 22, y: 156, w: 109, h: 36, keep: true },
    ];
    const safe = { left: 4, top: 43, right: 218, bottom: 326 };
    layoutBadges(bs, W, H, safe);
    expect(countOverlaps(bs)).toBe(0);
    for (const b of bs) expect(inside(b, safe)).toBe(true);
  });

  test('five region badges at 320 px (North-East over North) end up apart', () => {
    const bs: LaidBadge[] = [
      { x: 110, y: 200, w: 120, h: 46, keep: true, on: true },
      { x: 170, y: 160, w: 100, h: 46, keep: true },
      { x: 120, y: 60, w: 104, h: 46, keep: true },
      { x: 150, y: 80, w: 116, h: 46, keep: true },
      { x: 60, y: 130, w: 104, h: 46, keep: true },
    ];
    layoutBadges(bs, W, H, SAFE);
    expect(countOverlaps(bs)).toBe(0);
    for (const b of bs) expect(inside(b, SAFE)).toBe(true);
  });
});
