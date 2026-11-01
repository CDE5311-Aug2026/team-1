// The map card (owner sketch, 31 Oct 2026): a Three.js scene of URA's planning areas inside a card. Regions are
// numbered 1–5; inside a region its planning areas are numbered in deck order; inside an area its places are pins.
// Tiles in focus lift, the rest sink and dim; grey = not unlocked, light blue = exploring, blue = all checked in.
// Labels and pins are DOM buttons that follow the camera, so they stay tappable and readable by screen readers.
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { Rgba } from '../../features/nearby/map/CityMap';
import { toXY } from '../../features/nearby/map/projection';
import type { LatLng } from '../../features/nearby/types';
import {
  URA_AREAS,
  URA_REGIONS,
  areaProgress,
  areasOf,
  regionBox,
  regionProgress,
  type RegionId,
  type UnlockProgress,
  type UnlockStatus,
} from '../../data/ura/ura';
import groundUrl from '../../assets/nearby/sg-ground.webp';
import { MapScene, type TileLook } from './three/mapScene';
import styles from './MapCard3D.module.css';

/** picks: Editor's Pick (the selected pick's stops shown); pick: inside one pick, its stops. */
export type MapLevel = 'regions' | 'areas' | 'places' | 'picks' | 'pick';

export interface MapPlacePin {
  id: string;
  name: string;
  point: LatLng;
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

const pct = (p: UnlockProgress) => (p.total ? `${Math.round((p.visited / p.total) * 100)}% checked in` : 'no places yet');

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
}: Props) {
  const isPick = level === 'picks' || level === 'pick';
  const reduced = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<MapScene | null>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  const [ready, setReady] = useState(false);
  const [gl] = useState(webglOk);

  // ---- scene lifetime ----
  useEffect(() => {
    if (!gl || !canvasRef.current || !boxRef.current) return undefined;
    const scene = new MapScene(canvasRef.current, URA_AREAS, groundUrl);
    sceneRef.current = scene;
    const box = boxRef.current;
    const size = () => scene.setSize(box.clientWidth, box.clientHeight);
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
    if (!s) return;
    if (isPick) {
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
      // the selected area, with room around it for its neighbours (the map follows the card)
      const b = areaById.get(areaId)?.box ?? regionBox(region);
      const cx = (b[0] + b[2]) / 2;
      const cy = (b[1] + b[3]) / 2;
      const half = Math.max(2600, (b[2] - b[0]) / 2, (b[3] - b[1]) / 2);
      s.fit([cx - half, cy - half, cx + half, cy + half], false, 0.35);
    }
  }, [level, region, areaId, ready, isPick, places, selectedPlaceId]);

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
    return places.map((p) => {
      const q = toXY(p.point);
      return { key: `p:${p.id}`, x: q.x, y: q.y, top: () => (isPick ? 0.14 : (s()?.topOf(areaId) ?? 0)) };
    });
  }, [level, areaOrder, places, areaId, isPick]);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return undefined;
    const place = () => {
      for (const m of markers) {
        const el = labelRefs.current.get(m.key);
        if (!el) continue;
        const p = s.project(m.x, m.y, m.top());
        if (!p) {
          el.style.visibility = 'hidden';
          continue;
        }
        el.style.visibility = '';
        el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`;
      }
    };
    s.onFrame = place;
    s.kick();
    return () => {
      if (s.onFrame === place) s.onFrame = null;
    };
  }, [markers, ready]);

  // ---- taps on the map ----
  const down = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY };
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

  const setRef = (key: string) => (el: HTMLElement | null) => {
    if (el) labelRefs.current.set(key, el);
    else labelRefs.current.delete(key);
  };

  return (
    <div ref={boxRef} className={styles.map} role="application" aria-label={label} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
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
              aria-label={`Region ${i + 1}: ${r.name}, ${pct(regionProgress(r.id, visited))}`}
              onClick={() => onPickRegion(r.id)}
            >
              <span className={styles.numWrap}>
                <Ring p={regionProgress(r.id, visited)} />
                <span className={styles.num}>{i + 1}</span>
              </span>
              <span className={styles.badgeName}>{r.name}</span>
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
                className={`${styles.badge} ${styles.small} ${id === areaId ? styles.badgeOn : ''}`}
                aria-pressed={id === areaId}
                aria-label={`Area ${i + 1}: ${a.name}, ${pct(areaProgress(id, visited))}`}
                onClick={() => onPickArea(id)}
              >
                <span className={styles.numWrap}>
                  <Ring p={areaProgress(id, visited)} />
                  <span className={styles.num}>{i + 1}</span>
                </span>
                {id === areaId && <span className={styles.badgeName}>{a.name}</span>}
              </button>
            );
          })}
        {(level === 'places' || isPick) &&
          places.map((p, i) => (
            <button
              key={p.id}
              ref={setRef(`p:${p.id}`)}
              type="button"
              data-pin={p.id}
              className={`${styles.pin} ${p.id === selectedPlaceId ? styles.pinOn : ''} ${visited.has(p.id) ? styles.pinDone : ''}`}
              aria-pressed={p.id === selectedPlaceId}
              aria-label={numbered ? `Stop ${i + 1}: ${p.name}` : p.name}
              onClick={() => onPickPlace(p.id)}
            >
              {numbered && <span className={styles.pinNum}>{i + 1}</span>}
            </button>
          ))}
      </div>
    </div>
  );
}
