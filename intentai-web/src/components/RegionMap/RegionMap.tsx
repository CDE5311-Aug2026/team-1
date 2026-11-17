// The v2 "map division" (C7, boards 03 / 24 / 25): the five URA regions as SVG shapes, category pins projected from
// lat/lng, region shading by derived counts when a category filter is on, region chips and a category legend.
// Counts are always derived from `pins`, never typed. Planned (faded) pins are drawn but never counted.
import { useState, type KeyboardEvent } from 'react';
import CategoryGlyph from '../Category/CategoryGlyph';
import { TOURISM_CATEGORIES, TOURISM_INFO, type TourismCategory, type TourismFilter } from '../../data/tourism';
import type { RegionId } from '../../data/ura/ura';
import { REGION_IDS, REGION_LABEL_AT, REGION_NAMES, REGION_PATHS, VIEWBOX, project } from './regionPaths.generated';
import styles from './RegionMap.module.css';

export interface RegionMapPin {
  id: string;
  lat: number;
  lng: number;
  category: TourismCategory;
  region: RegionId;
  label: string;
  /** Planned: coming soon. Drawn with a dashed outline, never counted. */
  faded?: boolean;
}

export interface RegionMapProps {
  pins: RegionMapPin[];
  /** 'all' or one category */
  filter: TourismFilter;
  /** Chosen / home region (highlighted). */
  region?: RegionId;
  /** Tap a region shape or chip; omit for a read-only map. */
  onRegion?: (r: RegionId) => void;
  /** e.g. "14" hunters (Example data supplied by the caller). */
  badges?: Partial<Record<RegionId, string>>;
  /** Region chips with derived counts under the map (default true when onRegion). */
  showChips?: boolean;
  /** Category legend row (default true). */
  legend?: boolean;
  className?: string;
  ariaLabel?: string;
}

const LAND = '#fdfaec';
const SHORT: Record<TourismCategory, string> = { att: 'Attr.', wel: 'Well.', lei: 'Leis.', cru: 'Cruise' };

/** Pins per region that match the filter. Faded (planned) pins are never counted. */
export function regionCounts(pins: readonly RegionMapPin[], filter: TourismFilter): Record<RegionId, number> {
  const out = Object.fromEntries(REGION_IDS.map((r) => [r, 0])) as Record<RegionId, number>;
  for (const p of pins) if (!p.faded && (filter === 'all' || p.category === filter) && p.region in out) out[p.region] += 1;
  return out;
}

/** Share of the category colour mixed into land: 0.1 + 0.4·n/max (0 when the region has none). */
export function shadeShare(n: number, max: number): number {
  return n > 0 && max > 0 ? 0.1 + (0.4 * n) / max : 0;
}

function mixHex(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) * t + ch(b, i) * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
}

/** Pin size in px by the board 24/25 rule. */
export function pinSize(pin: RegionMapPin, filter: TourismFilter, region?: RegionId): 12 | 10 | 7 {
  if (filter !== 'all' && pin.category !== filter) return 7;
  return pin.region === region ? 12 : 10;
}

const placesText = (n: number) => `${n} ${n === 1 ? 'place' : 'places'}`;

export default function RegionMap({
  pins,
  filter,
  region,
  onRegion,
  badges,
  showChips,
  legend = true,
  className,
  ariaLabel,
}: RegionMapProps) {
  const [focused, setFocused] = useState<RegionId | null>(null);
  const counts = regionCounts(pins, filter);
  const max = Math.max(0, ...REGION_IDS.map((r) => counts[r]));
  const interactive = !!onRegion;
  const chips = showChips ?? interactive;

  const shade = (r: RegionId) => {
    if (filter === 'all') return { hex: LAND, css: 'var(--map-land, #fdfaec)', on: false };
    const t = shadeShare(counts[r], max);
    if (t === 0) return { hex: LAND, css: 'var(--map-land, #fdfaec)', on: false };
    const pct = Math.round(t * 100);
    const hex = mixHex(TOURISM_INFO[filter].fill, LAND, t);
    return { hex, css: `color-mix(in srgb, var(--cat-${filter}, ${TOURISM_INFO[filter].fill}) ${pct}%, var(--map-land, ${LAND}))`, on: true };
  };

  const key = (r: RegionId) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRegion?.(r);
    }
  };

  // Regions drawn on top of the rest: the chosen one (ink outline) and the keyboard-focused one (focus ring).
  // Each is stroked, then filled again over its own stroke, so only the outer half shows and no inner seams.
  const raised = REGION_IDS.filter((r) => r === region || r === focused);

  const pinsSorted = [...pins].sort((a, b) => pinSize(a, filter, region) - pinSize(b, filter, region));

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.map} role="group" aria-label={ariaLabel ?? 'Singapore regions map'}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {REGION_IDS.map((r) => {
            const s = shade(r);
            const name = REGION_NAMES[r];
            const a11y = interactive
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-pressed': r === region,
                  'aria-label': `${name}, ${placesText(counts[r])}`,
                  onClick: () => onRegion?.(r),
                  onKeyDown: key(r),
                  onFocus: () => setFocused(r),
                  onBlur: () => setFocused((f) => (f === r ? null : f)),
                }
              : { 'aria-hidden': true as const };
            return (
              <path
                key={r}
                d={REGION_PATHS[r]}
                className={[styles.region, interactive ? styles.regionLive : ''].join(' ')}
                fill={s.hex}
                stroke={s.hex}
                style={{ fill: s.css, stroke: s.css }}
                data-region={r}
                data-shaded={s.on ? 'true' : 'false'}
                data-share={s.on ? shadeShare(counts[r], max).toFixed(3) : undefined}
                {...a11y}
              />
            );
          })}
          {raised.map((r) => {
            const s = shade(r);
            return (
              <g key={`raised-${r}`} aria-hidden="true" className={styles.raised} data-raised={r}>
                <path
                  d={REGION_PATHS[r]}
                  className={r === focused ? styles.focusRing : styles.outline}
                  vectorEffect="non-scaling-stroke"
                  data-outline={r === region ? 'chosen' : 'focus'}
                />
                <path d={REGION_PATHS[r]} fill={s.hex} stroke="none" style={{ fill: s.css }} />
              </g>
            );
          })}
          <g aria-hidden="true">
            {REGION_IDS.map((r) => (
              <text
                key={r}
                x={REGION_LABEL_AT[r].x}
                y={REGION_LABEL_AT[r].y}
                textAnchor="middle"
                className={[styles.label, r === region ? styles.labelOn : ''].join(' ')}
              >
                {REGION_NAMES[r]}
              </text>
            ))}
          </g>
        </svg>

        <div className={styles.pins} aria-hidden="true">
          {pinsSorted.map((p) => {
            const { x, y } = project(p.lat, p.lng);
            const size = pinSize(p, filter, region);
            const pulse = filter !== 'all' && size === 12 && !p.faded;
            return (
              <span
                key={p.id}
                className={[
                  styles.pin,
                  size === 7 ? styles.pinOut : '',
                  p.faded ? styles.pinFaded : '',
                  pulse ? styles.pulse : '',
                ].join(' ')}
                style={{
                  left: `${(x / VIEWBOX.width) * 100}%`,
                  top: `${(y / VIEWBOX.height) * 100}%`,
                  width: size,
                  height: size,
                  ['--pc' as string]: `var(--cat-${p.category}, ${TOURISM_INFO[p.category].fill})`,
                }}
                title={p.label}
                data-pin={p.id}
                data-size={size}
                data-faded={p.faded ? 'true' : undefined}
                data-pulse={pulse ? 'true' : undefined}
              />
            );
          })}
          {badges &&
            REGION_IDS.filter((r) => badges[r]).map((r) => (
              <span
                key={`badge-${r}`}
                className={[styles.badge, r === region ? styles.badgeOn : ''].join(' ')}
                style={{
                  left: `${((REGION_LABEL_AT[r].x + 4) / VIEWBOX.width) * 100}%`,
                  top: `${((REGION_LABEL_AT[r].y + 12) / VIEWBOX.height) * 100}%`,
                }}
                data-badge={r}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
                </svg>
                {badges[r]}
              </span>
            ))}
        </div>

        {legend && (
          <ul className={styles.legend} aria-label="Categories">
            {TOURISM_CATEGORIES.map((c) => (
              <li
                key={c}
                className={[styles.legendItem, filter !== 'all' && filter !== c ? styles.legendDim : ''].join(' ')}
                data-legend={c}
              >
                <span className={styles.legendDot} style={{ background: `var(--cat-${c}, ${TOURISM_INFO[c].fill})` }}>
                  <CategoryGlyph category={c} size={8} color="#fff" />
                </span>
                <span aria-hidden="true">{SHORT[c]}</span>
                <span className={styles.srOnly}>{TOURISM_INFO[c].label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {chips && (
        <div className={styles.chips} role="group" aria-label="Regions">
          {REGION_IDS.map((r) => (
            <button
              key={r}
              type="button"
              className={[styles.chip, r === region ? styles.chipOn : ''].join(' ')}
              aria-pressed={r === region}
              aria-label={`${REGION_NAMES[r]}, ${placesText(counts[r])}`}
              disabled={!interactive}
              onClick={() => onRegion?.(r)}
              data-chip={r}
            >
              <span className={styles.chipPill}>
                {REGION_NAMES[r]}
                <span className={styles.chipCount}>{counts[r]}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
