// A walk from Editor's Pick as a 2D route (owner, 31 Oct 2026: "like a delivery or Amap route"): the flat map with the
// stops numbered in order and the dashed line between them, the time and distance, and a button that starts the
// directions in Google Maps. The line is the suggested order, not road routing; Google Maps finds the way.
import { useEffect, useRef, useState } from 'react';
import type { EditorPick } from '../../data/picks';
import { formatMinutes } from '../../data/picks';
import { distanceM } from '../../features/nearby/geo';
import CityMap from '../../features/nearby/map/CityMap';
import type { LatLng } from '../../features/nearby/domain';
import styles from './PickRoute.module.css';

interface Props {
  pick: EditorPick;
  selectedId?: string;
  visited: Set<string>;
  onSelect(placeId: string): void;
  onClose(): void;
}

function fitAll(points: LatLng[]) {
  const lat = (Math.min(...points.map((p) => p.lat)) + Math.max(...points.map((p) => p.lat))) / 2;
  const lng = (Math.min(...points.map((p) => p.lng)) + Math.max(...points.map((p) => p.lng))) / 2;
  const center = { lat, lng };
  const far = Math.max(0, ...points.map((p) => distanceM(center, p)));
  return { center, radiusM: Math.max(250, far + 150) };
}

const km = (v: number) => (v < 1 ? `${Math.round(v * 10) * 100} m` : `${v.toFixed(1)} km`);

export function PickRoute({ pick, selectedId, visited, onSelect, onClose }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(240);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(Math.max(160, Math.round(el.clientHeight))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const points = pick.stops.map((s) => ({ lat: s.place.coordinates.lat, lng: s.place.coordinates.lng }));
  const [focusId] = useState(() => Date.now());
  const fit = fitAll(points);
  const links = pick.links ?? [];
  const done = pick.stops.filter((s) => visited.has(s.place.id)).length;

  return (
    <div className={styles.route}>
      <div ref={box} className={styles.map}>
        <CityMap
          label={`2D route of ${pick.title}: ${pick.stops.length} stops in order`}
          height={h}
          pins={pick.stops.map((s, i) => ({
            key: s.place.id,
            name: `Stop ${i + 1}: ${s.place.name}`,
            location: points[i],
            category: s.place.category,
            visited: visited.has(s.place.id),
            label: String(i + 1),
          }))}
          selectedKey={selectedId}
          path={points}
          clusterPins={false}
          onSelect={onSelect}
          focus={{ id: focusId, center: fit.center, radiusM: fit.radiusM }}
          attribution="hidden"
          controlsTop={52}
        />
        <button type="button" className={styles.close} onClick={onClose}>
          3D map
        </button>
      </div>
      <div className={styles.sheet}>
        <p className={styles.stats}>
          <strong>{pick.stops.length}</strong> stops
          {pick.minutes ? (
            <>
              {' · '}
              {pick.stops.some((s) => s.estimate) && '≈ '}
              <strong>{formatMinutes(pick.minutes)}</strong> of visits
            </>
          ) : null}
          {pick.km ? (
            <>
              {' · ≈ '}
              <strong>{km(pick.km)}</strong> {pick.mode === 'transit' ? 'by walk + transit' : 'on foot'}
            </>
          ) : null}
          {done > 0 && ` · ${done} checked in`}
          <span className={styles.note}> · Dashed line: suggested order, not road routing.</span>
        </p>
        <div className={styles.go}>
          {links.map((l, i) => (
            <a key={l.url} title={l.label} className={i === 0 ? styles.goMain : styles.goMore} href={l.url} target="_blank" rel="noopener noreferrer">
              {i === 0 ? (links.length > 1 ? `Go with Google Maps 1/${links.length}` : 'Go with Google Maps') : `Then ${i + 1}/${links.length}`}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
