// The field notebook: a leather book lying on the desk. Tap it and the strap slips off and the cover swings open; then
// its pages turn like paper: swipe right to left and the page peels from its edge after your finger, its back folding
// over it and its shadow on the page beneath (paperPeel.ts); swipe the other way to bring the last one back. The
// dog-ear turns it too, and a thumb tab riffles straight to a chapter.
import { animate, type AnimationPlaybackControls } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { clearPeel, drawPeel } from '../../../components/Notebook/paperPeel';
import peel from '../../../components/Notebook/paperPeel.module.css';
import styles from './notebook.module.css';
import { fibres, grain, leather, marble, scuffs, stains } from './textures';

export interface NotebookPage {
  id: string;
  /** The thumb tab's label (pages with a tab start a chapter). */
  tab?: string;
  /** Spoken name for the page. */
  label: string;
  render(active: boolean): ReactNode;
}

const reduced = () => document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** React 18 has no `inert` prop: spread this. */
export const inert = (on: boolean) => (on ? ({ inert: '' } as Record<string, string>) : {});

export const MATERIALS = {
  '--grain': grain,
  '--stains': stains,
  '--fibres': fibres,
  '--leather': leather,
  '--scuffs': scuffs,
  '--marble': marble,
} as CSSProperties;

export function Notebook({
  pages,
  index,
  onIndex,
  open,
  onOpen,
  cover,
  tone,
  strap = true,
  held = false,
  coverLabel = 'Open the field notebook',
  fit = false,
  insert,
  play,
}: {
  pages: NotebookPage[];
  index: number;
  onIndex(next: number): void;
  open: boolean;
  onOpen(): void;
  cover: ReactNode;
  /** The binding's colour (default: brown leather). */
  tone?: string;
  /** The leather strap round a closed field notebook. */
  strap?: boolean;
  /** Held up, just taken off the shelf (not lying tilted on the desk). */
  held?: boolean;
  coverLabel?: string;
  /** Fill the reading screen (the book is all there is; nothing scrolls). */
  fit?: boolean;
  /** Something laid over the open page for a while (a film print tipped in), inside the book. */
  insert?: ReactNode;
  /** A last thumb tab that leaves the book: back out to play the story's next stop. */
  play?(): void;
}) {
  const book = useRef<HTMLDivElement>(null);
  const leaves = useRef<(HTMLElement | null)[]>([]);
  const flap = useRef<HTMLDivElement>(null);
  const flapPaper = useRef<HTMLDivElement>(null);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  // the leaf on the move (lifted above the rest while it turns)
  const [moving, setMoving] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; t: number; dir: 0 | 1 | -1; id: number; k: number } | null>(null);
  const [riffle, setRiffle] = useState<number | null>(null);

  const curlOf = (el?: HTMLElement | null) => el?.querySelector<HTMLElement>(`.${styles.curl}`) ?? null;
  const settle = () => {
    for (const el of leaves.current) clearPeel(el, curlOf(el));
    clearPeel(flap.current, flapPaper.current);
  };
  /** dir 1 peels the open page away, -1 brings the one before back; p from 0 to 1. */
  const paint = (dir: 1 | -1, p: number) => {
    const leaf = leaves.current[dir === 1 ? index : index - 1];
    const under = leaves.current[dir === 1 ? index + 1 : index];
    if (!leaf) return;
    drawPeel(
      { leaf, leafShade: curlOf(leaf), underShade: curlOf(under), flap: flap.current, flapPaper: flapPaper.current },
      dir === 1 ? p : 1 - p,
      leaf.offsetWidth,
      leaf.offsetHeight,
    );
  };
  // a new page open: the classes take over from what the turn left behind
  useLayoutEffect(() => {
    settle();
    setMoving(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  useEffect(() => () => anim.current?.stop(), []);

  /** Finish (to 1) or undo (to 0) a turn from where it is; quick for a riffle. */
  const run = (dir: 1 | -1, from: number, to: 0 | 1, quick = false) => {
    anim.current?.stop();
    if (reduced()) {
      settle();
      setMoving(null);
      if (to === 1) onIndex(index + dir);
      return;
    }
    setMoving(dir === 1 ? index : index - 1);
    anim.current = animate(from, to, {
      ...(quick ? { duration: 0.14, ease: 'easeIn' as const } : { type: 'spring' as const, stiffness: to === 1 ? 170 : 260, damping: 26, restDelta: 0.002 }),
      onUpdate: (p) => paint(dir, p),
      onComplete: () => {
        anim.current = null;
        if (to === 1) onIndex(index + dir);
        else {
          settle();
          setMoving(null);
        }
      },
    });
  };

  // riffle to a far page one leaf at a time, so you see the pages go by
  useEffect(() => {
    if (riffle == null || riffle === index) return setRiffle(null);
    if (reduced()) {
      onIndex(riffle);
      return setRiffle(null);
    }
    const t = setTimeout(() => run(riffle > index ? 1 : -1, 0, 1, true), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riffle, index, onIndex]);

  const turn = (to: number) => {
    if (anim.current) return;
    const next = Math.max(0, Math.min(pages.length - 1, to));
    if (Math.abs(next - index) > 1) setRiffle(next);
    else if (next !== index) run(next > index ? 1 : -1, 0, 1);
  };

  const width = () => book.current?.getBoundingClientRect().width ?? 360;
  function down(e: RPointerEvent) {
    if (!open || anim.current || (e.target as HTMLElement).closest('button,a,input,[data-nodrag]')) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), dir: 0, id: e.pointerId, k: 0 };
  }
  function move(e: RPointerEvent) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x,
      dy = e.clientY - s.y;
    if (!s.dir) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) return void (start.current = null); // a scroll, not a turn
      s.dir = dx < 0 ? 1 : -1;
      if ((s.dir === 1 && index >= pages.length - 1) || (s.dir === -1 && index <= 0)) return void (start.current = null);
      setMoving(s.dir === 1 ? index : index - 1);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // the pointer is already gone: the turn still follows its moves
      }
    }
    s.k = Math.min(1, Math.max(0, (s.dir === 1 ? -dx : dx) - 10) / (width() * 0.85));
    paint(s.dir, s.k);
  }
  function up(e: RPointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s || !s.dir) return;
    const fast = Math.abs(e.clientX - s.x) / Math.max(1, performance.now() - s.t) > 0.5;
    run(s.dir, s.k, s.k > 0.35 || fast ? 1 : 0);
  }

  const tabs = pages.map((p, i) => ({ ...p, i })).filter((p) => p.tab);

  return (
    <div
      className={`${styles.desk} ${open ? styles.isOpen : ''} ${held ? styles.held : ''} ${fit ? styles.fit : ''}`}
      style={{ ...MATERIALS, ...(tone ? { '--cover': tone } : {}) } as CSSProperties}
    >
      <div className={styles.book} ref={book} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className={styles.stage}>
          {/* the page block's edges (seen while closed and tilted) */}
          <span className={styles.edgeRight} aria-hidden="true" />
          <span className={styles.edgeBottom} aria-hidden="true" />
          <span className={styles.back} aria-hidden="true" />

          {pages.map((p, i) => {
            const near = Math.abs(i - index) <= 1 || moving === i;
            const z = moving === i ? 500 : i < index ? 100 + i : 300 - i;
            // leaves share a plane: nudge each back a hair so the one on top always paints on top
            const depth = moving === i ? 0.6 : i < index ? (i - index) * 0.3 : (index - i) * 0.4;
            return (
              <section
                key={p.id}
                ref={(el) => void (leaves.current[i] = el)}
                className={`${styles.leaf} ${i < index && moving !== i ? styles.turned : ''}`}
                style={{ zIndex: z, transform: `translateZ(${depth}px)` } as CSSProperties}
                aria-hidden={i !== index}
                {...inert(i !== index || !open)}
                aria-label={p.label}
              >
                <div className={styles.front}>
                  <div className={styles.paper}>{near && p.render(i === index && open)}</div>
                  <span className={styles.curl} aria-hidden="true" />
                  {i < pages.length - 1 && (
                    <button type="button" className={styles.dogEar} aria-label="Next page" onClick={() => turn(index + 1)} data-nodrag>
                      <span />
                    </button>
                  )}
                  {i > 0 && (
                    <button type="button" className={styles.backEar} aria-label="Previous page" onClick={() => turn(index - 1)} data-nodrag>
                      ‹
                    </button>
                  )}
                </div>
                <div className={styles.reverse} aria-hidden="true" />
              </section>
            );
          })}
          {/* the back of a page as it folds over, kept on the book */}
          {open && (
            <div className={`${peel.host} ${styles.flapHost}`} aria-hidden="true">
              <div ref={flap} className={peel.flap}>
                <div ref={flapPaper} className={peel.paper} />
              </div>
            </div>
          )}

          <div className={styles.cover} aria-hidden={open}>
            <button type="button" className={styles.coverFront} onClick={onOpen} aria-label={coverLabel} {...inert(open)}>
              {cover}
              {strap && <span className={styles.strap} aria-hidden="true" />}
            </button>
            <span className={styles.coverEdge} aria-hidden="true" />
            <span className={styles.coverInside} aria-hidden="true" />
          </div>
          <span className={styles.spine} aria-hidden="true" />
          {open && insert}
        </div>

        {open && (
          <nav className={styles.tabs} aria-label="Chapters">
            {tabs.map((t, n) => (
              <button
                key={t.id}
                type="button"
                className={styles.tab}
                aria-current={index >= t.i && (tabs[n + 1]?.i ?? Infinity) > index ? 'page' : undefined}
                style={{ '--n': n } as CSSProperties}
                onClick={() => turn(t.i)}
                data-nodrag
              >
                <span>{t.tab}</span>
              </button>
            ))}
            {play && (
              <button type="button" className={`${styles.tab} ${styles.playTab}`} style={{ '--n': tabs.length } as CSSProperties} onClick={play} data-nodrag>
                <span>Play</span>
              </button>
            )}
          </nav>
        )}
      </div>
      {open && (
        <p className={styles.folio} aria-live="polite">
          <span>
            {index + 1} / {pages.length}
          </span>
          {pages[index]?.label}
        </p>
      )}
    </div>
  );
}
