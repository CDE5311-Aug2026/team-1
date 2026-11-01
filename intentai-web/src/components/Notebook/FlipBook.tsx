// Pages you turn (owner, 31 Oct 2026: "slide it like turning pages"). The pages lie in a stack; swipe left and the top
// one lifts at its right edge and swings over the spine on the left, in 3D, showing the next; swipe right and the last
// one comes back. The page follows your finger, then finishes the turn (or falls back) on a spring. A page scrolls up and
// down as usual; only a sideways swipe turns it. The arrows, the dots, the turned-up corner and the arrow keys turn it
// too. Things inside a page that move sideways themselves (a slider, a note) are marked data-no-flip. A page's top-level
// element marked data-fill stretches to the sheet's height.
import { animate, useReducedMotionConfig, type AnimationPlaybackControls } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from './FlipBook.module.css';

export interface BookPage {
  key: string;
  label: string;
  node: ReactNode;
}

/** Turning the pages from outside the book (Home's ↵ key). */
export interface BookControls {
  turn(dir: 1 | -1): void;
}

interface Props {
  pages: BookPage[];
  /** Filled with the book's controls while it is mounted. */
  controls?: React.MutableRefObject<BookControls | null>;
  /** A new value starts again at the first page (a different place). */
  resetKey: string;
  /** Number the pages after the first as notebook entries ("No. 01 · Key numbers"). */
  numbered?: boolean;
  /** Where the book is, continuously while a page turns: 0 on the first page, 0.5 halfway to the second, 1 on it, … */
  onTurn?: (position: number) => void;
  /** Shown at the start of the strip under the pages, on every page (the way out, always in the same place). */
  navStart?: ReactNode;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export function FlipBook({ pages, resetKey, numbered = true, onTurn, navStart, controls }: Props) {
  const reduce = useReducedMotionConfig();
  const [index, setIndex] = useState(0);
  const leaves = useRef<(HTMLElement | null)[]>([]);
  const book = useRef<HTMLDivElement>(null);
  const turning = useRef<AnimationPlaybackControls | null>(null);
  const gesture = useRef<{ id: number; x: number; y: number; t: number; mode: 'wait' | 'flip'; dir: 1 | -1; edge: boolean; p: number; v: number } | null>(null);
  const swallowClick = useRef(false);
  const last = pages.length - 1;
  const at = Math.min(index, last);
  const onTurnRef = useRef(onTurn);
  onTurnRef.current = onTurn;

  useEffect(() => {
    turning.current?.stop();
    setIndex(0);
  }, [resetKey]);

  // after a turn the classes take over from the inline styles the turn left behind
  useLayoutEffect(() => {
    for (const el of leaves.current) {
      if (!el) continue;
      el.style.removeProperty('transform');
      el.style.removeProperty('--lift');
      el.style.removeProperty('--under');
    }
    onTurnRef.current?.(at);
  }, [at, resetKey]);

  /** Draw a turn in progress: dir 1 lifts the top page away, -1 brings the one before back; p from 0 to 1. */
  const paint = (dir: 1 | -1, p: number) => {
    const leaf = leaves.current[dir === 1 ? at : at - 1];
    const under = leaves.current[dir === 1 ? at + 1 : at];
    const turned = dir === 1 ? p : 1 - p; // how far the moving page is over
    if (leaf) {
      leaf.style.transform = `rotateY(${-178 * turned}deg)`;
      leaf.style.setProperty('--lift', String(Math.sin(turned * Math.PI)));
    }
    under?.style.setProperty('--under', String(1 - turned));
    onTurnRef.current?.(dir === 1 ? at + p : at - p);
  };

  const finish = (dir: 1 | -1, from: number, to: 0 | 1) => {
    turning.current?.stop();
    if (reduce) {
      if (to === 1) setIndex(at + dir);
      return;
    }
    turning.current = animate(from, to, {
      type: 'spring',
      stiffness: to === 1 ? 170 : 260,
      damping: 26,
      restDelta: 0.002,
      onUpdate: (p) => paint(dir, p),
      onComplete: () => {
        turning.current = null;
        if (to === 1) setIndex(at + dir);
        else onTurnRef.current?.(at);
        if (to === 0)
          for (const el of leaves.current)
            if (el) {
              el.style.removeProperty('transform');
              el.style.removeProperty('--lift');
              el.style.removeProperty('--under');
            }
      },
    });
  };

  const turn = (dir: 1 | -1) => {
    if (turning.current) return;
    if ((dir === 1 && at >= last) || (dir === -1 && at <= 0)) return;
    finish(dir, 0, 1);
  };

  const turnRef = useRef(turn);
  turnRef.current = turn;
  useEffect(() => {
    if (!controls) return;
    controls.current = { turn: (dir) => turnRef.current(dir) };
    return () => {
      controls.current = null;
    };
  }, [controls]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (turning.current || e.button !== 0) return;
    if ((e.target as Element).closest('[data-no-flip], input, textarea, select, video, [role="slider"]')) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, mode: 'wait', dir: 1, edge: false, p: 0, v: 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.mode === 'wait') {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (gesture.current = null); // a scroll
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      g.mode = 'flip';
      g.dir = dx < 0 ? 1 : -1;
      g.edge = (g.dir === 1 && at >= last) || (g.dir === -1 && at <= 0);
      book.current?.setPointerCapture(e.pointerId);
    }
    const width = book.current?.clientWidth || 320;
    const raw = clamp(((g.dir === 1 ? -dx : dx) - 10) / (width * 0.8));
    const p = g.edge ? raw * 0.1 : raw;
    const dt = Math.max(1, e.timeStamp - g.t);
    g.v = 0.7 * g.v + 0.3 * ((p - g.p) / dt) * 1000; // turn per second
    g.p = p;
    g.t = e.timeStamp;
    if (g.edge) {
      // nothing more that way: the page only lifts a little and falls back
      const leaf = leaves.current[at];
      if (leaf) leaf.style.transform = `rotateY(${(g.dir === 1 ? -1 : 1) * 40 * p}deg)`;
    } else paint(g.dir, p);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.id !== e.pointerId || g.mode !== 'flip') return;
    swallowClick.current = true;
    window.setTimeout(() => (swallowClick.current = false), 50);
    if (g.edge) {
      const leaf = leaves.current[at];
      if (leaf) leaf.style.removeProperty('transform');
      return;
    }
    const go = g.p > 0.33 || g.v > 1.6;
    finish(g.dir, g.p, go ? 1 : 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as Element).closest('input, textarea, [role="slider"], [data-no-flip]')) return;
    if (e.key === 'ArrowRight') turn(1);
    else if (e.key === 'ArrowLeft') turn(-1);
    else return;
    e.preventDefault();
  };

  return (
    <div className={styles.wrap}>
      <div
        ref={book}
        className={styles.book}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (swallowClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onKeyDown={onKeyDown}
      >
        {pages.map((page, i) => {
          const state = i < at ? 'past' : i === at ? 'current' : 'next';
          return (
            <section
              key={`${resetKey}:${page.key}`}
              ref={(el) => void (leaves.current[i] = el)}
              className={styles.leaf}
              data-state={state}
              aria-label={page.label}
              aria-hidden={state !== 'current' || undefined}
              // pages not open are out of reach of tab and screen readers
              {...{ inert: state !== 'current' ? '' : undefined }}
              style={{ zIndex: i < at ? 100 + i : 50 - (i - at) }}
            >
              <div className={styles.sheet}>
                {numbered && i > 0 && (
                  <p className={styles.entryNo} aria-hidden="true">
                    <span>{`No. ${String(i).padStart(2, '0')} · `}</span>
                    {page.label}
                  </p>
                )}
                {/* (no folio at the foot: the page's number is in the strip under the pages, and the room is the page's) */}
                <div className={styles.body}>{page.node}</div>
              </div>
              {i < last && (
                // the corner turned up: a tap turns the page
                <button type="button" className={styles.corner} tabIndex={-1} aria-hidden="true" onClick={() => turn(1)} />
              )}
              <span className={styles.shade} aria-hidden="true" />
            </section>
          );
        })}
      </div>

      <nav className={styles.nav} aria-label="Pages">
        {navStart}
        <p className={styles.where} aria-live="polite">
          <span className={styles.count}>{`${at + 1}/${pages.length}`}</span>
          <span className={styles.label}>{pages[at]?.label}</span>
        </p>
        <span className={styles.dots} aria-hidden="true">
          {pages.map((p, i) => (
            <i key={p.key} data-on={i === at || undefined} />
          ))}
        </span>
        {/* turning the page: both arrows together, apart from the way out */}
        <span className={styles.turns}>
          <button type="button" className={styles.arrow} aria-label="Previous page" disabled={at <= 0} onClick={() => turn(-1)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className={styles.arrow} aria-label="Next page" disabled={at >= last} onClick={() => turn(1)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </span>
      </nav>
    </div>
  );
}
