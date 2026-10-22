// 2D Singapore map drawn from the EARTH ONLINE dataset's ground image (OpenStreetMap land cover), in the
// same metric frame as the 3D model. Pan (drag / arrow keys), zoom (wheel, pinch, + / −), recenter,
// selectable pins with clustering, a radius overlay and an optional precise "you" dot.
// No third-party map service is contacted. Every place shown here is also in the list beside it.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import groundUrl from '../../../assets/nearby/sg-ground.webp';
import { CATEGORY_INFO } from '../domain';
import { Icon } from '../components/icons';
import type { Category, LatLng } from '../types';
import {
  HALF,
  clampCenter,
  clampScale,
  cluster,
  fitView,
  fromScreen,
  scaleForRadius,
  toLatLng,
  toScreen,
  toXY,
  type View,
  type XY,
} from './projection';
import styles from './CityMap.module.css';

export interface MapPin {
  key: string;
  name: string;
  location: LatLng;
  category: Category;
  visited?: boolean;
}

/** Zoom in, zoom out and recenter: the 2D map's buttons, also used over the 3D view so both look and work the same. */
export function MapControls({
  top,
  onZoom,
  onRecenter,
  recenterLabel = 'Recenter map',
  bleed = false,
}: {
  top?: number;
  /** k > 1 zooms in. */
  onZoom: (k: number) => void;
  onRecenter?: () => void;
  recenterLabel?: string;
  /** Outside a full-bleed CityMap (the 3D view): the full-bleed look anyway. */
  bleed?: boolean;
}) {
  return (
    <div className={bleed ? `${styles.controls} ${styles.controlsBleed}` : styles.controls} style={top !== undefined ? { top } : undefined}>
      <button type="button" className={styles.control} onClick={() => onZoom(1.6)} aria-label="Zoom in">
        <Icon name="plus" />
      </button>
      <button type="button" className={styles.control} onClick={() => onZoom(1 / 1.6)} aria-label="Zoom out">
        <Icon name="minus" />
      </button>
      {onRecenter && (
        <button type="button" className={styles.control} onClick={onRecenter} aria-label={recenterLabel}>
          <Icon name="recenter" />
        </button>
      )}
    </div>
  );
}

export interface MapFocus {
  /** Change the id to apply the focus again (recenter). */
  id: number;
  points?: LatLng[];
  center?: LatLng;
  radiusM?: number;
}

export interface MapLabel {
  id: string;
  name: string;
  location: LatLng;
}

interface CityMapProps {
  pins: MapPin[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  focus: MapFocus;
  circle?: { center: LatLng; radiusM: number; label: string };
  you?: LatLng | null;
  labels?: MapLabel[];
  /** Called when a user pan/zoom has settled, with the new centre. */
  onSettled?: (center: LatLng) => void;
  /** The view shown in the uncovered part of the map (its centre and the radius that fits), after it settles:
   *  the 3D view opens on the same view. */
  onView?: (center: LatLng, radiusM: number) => void;
  onRecenter?: () => void;
  recenterLabel?: string;
  /** Fixed height in px. Omit with `bleed` to fill the parent (full-screen map). */
  height?: number;
  label: string;
  /** Full-bleed: no border or radius, fills the parent box (Explore's full-screen map). */
  bleed?: boolean;
  /** Parts of the map covered by floating UI (search bar on top, sheet at the bottom), in px. Focus and the
   *  "bring the selected pin into view" step use the uncovered area; controls and notes sit inside it. */
  insets?: { top?: number; bottom?: number; left?: number; right?: number };
  /** Top of the zoom / recenter buttons in px (default: just under the top inset). */
  controlsTop?: number;
  /** Pins are shown but not selectable (e.g. the single place on its own detail page). */
  readOnly?: boolean;
}

const KEY_PAN_PX = 60;
/** Pins closer than this merge, so 30–34 px targets never overlap (WCAG 2.5.8). */
const CLUSTER_PX = 38;
const SETTLE_MS = 400;
const IS_JSDOM = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

/* ---------- road layers (EARTH ONLINE sg_roads, simplified; loaded on demand) ---------- */
interface RoadLine {
  c: number;
  foreign: boolean;
  xs: Float32Array;
  ys: Float32Array;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
type RoadLayer = RoadLine[];

function decodeRoads(lines: number[][]): RoadLayer {
  return lines
    .map((l) => {
      const n = (l.length - 1) / 2;
      const xs = new Float32Array(n);
      const ys = new Float32Array(n);
      let x = l[1];
      let y = l[2];
      xs[0] = x;
      ys[0] = y;
      for (let k = 1; k < n; k++) {
        x += l[1 + 2 * k];
        y += l[2 + 2 * k];
        xs[k] = x;
        ys[k] = y;
      }
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let k = 0; k < n; k++) {
        minX = Math.min(minX, xs[k]);
        maxX = Math.max(maxX, xs[k]);
        minY = Math.min(minY, ys[k]);
        maxY = Math.max(maxY, ys[k]);
      }
      return { c: l[0] & 15, foreign: (l[0] & 16) !== 0, xs, ys, minX, maxX, minY, maxY };
    })
    .sort((a, b) => b.c - a.c); // local streets first, motorways on top
}

let majorRoads: Promise<RoadLayer> | null = null;
let minorRoads: Promise<RoadLayer> | null = null;
const loadMajor = () => (majorRoads ??= import('../../../data/explore/roads-major.json').then((m) => decodeRoads(m.default.lines)));
const loadMinor = () => (minorRoads ??= import('../../../data/explore/roads-minor.json').then((m) => decodeRoads(m.default.lines)));

// [width in m, min px, colour] per class (motorway, link, trunk, link, primary, link, secondary, link, tertiary, link, local)
const ROAD_STYLE: [number, number, string][] = [
  [26, 2.6, '#f0a04b'],
  [8, 1.4, '#f0a04b'],
  [20, 2.2, '#f6c063'],
  [7, 1.2, '#f6c063'],
  [15, 1.8, '#fbe08f'],
  [6, 1, '#fbe08f'],
  [12, 1.4, '#ffffff'],
  [5.5, 0.9, '#ffffff'],
  [9.5, 1.1, '#ffffff'],
  [5, 0.8, '#ffffff'],
  [7, 0.7, '#ffffff'],
];
/** Local streets appear from this scale (px per metre). */
const MINOR_SCALE = 0.05;

function drawRoads(ctx: CanvasRenderingContext2D, layer: RoadLayer, view: View, minClassScale: (c: number) => boolean) {
  const left = view.center.x - view.width / 2 / view.scale;
  const right = view.center.x + view.width / 2 / view.scale;
  const bottom = view.center.y - view.height / 2 / view.scale;
  const top = view.center.y + view.height / 2 / view.scale;
  const ox = view.width / 2 - view.center.x * view.scale;
  const oy = view.height / 2 + view.center.y * view.scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let current = -1;
  for (const l of layer) {
    // Singapore only: roads outside it (Johor, the Causeway's far end) are not drawn
    if (l.foreign || l.maxX < left || l.minX > right || l.maxY < bottom || l.minY > top || !minClassScale(l.c)) continue;
    if (l.c !== current) {
      const [w, minPx, colour] = ROAD_STYLE[l.c] ?? ROAD_STYLE[10];
      ctx.lineWidth = Math.max(minPx, w * view.scale);
      ctx.strokeStyle = colour;
      current = l.c;
    }
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(l.xs[0] * view.scale + ox, oy - l.ys[0] * view.scale);
    for (let k = 1; k < l.xs.length; k++) ctx.lineTo(l.xs[k] * view.scale + ox, oy - l.ys[k] * view.scale);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

let groundImage: HTMLImageElement | null = null;
function loadGround(onLoad: () => void): HTMLImageElement | null {
  if (IS_JSDOM || typeof Image === 'undefined') return null;
  if (!groundImage) {
    groundImage = new Image();
    groundImage.decoding = 'async';
    groundImage.src = groundUrl;
  }
  if (!groundImage.complete) groundImage.addEventListener('load', onLoad, { once: true });
  return groundImage;
}

export default function CityMap({
  pins,
  selectedKey,
  onSelect,
  focus,
  circle,
  you,
  labels = [],
  onSettled,
  onView,
  onRecenter,
  recenterLabel = 'Recenter map',
  height: fixedHeight,
  label,
  readOnly = false,
  bleed = false,
  insets,
  controlsTop,
}: CityMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(350);
  const [boxHeight, setBoxHeight] = useState(fixedHeight ?? 300);
  const height = fixedHeight ?? boxHeight;
  const insetTop = insets?.top ?? 0;
  const insetBottom = insets?.bottom ?? 0;
  const insetLeft = insets?.left ?? 0;
  const insetRight = insets?.right ?? 0;
  const [view, setView] = useState<Pick<View, 'center' | 'scale'>>({ center: { x: 0, y: 2000 }, scale: 0.008 });
  const [groundReady, setGroundReady] = useState(false);
  const [roads, setRoads] = useState<{ major?: RoadLayer; minor?: RoadLayer }>({});
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const pointers = useRef(new Map<number, XY>());
  const dragged = useRef(false);
  const gesture = useRef<{ start: XY; center: XY; scale: number; dist?: number; moved: boolean } | null>(null);
  const fullView: View = { ...view, width, height };

  // Width follows the container.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => {
      setWidth(el.clientWidth || 350);
      if (fixedHeight === undefined) setBoxHeight(el.clientHeight || 300);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Apply focus (initial view, recenter, new search area) within the uncovered part of the map: the focus point
  // sits in the middle of the area between the top and bottom insets.
  const freeH = Math.max(120, height - insetTop - insetBottom);
  const freeW = Math.max(160, width - insetLeft - insetRight);
  const slide = (insetLeft - insetRight) / 2;
  const lift = (insetBottom - insetTop) / 2;
  // Insets change as the sheet moves; only a new focus (or a new map size) recentres, read through a ref.
  const free = useRef({ freeH, freeW, lift, slide });
  free.current = { freeH, freeW, lift, slide };
  useEffect(() => {
    const { freeH, freeW, lift, slide } = free.current;
    const shift = (c: XY, scale: number): XY => ({ x: c.x - slide / scale, y: c.y - lift / scale });
    if (focus.center && focus.radiusM) {
      const scale = scaleForRadius(focus.radiusM, freeW, freeH);
      setView({ center: shift(toXY(focus.center), scale), scale });
    } else if (focus.points && focus.points.length) {
      const fitted = fitView(focus.points.map(toXY), freeW, freeH, 24);
      setView({ center: shift(fitted.center, fitted.scale), scale: fitted.scale });
    } else if (focus.center) {
      setView((v) => ({ ...v, center: shift(toXY(focus.center as LatLng), v.scale) }));
    }
    // Re-run only when a new focus is requested or the size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.id, width, height]);

  // Report the view the user sees (focus changes and gestures alike), once it rests.
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  useEffect(() => {
    if (!onViewRef.current) return undefined;
    const t = setTimeout(() => {
      const { freeH, freeW, lift, slide } = free.current;
      const c = { x: view.center.x + slide / view.scale, y: view.center.y + lift / view.scale };
      onViewRef.current?.(toLatLng(c), Math.max(20, Math.min(freeW, freeH) / 2 - 24) / view.scale);
    }, 250);
    return () => clearTimeout(t);
  }, [view]);

  // Selecting a place from the list brings its pin into view (only when it is off-screen).
  useEffect(() => {
    const pin = pins.find((p) => p.key === selectedKey);
    if (!pin) return;
    const s = toScreen(toXY(pin.location), fullView);
    if (s.x < insetLeft + 20 || s.x > width - insetRight - 20 || s.y < insetTop + 20 || s.y > height - insetBottom - 20)
      setView((v) => ({ ...v, center: { x: toXY(pin.location).x - slide / v.scale, y: toXY(pin.location).y - lift / v.scale } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  useEffect(() => {
    const img = loadGround(() => setGroundReady(true));
    if (img?.complete) setGroundReady(true);
    if (IS_JSDOM) return;
    let alive = true;
    void loadMajor().then((major) => alive && setRoads((r) => ({ ...r, major })));
    return () => {
      alive = false;
    };
  }, []);

  const wantMinor = view.scale >= MINOR_SCALE;
  useEffect(() => {
    if (!wantMinor || roads.minor || IS_JSDOM) return;
    let alive = true;
    void loadMinor().then((minor) => alive && setRoads((r) => ({ ...r, minor })));
    return () => {
      alive = false;
    };
  }, [wantMinor, roads.minor]);

  // Size the canvas only when its box changes (re-assigning width/height reallocates it).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || IS_JSDOM) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }, [width, height]);

  // Draw the ground image and roads for the current view, at most once per animation frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || IS_JSDOM) return undefined;
    const frame = requestAnimationFrame(() => draw(canvas));
    return () => cancelAnimationFrame(frame);
  }, [view, width, height, groundReady, roads]); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    const img = groundImage;
    if (!ctx) return;
    const dpr = canvas.width / Math.max(1, width);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#4d7ea2'; // the sea of the ground picture (Singapore only: neighbouring coasts are sea too)
    ctx.fillRect(0, 0, width, height);
    if (!img || !img.complete || !img.naturalWidth) return;
    const topLeft = toScreen({ x: -HALF, y: HALF }, fullView);
    const size = 2 * HALF * view.scale;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, topLeft.x, topLeft.y, size, size);
    // Level of detail: expressways and main roads first; smaller roads as you zoom in.
    const s = view.scale;
    if (roads.minor && s >= MINOR_SCALE) drawRoads(ctx, roads.minor, fullView, () => true);
    if (roads.major) drawRoads(ctx, roads.major, fullView, (c) => c <= 3 || (c <= 5 && s >= 0.012) || s >= 0.025);
  };

  const settle = useCallback(
    (next: Pick<View, 'center' | 'scale'>) => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => onSettled?.(toLatLng(next.center)), SETTLE_MS);
    },
    [onSettled],
  );
  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  const update = (next: Pick<View, 'center' | 'scale'>, user = true) => {
    const clamped = { center: clampCenter(next.center), scale: clampScale(next.scale) };
    setView(clamped);
    if (user) settle(clamped);
  };

  const zoomAt = (factor: number, sx = width / 2, sy = height / 2) => {
    const before = fromScreen(sx, sy, fullView);
    const scale = clampScale(view.scale * factor);
    // keep the point under the cursor fixed
    const center = { x: before.x - (sx - width / 2) / scale, y: before.y + (sy - height / 2) / scale };
    update({ center, scale });
  };

  const local = (e: { clientX: number; clientY: number }): XY => {
    const r = boxRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // A press on a pin can still become a drag; capture starts only once it moves (so taps stay clicks).
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    gesture.current = {
      start: pts.length === 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : local(e),
      center: view.center,
      scale: view.scale,
      dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && g.dist) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = clampScale((g.scale * dist) / g.dist);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const anchor = fromScreen(g.start.x, g.start.y, { center: g.center, scale: g.scale, width, height });
      g.moved = true;
      update({ center: { x: anchor.x - (mid.x - width / 2) / scale, y: anchor.y + (mid.y - height / 2) / scale }, scale });
      return;
    }
    const p = local(e);
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) < 5) return;
    if (!g.moved) {
      try {
        boxRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic pointers in tests cannot be captured */
      }
      dragged.current = true;
    }
    g.moved = true;
    update({ center: { x: g.center.x - dx / view.scale, y: g.center.y + dy / view.scale }, scale: view.scale });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    // The click that follows a drag must not select a pin.
    if (dragged.current) setTimeout(() => (dragged.current = false), 0);
    if (pointers.current.size === 0) gesture.current = null;
    else if (gesture.current) {
      const [p] = [...pointers.current.values()];
      gesture.current = { start: p, center: view.center, scale: view.scale, moved: true };
    }
  };

  // Wheel zoom (non-passive so the page does not scroll while zooming the map). Subscribed once; the
  // handler reads the latest zoom function from a ref.
  const zoomRef = useRef(zoomAt);
  zoomRef.current = zoomAt;
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomRef.current(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = KEY_PAN_PX / view.scale;
    const moves: Record<string, XY> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    };
    if (moves[e.key]) {
      e.preventDefault();
      update({ center: { x: view.center.x + moves[e.key].x, y: view.center.y + moves[e.key].y }, scale: view.scale });
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomAt(1.6);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoomAt(1 / 1.6);
    }
  };

  // Pins → screen → clusters (only those near the viewport).
  const clusters = useMemo(() => {
    const placed = pins.map((pin) => ({ pin, key: pin.key, s: toScreen(toXY(pin.location), fullView) }));
    const visible = placed.filter((p) => p.s.x > -40 && p.s.x < width + 40 && p.s.y > -40 && p.s.y < height + 40);
    // The selected pin is never hidden inside a cluster. Output stays in key order so a focused pin's
    // button keeps its place in the DOM (focus is not lost when it becomes selected).
    const selectedPin = visible.find((p) => p.key === selectedKey);
    const rest = cluster(visible.filter((p) => p !== selectedPin), (p) => p.s, CLUSTER_PX);
    const all = selectedPin ? [...rest, { id: selectedPin.key, x: selectedPin.s.x, y: selectedPin.s.y, items: [selectedPin] }] : rest;
    return all.sort((a, b) => (a.items[0].key < b.items[0].key ? -1 : a.items[0].key > b.items[0].key ? 1 : 0));
  }, [pins, view, width, height, selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCluster = (items: { pin: MapPin }[]) => {
    const pts = items.map((i) => toXY(i.pin.location));
    const fitted = fitView(pts, width, height, 60, 0.6);
    update({ center: fitted.center, scale: Math.max(fitted.scale, view.scale * 2) });
  };

  const circleGeom = circle
    ? { c: toScreen(toXY(circle.center), fullView), r: circle.radiusM * view.scale }
    : null;
  const youPt = you ? toScreen(toXY(you), fullView) : null;
  const showLabels = view.scale < 0.03;
  // Area names never sit under a pin or on another name (a clean overview, like a maps app).
  const placedLabels = useMemo(() => {
    if (!showLabels) return [];
    const taken: { l: number; r: number; t: number; b: number }[] = clusters.map((c) => ({ l: c.x - 22, r: c.x + 22, t: c.y - 22, b: c.y + 22 }));
    const out: { id: string; name: string; x: number; y: number }[] = [];
    for (const l of labels) {
      const p = toScreen(toXY(l.location), fullView);
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;
      const half = l.name.length * 3.6 + 4;
      // On the spot, else just under or over the pin that covers it; dropped when there is no room.
      for (const dy of [4, 38, -26]) {
        const y = p.y + dy;
        const box = { l: p.x - half, r: p.x + half, t: y - 13, b: y + 4 };
        if (taken.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t)) continue;
        taken.push(box);
        out.push({ id: l.id, name: l.name, x: p.x, y });
        break;
      }
    }
    return out;
  }, [showLabels, clusters, labels, view, width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={bleed ? `${styles.wrap} ${styles.bleed}` : styles.wrap} style={bleed ? undefined : { height }}>
      <div
        ref={boxRef}
        className={styles.map}
        role="application"
        aria-roledescription="map"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-testid="city-map"
        data-scale={view.scale.toFixed(4)}
      >
        <canvas ref={canvasRef} className={styles.canvas} style={{ width, height }} aria-hidden="true" />
        <svg className={styles.overlay} width={width} height={height} aria-hidden="true">
          {circleGeom && (
            <circle cx={circleGeom.c.x} cy={circleGeom.c.y} r={circleGeom.r} className={styles.radius} />
          )}
          {placedLabels.map((l) => (
            <text key={l.id} x={l.x} y={l.y} className={styles.areaLabel} textAnchor="middle">
              {l.name}
            </text>
          ))}
          {youPt && (
            <g>
              <circle cx={youPt.x} cy={youPt.y} r={14} className={styles.youHalo} />
              <circle cx={youPt.x} cy={youPt.y} r={6} className={styles.you} />
            </g>
          )}
        </svg>
        {clusters.map((c) => {
          if (c.items.length > 1) {
            return (
              <button
                key={c.id}
                type="button"
                className={styles.cluster}
                style={{ left: c.x, top: c.y }}
                onClick={() => !dragged.current && openCluster(c.items)}
                aria-label={`${c.items.length} places here. Zoom in`}
              >
                {c.items.length}
              </button>
            );
          }
          const { pin } = c.items[0];
          const selected = pin.key === selectedKey;
          if (readOnly) {
            return (
              <span
                key={pin.key}
                className={`${styles.pin} ${styles[pin.category]} ${selected ? styles.selected : ''}`}
                style={{ left: c.x, top: c.y }}
                role="img"
                aria-label={`${pin.name}, ${CATEGORY_INFO[pin.category].label}`}
              >
                <Icon name={pin.category} size={selected ? 20 : 16} />
              </span>
            );
          }
          return (
            <button
              key={pin.key}
              type="button"
              className={`${styles.pin} ${styles[pin.category]} ${selected ? styles.selected : ''}`}
              style={{ left: c.x, top: c.y }}
              aria-pressed={selected}
              aria-label={`${pin.name}, ${CATEGORY_INFO[pin.category].label}${pin.visited ? ', visited' : ''}`}
              onClick={() => !dragged.current && onSelect(pin.key)}
              data-pin={pin.key}
            >
              <Icon name={pin.category} size={selected ? 20 : 16} />
              {pin.visited && <span className={styles.visitedTick} aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
      <MapControls
        top={controlsTop !== undefined ? controlsTop : insetTop ? insetTop + 8 : undefined}
        onZoom={(k) => zoomAt(k)}
        onRecenter={onRecenter}
        recenterLabel={recenterLabel}
      />
      {circle && !bleed && <p className={styles.radiusNote}>{circle.label}</p>}
      <p className={styles.attribution} style={insetBottom ? { bottom: insetBottom } : undefined}>
        EARTH ONLINE map · © OpenStreetMap contributors
      </p>
    </div>
  );
}
