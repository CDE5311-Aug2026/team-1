// What is written and pasted on the notebook's pages.
import type { CSSProperties, ReactNode } from 'react';
import { CardBox, Chest } from './CardBox';
import type { Chapter } from './chapters';
import { SHORT_PINS } from './chapters';
import styles from './pages.module.css';
import { SealedLetter } from './SealedLetter';
import { MapCover } from './TreasureMap';
import { inkMask } from './textures';

export function CoverArt({ owner }: { owner: string }) {
  return (
    <span className={styles.cover}>
      <span className={styles.coverRule} aria-hidden="true" />
      <svg className={styles.coverRose} viewBox="-50 -50 100 100" aria-hidden="true">
        <circle r="44" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle r="38" fill="none" stroke="currentColor" strokeWidth=".6" strokeDasharray="2 3" />
        {Array.from({ length: 16 }, (_, i) => (
          <line key={i} x1="0" y1="-38" x2="0" y2="-44" stroke="currentColor" strokeWidth={i % 4 ? 0.6 : 1.6} transform={`rotate(${i * 22.5})`} />
        ))}
        <path d="M0,-34 L7,0 L0,34 L-7,0 Z" fill="currentColor" />
        <path d="M-34,0 L0,7 L34,0 L0,-7 Z" fill="currentColor" opacity=".6" />
        <path d="M-20,-20 L3,-3 L20,20 L-3,3 Z" fill="currentColor" opacity=".35" />
        <path d="M20,-20 L3,3 L-20,20 L-3,-3 Z" fill="currentColor" opacity=".35" />
        <circle r="3.5" fill="#4f2a1b" stroke="currentColor" />
      </svg>
      <span className={styles.coverTitle}>
        <small>SINGAPORE</small>
        FIELD NOTES
        <b>A City Treasure Hunt</b>
      </span>
      <span className={styles.coverFoot}>
        <span>Nº {owner}</span>
        <span>MMXXVI</span>
      </span>
      <span className={styles.coverHint}>Tap the cover · untie the strap</span>
    </span>
  );
}

const Page = ({ children, className = '' }: { children: ReactNode; className?: string }) => <div className={`${styles.page} ${className}`}>{children}</div>;
const Running = ({ left, right }: { left: string; right: string }) => (
  <p className={styles.running}>
    <span>{left}</span>
    <span>{right}</span>
  </p>
);

export function Bookplate({ owner, rank, places, stops, onBoards }: { owner: string; rank: number; places: number; stops: number; onBoards(): void }) {
  return (
    <Page className={styles.plate}>
      <div className={styles.exLibris}>
        <span className={styles.exHead}>EX LIBRIS</span>
        <p className={styles.belongs}>This notebook belongs to</p>
        <p className={styles.ownerLine}>Explorer {owner}</p>
        <dl className={styles.ledger}>
          <div>
            <dt>Places visited</dt>
            <dd>{places}</dd>
          </div>
          <div>
            <dt>Stops solved</dt>
            <dd>{stops}</dd>
          </div>
          <div>
            <dt>Points</dt>
            <dd>{stops * 100}</dd>
          </div>
        </dl>
      </div>
      <button
        type="button"
        className={styles.rankStamp}
        onClick={onBoards}
        style={{ '--ink-mask': inkMask } as CSSProperties}
        aria-label={`Singapore rank ${rank}. Open the leaderboards`}
      >
        <small>SGP · RANK</small>
        <b>#{rank}</b>
        <small>Leaderboards ↗︎</small>
      </button>
      <p className={styles.plateNote}>
        If found, please return it to the street.
        <br />
        Every page can only be finished on a real street.
      </p>
      <p className={styles.turnHint}>
        Drag the page edge to turn <span aria-hidden="true">⟶</span>
      </p>
    </Page>
  );
}

// ---- the city chart ----
export const BOX = { lng: [103.835, 103.875], lat: [1.2735, 1.3305] };
export const CW = 300,
  CH = 430;
export const px = (lat: number, lng: number) => ({
  x: ((lng - BOX.lng[0]) / (BOX.lng[1] - BOX.lng[0])) * CW,
  y: ((BOX.lat[1] - lat) / (BOX.lat[1] - BOX.lat[0])) * CH,
});
export const line = (pts: [number, number][]) => pts.map(([la, ln], i) => `${i ? 'L' : 'M'}${px(la, ln).x.toFixed(1)},${px(la, ln).y.toFixed(1)}`).join(' ');
export const COAST: [number, number][] = [
  [1.2742, 103.836],
  [1.2762, 103.8432],
  [1.2788, 103.8487],
  [1.2826, 103.8524],
  [1.2866, 103.8541],
  [1.2893, 103.8571],
  [1.2878, 103.8604],
  [1.2842, 103.8622],
  [1.2826, 103.8655],
  [1.2884, 103.8676],
  [1.2958, 103.8664],
  [1.3012, 103.8681],
  [1.3045, 103.8722],
];
export const RIVER: [number, number][] = [
  [1.2912, 103.836],
  [1.2903, 103.8418],
  [1.2889, 103.8458],
  [1.2876, 103.8492],
  [1.2869, 103.8522],
  [1.2872, 103.8546],
];
export const KALLANG: [number, number][] = [
  [1.334, 103.8618],
  [1.322, 103.8646],
  [1.312, 103.8668],
  [1.3045, 103.8704],
];

export function CityChart({ chapters, onOpen, onShort }: { chapters: Chapter[]; onOpen(routeId: string): void; onShort(): void }) {
  const sea = `${line(COAST)} L${CW},${CH} L0,${CH} Z`;
  const gs = SHORT_PINS.press ? px(SHORT_PINS.press.lat, SHORT_PINS.press.lng) : null;
  return (
    <Page className={styles.chart}>
      <Running left="The chart" right="CHART OF THE TOWN" />
      <h2 className={styles.chartTitle}>
        The Hunt Chart
        <small>Four streets, four commissions, one prologue</small>
      </h2>
      <svg className={styles.chartSvg} viewBox={`0 0 ${CW} ${CH}`} role="group" aria-label="Chart of the hunts">
        <defs>
          <pattern id="seaHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
            <path d="M0,3.5 q1.75,-2 3.5,0 t3.5,0" fill="none" stroke="rgba(70,60,45,.28)" strokeWidth=".7" />
          </pattern>
          <filter id="chartRough">
            <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" />
            <feDisplacementMap in="SourceGraphic" scale="2.2" />
          </filter>
        </defs>
        <g stroke="rgba(90,60,30,.1)" strokeWidth=".6">
          {Array.from({ length: 16 }, (_, i) => (
            <line key={i} x1={CW - 34} y1={40} x2={CW - 34 + Math.cos((i * Math.PI) / 8) * 600} y2={40 + Math.sin((i * Math.PI) / 8) * 600} />
          ))}
        </g>
        <path d={sea} fill="url(#seaHatch)" />
        {/* a junk in the strait */}
        <g transform={`translate(${CW - 92},${CH - 44}) scale(.9)`} fill="none" stroke="rgba(60,40,20,.7)" strokeWidth="1" strokeLinejoin="round">
          <path d="M-22,6 Q0,14 24,4 L20,10 Q0,18 -18,11 Z" fill="rgba(90,60,30,.25)" />
          <path d="M-4,4 L-4,-26 M8,3 L8,-18" />
          <path d="M-4,-24 Q-16,-12 -14,2 L-4,2 Z M8,-16 Q18,-8 17,1 L8,1 Z" fill="rgba(155,44,28,.25)" />
          <path d="M-30,16 q4,-3 8,0 t8,0 M14,18 q4,-3 8,0 t8,0" strokeWidth=".7" />
        </g>
        <path d={line(COAST)} fill="none" stroke="rgba(60,40,20,.7)" strokeWidth="1.4" filter="url(#chartRough)" />
        <path d={line(RIVER)} fill="none" stroke="rgba(70,90,100,.55)" strokeWidth="2.4" strokeLinecap="round" filter="url(#chartRough)" />
        <path d={line(KALLANG)} fill="none" stroke="rgba(70,90,100,.45)" strokeWidth="2" strokeLinecap="round" filter="url(#chartRough)" />
        <text {...px(1.2774, 103.8575)} className={styles.chartSea}>
          MARINA BAY
        </text>
        <text x="16" y={CH - 18} className={styles.chartSea}>
          SINGAPORE STRAIT
        </text>
        <text {...px(1.2915, 103.8378)} className={styles.chartRiver}>
          SINGAPORE RIVER
        </text>

        {gs && (
          <g
            transform={`translate(${gs.x + 16},${gs.y - 22})`}
            className={styles.chartPin}
            role="button"
            tabIndex={0}
            aria-label="Prologue: Beneath the Golden Dome"
            onClick={onShort}
            onKeyDown={(e) => e.key === 'Enter' && onShort()}
          >
            <circle r="16" fill="transparent" />
            <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#b8862f" />
            <text x="10" y="4" className={styles.chartLabelSmall}>
              Prologue · Golden Dome
            </text>
          </g>
        )}
        {chapters.map((c) => {
          const pts = c.stops.filter((s) => s.pin).map((s) => px(s.pin!.lat, s.pin!.lng));
          const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length,
            cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
          const left = cx > CW * 0.62;
          return (
            <g
              key={c.routeId}
              className={styles.chartPin}
              role="button"
              tabIndex={0}
              aria-label={`Chapter ${c.roman}: ${c.area}, ${c.solved} of ${c.stops.length}`}
              onClick={() => onOpen(c.routeId)}
              onKeyDown={(e) => e.key === 'Enter' && onOpen(c.routeId)}
            >
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="1.6" fill={c.stops[i]?.done ? '#9b2c1c' : 'rgba(60,40,20,.55)'} />
              ))}
              <circle cx={cx} cy={cy} r="22" fill="transparent" />
              <path
                d={`M${cx - 6},${cy - 6} L${cx + 6},${cy + 6} M${cx + 6},${cy - 6} L${cx - 6},${cy + 6}`}
                stroke={c.complete ? '#9b2c1c' : '#5a3d22'}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <g transform={`translate(${left ? cx - 12 : cx + 12},${cy - 4})`}>
                <text textAnchor={left ? 'end' : 'start'} className={styles.chartLabel}>
                  {c.roman} · {placeOf(c)}
                </text>
                <text y="12" textAnchor={left ? 'end' : 'start'} className={styles.chartLabelSmall}>
                  {c.solved}/{c.stops.length} · {c.title}
                </text>
              </g>
            </g>
          );
        })}
        <g transform={`translate(${CW - 34},40)`} opacity=".8">
          <circle r="16" fill="none" stroke="rgba(60,40,20,.5)" />
          <path d="M0,-20 L4,0 L0,20 L-4,0 Z" fill="rgba(60,40,20,.7)" />
          <path d="M0,-20 L4,0 L-4,0 Z" fill="#9b2c1c" />
          <text y="-24" textAnchor="middle" className={styles.chartLabelSmall}>
            N
          </text>
        </g>
      </svg>
      <p className={styles.chartFoot}>Tap an ✕ to turn to its chapter</p>
    </Page>
  );
}

/** A chapter's place in English: 'TELOK AYER' → 'Telok Ayer'. */
export const placeOf = (ch: Chapter) => ch.en.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// ---- a route chapter: three pages ----
// Every page carries the same running head as the back pages: the volume and what the page is on the left, the place on
// the right; the top bar already names the book, so the pages do not repeat it.
export function ChapterLetterPage({ ch, onRead, onSetOut }: { ch: Chapter; onRead(): void; onSetOut(): void }) {
  return (
    <Page className={styles.letterPage}>
      <Running left={`Vol. ${ch.roman} · The case`} right={placeOf(ch)} />
      <h2 className={styles.chTitle}>{ch.title}</h2>
      <p className={styles.chKicker}>{ch.logline || `${ch.stops.length} stops`}</p>
      {/* the reader's caption under the book says "Press the seal to open the letter" (FieldNotebook's page hint) */}
      <SealedLetter
        hint={false}
        id={ch.routeId}
        initial={ch.guide.slice(0, 1)}
        to={
          <>
            To the {ch.role.replace(/\s*[(\uFF08].*?[)\uFF09]/, '').replace(/^\w/, (c) => c.toLowerCase())}
            <br />
            {ch.area}
          </>
        }
        from={`From ${ch.guide}`}
        preview={
          <span className={styles.letterPreview}>
            <span className={styles.letterSalute}>Hello,</span>
            {ch.prologue[0]?.text}
            <span className={styles.letterMore}>Read the letter ↗︎</span>
          </span>
        }
        onRead={onRead}
      />
      <div className={styles.setOutRow}>
        <span className={styles.progressInk}>
          <b>{ch.solved}</b> / {ch.stops.length} stops
        </span>
        <button type="button" className={styles.setOut} onClick={onSetOut}>
          <span>{ch.solved ? (ch.complete ? 'Walk it again' : 'Keep looking') : 'Set out'}</span>
        </button>
      </div>
    </Page>
  );
}

export function ChapterMapPage({ ch, onUnfold }: { ch: Chapter; onUnfold(): void }) {
  const next = ch.stops.find((s) => !s.done);
  return (
    <Page className={styles.mapPage}>
      <Running left={`Vol. ${ch.roman} · The map`} right={placeOf(ch)} />
      <button type="button" className={styles.mapPacket} onClick={onUnfold} aria-label={`Unfold the ${placeOf(ch)} treasure map`}>
        <MapCover chapter={ch} />
        <span className={styles.packetTwine} aria-hidden="true" />
      </button>
      <p className={styles.unfoldHint}>Tap the packet to unfold the map</p>
      {/* the full stop list lives on the record page; here, only the lead you follow next */}
      <div className={styles.lead}>
        <span className={styles.leadNo}>{next ? `Stop ${next.n} of ${ch.stops.length}` : `All ${ch.stops.length} marked`}</span>
        {next ? (
          <>
            <b className={styles.leadName}>{next.name}</b>
            <span className={styles.leadClue}>{next.title}</span>
          </>
        ) : (
          <b className={styles.leadName}>Every cross is inked in.</b>
        )}
      </div>
    </Page>
  );
}

export function ChapterCardsPage({ ch, onCards, onChest }: { ch: Chapter; onCards(): void; onChest(): void }) {
  return (
    <Page className={styles.cardsPage}>
      <Running left={`Vol. ${ch.roman} · The clues`} right={placeOf(ch)} />
      <div className={styles.boxSpot}>
        <CardBox chapter={ch} onOpen={onCards} />
      </div>
      <p className={styles.pencil}>Each stop you solve turns its card face up.</p>
      <div className={styles.chestSpot}>
        <Chest chapter={ch} onOpen={onChest} />
      </div>
    </Page>
  );
}
