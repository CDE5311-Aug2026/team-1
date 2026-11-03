// The treasure map of a route, inked from the stops' real positions: the trail between them, an X where a clue was
// found, the next stop ringed, a compass rose and a true scale bar. It is folded in eight (four columns, two rows):
// tap the packet and it unfolds, first down, then out like an accordion; tap a stop for its note.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { goLabel, type Chapter, type ChapterStop } from './chapters';
import { Overlay } from './Overlay';
import styles from './props.module.css';

const W = 400,
  H = 300;

/** Project the stops into the sheet (equirectangular is exact enough at street scale). */
function useProjection(stops: ChapterStop[]) {
  return useMemo(() => {
    const pts = stops.filter((s) => s.pin);
    const lat = pts.map((s) => s.pin!.lat),
      lng = pts.map((s) => s.pin!.lng);
    const k = Math.cos((1.3 * Math.PI) / 180); // shrink longitude at 1.3°N
    let x0 = Math.min(...lng),
      x1 = Math.max(...lng),
      y0 = Math.min(...lat),
      y1 = Math.max(...lat);
    // never closer than a few minutes' walk across
    const span = Math.max((x1 - x0) * k, y1 - y0, 0.004);
    const pad = span * 0.32;
    const cx = (x0 + x1) / 2,
      cy = (y0 + y1) / 2;
    // fit the 4:3 sheet
    let hw = (span / 2 + pad) / k,
      hh = span / 2 + pad;
    if (hw * k * 3 < hh * 4) hw = (hh * 4) / 3 / k;
    else hh = (hw * k * 3) / 4;
    x0 = cx - hw;
    x1 = cx + hw;
    y0 = cy - hh;
    y1 = cy + hh;
    const at = (p: { lat: number; lng: number }) => ({ x: ((p.lng - x0) / (x1 - x0)) * W, y: ((y1 - p.lat) / (y1 - y0)) * H });
    const metresPerUnit = ((y1 - y0) * 111_000) / H;
    return { at, metresPerUnit, lat: [y0, y1], lng: [x0, x1] };
  }, [stops]);
}

/** A smooth hand-drawn trail through the points (Catmull–Rom). */
function trail(p: { x: number; y: number }[]) {
  if (p.length < 2) return '';
  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i],
      b = p[i],
      c = p[i + 1],
      e = p[i + 2] ?? c;
    d += ` C${(b.x + (c.x - a.x) / 6).toFixed(1)},${(b.y + (c.y - a.y) / 6).toFixed(1)} ${(c.x - (e.x - b.x) / 6).toFixed(1)},${(c.y - (e.y - b.y) / 6).toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
  }
  return d;
}

/** What else is on each map: the street the stops line, the old shore (before reclamation), the river. */
const FEATURES: Record<string, { street?: string; shore?: string; river?: boolean }> = {
  'telok-ayer': { street: 'TELOK AYER STREET', shore: 'OLD SHORE · c. 1820s (approx.)' },
  'kampong-gelam': { shore: 'OLD SHORE · along Beach Road (approx.)' },
  'only-one-missing': { shore: 'OLD SHORE · along Beach Road (approx.)' },
  // the prologue walks the same streets
  short: { shore: 'OLD SHORE · along Beach Road (approx.)' },
  balestier: { street: 'BALESTIER ROAD' },
  'civic-f1': { river: true },
};
const RIVER = [
  [1.2912, 103.836],
  [1.2903, 103.8418],
  [1.2889, 103.8458],
  [1.2876, 103.8492],
  [1.2869, 103.8522],
  [1.2872, 103.8546],
  [1.2866, 103.8575],
].map(([lat, lng]) => ({ lat, lng }));

const dms = (v: number) => {
  const d = Math.floor(v),
    m = (v - d) * 60;
  return `${d}°${m.toFixed(1)}′`;
};

export function MapArt({ chapter, focus, onPick }: { chapter: Chapter; focus?: string; onPick?(stop: ChapterStop): void }) {
  const { at, metresPerUnit, lat, lng } = useProjection(chapter.stops);
  // a stop with no pin yet (the prologue's hidden second building) is not on the map until it is found
  const pts = chapter.stops.filter((s) => s.pin).map((s) => ({ s, ...at(s.pin!) }));
  const next = chapter.stops.find((s) => !s.done);
  const done = pts.filter((p) => p.s.done);
  // a scale bar of a round length
  const bar = [50, 100, 200, 250, 500].find((m) => m / metresPerUnit > 46) ?? 500;
  const barPx = bar / metresPerUnit;
  const feat = FEATURES[chapter.routeId] ?? {};
  const uid = `m-${chapter.routeId}`;
  // the old shore runs east of the stops (the sea was where the reclaimed land is now)
  const byY = [...pts].sort((a, b) => a.y - b.y);
  const shore = feat.shore ? [{ x: byY[0].x + 34, y: -10 }, ...byY.map((p) => ({ x: p.x + 34, y: p.y })), { x: byY[byY.length - 1].x + 34, y: H + 10 }] : [];
  const river = feat.river ? RIVER.map(at) : [];
  return (
    <svg
      className={styles.mapArt}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${chapter.area} treasure map, ${chapter.solved} of ${chapter.stops.length} found`}
    >
      <defs>
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
        <pattern id={`${uid}-sea`} width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M0,4.5 q2.25,-2.4 4.5,0 t4.5,0" fill="none" stroke="rgba(60,70,80,.28)" strokeWidth=".7" />
        </pattern>
      </defs>
      {/* frame and graticule */}
      <rect x="8" y="8" width={W - 16} height={H - 16} fill="none" stroke="rgba(60,40,20,.55)" strokeWidth="1.2" />
      <rect x="12" y="12" width={W - 24} height={H - 24} fill="none" stroke="rgba(60,40,20,.35)" strokeWidth=".6" />
      {[0.25, 0.5, 0.75].map((f) => (
        <g key={f} stroke="rgba(60,40,20,.12)" strokeDasharray="2 5">
          <line x1={W * f} y1="12" x2={W * f} y2={H - 12} />
          <line x1="12" y1={H * f} x2={W - 12} y2={H * f} />
        </g>
      ))}
      <text x="16" y={H - 16} className={styles.mapTiny}>
        {dms(lat[0])}N
      </text>
      <text x={W - 16} y="22" className={styles.mapTiny} textAnchor="end">
        {dms(lng[1])}E
      </text>

      {/* rhumb lines from the rose, as on old sea charts */}
      <g stroke="rgba(90,60,30,.09)" strokeWidth=".6">
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i * Math.PI) / 8;
          return <line key={i} x1={W - 46} y1={H - 52} x2={W - 46 + Math.cos(a) * 520} y2={H - 52 + Math.sin(a) * 520} />;
        })}
      </g>
      {shore.length > 0 && (
        <g>
          <path d={`${trail(shore)} L${W + 10},${H + 10} L${W + 10},-10 Z`} fill={`url(#${uid}-sea)`} />
          <path d={trail(shore)} fill="none" stroke="rgba(60,40,20,.55)" strokeWidth="1.3" filter="url(#rough)" />
          <path d={trail(shore.map((p) => ({ x: p.x + 6, y: p.y })))} fill="none" stroke="rgba(60,40,20,.25)" strokeWidth=".8" strokeDasharray="3 3" />
          <text
            transform={`translate(${Math.min(W - 24, byY[Math.floor(byY.length / 2)].x + 58)},${H * 0.5}) rotate(90)`}
            textAnchor="middle"
            className={styles.mapSea}
          >
            {feat.shore}
          </text>
        </g>
      )}
      {river.length > 0 && (
        <g>
          <path d={trail(river)} fill="none" stroke="rgba(90,110,120,.35)" strokeWidth="16" strokeLinecap="round" />
          <path d={trail(river)} fill="none" stroke="rgba(60,70,80,.45)" strokeWidth="1" strokeDasharray="4 4" />
          <text x={river[2].x} y={river[2].y + 22} className={styles.mapSea}>
            SINGAPORE RIVER
          </text>
        </g>
      )}
      {feat.street && (
        <g>
          <path id={`${uid}-street`} d={trail(byY)} fill="none" stroke="rgba(60,40,20,.38)" strokeWidth="13" strokeLinecap="round" />
          <path d={trail(byY)} fill="none" stroke="#ecdfc0" strokeWidth="10.5" strokeLinecap="round" />
          <text className={styles.mapStreet} dy="3">
            <textPath href={`#${uid}-street`} startOffset="62%" textAnchor="middle">
              {feat.street}
            </textPath>
          </text>
        </g>
      )}

      {/* compass rose */}
      <g transform={`translate(${W - 46},${H - 52})`} className={styles.compass}>
        <circle r="20" fill="none" stroke="rgba(60,40,20,.5)" strokeWidth=".8" />
        <circle r="15" fill="none" stroke="rgba(60,40,20,.3)" strokeWidth=".5" strokeDasharray="1 2" />
        <path d="M0,-24 L4,0 L0,24 L-4,0 Z" fill="rgba(60,40,20,.75)" />
        <path d="M-24,0 L0,4 L24,0 L0,-4 Z" fill="rgba(60,40,20,.45)" />
        <path d="M0,-24 L4,0 L-4,0 Z" fill="#9b2c1c" />
        <text y="-28" textAnchor="middle" className={styles.mapTiny}>
          N
        </text>
      </g>
      {/* scale bar */}
      <g transform={`translate(22,${H - 36})`}>
        <rect width={barPx} height="4" fill="none" stroke="rgba(60,40,20,.7)" strokeWidth=".8" />
        <rect width={barPx / 2} height="4" fill="rgba(60,40,20,.7)" />
        <text y="-4" className={styles.mapTiny}>
          0
        </text>
        <text x={barPx} y="-4" textAnchor="end" className={styles.mapTiny}>
          {bar} m
        </text>
      </g>

      {/* the trail: walked part in ink, the rest pencilled */}
      <path d={trail(pts)} fill="none" stroke="rgba(70,50,30,.35)" strokeWidth="1.6" strokeDasharray="1 5" strokeLinecap="round" filter="url(#rough)" />
      <path
        d={trail(pts.slice(0, Math.max(1, done.length + (next ? 1 : 0))).filter((_, i) => i <= done.length))}
        fill="none"
        stroke="#7a2a17"
        strokeWidth="2"
        strokeDasharray="6 5"
        strokeLinecap="round"
        filter="url(#rough)"
        className={styles.inkTrail}
      />

      {pts.map(({ s, x, y }) => {
        const isNext = s.id === next?.id;
        const label = s.name.length > 9 ? s.name.slice(0, 8) + '…' : s.name;
        const left = x > W - 110 || (x > 110 && s.n % 2 === 0);
        return (
          <g
            key={s.id}
            transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
            className={`${styles.stopMark} ${focus === s.id ? styles.stopFocus : ''}`}
            role={onPick ? 'button' : undefined}
            tabIndex={onPick ? 0 : undefined}
            aria-label={`${s.n}. ${s.name}${s.done ? ', found' : isNext ? ', next' : ''}`}
            onClick={onPick ? () => onPick(s) : undefined}
            onKeyDown={onPick ? (e) => (e.key === 'Enter' || e.key === ' ') && onPick(s) : undefined}
          >
            <circle r="16" fill="transparent" />
            {/* owner's sketch (3 Nov 2026): every stop's progress reads at a glance, ✓ found and ✗ still to find; the
                next one's ✗ is in red ink, ringed */}
            {s.done ? (
              <g className={styles.xMark} filter="url(#rough)">
                <path d="M-7,0 L-2.5,5.5 L7.5,-6.5" fill="none" stroke="#2f5a34" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ) : (
              <g filter="url(#rough)">
                {isNext && <circle r="11" fill="rgba(155,44,28,.08)" stroke="#9b2c1c" strokeWidth="1.4" className={styles.nextRing} />}
                <path d="M-5,-5 L5,5 M5,-5 L-5,5" stroke={isNext ? '#9b2c1c' : 'rgba(60,40,20,.55)'} strokeWidth={isNext ? 2.8 : 2} strokeLinecap="round" />
              </g>
            )}
            <text x={left ? -12 : 12} y="-7" textAnchor={left ? 'end' : 'start'} className={styles.mapNum}>
              {s.n}
            </text>
            <text x={left ? -12 : 12} y="6" textAnchor={left ? 'end' : 'start'} className={`${styles.mapLabel} ${s.done ? styles.mapLabelDone : ''}`}>
              {label}
            </text>
          </g>
        );
      })}

      {/* cartouche */}
      <g transform="translate(22,22)">
        <rect width="132" height="40" fill="rgba(239,226,196,.85)" stroke="rgba(60,40,20,.6)" strokeWidth=".8" />
        <rect x="3" y="3" width="126" height="34" fill="none" stroke="rgba(60,40,20,.35)" strokeWidth=".5" />
        <text x="66" y="19" textAnchor="middle" className={styles.mapTitle}>
          {chapter.area}
        </text>
        <text x="66" y="31" textAnchor="middle" className={styles.mapTiny}>
          {chapter.en} · VOL. {chapter.roman}
        </text>
      </g>
    </svg>
  );
}

/** The folded packet as it lies on the page (and as the outer panel of the map). */
export function MapCover({ chapter }: { chapter: Chapter }) {
  return (
    <span className={styles.mapCoverArt}>
      <small>FINDSG · SURVEY Nº {chapter.roman}</small>
      <b>{chapter.area}</b>
      <i>Treasure map</i>
      <svg viewBox="-24 -24 48 48" aria-hidden="true">
        <circle r="20" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M0,-22 L5,0 L0,22 L-5,0 Z" fill="currentColor" />
        <path d="M-22,0 L0,5 L22,0 L0,-5 Z" fill="currentColor" opacity=".55" />
      </svg>
      <em>
        {chapter.solved} / {chapter.stops.length} marked
      </em>
    </span>
  );
}

const COLS = 4;

export function UnfoldedMap({ chapter, onClose, onGo }: { chapter: Chapter; onClose(): void; onGo(stop: ChapterStop): void }) {
  // 0 folded → 1 dropped down → 2 fully open
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState<ChapterStop | null>(null);
  useEffect(() => {
    const quick = document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (quick) return setStep(2);
    const a = setTimeout(() => setStep(1), 380),
      b = setTimeout(() => setStep(2), 1150);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  // nested columns: each folds against its parent (zigzag); each column holds a top and a bottom cell
  const column = (c: number): JSX.Element => {
    const flipped = c % 2 === 1;
    const colAngle = step < 2 ? (c === 0 ? 0 : flipped ? -179.5 : 179.5) : 0;
    const rowAngle = step < 1 ? (c % 2 ? -179 : 179) : 0;
    return (
      <div className={styles.mapCol} style={{ transform: `rotateY(${colAngle}deg)`, left: c === 0 ? 0 : '100%' } as CSSProperties}>
        <div className={styles.mapCell} style={{ '--c': c, '--r': 0 } as CSSProperties}>
          <div className={styles.cellFace}>
            <MapArt chapter={chapter} focus={pick?.id} onPick={step === 2 ? setPick : undefined} />
          </div>
          <div className={styles.cellBack}>{c === COLS - 1 && <MapCover chapter={chapter} />}</div>
        </div>
        <div className={styles.mapCellBottom} style={{ transform: `rotateX(${rowAngle}deg)` }}>
          <div className={styles.mapCell} style={{ '--c': c, '--r': 1 } as CSSProperties}>
            <div className={styles.cellFace}>
              <MapArt chapter={chapter} focus={pick?.id} onPick={step === 2 ? setPick : undefined} />
            </div>
            <div className={styles.cellBack} />
          </div>
        </div>
        {c < COLS - 1 && column(c + 1)}
      </div>
    );
  };

  return (
    <Overlay label={`${chapter.area} treasure map`} onClose={onClose}>
      <div className={styles.mapStage} data-step={step}>
        <div className={styles.mapSheet}>{column(0)}</div>
      </div>
      <div className={styles.mapNote} data-show={step === 2}>
        {pick ? (
          <div className={styles.stopNote} key={pick.id}>
            {/* step to the stop before or after: on a tight street the pins sit almost on top of each other */}
            <div className={styles.stopStep}>
              <button type="button" aria-label="Previous stop" disabled={pick.n <= 1} onClick={() => setPick(chapter.stops[pick.n - 2])}>
                ‹
              </button>
              <small>
                Stop {pick.n} · {pick.done ? 'found ✓' : pick.id === chapter.stops.find((s) => !s.done)?.id ? 'next ✗' : 'to find ✗'}
              </small>
              <button
                type="button"
                aria-label="Next stop"
                disabled={pick.n >= chapter.stops.length}
                onClick={() => setPick(chapter.stops[pick.n])}
              >
                ›
              </button>
            </div>
            <h3>{pick.name}</h3>
            <p>{pick.done ? pick.discovery.title : pick.objective}</p>
            {pick.address && <address>{pick.address}</address>}
            {pick.pin?.approx && <p className={styles.approx}>Approximate spot: check on site.</p>}
            <button type="button" className={styles.waxButton} onClick={() => onGo(pick)}>
              <span>{goLabel(chapter, pick)}</span>
            </button>
          </div>
        ) : (
          <p className={styles.mapHint}>
            Tap a place on the map · ✓ found · ✗ still to find
            <br />
            <span>
              {chapter.solved} / {chapter.stops.length} found
            </span>
          </p>
        )}
      </div>
    </Overlay>
  );
}
