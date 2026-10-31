// The map card (owner sketch, 31 Oct 2026): a Three.js scene of URA's planning areas inside a card. Regions are
// numbered 1–5; inside a region its planning areas are numbered in deck order; inside an area its places are pins.
// Tiles in focus lift, the rest sink and dim; grey = not unlocked, light blue = exploring, blue = all checked in.
// Labels and pins are DOM buttons that follow the camera, so they stay tappable and readable by screen readers.
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { Rgba } from '../../features/nearby/map/CityMap';
import { toXY } from '../../features/nearby/map/projection';
import type { LatLng } from '../../features/nearby/types';
import { URA_AREAS, URA_REGIONS, areaProgress, areasOf, regionBox, type RegionId, type UnlockStatus } from '../../data/ura/ura';
import { MapScene, type TileLook } from './three/mapScene';
import styles from './MapCard3D.module.css';

export type MapLevel = 'regions' | 'areas' | 'places';

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

const LAND: Record<UnlockStatus, Rgba> = { none: [214, 208, 196, 1], exploring: [150, 188, 240, 1], done: [47, 111, 228, 1] };
const LAND_DIM: Record<UnlockStatus, Rgba> = { none: [120, 128, 138, 0.9], exploring: [96, 120, 158, 0.9], done: [44, 76, 140, 0.9] };
/** The selected planning area: a warmer, lighter tile. */
const LAND_FOCUS: Record<UnlockStatus, Rgba> = { none: [252, 214, 176, 1], exploring: [176, 210, 252, 1], done: [82, 146, 245, 1] };
/** The rest of the region around it. */
const LAND_NEAR: Record<UnlockStatus, Rgba> = { none: [196, 190, 178, 1], exploring: [136, 170, 220, 1], done: [42, 98, 204, 1] };
const EDGE: Rgba = [255, 255, 255, 0.85];
const EDGE_DIM: Rgba = [255, 255, 255, 0.18];
const ORANGE: Rgba = [228, 103, 31, 1];

const areaById = new Map(URA_AREAS.map((a) => [a.id, a]));
/** The main island (offshore island areas left out), for the regions view. */
const ISLAND: [number, number, number, number] = (() => {
  const bs = URA_AREAS.filter((a) => !/Islands$/.test(a.name)).map((a) => a.box);
  return [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];
})();
const mainland = (region: RegionId) => areasOf(region).filter((a) => !/Islands$/.test(a.name));
/** A region's label point: the middle of its biggest mainland areas. */
function regionPoint(region: RegionId): [number, number] {
  const as = mainland(region).length ? mainland(region) : areasOf(region);
  const xs = as.map((a) => a.centre[0]);
  const ys = as.map((a) => a.centre[1]);
  return [xs.reduce((s, v) => s + v, 0) / xs.length, ys.reduce((s, v) => s + v, 0) / ys.length];
}

export function MapCard3D({ level, region, areaId, areaOrder, places, selectedPlaceId, visited, label, onPickRegion, onPickArea, onPickPlace }: Props) {
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
    const scene = new MapScene(canvasRef.current, URA_AREAS);
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
  }, [level, region, areaId, visited]);

  useEffect(() => {
    sceneRef.current?.setLooks(looks);
  }, [looks, ready]);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    if (level === 'places') s.fit(areaById.get(areaId)?.box ?? regionBox(region), false, 0.18);
    else if (level === 'regions') s.fit(ISLAND, false, 0.04);
    else s.fit(regionBox(region), false, 0.08);
  }, [level, region, areaId, ready]);

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
      return { key: `p:${p.id}`, x: q.x, y: q.y, top: () => s()?.topOf(areaId) ?? 0 };
    });
  }, [level, areaOrder, places, areaId]);

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
              aria-label={`Region ${i + 1}: ${r.name}`}
              onClick={() => onPickRegion(r.id)}
            >
              <span className={styles.num}>{i + 1}</span>
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
                aria-label={`Area ${i + 1}: ${a.name}`}
                onClick={() => onPickArea(id)}
              >
                <span className={styles.num}>{i + 1}</span>
                {id === areaId && <span className={styles.badgeName}>{a.name}</span>}
              </button>
            );
          })}
        {level === 'places' &&
          places.map((p) => (
            <button
              key={p.id}
              ref={setRef(`p:${p.id}`)}
              type="button"
              data-pin={p.id}
              className={`${styles.pin} ${p.id === selectedPlaceId ? styles.pinOn : ''} ${visited.has(p.id) ? styles.pinDone : ''}`}
              aria-pressed={p.id === selectedPlaceId}
              aria-label={p.name}
              onClick={() => onPickPlace(p.id)}
            />
          ))}
      </div>
    </div>
  );
}
