// A walk from Editor's Pick as a 2D route (owner, 31 Oct 2026: "like a delivery or Amap route"; then "the built-in 2D
// map should be Google Maps"): Google Maps' own directions between the stops, in order, embedded in the card, the
// time and distance, and buttons that open the same directions in Google Maps. Long walks go in parts of up to 10 stops
// (each part starts where the last ended).
import { useState } from 'react';
import type { EditorPick } from '../../data/picks';
import { formatMinutes } from '../../data/picks';
import styles from './PickRoute.module.css';

interface Props {
  pick: EditorPick;
  visited: Set<string>;
  onClose(): void;
}

const PART = 10;
const km = (v: number) => (v < 1 ? `${Math.round(v * 10) * 100} m` : `${v.toFixed(1)} km`);

/** Stops in parts of up to PART, each starting at the previous part's last stop. */
export function routeParts<T>(stops: readonly T[]): T[][] {
  if (stops.length <= PART) return [stops.slice()];
  const parts: T[][] = [];
  for (let i = 0; i < stops.length - 1; i += PART - 1) parts.push(stops.slice(i, i + PART));
  return parts;
}

/** Google Maps directions through these points, as an embeddable page (no key needed). */
export function embedUrl(points: readonly { lat: number; lng: number }[], transit: boolean): string {
  const ll = (p: { lat: number; lng: number }) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const q = new URLSearchParams({ saddr: ll(points[0]), daddr: points.slice(1).map(ll).join(' to:'), dirflg: transit ? 'r' : 'w', hl: 'en', output: 'embed' });
  return `https://maps.google.com/maps?${q}`;
}

export function PickRoute({ pick, visited, onClose }: Props) {
  const parts = routeParts(pick.stops.map((s) => s.place));
  const [part, setPart] = useState(0);
  const cur = parts[Math.min(part, parts.length - 1)];
  const links = pick.links ?? [];
  const done = pick.stops.filter((s) => visited.has(s.place.id)).length;
  const first = pick.stops.findIndex((s) => s.place.id === cur[0].id) + 1;

  return (
    <div className={styles.route}>
      <div className={styles.map}>
        <iframe
          key={part}
          className={styles.frame}
          src={embedUrl(
            cur.map((p) => p.coordinates),
            pick.mode === 'transit',
          )}
          title={`Google Maps: ${pick.title}, stops ${first} to ${first + cur.length - 1} in order`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <button type="button" className={styles.close} onClick={onClose}>
          3D map
        </button>
        {parts.length > 1 && (
          <div className={styles.parts} role="radiogroup" aria-label="Part of the walk">
            {parts.map((_, i) => (
              <button key={i} type="button" role="radio" aria-checked={i === part} className={styles.part} onClick={() => setPart(i)}>
                Part {i + 1}
              </button>
            ))}
          </div>
        )}
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
