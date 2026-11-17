// The map card (owner sketch, 31 Oct 2026): a Three.js scene of URA's planning areas inside a card. Regions are
// numbered 1–5; inside a region its planning areas are numbered in deck order; inside an area its places are pins.
// Tiles in focus lift, the rest sink and dim; grey = not unlocked, light blue = exploring, blue = all checked in.
// Labels and pins are DOM buttons that follow the camera, so they stay tappable and readable by screen readers.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import CategoryGlyph from '../Category/CategoryGlyph';
import { TOURISM_CATEGORIES, TOURISM_INFO, tourismOf, type TourismCategory, type TourismFilter } from '../../data/tourism';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { Rgba } from '../../features/nearby/map/CityMap';
import { toXY } from '../../features/nearby/map/projection';
import type { LatLng } from '../../features/nearby/types';
import { NEAR_M } from './nearYou';
import {
  URA_AREAS,
  URA_REGIONS,
  areaProgress,
  areasOf,
  placesInArea,
  placesInRegion,
  regionBox,
  regionProgress,
  type RegionId,
  type UnlockProgress,
  type UnlockStatus,
} from '../../data/ura/ura';
import groundUrl from '../../assets/nearby/sg-ground.webp';
import { MapScene, type TileLook } from './three/mapScene';
import { layoutBadges, type LaidBadge } from './badgeLayout';
import styles from './MapCard3D.module.css';

/** picks: Editor's Pick (the selected pick's stops shown); pick: inside one pick, its stops; near: what is within
 *  NEAR_M of where you are (Locate). */
export type MapLevel = 'regions' | 'areas' | 'places' | 'picks' | 'pick' | 'near';

export interface MapPlacePin {
  id: string;
  name: string;
  point: LatLng;
  /** Its Tourism 2040 category: the pin's colour and glyph (v2). */
  tourism?: TourismCategory;
}

interface Props {
  level: MapLevel;
  region: RegionId;
  areaId: string;
  /** Planning areas of the region, in deck order (their numbers). */
  areaOrder: readonly string[];
  places: readonly MapPlacePin[];
  selectedPlaceId?: string;
  visited: ReadonlySet<string>;
  label: string;
  onPickRegion(id: RegionId): void;
  onPickArea(id: string): void;
  onPickPlace(id: string): void;
  /** Number the pins in order (a walk's stops). */
  numbered?: boolean;
  /** Join the pins with a dashed line (a walk's order of stops). */
  path?: boolean;
  /** Where you are (Locate): a blue dot, and the map frames NEAR_M round it. */
  here?: LatLng;
  /** v2 category chips: other categories' pins dim, and the region / area badges count this category's places
   *  (with All: each of the four categories'). */
  category?: TourismFilter;
  /** Room kept clear at the map's right edge (the tool rail lies over it), px: the badges stay inside the rest. */
  insetRight?: number;
  /** Room kept clear at the map's top (the crumb's bottom, measured, and a margin), px. */
  insetTop?: number;
  /** Where the tool rail ends, px from the map's top (measured): area badges may use the room under it. */
  railBottom?: number;
}

/** Room kept clear at the map's foot (the map credit), px. */
const INSET_BOTTOM = 30;
const INSET_LEFT = 4;
/** Area badges carry their (short) names when the region has at most this many areas (West has 12; Central's 22 do
 *  not fit named on a 320 px phone, so there only the selected badge is named). */
const MAX_NAMED = 12;

type Counted = { tourism?: { category: TourismCategory }; operatingStatus?: string };
/** How many of these places are in the category (the badges' counts); places still planned are not counted. */
export const countIn = (places: readonly Counted[], cat: TourismCategory) =>
  places.filter((p) => p.operatingStatus !== 'planned' && tourismOf(p) === cat).length;

/** With All picked: the four categories' counts in their fixed order (Attractions · Wellness · Leisure · Cruise);
 *  a category with none here is left out. */
function CatCounts({ places }: { places: readonly Counted[] }) {
  const counts = TOURISM_CATEGORIES.map((c) => [c, countIn(places, c)] as const).filter(([, n]) => n > 0);
  if (!counts.length) return null;
  return (
    <span className={styles.catCounts} aria-hidden="true">
      {counts.map(([c, n]) => (
        <span key={c} className={styles.mini} data-cat={c} style={{ '--mini-bg': TOURISM_INFO[c].tint, '--mini-ink': TOURISM_INFO[c].ink } as CSSProperties}>
          <CategoryGlyph category={c} size={9} color="currentColor" />
          {n}
        </span>
      ))}
    </span>
  );
}

/** The badges' counts for screen readers: the picked category's, or (All) each category with places here. */
const countsLabel = (places: readonly Counted[], cat: TourismCategory | null) =>
  cat
    ? `, ${countIn(places, cat)} ${TOURISM_INFO[cat].label}`
    : TOURISM_CATEGORIES.map((c) => [c, countIn(places, c)] as const)
        .filter(([, n]) => n > 0)
        .map(([c, n]) => `, ${n} ${TOURISM_INFO[c].label}`)
        .join('');

function CatCount({ cat, n }: { cat: TourismCategory; n: number }) {
  const info = TOURISM_INFO[cat];
  return (
    <span className={styles.catCount} style={{ '--cat': info.fill } as CSSProperties} aria-hidden="true">
      <CategoryGlyph category={cat} size={10} color="#fff" />
      {n}
    </span>
  );
}

const IS_JSDOM = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

function webglOk(): boolean {
  if (IS_JSDOM || typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// Tints over EARTH ONLINE's ground picture: see-through, so the city's own art shows under them.
const LAND: Record<UnlockStatus, Rgba> = { none: [236, 230, 218, 0.38], exploring: [130, 175, 245, 0.55], done: [47, 111, 228, 0.62] };
const LAND_DIM: Record<UnlockStatus, Rgba> = { none: [24, 28, 38, 0.55], exploring: [30, 48, 90, 0.55], done: [26, 52, 120, 0.6] };
/** The selected planning area: a warmer, lighter tile. */
const LAND_FOCUS: Record<UnlockStatus, Rgba> = { none: [252, 196, 150, 0.5], exploring: [150, 196, 252, 0.6], done: [82, 146, 245, 0.66] };
/** The rest of the region around it. */
const LAND_NEAR: Record<UnlockStatus, Rgba> = { none: [236, 230, 218, 0.3], exploring: [130, 175, 245, 0.5], done: [47, 111, 228, 0.58] };
const EDGE: Rgba = [255, 255, 255, 0.85];
const EDGE_DIM: Rgba = [255, 255, 255, 0.18];
const ORANGE: Rgba = [228, 103, 31, 1];

const areaById = new Map(URA_AREAS.map((a) => [a.id, a]));
const mainland = (region: RegionId) => areasOf(region).filter((a) => !/Islands$/.test(a.name));
/** A region's label point: the middle of its biggest mainland areas. */
function regionPoint(region: RegionId): [number, number] {
  const as = mainland(region).length ? mainland(region) : areasOf(region);
  const xs = as.map((a) => a.centre[0]);
  const ys = as.map((a) => a.centre[1]);
  return [xs.reduce((s, v) => s + v, 0) / xs.length, ys.reduce((s, v) => s + v, 0) / ys.length];
}

type Box = [number, number, number, number];
/** Every planning area of the region, islands included (regionBox leaves the islands out). */
function allAreasBox(region: RegionId): Box {
  const bs = areasOf(region).map((a) => a.box);
  return [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];
}
/** A box grown east and north by the share of the map the rail and the crumb cover, so that once the camera frames
 *  it, the box itself sits in the part of the map left clear (map y runs north, the top of the screen). */
function clearOf(b: Box, w: number, h: number, right: number, top: number): Box {
  // not laid out yet (or a sliver of a map): frame the box itself; the resize brings the real framing
  if (w < 120 || h < 120) return b;
  const fx = Math.min(0.6, right / (w - right));
  const fy = Math.min(0.6, top / (h - top - INSET_BOTTOM));
  const fb = Math.min(0.3, INSET_BOTTOM / (h - top - INSET_BOTTOM));
  const bw = b[2] - b[0];
  const bh = b[3] - b[1];
  return [b[0], b[1] - bh * fb, b[2] + bw * fx, b[3] + bh * fy];
}

/** A badge's ring: how much of the region or area is checked in (the card below has the full numbers). */
function Ring({ p }: { p: UnlockProgress }) {
  const r = 12.5;
  const c = 2 * Math.PI * r;
  const k = p.total ? p.visited / p.total : 0;
  return (
    <svg className={styles.ring} width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r={r} fill="none" stroke="rgba(35,33,29,0.16)" strokeWidth="3" />
      {k > 0 && (
        <circle
          cx="15"
          cy="15"
          r={r}
          fill="none"
          stroke={p.status === 'done' ? '#1f9d55' : '#2f6fe4'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(2, k * c)} ${c}`}
          transform="rotate(-90 15 15)"
        />
      )}
    </svg>
  );
}

/** A badge's progress in words: its status, then the numbers (as the old deck's cards had them). */
const progressWords = (p: UnlockProgress) =>
  !p.total
    ? 'no places yet'
    : `${p.status === 'done' ? 'unlocked' : p.status === 'exploring' ? 'exploring' : 'not visited yet'}, ${p.visited} of ${p.total} ${p.total === 1 ? 'place' : 'places'} checked in`;

/** All of it checked in: a tick on the badge's ring (so colour never carries it alone). */
const Tick = () => <span className={styles.tick} data-tick="" aria-hidden="true" />;

export function MapCard3D({
  level,
  region,
  areaId,
  areaOrder,
  places,
  selectedPlaceId,
  visited,
  label,
  onPickRegion,
  onPickArea,
  onPickPlace,
  numbered = false,
  path = false,
  here,
  category = 'all',
  insetRight = 0,
  insetTop = 44,
  railBottom,
}: Props) {
  const cat = category === 'all' ? null : category;
  // near-you pins stand on the ground like a pick's stops
  const isPick = level === 'picks' || level === 'pick' || level === 'near';
  const named = areaOrder.length <= MAX_NAMED;
  const reduced = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<MapScene | null>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  // The map's and the badges' sizes, measured when they change (ResizeObserver), never in the frame loop: reading
  // offsetWidth there after writing transforms forced a layout per badge per frame.
  const boxSize = useRef({ w: 0, h: 0 });
  const badgeSizes = useRef(new Map<string, { w: number; h: number }>());
  const badgeRO = useRef<ResizeObserver | null>(null);
  /** Set while the level's camera framing depends on the map's size; run again (at once) when the map resizes. */
  const sizedFrame = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [gl] = useState(webglOk);

  // ---- scene lifetime ----
  useEffect(() => {
    if (!gl || !canvasRef.current || !boxRef.current) return undefined;
    const scene = new MapScene(canvasRef.current, URA_AREAS, groundUrl);
    sceneRef.current = scene;
    const box = boxRef.current;
    const size = () => {
      boxSize.current = { w: box.clientWidth, h: box.clientHeight };
      scene.setSize(box.clientWidth, box.clientHeight);
      // a framing that depends on the map's size (the planning areas, clear of the rail) is worked out again
      sizedFrame.current?.();
    };
    size();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
    ro?.observe(box);
    setReady(true);
    return () => {
      ro?.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [gl]);

  // the badges' sizes: measured as each one is added and whenever it changes size (a new count, the text size)
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        const key = el.dataset.key;
        // a badge showing its number only for want of room keeps its named size on record
        if (key && el.dataset.squeezed === undefined) badgeSizes.current.set(key, { w: el.offsetWidth, h: el.offsetHeight });
      }
      sceneRef.current?.kick();
    });
    badgeRO.current = ro;
    // the badges already drawn (later ones are observed as they are added, in their ref)
    for (const [key, el] of labelRefs.current) if (key.startsWith('r:') || key.startsWith('a:')) ro.observe(el);
    return () => {
      ro.disconnect();
      if (badgeRO.current === ro) badgeRO.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.reduced = reduced;
  }, [reduced, ready]);

  // ---- looks and focus ----
  const looks = useMemo(() => {
    const m = new Map<string, TileLook>();
    for (const a of URA_AREAS) {
      const status = areaProgress(a.id, visited).status;
      if (isPick) {
        // a pick crosses areas: the land stays even and flat, the stops and their line stand out
        m.set(a.id, { color: [LAND_NEAR[status][0], LAND_NEAR[status][1], LAND_NEAR[status][2], 0.1], lift: 0, edge: EDGE_DIM });
        continue;
      }
      const inRegion = a.region === region;
      const focusTile = level === 'regions' ? inRegion : a.id === areaId;
      const lit = level === 'regions' ? inRegion : inRegion;
      m.set(a.id, {
        color: level === 'regions' ? (lit ? LAND[status] : LAND_DIM[status]) : focusTile ? LAND_FOCUS[status] : inRegion ? LAND_NEAR[status] : LAND_DIM[status],
        lift: level === 'regions' ? (inRegion ? 0.35 : 0) : focusTile ? 0.7 : inRegion ? 0.12 : 0,
        edge: level !== 'regions' && a.id === areaId ? ORANGE : lit ? EDGE : EDGE_DIM,
      });
    }
    return m;
  }, [level, region, areaId, visited, isPick]);

  useEffect(() => {
    sceneRef.current?.setLooks(looks);
  }, [looks, ready]);

  useEffect(() => {
    sceneRef.current?.setPath(
      isPick && path
        ? places.map((p) => {
            const q = toXY(p.point);
            return [q.x, q.y] as [number, number];
          })
        : null,
    );
  }, [isPick, path, places, ready]);

  useEffect(() => {
    const s = sceneRef.current;
    sizedFrame.current = null;
    if (!s) return;
    if (level === 'near' && here) {
      // the circle round you; a picked card's pin stays in it
      const q = toXY(here);
      s.fit([q.x - NEAR_M, q.y - NEAR_M, q.x + NEAR_M, q.y + NEAR_M], false, 0.15);
    } else if (isPick) {
      const pts = places.map((p) => toXY(p.point));
      const sel = places.find((p) => p.id === selectedPlaceId);
      if (level === 'pick' && sel) {
        // the map follows the stop card, wherever on the island it is
        const q = toXY(sel.point);
        s.fit([q.x - 900, q.y - 900, q.x + 900, q.y + 900], false, 0.2);
      } else if (pts.length) {
        const xs = pts.map((q) => q.x);
        const ys = pts.map((q) => q.y);
        const half = Math.max(700, (Math.max(...xs) - Math.min(...xs)) / 2, (Math.max(...ys) - Math.min(...ys)) / 2);
        const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
        const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
        s.fit([cx - half, cy - half, cx + half, cy + half], false, 0.15);
      }
    } else if (level === 'places') s.fit(areaById.get(areaId)?.box ?? regionBox(region), false, 0.18);
    else if (level === 'regions') s.fit(regionBox(region), false, 0.3);
    else {
      // all of the region's planning areas (its islands too), in the part of the map clear of the rail and the crumb,
      // so every area badge starts on the map and can be tapped
      const frame = (instant: boolean) => {
        const { w, h } = boxSize.current;
        s.fit(clearOf(allAreasBox(region), w, h, insetRight, insetTop), instant, 0.1);
      };
      frame(false);
      sizedFrame.current = () => frame(true);
    }
  }, [level, region, areaId, ready, isPick, places, selectedPlaceId, here, insetRight, insetTop]);

  // ---- labels and pins follow the camera ----
  type Marker = { key: string; x: number; y: number; top: () => number };
  const markers: Marker[] = useMemo(() => {
    const s = () => sceneRef.current;
    if (level === 'regions')
      return URA_REGIONS.map((r) => {
        const [x, y] = regionPoint(r.id);
        const tallest = mainland(r.id)[0]?.id ?? '';
        return { key: `r:${r.id}`, x, y, top: () => s()?.topOf(tallest) ?? 0 };
      });
    if (level === 'areas')
      return areaOrder.map((id) => {
        const a = areaById.get(id)!;
        return { key: `a:${id}`, x: a.centre[0], y: a.centre[1], top: () => s()?.topOf(id) ?? 0 };
      });
    const pins: Marker[] = places.map((p) => {
      const q = toXY(p.point);
      return { key: `p:${p.id}`, x: q.x, y: q.y, top: () => (isPick ? 0.14 : (s()?.topOf(areaId) ?? 0)) };
    });
    if (level === 'near' && here) {
      const q = toXY(here);
      pins.push({ key: 'here', x: q.x, y: q.y, top: () => 0.14 });
    }
    return pins;
  }, [level, areaOrder, places, areaId, isPick, here]);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return undefined;
    const place = () => {
      const { w: bw, h: bh } = boxSize.current;
      // Regions keep the rail's whole column clear. A region's areas (up to 22 on a 320 px map) also get the room
      // under the rail: there the rail is a rectangle to keep off, not a strip.
      const underRail = level === 'areas' && !!railBottom && railBottom < bh - INSET_BOTTOM;
      const safe = { left: INSET_LEFT, top: insetTop, right: underRail ? bw - INSET_LEFT : bw - insetRight, bottom: bh - INSET_BOTTOM };
      const blocked = underRail ? [{ left: bw - insetRight, top: 0, right: bw, bottom: railBottom! + 4 }] : [];
      const badges: (LaidBadge & { el: HTMLElement })[] = [];
      for (const m of markers) {
        const el = labelRefs.current.get(m.key);
        if (!el) continue;
        const p = s.project(m.x, m.y, m.top());
        const isBadge = m.key.startsWith('r:') || m.key.startsWith('a:');
        if (!p) {
          el.style.visibility = 'hidden';
          continue;
        }
        // a region or area badge stays whole inside the map, clear of the tool rail and the crumb at the top, and
        // off its neighbours; place pins stay exactly on their place
        if (bw && isBadge) {
          let size = badgeSizes.current.get(m.key);
          if (!size) {
            // not measured yet (just added): once, then the ResizeObserver keeps it
            size = { w: el.offsetWidth, h: el.offsetHeight };
            badgeSizes.current.set(m.key, size);
          }
          const on = el.getAttribute('aria-pressed') === 'true';
          // a named area badge (not the selected one) may shed its name for room: then it is round, its height wide
          const bare = m.key.startsWith('a:') && named && !on ? size.h : undefined;
          badges.push({ el, x: p.x, y: p.y, w: size.w, h: size.h, keep: m.key.startsWith('r:'), on, bare });
          continue;
        }
        el.style.visibility = '';
        el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`;
      }
      layoutBadges(badges, bw, bh, safe, blocked);
      for (const b of badges) {
        // off the camera: hidden (and out of the tab order), not stacked at an edge
        b.el.style.visibility = b.hidden ? 'hidden' : '';
        if (b.squeezed) b.el.dataset.squeezed = '';
        else delete b.el.dataset.squeezed;
        if (!b.hidden) b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) translate(-50%, -50%)`;
      }
    };
    s.onFrame = place;
    s.kick();
    return () => {
      if (s.onFrame === place) s.onFrame = null;
    };
  }, [markers, ready, insetRight, insetTop, railBottom, level]);

  // ---- taps on the map ----
  const down = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY };
  };
  // the page took the gesture (a scroll): no tap
  const onPointerCancel = () => {
    down.current = null;
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = down.current;
    down.current = null;
    const s = sceneRef.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!d || !s || !box || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return;
    const hit = s.pick(e.clientX - box.left, e.clientY - box.top);
    const a = hit ? areaById.get(hit) : undefined;
    if (!a) return;
    if (level === 'regions' || a.region !== region) onPickRegion(a.region);
    else onPickArea(a.id);
  };

  // one ref callback per key, kept, so React does not detach and re-attach every badge on each render
  const refFns = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const setRef = (key: string) => {
    let fn = refFns.current.get(key);
    if (!fn) {
      fn = attach(key);
      refFns.current.set(key, fn);
    }
    return fn;
  };
  const attach = (key: string) => (el: HTMLElement | null) => {
    const badge = key.startsWith('r:') || key.startsWith('a:');
    const had = labelRefs.current.get(key);
    if (el) {
      labelRefs.current.set(key, el);
      if (badge && had !== el) {
        el.dataset.key = key;
        badgeSizes.current.delete(key);
        badgeRO.current?.observe(el);
      }
    } else {
      labelRefs.current.delete(key);
      if (badge && had) {
        badgeRO.current?.unobserve(had);
        badgeSizes.current.delete(key);
      }
    }
  };

  return (
    <div ref={boxRef} className={styles.map} role="application" aria-label={label} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}>
      {gl && <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />}
      {!gl && <div className={styles.flat} aria-hidden="true" />}
      <div className={styles.overlay}>
        {level === 'regions' &&
          URA_REGIONS.map((r, i) => (
            <button
              key={r.id}
              ref={setRef(`r:${r.id}`)}
              type="button"
              className={`${styles.badge} ${r.id === region ? styles.badgeOn : ''}`}
              aria-pressed={r.id === region}
              data-status={regionProgress(r.id, visited).status}
              aria-label={`Region ${i + 1}: ${r.name}, ${progressWords(regionProgress(r.id, visited))}${countsLabel(placesInRegion(r.id), cat)}`}
              onClick={() => onPickRegion(r.id)}
            >
              <span className={styles.numWrap}>
                <Ring p={regionProgress(r.id, visited)} />
                <span className={styles.num}>{i + 1}</span>
                {regionProgress(r.id, visited).status === 'done' && <Tick />}
              </span>
              <span className={styles.badgeText}>
                <span className={styles.badgeName}>{r.name}</span>
                {!cat && <CatCounts places={placesInRegion(r.id)} />}
              </span>
              {cat && <CatCount cat={cat} n={countIn(placesInRegion(r.id), cat)} />}
            </button>
          ))}
        {level === 'areas' &&
          areaOrder.map((id, i) => {
            const a = areaById.get(id)!;
            return (
              <button
                key={id}
                ref={setRef(`a:${id}`)}
                type="button"
                className={`${styles.badge} ${styles.small} ${id === areaId ? styles.badgeOn : named ? '' : styles.bare}`}
                aria-pressed={id === areaId}
                data-status={areaProgress(id, visited).status}
                aria-label={`Area ${i + 1}: ${a.name}, ${progressWords(areaProgress(id, visited))}${countsLabel(placesInArea(id), cat)}`}
                onClick={() => onPickArea(id)}
              >
                <span className={styles.numWrap}>
                  <Ring p={areaProgress(id, visited)} />
                  <span className={styles.num}>{i + 1}</span>
                  {areaProgress(id, visited).status === 'done' && <Tick />}
                </span>
                {/* a region of up to a dozen areas: every badge is named (cut short; the full name is in its label).
                    Central's 22 cannot all be named on a phone: there only the selected one is. Only the selected
                    badge carries the counts. */}
                {(id === areaId || named) && (
                  <span className={styles.badgeText}>
                    <span className={id === areaId ? styles.badgeName : `${styles.badgeName} ${styles.short}`}>{a.name}</span>
                    {id === areaId && !cat && <CatCounts places={placesInArea(id)} />}
                  </span>
                )}
                {id === areaId && cat && <CatCount cat={cat} n={countIn(placesInArea(id), cat)} />}
              </button>
            );
          })}
        {(level === 'places' || isPick) &&
          places.map((p, i) => {
            // v2: the pin is its category's colour and glyph; checked in = a check mark on it (not a colour)
            const info = p.tourism ? TOURISM_INFO[p.tourism] : undefined;
            const dim = !!cat && p.tourism !== cat;
            const done = visited.has(p.id);
            return (
              <button
                key={p.id}
                ref={setRef(`p:${p.id}`)}
                type="button"
                data-pin={p.id}
                data-category={p.tourism}
                data-dim={dim || undefined}
                className={`${styles.pin} ${p.id === selectedPlaceId ? styles.pinOn : ''} ${done ? styles.pinDone : ''} ${dim ? styles.pinDim : ''}`}
                style={info ? ({ '--pin': info.fill } as CSSProperties) : undefined}
                aria-pressed={p.id === selectedPlaceId}
                aria-label={`${numbered ? `Stop ${i + 1}: ${p.name}` : p.name}${info ? `, ${info.label}` : ''}${done ? ', checked in' : ''}`}
                onClick={() => onPickPlace(p.id)}
              >
                {numbered ? (
                  <>
                    <span className={styles.pinNum}>{i + 1}</span>
                    {/* a walk's stop is numbered: its category is a small glyph on the corner (never colour alone) */}
                    {p.tourism && (
                      <span className={styles.pinCorner} data-corner={p.tourism} aria-hidden="true">
                        <CategoryGlyph category={p.tourism} size={7} color="#fff" />
                      </span>
                    )}
                  </>
                ) : p.tourism ? (
                  <CategoryGlyph category={p.tourism} size={p.id === selectedPlaceId ? 13 : 9} color="#fff" className={styles.pinGlyph} />
                ) : null}
              </button>
            );
          })}
        {level === 'near' && here && <span ref={setRef('here')} className={styles.here} role="img" aria-label="You are here" />}
      </div>
    </div>
  );
}
