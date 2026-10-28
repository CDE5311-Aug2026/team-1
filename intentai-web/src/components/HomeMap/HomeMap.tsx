import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { useEffect, useRef } from 'react';
import { HOME_BASE, type HomePlace } from '../../data/homePlaces';
import { distanceM } from '../../features/nearby/geo';
import type { LatLng } from '../../features/nearby/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FLY_OVER_M, PAN_MS, offsetCentre, visibleCentre, type MapCommand, type Project, type Unproject } from './camera';
import styles from './HomeMap.module.css';

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
/** Tiles count as failed after this many errors inside the window with no successful load. */
const TILE_ERRORS = 3;
const TILE_WINDOW_MS = 5000;
/** Same range the Nearby reducer clamps to, so a pinch cannot report a zoom outside it. */
const MIN_ZOOM = 12;
const MAX_ZOOM = 19;

export interface HomeMapProps {
  pins: HomePlace[];
  selectedId: string;
  command: MapCommand;
  /** Where the camera should be (the last focused place); used on mount and for batched commands. */
  lastFocus: LatLng;
  zoom: number;
  bottomInset: number;
  onPinActivate(id: string): void;
  onTilesFailed(): void;
  /** The user zoomed the map by hand (pinch, wheel, double-click). */
  onUserZoom(zoom: number): void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Canvas pin: a teardrop with a columns glyph; filled orange when selected, white with an orange outline otherwise.
const COLUMNS = 'M3 9.5 12 4l9 5.5M5.5 10v8M9.5 10v8M14.5 10v8M18.5 10v8M3 20h18';
const TEARDROP = 'M18 45s-15-14.3-15-26.5a15 15 0 0 1 30 0C33 30.7 18 45 18 45Z';

/** Pin sizes (px): the selected teardrop is larger. */
export const PIN_SELECTED = { width: 36, height: 46 } as const;
export const PIN_OTHER = { width: 28, height: 36 } as const;
/** Below this zoom only the selected pin keeps its name label. */
export const LABELS_MIN_ZOOM = 14;

function pinSvg(selected: boolean): string {
  const { width, height } = selected ? PIN_SELECTED : PIN_OTHER;
  const fill = selected ? '#e4671f' : '#fff';
  const stroke = selected ? '#fff' : '#e4671f';
  return (
    `<svg class="${styles.glyph}${selected ? ' pin-on' : ''}" viewBox="0 0 36 46" width="${width}" height="${height}" aria-hidden="true" focusable="false">` +
    `<path d="${TEARDROP}" fill="${fill}" stroke="${stroke}" stroke-width="${selected ? 2 : 2.5}"/>` +
    `<g transform="translate(10.5 10.5) scale(.625)" fill="none" stroke="${stroke}" stroke-width="${selected ? 2.4 : 2.6}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${COLUMNS}"/></g></svg>`
  );
}

function pinIcon(place: HomePlace, selected: boolean): L.DivIcon {
  const name = escapeHtml(place.name);
  const html =
    `<button type="button" class="${styles.pin} ${selected ? styles.selected : styles.other}" ` +
    `data-place-id="${escapeHtml(place.id)}" data-selected="${selected}" data-side="right" aria-label="Show ${name} on the map">` +
    pinSvg(selected) +
    `<span class="${styles.label}" data-label="" aria-hidden="true">${name}</span></button>`;
  return L.divIcon({ className: styles.marker, html, iconSize: [0, 0] });
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Gap between the pin head and its label, and the margin kept from the map edges and controls. */
const LABEL_GAP = 2;
const LABEL_MARGIN = 6;
/** The label sits this far below the top of the selected pin. */
const LABEL_DROP = 6;

/**
 * Where the selected pin's label goes. Right of the pin head; on the left when it would run into the map edge or a
 * control there. If it fits on neither side it wraps on the roomier side (`maxWidth`).
 * Boxes are in map pixels; `obstacles` are the controls drawn over the map.
 */
export function placeLabel(
  pin: Box,
  label: { width: number; height: number },
  mapWidth: number,
  obstacles: readonly Box[],
): { side: 'right' | 'left'; maxWidth?: number } {
  const top = pin.top + LABEL_DROP;
  const bottom = top + label.height;
  const across = obstacles.filter((o) => o.bottom > top && o.top < bottom);
  let rightLimit = mapWidth - LABEL_MARGIN;
  let leftLimit = LABEL_MARGIN;
  for (const o of across) {
    if (o.left >= pin.right) rightLimit = Math.min(rightLimit, o.left - LABEL_MARGIN);
    else if (o.right <= pin.left) leftLimit = Math.max(leftLimit, o.right + LABEL_MARGIN);
  }
  const roomRight = rightLimit - (pin.right + LABEL_GAP);
  const roomLeft = pin.left - LABEL_GAP - leftLimit;
  if (label.width <= roomRight) return { side: 'right' };
  if (label.width <= roomLeft) return { side: 'left' };
  return roomRight >= roomLeft ? { side: 'right', maxWidth: Math.max(48, roomRight) } : { side: 'left', maxWidth: Math.max(48, roomLeft) };
}

/** Lays out the selected pin's label inside `container` (the Leaflet element) against the controls drawn over it. */
function layoutSelectedLabel(container: HTMLElement) {
  const button = container.querySelector<HTMLElement>('button[data-selected="true"]');
  const label = button?.querySelector<HTMLElement>('[data-label]');
  const glyph = button?.querySelector('svg');
  if (!button || !label || !glyph) return;
  button.dataset.side = 'right';
  label.style.maxWidth = '';
  label.style.whiteSpace = '';
  const map = container.getBoundingClientRect();
  if (map.width === 0) return;
  const rel = (r: DOMRect): Box => ({ left: r.left - map.left, top: r.top - map.top, right: r.right - map.left, bottom: r.bottom - map.top });
  const bounds = container.closest('[data-map-bounds]') ?? container.parentElement;
  const obstacles = [...(bounds?.querySelectorAll<HTMLElement>('[data-map-obstacle]') ?? [])].map((o) => rel(o.getBoundingClientRect()));
  const l = label.getBoundingClientRect();
  const placed = placeLabel(rel(glyph.getBoundingClientRect()), { width: l.width, height: l.height }, map.width, obstacles);
  button.dataset.side = placed.side;
  if (placed.maxWidth !== undefined) {
    label.style.maxWidth = `${placed.maxWidth}px`;
    label.style.whiteSpace = 'normal';
  }
}

function projectOf(map: L.Map): Project {
  return (ll, z) => {
    const p = map.project(ll, z);
    return { x: p.x, y: p.y };
  };
}

function unprojectOf(map: L.Map): Unproject {
  return (pt, z) => {
    const ll = map.unproject([pt.x, pt.y], z);
    return { lat: ll.lat, lng: ll.lng };
  };
}

/** Home's OpenStreetMap street map. Loaded lazily by HomeMapFrame; the camera follows `command`. */
export default function HomeMap(props: HomeMapProps) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const appliedSeq = useRef(props.command.seq);
  const appliedInset = useRef(props.bottomInset);
  // 'stopping': inside our stop(), whose events are ours. 'moving': our move until its moveend.
  const phase = useRef<'idle' | 'stopping' | 'moving'>('idle');
  // Effects read the newest props through this ref, so they can run on narrow dependencies.
  const latest = useRef({ ...props, reduced });
  latest.current = { ...props, reduced };

  // Create the map and restore the camera from props, without animation (first load and every Retry).
  useEffect(() => {
    const el = containerRef.current!;
    const map = L.map(el, { zoomControl: false, attributionControl: false, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM });
    mapRef.current = map;
    const { lastFocus, zoom, bottomInset, command } = latest.current;
    map.setView(offsetCentre(projectOf(map), unprojectOf(map), lastFocus, zoom, bottomInset), zoom, { animate: false });
    appliedSeq.current = command.seq;
    appliedInset.current = bottomInset;

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

    const you = L.marker(HOME_BASE, {
      icon: L.divIcon({ className: styles.you, html: `<span class="halo ${styles.youHalo}"></span><span class="${styles.youDot}"></span>`, iconSize: [18, 18] }),
      keyboard: false,
      interactive: false,
    }).addTo(map);
    you.getElement()?.setAttribute('aria-hidden', 'true');

    // Zooms during our own stop()/move are not the user's. Our move's moveend ends that phase; if the
    // view then differs from props.zoom (user input mid-move, Leaflet's clamp, a dropped animated zoom),
    // the real zoom is reported so the reducer matches the map.
    const showLabels = () => {
      el.dataset.labels = map.getZoom() >= LABELS_MIN_ZOOM ? 'all' : 'selected';
    };
    showLabels();
    // After the event has reached every listener: markers reposition in their own 'viewreset'/'zoom' handlers.
    let relabelQueued = false;
    const relabel = () => {
      if (relabelQueued) return;
      relabelQueued = true;
      queueMicrotask(() => {
        relabelQueued = false;
        if (mapRef.current === map) layoutSelectedLabel(el);
      });
    };
    for (const type of ['move', 'moveend', 'viewreset']) map.on(type, relabel);
    map.on('zoomend', () => {
      showLabels();
      relabel();
    });
    map.on('zoomend', () => {
      if (phase.current !== 'idle') return;
      const z = map.getZoom();
      if (z !== latest.current.zoom) latest.current.onUserZoom(z);
    });
    map.on('moveend', () => {
      if (phase.current !== 'moving') return;
      phase.current = 'idle';
      const z = map.getZoom();
      if (z !== latest.current.zoom) latest.current.onUserZoom(z);
    });
    // Any user input ends our phase, so its zoom is reported at once.
    const userInput = () => {
      phase.current = 'idle';
    };
    map.on('dragstart', userInput);
    const inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    for (const type of inputs) el.addEventListener(type, userInput, { passive: true });

    // Keep the centre on resize: with a bottom inset, that keeps the target centred in the visible area.
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            map.invalidateSize({ pan: true });
            relabel();
          });
    resize?.observe(el);

    // One activation path for every pin: the pin's own <button>.
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const button = target?.closest<HTMLElement>('button[data-place-id]');
      if (button && el.contains(button) && button.dataset.placeId) latest.current.onPinActivate(button.dataset.placeId);
    };
    el.addEventListener('click', onClick);

    return () => {
      el.removeEventListener('click', onClick);
      for (const type of inputs) el.removeEventListener(type, userInput);
      resize?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Pins. Keyed by ids so a fresh `pins` array with the same places does not rebuild the markers.
  const pinKey = props.pins.map((p) => p.id).join('\n');
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;
    const focusedId = document.activeElement instanceof HTMLElement && el.contains(document.activeElement)
      ? document.activeElement.dataset.placeId
      : undefined;
    const { pins, selectedId } = latest.current;
    const markers = pins.map((p) => {
      const selected = p.id === selectedId;
      return L.marker(p.point, { icon: pinIcon(p, selected), keyboard: false, interactive: false, zIndexOffset: selected ? 1000 : 0 }).addTo(map);
    });
    layoutSelectedLabel(el);
    // Keep keyboard focus on the pin the user just activated.
    if (focusedId) {
      for (const b of el.querySelectorAll<HTMLElement>('button[data-place-id]')) if (b.dataset.placeId === focusedId) b.focus();
    }
    return () => {
      for (const m of markers) m.remove();
    };
  }, [pinKey, props.selectedId]);

  // The carousel grew or shrank: shift by half the difference so the camera (manual moves included) stays put.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const prev = appliedInset.current;
    appliedInset.current = props.bottomInset;
    if (prev !== props.bottomInset) map.panBy([0, (props.bottomInset - prev) / 2], { animate: false });
  }, [props.bottomInset]);

  // Move only when a new command arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { command, lastFocus, zoom, bottomInset, reduced: still } = latest.current;
    if (command.seq <= appliedSeq.current) return;
    const batched = command.seq > appliedSeq.current + 1;
    appliedSeq.current = command.seq;

    const project = projectOf(map);
    const unproject = unprojectOf(map);
    const centreFor = (t: LatLng, z: number) => offsetCentre(project, unproject, t, z, bottomInset);
    const anim: L.ZoomPanOptions = still ? { animate: false } : { animate: true, duration: PAN_MS / 1000, easeLinearity: 0.25 };

    // stop() cancels a running pan. Mid-flight (fractional zoom) it would also start an animated snap
    // to a whole zoom that swallows our next setView; skip it there, as setView/panTo/flyTo stop a
    // running flight themselves.
    phase.current = 'stopping';
    if (Number.isInteger(map.getZoom())) map.stop();
    phase.current = 'moving';
    if (batched) {
      // Intermediate commands were never seen: go to the absolute state.
      const c = centreFor(lastFocus, zoom);
      if (distanceM(map.getCenter(), c) > FLY_OVER_M) map.flyTo(c, zoom, anim);
      else map.setView(c, zoom, anim);
    } else if (command.kind === 'focus') {
      const c = centreFor(command.target, zoom);
      if (command.fly) map.flyTo(c, zoom, anim);
      // An interrupted flight leaves a fractional zoom; a plain pan would keep it.
      else if (map.getZoom() !== zoom) map.setView(c, zoom, anim);
      else map.panTo(c, anim);
    } else {
      const anchor = visibleCentre(project, unproject, map.getCenter(), map.getZoom(), bottomInset);
      map.setView(centreFor(anchor, zoom), zoom, anim);
    }
  }, [props.command.seq]);

  return <div ref={containerRef} className={styles.map} role="region" aria-label="Map of places near you" />;
}
