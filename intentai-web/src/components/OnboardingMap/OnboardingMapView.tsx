import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import type { HomeBase } from '../../data/domain';
import type { LatLng } from '../../features/nearby/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AREAS, OVERVIEW_AREAS } from '../../pages/Onboarding/areas';
import motion from '../../pages/Onboarding/Onboarding.module.css';
import { MAX_BOUNDS, inBaseBounds } from './bounds';
import styles from './OnboardingMapView.module.css';

// Same tiles as Home's map (kept here so this chunk does not pull in Home's map).
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OVERVIEW_ZOOM = 12.5;
export const PINNED_ZOOM = 14.5;
export const OVERVIEW_CENTER: LatLng = { lat: 1.3, lng: 103.815 };
/** Arrow keys pan by this many screen px. */
export const PAN_PX = 80;
/** Camera moves take as long as the canvas's map transition. */
const MOVE_S = 0.8;
/** Tiles count as failed after this many errors inside the window with no successful load. */
const TILE_ERRORS = 3;
const TILE_WINDOW_MS = 5000;

export interface OnboardingMapViewProps {
  base: HomeBase | null;
  /** Bumps on every drop (also at the same spot): recentre on the pin at the pinned zoom and replay its drop. */
  drops: number;
  /** Bumps on every zoom-out: back to the overview zoom around the current centre. */
  outSeq: number;
  /** Pinned zoom (all 17 area names) or overview (the 9 main ones). */
  zoomed: boolean;
  onDrop(point: LatLng): void;
  onTilesFailed(): void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const PIN_SVG =
  '<svg width="40" height="50" viewBox="0 0 40 50" aria-hidden="true" focusable="false">' +
  '<path d="M20 49s16-14.5 16-28A16 16 0 0 0 4 21c0 13.5 16 28 16 28Z" fill="#E4671F" stroke="#FFFFFF" stroke-width="3"/>' +
  '<circle cx="20" cy="20" r="6" fill="#FFFFFF"/></svg>';

function pinIcon(label: string): L.DivIcon {
  const html =
    `<span class="${styles.ping} ${motion.ping}"></span>` +
    `<span class="${styles.drop} ${motion.aDrop}">${PIN_SVG}</span>` +
    `<span class="${styles.pillAnchor}"><span class="${styles.pill} ${motion.aVal}" style="animation-delay:.25s">${escapeHtml(label)}</span></span>`;
  return L.divIcon({ className: styles.marker, html, iconSize: [0, 0] });
}

const OVERVIEW_NAMES = new Set(OVERVIEW_AREAS.map((a) => a.name));

function areaIcon(name: string, hidden: boolean): L.DivIcon {
  const cls = [styles.area, OVERVIEW_NAMES.has(name) ? styles.overview : '', hidden ? styles.areaHidden : ''].filter(Boolean).join(' ');
  const html = `<span class="${cls}" data-area="${escapeHtml(name)}"><span class="${styles.dot}"></span><span class="${styles.areaName}">${escapeHtml(name)}</span></span>`;
  return L.divIcon({ className: styles.marker, html, iconSize: [0, 0] });
}

/** The home-base map: OpenStreetMap tiles, area names and the dropped pin. Loaded lazily by OnboardingMapFrame. */
export default function OnboardingMapView(props: OnboardingMapViewProps) {
  const reduced = useReducedMotion();
  const hintId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const latest = useRef({ ...props, reduced });
  latest.current = { ...props, reduced };

  const { base } = props;
  const dropKey = base ? `${props.drops}|${base.lat}|${base.lng}` : `${props.drops}|none`;
  const appliedDrop = useRef(dropKey);
  const appliedOut = useRef(props.outSeq);

  const move = (map: L.Map, centre: LatLng, zoom: number) => {
    if (latest.current.reduced) map.setView(centre, zoom, { animate: false });
    else map.flyTo(centre, zoom, { duration: MOVE_S });
  };

  // A drop outside the range the store accepts is ignored (maxBounds keeps the view inside it anyway).
  const drop = (point: LatLng) => {
    if (inBaseBounds(point)) latest.current.onDrop({ lat: point.lat, lng: point.lng });
  };

  // Create the map (first load and every Retry) with the camera where the step left it.
  useEffect(() => {
    const el = containerRef.current!;
    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.5,
      minZoom: OVERVIEW_ZOOM,
      maxZoom: PINNED_ZOOM,
      maxBounds: MAX_BOUNDS,
      maxBoundsViscosity: 1,
      keyboard: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      touchZoom: false,
      boxZoom: false,
    });
    mapRef.current = map;
    const { base: b, zoomed } = latest.current;
    if (b && zoomed) map.setView(b, PINNED_ZOOM, { animate: false });
    else map.setView(OVERVIEW_CENTER, OVERVIEW_ZOOM, { animate: false });

    let errors: number[] = [];
    let failed = false;
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: '' })
      .on('tileload', () => {
        errors = [];
      })
      .on('tileerror', () => {
        if (failed) return;
        const now = Date.now();
        errors = errors.filter((t) => now - t < TILE_WINDOW_MS);
        errors.push(now);
        if (errors.length >= TILE_ERRORS) {
          failed = true;
          latest.current.onTilesFailed();
        }
      })
      .addTo(map);

    // Tap drops, drag pans. Leaflet already swallows the click that ends a drag; this guard also
    // covers a click that arrives after a dragstart in the same gesture.
    let dragged = false;
    const pressStart = () => {
      dragged = false;
    };
    const starts = ['pointerdown', 'mousedown', 'touchstart'] as const;
    for (const type of starts) el.addEventListener(type, pressStart, { capture: true, passive: true });
    map.on('dragstart', () => {
      dragged = true;
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (dragged || !e.latlng) return;
      drop(e.latlng);
    });

    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resize?.observe(el);

    return () => {
      for (const type of starts) el.removeEventListener(type, pressStart, { capture: true });
      resize?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Area names. Rebuilt when the pin's label changes: the area the pin is named after hides its own dot.
  const pinLabel = base?.label ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = AREAS.map((a) =>
      L.marker({ lat: a.lat, lng: a.lng }, { icon: areaIcon(a.name, a.name === pinLabel), keyboard: false, interactive: false }).addTo(map),
    );
    return () => {
      for (const m of markers) m.remove();
    };
  }, [pinLabel]);

  // The pin. A new marker per drop, so the drop animation replays.
  useEffect(() => {
    const map = mapRef.current;
    const b = latest.current.base;
    if (!map || !b) return;
    const marker = L.marker({ lat: b.lat, lng: b.lng }, { icon: pinIcon(b.label), keyboard: false, interactive: false, zIndexOffset: 1000 }).addTo(map);
    return () => {
      marker.remove();
    };
  }, [dropKey, pinLabel]);

  // A drop: centre on the pin at the pinned zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedDrop.current === dropKey) return;
    appliedDrop.current = dropKey;
    const b = latest.current.base;
    if (b) move(map, b, PINNED_ZOOM);
  }, [dropKey]);

  // Zoom out: overview zoom around the current centre.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedOut.current === props.outSeq) return;
    appliedOut.current = props.outSeq;
    move(map, map.getCenter(), OVERVIEW_ZOOM);
  }, [props.outSeq]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const map = mapRef.current;
    if (!map || e.target !== e.currentTarget) return;
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [-PAN_PX, 0],
      ArrowRight: [PAN_PX, 0],
      ArrowUp: [0, -PAN_PX],
      ArrowDown: [0, PAN_PX],
    };
    if (e.key in pan) {
      e.preventDefault();
      map.panBy(pan[e.key], { animate: !reduced });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      drop(map.getCenter());
    }
  };

  const label = base ? `Map. Home base set to ${base.label}. Tap elsewhere to move it` : 'Map. Tap where you usually are to set your home base';

  return (
    <div className={styles.wrap} data-zoomed={props.zoomed}>
      <div
        ref={containerRef}
        className={styles.map}
        role="application"
        aria-label={label}
        aria-describedby={hintId}
        tabIndex={0}
        onKeyDown={onKeyDown}
      />
      <p id={hintId} className={styles.srOnly}>
        Arrow keys move the map. Enter drops the pin at the centre.
      </p>
    </div>
  );
}
