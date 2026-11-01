// Hunt's first sight: the chart of the town above a shelf of five cloth-bound field archives, one per story. Swipe along
// the shelf (or tap a book, or a cross on the chart) and the chart swings over to that book's streets and inks its
// route. Tap the book again and it comes off the shelf and opens into that story's notebook.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ROUTES } from '../../../findsg';
import type { Chapter } from './chapters';
import { MATERIALS } from './Notebook';
import { RouteChart } from './RouteChart';
import { ShelfScene } from './shelf3d/ShelfScene';
import styles from './shelf.module.css';

export type BookId = 'short' | 'telok-ayer' | 'kampong-gelam' | 'balestier' | 'civic-f1';

export interface BookDef {
  id: BookId;
  roman: string;
  title: string;
  /** The small-caps line under the title. */
  en: string;
  /** The cloth colour. */
  tone: string;
  /** Where the story is set (the shelf and the map label). */
  place: string;
  quote: string;
  art: ReactNode;
}

const route = (id: Exclude<BookId, 'short'>) => ROUTES[id];
/** 'CIVIC DISTRICT' → 'Civic District'. */
const placeOf = (id: Exclude<BookId, 'short'>) =>
  route(id)
    .en.toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const BOOKS: BookDef[] = [
  {
    id: 'short',
    roman: 'I',
    title: 'Beneath the Golden Dome',
    en: 'THE GLASS BENEATH THE GOLD',
    tone: '#2f4a39',
    place: 'Kampong Gelam',
    quote: 'An ordinary thing, worth a city remembering.',
    art: <DomeArt />,
  },
  {
    id: 'telok-ayer',
    roman: 'II',
    title: route('telok-ayer').title,
    place: placeOf('telok-ayer'),
    en: 'FROM THE OLD COASTLINE',
    tone: '#6a3624',
    quote: route('telok-ayer').quote,
    art: <ShipArt />,
  },
  {
    id: 'kampong-gelam',
    roman: 'III',
    title: route('kampong-gelam').title,
    place: placeOf('kampong-gelam'),
    en: 'A NEIGHBOURHOOD PAPER, 1938',
    tone: '#2d4767',
    quote: route('kampong-gelam').quote,
    art: <PressArt />,
  },
  {
    id: 'balestier',
    roman: 'IV',
    title: route('balestier').title,
    place: placeOf('balestier'),
    en: 'THE UNWRITTEN CREDITS',
    tone: '#4a3a1f',
    quote: route('balestier').quote,
    art: <ReelArt />,
  },
  {
    id: 'civic-f1',
    roman: 'V',
    title: route('civic-f1').title,
    place: placeOf('civic-f1'),
    en: 'THE CITY BETWEEN THE SECONDS',
    tone: '#223d58',
    quote: route('civic-f1').quote,
    art: <ClockArt />,
  },
];
export const bookOf = (id: string | null) => BOOKS.find((b) => b.id === id) ?? null;

/** A book's front board: gold-blocked frame, title and line drawing. Sized by its container, so the same board works on
 *  the shelf and as the open notebook's cover. */
export function BookCover({ book }: { book: BookDef }) {
  return (
    <span className={styles.board}>
      <span className={styles.frame} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className={styles.series}>FIND SG · FIELD ARCHIVE</span>
      <span className={styles.title}>{book.title}</span>
      <span className={styles.en}>{book.en}</span>
      <span className={styles.art} aria-hidden="true">
        {book.art}
      </span>
      <span className={styles.flourish} aria-hidden="true">
        ~◆~
      </span>
      <span className={styles.roman}>{book.roman}</span>
    </span>
  );
}

export interface ShelfProgress {
  done: number;
  total: number;
}

export function Bookshelf({
  chapters,
  short,
  progress,
  selected,
  onSelect,
  onOpen,
}: {
  chapters: Chapter[];
  short: { book: boolean; bottle: boolean };
  progress: Record<BookId, ShelfProgress>;
  selected: BookId;
  onSelect(id: BookId): void;
  /** Take the book off the shelf: its spot on screen, for the book to fly from. */
  onOpen(id: BookId, from: DOMRect): void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pulling, setPulling] = useState<BookId | null>(null);
  // the real 3D shelf, unless this device cannot draw it (then the flat shelf below is shown instead)
  const [flat, setFlat] = useState(() => typeof window === 'undefined' || !('WebGLRenderingContext' in window));
  const settle = useRef<number>(0);

  // start with the selected book in the middle of the shelf
  useEffect(() => {
    const el = refs.current[selected];
    const r = row.current;
    if (el && r) r.scrollLeft = el.offsetLeft + el.offsetWidth / 2 - r.clientWidth / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the book nearest the middle is the one you are looking at
  function onScroll() {
    cancelAnimationFrame(settle.current);
    settle.current = requestAnimationFrame(() => {
      const r = row.current;
      if (!r) return;
      const mid = r.scrollLeft + r.clientWidth / 2;
      let best: BookId = selected,
        d = Infinity;
      for (const b of BOOKS) {
        const el = refs.current[b.id];
        if (!el) continue;
        const dd = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
        if (dd < d) ((d = dd), (best = b.id));
      }
      if (best !== selected) onSelect(best);
    });
  }

  function pick(id: BookId) {
    onSelect(id);
    refs.current[id]?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  function tap(id: BookId) {
    const el = refs.current[id];
    if (id !== selected) return pick(id);
    if (!el || pulling) return;
    setPulling(id);
    const rect = el.querySelector(`.${styles.front}`)?.getBoundingClientRect() ?? el.getBoundingClientRect();
    setTimeout(() => onOpen(id, rect), 380);
  }

  const book = bookOf(selected)!;
  const p = progress[selected];

  return (
    <section className={styles.library} style={MATERIALS} aria-label="The story shelf">
      <RouteChart books={BOOKS} chapters={chapters} short={short} selected={selected} onPick={pick} />
      {!flat && (
        <ShelfScene
          books={BOOKS}
          progress={progress}
          selected={selected}
          onSelect={onSelect}
          onOpen={(id, rect) => {
            setPulling(id);
            onOpen(id, rect);
          }}
          onFail={() => setFlat(true)}
        />
      )}
      {/* the flat shelf: drawn when there is no 3D, and otherwise kept for keyboards and screen readers */}
      <div className={`${styles.shelf} ${flat ? '' : styles.offscreen}`}>
        <div className={styles.row} ref={row} onScroll={onScroll} role="listbox" aria-label="Story books" aria-orientation="horizontal">
          {BOOKS.map((b) => {
            const pr = progress[b.id];
            return (
              <button
                key={b.id}
                ref={(el) => void (refs.current[b.id] = el)}
                type="button"
                role="option"
                aria-selected={b.id === selected}
                className={`${styles.book} ${b.id === selected ? styles.chosen : ''} ${pulling === b.id ? styles.pulling : ''}`}
                style={{ '--tone': b.tone } as CSSProperties}
                onClick={() => tap(b.id)}
                aria-label={`${b.roman}. ${b.title}${pr.done ? `, ${pr.done} of ${pr.total} found` : ''}${b.id === selected ? '. Tap again to open' : ''}`}
              >
                <span className={styles.body}>
                  <span className={styles.front}>
                    <BookCover book={b} />
                  </span>
                  <span className={styles.pages} aria-hidden="true" />
                  <span className={styles.spine} aria-hidden="true" />
                  <span className={styles.top} aria-hidden="true" />
                  <span className={styles.ribbon} aria-hidden="true" />
                </span>
                <span className={styles.tag} aria-hidden="true">
                  {pr.done}/{pr.total}
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.plank} aria-hidden="true">
          <span className={styles.plate}>FIND SG · STORIES OF A CITY</span>
        </div>
      </div>

      {/* a few lines about the book in the middle; tapping the book opens it */}
      <div className={styles.intro} key={book.id}>
        <h2>{book.title}</h2>
        <p className={styles.quote}>{book.quote}</p>
        <p className={styles.meta}>
          <span className={p.total > 0 && p.done >= p.total ? styles.doneTag : styles.openTag}>
            {p.total > 0 && p.done >= p.total ? 'Finished' : `${p.done} of ${p.total} found`}
          </span>
        </p>
      </div>
    </section>
  );
}

/* ---- gold-blocked line drawings (viewBox 120 × 100) ---- */
const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 120 100" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

function DomeArt() {
  return (
    <Svg>
      <path d="M44 50 Q44 27 60 22 Q76 27 76 50" />
      <path d="M48 50 Q50 33 60 28" opacity=".5" />
      <path d="M60 22 V14" />
      <path d="M62.5 9.5 a3 3 0 1 0 0 4.5 a2.3 2.3 0 1 1 0 -4.5" />
      <rect x="42" y="50" width="36" height="7" />
      <rect x="32" y="57" width="56" height="27" />
      {[38, 47, 56, 65, 74].map((x) => (
        <path key={x} d={`M${x} 84 V70 a4 4 0 0 1 8 0 V84`} />
      ))}
      <path d="M20 84 V46 l3 -6 l3 6 V84 M23 40 V35" />
      <path d="M94 84 V46 l3 -6 l3 6 V84 M97 40 V35" />
      <path d="M12 84 H108" />
      <path d="M30 95 Q45 88 60 94 Q75 88 90 95" />
      <path d="M30 95 V91 Q45 84 60 90 Q75 84 90 91 V95 M60 90 V94" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${35 + i * 6} ${91 - i * 0.6} Q${42 + i * 4} ${88 - i} ${55} ${90 - i * 0.4}`} opacity=".55" />
      ))}
      <circle cx="101" cy="92" r="5" />
      <circle cx="101" cy="92" r="2.6" opacity=".6" />
    </Svg>
  );
}

function ShipArt() {
  return (
    <Svg>
      {[8, 20, 32].map((x) => (
        <g key={x}>
          <path d={`M${x} 64 V44 l5 -5 l5 5 V64`} />
          <path d={`M${x + 3} 64 V55 a2 2 0 0 1 4 0 V64`} />
          <rect x={x + 3} y="45" width="4" height="4" opacity=".7" />
        </g>
      ))}
      <circle cx="26" cy="20" r="9" />
      <path d="M26 9 V31 M15 20 H37 M26 13 l2 7 l-2 7 l-2 -7 Z" />
      <path d="M48 66 H102 L95 76 H55 Z" />
      <path d="M74 66 V18" />
      <path d="M74 21 Q95 28 98 62 H74" />
      {[30, 38, 46, 54].map((y) => (
        <path key={y} d={`M74 ${y} L${86 + (y - 30) * 0.45} ${y - 2}`} opacity=".7" />
      ))}
      <path d="M72 30 Q58 40 56 62 H72" />
      <path d="M44 81 q4 -2 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" opacity=".6" />
      <g transform="rotate(-6 60 90)">
        <rect x="30" y="82" width="60" height="16" />
        <path d="M30 82 L60 93 L90 82" />
        <rect x="80" y="84" width="7" height="6" opacity=".7" />
      </g>
    </Svg>
  );
}

function PressArt() {
  return (
    <Svg>
      <g opacity=".45">
        {[6, 30, 54, 78, 102].map((x) => (
          <path key={x} d={`M${x - 4} 38 V24 a8 8 0 0 1 16 0 V38`} />
        ))}
        <path d="M0 38 H120 M0 14 H120" />
      </g>
      <path d="M36 42 H68 V84 H36 Z" />
      <path d="M40 42 V30 H64 V42" />
      <path d="M52 30 V20 M42 20 H62" />
      <path d="M40 54 H64 V60 H40 Z" />
      <path d="M32 84 H72 M38 70 H66" />
      <circle cx="88" cy="68" r="13" />
      <circle cx="88" cy="68" r="3" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <path key={a} d={`M88 68 L${88 + 13 * Math.cos((a * Math.PI) / 180)} ${68 + 13 * Math.sin((a * Math.PI) / 180)}`} opacity=".8" />
      ))}
      <g transform="rotate(-8 22 84)">
        <rect x="10" y="76" width="22" height="16" />
        <path d="M13 80 H29 M13 84 H29 M13 88 H24" opacity=".6" />
      </g>
      <g transform="rotate(6 100 90)">
        <rect x="90" y="84" width="22" height="12" />
        <path d="M93 88 H109 M93 92 H104" opacity=".6" />
      </g>
    </Svg>
  );
}

function ReelArt() {
  return (
    <Svg>
      <circle cx="64" cy="32" r="18" />
      <circle cx="64" cy="32" r="3" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={64 + 10 * Math.cos(((a - 90) * Math.PI) / 180)} cy={32 + 10 * Math.sin(((a - 90) * Math.PI) / 180)} r="4" />
      ))}
      <path d="M46 34 C24 28 14 52 30 56 C40 58 42 48 34 46" />
      <path d="M44 38 C26 34 20 50 30 52" opacity=".5" />
      <path d="M22 60 H104 V86 H22 Z" />
      <path d="M38 52 H88 V60 H38 Z" />
      <path d="M44 56 H82" opacity=".6" />
      {[30, 46, 80, 96].map((x) => (
        <path key={x} d={`M${x} 60 V86`} opacity=".7" />
      ))}
      <path d="M54 86 V70 H72 V86" />
      <path d="M60 70 V86 M66 70 V86" opacity=".5" />
      <path d="M12 86 H112" />
      <g transform="rotate(-10 24 92)">
        <rect x="14" y="88" width="20" height="9" />
        <path d="M14 88 L18 83 H36 L34 88" />
      </g>
    </Svg>
  );
}

function ClockArt() {
  return (
    <Svg>
      <circle cx="50" cy="36" r="22" />
      <circle cx="50" cy="36" r="19" opacity=".5" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <path key={i} d={`M${50 + 16 * Math.sin(a)} ${36 - 16 * Math.cos(a)} L${50 + 19 * Math.sin(a)} ${36 - 19 * Math.cos(a)}`} />;
      })}
      <path d="M50 36 V24 M50 36 L58 41" strokeWidth="1.5" />
      <path d="M96 60 V40 M88 40 Q96 46 104 40 M90 40 H102" />
      <path d="M96 36 V30 M92 30 H100" />
      <path d="M93 34 Q88 38 89 44 M99 34 Q104 38 103 44" opacity=".6" />
      <path d="M84 60 Q96 66 108 60" />
      <path d="M6 66 H114 M6 70 H114" />
      {[8, 26, 44, 62, 80, 98].map((x) => (
        <path key={x} d={`M${x} 90 V80 a7 7 0 0 1 14 0 V90`} />
      ))}
      <path d="M6 90 H114" />
      {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110].map((x) => (
        <path key={x} d={`M${x} 66 V62`} opacity=".6" />
      ))}
    </Svg>
  );
}
