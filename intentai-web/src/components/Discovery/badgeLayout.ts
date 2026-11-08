// Where the map's region and area badges go each frame (MapCard3D). Pure, so it is tested without WebGL.
// A badge starts on its projected point. One whose point is off the camera is hidden (it is not stacked at an edge);
// the rest stay whole inside the safe rectangle (clear of the tool rail, the crumb at the top and the credit below).
// Then they are placed one by one (the selected badge first, then in their order): each takes the free spot nearest
// its point, sideways or up and down, so a crowded region still has every badge apart and tappable.

export interface LaidBadge {
  /** Centre, in map pixels (projected point in, laid-out centre out). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Always shown, clamped in even when its point is off the camera (the five regions). */
  keep?: boolean;
  /** The selected badge: placed first, so it stays on its point and the others make room round it. */
  on?: boolean;
  /** Its width with the name left off (the number only), when it may shed its name to find room. */
  bare?: number;
  /** Set by layoutBadges: off the camera. */
  hidden?: boolean;
  /** Set by layoutBadges: no room for it named, so it shows its number only (w is then `bare`). */
  squeezed?: boolean;
}

/** The rectangle badges must stay inside (their edges), in map pixels. */
export interface SafeRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const GAP = 4;
const STEP = 8;
const REACH = 240;
/** Offsets round a badge's point, nearest first (a disc of REACH px, every STEP px). */
const OFFSETS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let dx = -REACH; dx <= REACH; dx += STEP)
    for (let dy = -REACH; dy <= REACH; dy += STEP) if (dx * dx + dy * dy <= REACH * REACH) out.push([dx, dy]);
  return out.sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]));
})();

function clampTo(x: number, y: number, b: LaidBadge, safe: SafeRect): [number, number] {
  const hw = b.w / 2;
  const hh = b.h / 2;
  const x0 = safe.left + hw;
  const x1 = safe.right - hw;
  const y0 = safe.top + hh;
  const y1 = safe.bottom - hh;
  return [x1 < x0 ? (safe.left + safe.right) / 2 : Math.min(Math.max(x, x0), x1), y1 < y0 ? (safe.top + safe.bottom) / 2 : Math.min(Math.max(y, y0), y1)];
}

const clash = (x: number, y: number, b: LaidBadge, placed: readonly LaidBadge[], blocked: readonly SafeRect[]) =>
  placed.some((p) => Math.abs(p.x - x) < (p.w + b.w) / 2 + GAP && Math.abs(p.y - y) < (p.h + b.h) / 2 + GAP) ||
  blocked.some((r) => x + b.w / 2 + GAP > r.left && x - b.w / 2 - GAP < r.right && y + b.h / 2 + GAP > r.top && y - b.h / 2 - GAP < r.bottom);

/** Lays the badges out in place. `width`/`height` are the map's; a point outside them is off the camera. `blocked`:
 *  rectangles inside the safe one that badges keep off (the tool rail, when the room under it is free). */
export function layoutBadges(
  badges: LaidBadge[],
  width: number,
  height: number,
  safe: SafeRect,
  blocked: readonly SafeRect[] = [],
): LaidBadge[] {
  const shown: LaidBadge[] = [];
  for (const b of badges) {
    b.hidden = !b.keep && (b.x < 0 || b.x > width || b.y < 0 || b.y > height);
    if (!b.hidden) shown.push(b);
  }
  // the selected one first; then from the top of the map down (a stable order frame to frame that packs closely)
  const order = [...shown.filter((b) => b.on), ...shown.filter((b) => !b.on).sort((a, b) => a.y - b.y || a.x - b.x)];
  const placed: LaidBadge[] = [];
  let stuck = false;
  for (const b of order) {
    b.squeezed = false;
    const px = b.x;
    const py = b.y;
    let at = freeSpot(px, py, b, placed, safe, blocked);
    if (!at && b.bare && b.bare < b.w) {
      // no room for its name: the number alone
      const named = b.w;
      b.w = b.bare;
      at = freeSpot(px, py, b, placed, safe, blocked);
      if (at) b.squeezed = true;
      else b.w = named;
    }
    if (!at) stuck = true;
    [b.x, b.y] = at ?? clampTo(px, py, b, safe);
    placed.push(b);
  }
  // a badge found no free spot (wide badges on a narrow map, the free room cut up by the others): stack them
  if (stuck && !blocked.length) settle(shown, safe);
  return badges;
}

const sideBySide = (a: LaidBadge, b: LaidBadge) => Math.abs(a.x - b.x) >= (a.w + b.w) / 2 + GAP;

/** Top down, each badge goes below those above it that share its column; then bottom up, each goes above those below
 *  it, so the stack fits between the crumb and the credit when its height allows. */
function settle(bs: LaidBadge[], safe: SafeRect) {
  const down = [...bs].sort((a, b) => a.y - b.y);
  down.forEach((b, i) => {
    let y = Math.max(b.y, safe.top + b.h / 2);
    for (const a of down.slice(0, i)) if (!sideBySide(a, b)) y = Math.max(y, a.y + (a.h + b.h) / 2 + GAP);
    b.y = y;
  });
  const up = [...bs].sort((a, b) => b.y - a.y);
  up.forEach((b, i) => {
    let y = Math.min(b.y, safe.bottom - b.h / 2);
    for (const a of up.slice(0, i)) if (!sideBySide(a, b)) y = Math.min(y, a.y - (a.h + b.h) / 2 - GAP);
    b.y = Math.max(y, safe.top + b.h / 2);
  });
}

function freeSpot(
  px: number,
  py: number,
  b: LaidBadge,
  placed: readonly LaidBadge[],
  safe: SafeRect,
  blocked: readonly SafeRect[],
): [number, number] | null {
  const [x0, y0] = clampTo(px, py, b, safe);
  for (const [dx, dy] of OFFSETS) {
    const [x, y] = clampTo(x0 + dx, y0 + dy, b, safe);
    if (!clash(x, y, b, placed, blocked)) return [x, y];
  }
  return null;
}

/** True when two laid-out badges overlap (for tests and checks). */
export const overlaps = (a: LaidBadge, b: LaidBadge) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
