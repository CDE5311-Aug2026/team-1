// v2 boards 09 and 10 (owner, 8 Nov 2026: "remodel all stories' background but keep the original book design"): the
// light survey chart every volume is read on, and the field archive's ground. Drawn, not photographed: a survey grid
// and faint rhumb lines in CSS, brass compass roses in SVG, and Singapore's coastline from the URA region outlines
// (RegionMap's generated paths, URA Master Plan 2019, Singapore Open Data Licence) in a thin hatched line. The roses
// turn slowly only when motion is allowed (chartPaper.module.css).
import { useId, type CSSProperties } from 'react';
import { REGION_IDS, REGION_PATHS, VIEWBOX } from '../RegionMap/regionPaths.generated';
import styles from './chartPaper.module.css';

const f = (n: number) => Math.round(n * 1000) / 1000;
const pt = (a: number, r: number) => `${f(Math.sin(a) * r)},${f(-Math.cos(a) * r)}`;

/** One four-sided blade per direction, each in two halves (lit and shaded), like an engraved rose. */
function blades(len: number, half: number, offset: number) {
  let lit = '';
  let shade = '';
  for (let i = 0; i < 4; i++) {
    const a = offset + (i * Math.PI) / 2;
    lit += `M0,0 L${pt(a, len)} L${pt(a + Math.PI / 2, half)} Z `;
    shade += `M0,0 L${pt(a, len)} L${pt(a - Math.PI / 2, half)} Z `;
  }
  return { lit, shade };
}
const MAIN = blades(1.25, 0.19, 0);
const DIAG = blades(0.8, 0.16, Math.PI / 4);
const TICKS = Array.from({ length: 24 }, (_, i) => {
  const a = (i * Math.PI) / 12;
  return `M${pt(a, 0.9)} L${pt(a, 1)}`;
}).join(' ');

/** A brass compass rose, `size` px across its ring (its north point reaches a little past it), with its N above. */
export function CompassRose({ size, className, spin, style }: { size: number; className?: string; spin?: 'slow' | 'slower' | 'back'; style?: CSSProperties }) {
  const id = useId().replace(/:/g, '');
  const gleam = `gleam-${id}`;
  return (
    <svg
      className={`${styles.rose} ${className ?? ''}`}
      style={style}
      width={size * 1.3}
      height={size * 1.62}
      viewBox="-1.3 -1.94 2.6 3.24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gleam} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6420" />
          <stop offset=".45" stopColor="#f2d58a" />
          <stop offset=".55" stopColor="#fff3c4" />
          <stop offset=".7" stopColor="#e8c466" />
          <stop offset="1" stopColor="#8a6420" />
        </linearGradient>
      </defs>
      <text x="0" y="-1.5" textAnchor="middle" className={styles.north}>
        N
      </text>
      <g className={spin ? styles[spin] : undefined} fill="none" stroke={`url(#${gleam})`} strokeWidth={1.1 / size}>
        <circle r="1" />
        <circle r=".86" strokeDasharray={`${3 / size} ${5 / size}`} />
        <path d={TICKS} />
        <path d={DIAG.lit} fill={`url(#${gleam})`} fillOpacity=".7" />
        <path d={DIAG.shade} fill="rgba(184,138,42,.35)" />
        <path d={MAIN.lit} fill={`url(#${gleam})`} fillOpacity=".85" />
        <path d={MAIN.shade} fill="rgba(184,138,42,.35)" />
        <circle r=".1" fill="#fff3c4" stroke="#b88a2a" strokeWidth={0.8 / size} />
      </g>
    </svg>
  );
}

/** Singapore's coastline (the five URA regions merged), hatched like water on an old survey, in a thin gold line. */
export function Coastline({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`${styles.coast} ${className ?? ''}`} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`hatch-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
          <path d="M0,3 q1.5,-1.8 3,0 t3,0" fill="none" stroke="rgba(184,138,42,.28)" strokeWidth=".55" />
        </pattern>
      </defs>
      <g fill={`url(#hatch-${id})`} stroke="rgba(184,138,42,.34)" strokeWidth=".45" strokeLinejoin="round">
        {REGION_IDS.map((r) => (
          <path key={r} d={REGION_PATHS[r]} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The chart behind a volume or the archive: absolutely placed over its (positioned) parent, behind everything.
 * `reader`: board 10 (the coast along the foot, a large rose low on the right, small ones top right and low left).
 * `archive`: board 09 (a large faint rose mid-right, the small ones, the coast low down).
 * Past 700 px a fourth rose fills the upper left, and the roses grow with the screen (chartPaper.module.css).
 */
export function ChartPaper({ variant = 'reader', className }: { variant?: 'reader' | 'archive'; className?: string }) {
  return (
    <div className={`${styles.paper} ${variant === 'archive' ? styles.archive : styles.reader} ${className ?? ''}`} aria-hidden="true" data-chart-paper={variant}>
      <span className={styles.rays} />
      <Coastline className={styles.coastPlace} />
      <CompassRose size={variant === 'archive' ? 236 : 240} spin="slower" className={styles.bigRose} />
      <CompassRose size={44} spin="slow" className={styles.roseTop} />
      <CompassRose size={44} spin="back" className={styles.roseLow} />
      <CompassRose size={44} spin="slow" className={styles.roseFar} />
    </div>
  );
}
