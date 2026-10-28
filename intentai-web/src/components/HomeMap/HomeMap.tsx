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

// Large teardrop with a white building glyph (selected place).
const TEARDROP_SVG =
  '<svg class="' +
  styles.glyph +
  '" viewBox="0 0 36 44" width="36" height="44" aria-hidden="true" focusable="false">' +
  '<path d="M18 42.5C18 42.5 3 27.5 3 17.5a15 15 0 0 1 30 0c0 10-15 25-15 25z" fill="#e4671f" stroke="#fff" stroke-width="2"/>' +
  '<path d="M11 15.5 18 11l7 4.5z" fill="#fff"/>' +
  '<rect x="12" y="16.5" width="2" height="6" fill="#fff"/><rect x="17" y="16.5" width="2" height="6" fill="#fff"/>' +
  '<rect x="22" y="16.5" width="2" height="6" fill="#fff"/><rect x="11" y="23" width="14" height="2" fill="#fff"/>' +
  '</svg>';

// Small round pin (other places).
const ROUND_SVG =
  '<svg class="' +
  styles.glyph +
  '" viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" focusable="false">' +
  '<circle cx="11" cy="11" r="9.5" fill="#e4671f" stroke="#fff" stroke-width="2"/><circle cx="11" cy="11" r="3" fill="#fff"/>' +
  '</svg>';

function pinIcon(place: HomePlace, selected: boolean): L.DivIcon {
  const name = escapeHtml(place.name);
  const html =
    `<button type="button" class="${styles.pin} ${selected ? styles.selected : styles.other}" ` +
    `data-place-id="${escapeHtml(place.id)}" data-selected="${selected}" aria-label="${name}">` +
    (selected ? TEARDROP_SVG : ROUND_SVG) +
    `<span class="${styles.label}" aria-hidden="true">${name}</span></button>`;
  return L.divIcon({ className: styles.marker, html, iconSize: [0, 0] });
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
  // True from our stop() until our own move settles on props.zoom; zooms meanwhile are not the user's.
  const ourMove = useRef(false);
  // Effects read the newest props through this ref, so they can run on narrow dependencies.
  const latest = useRef({ ...props, reduced });
  latest.current = { ...props, reduced };

  // Create the map and restore the camera from props, without animation (first load and every Retry).
  useEffect(() => {
    const el = containerRef.current!;
    const map = L.map(el, { zoomControl: false, attributionControl: false });
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
      icon: L.divIcon({ className: styles.you, html: '', iconSize: [16, 16] }),
      keyboard: false,
      interactive: false,
    }).addTo(map);
    you.getElement()?.setAttribute('aria-hidden', 'true');

    // Leaflet's stop() snaps a running flight to an intermediate zoom and fires zoomend; that and our
    // own moves are not user zooms. The flag clears once the view settles on props.zoom.
    const settle = () => {
      if (ourMove.current && map.getZoom() === latest.current.zoom) ourMove.current = false;
    };
    map.on('zoomend', () => {
      if (ourMove.current) return settle();
      const z = map.getZoom();
      if (z !== latest.current.zoom) latest.current.onUserZoom(z);
    });
    map.on('moveend', settle);

    // Keep the centre on resize: with a bottom inset, that keeps the target centred in the visible area.
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => map.invalidateSize({ pan: true }));
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

    ourMove.current = true;
    map.stop();
    if (batched) {
      // Intermediate commands were never seen: go to the absolute state.
      const c = centreFor(lastFocus, zoom);
      if (distanceM(map.getCenter(), c) > FLY_OVER_M) map.flyTo(c, zoom, anim);
      else map.setView(c, zoom, anim);
    } else if (command.kind === 'focus') {
      const c = centreFor(command.target, zoom);
      if (command.fly) map.flyTo(c, zoom, anim);
      // stop() may have left an interrupted flight's zoom; a plain pan would keep it.
      else if (map.getZoom() !== zoom) map.setView(c, zoom, anim);
      else map.panTo(c, anim);
    } else {
      const anchor = visibleCentre(project, unproject, map.getCenter(), map.getZoom(), bottomInset);
      map.setView(centreFor(anchor, zoom), zoom, anim);
    }
  }, [props.command.seq]);

  return <div ref={containerRef} className={styles.map} role="region" aria-label="Map of places near you" />;
}
