// One page at a time, turned like paper (owner, 2 Nov 2026): swipe right to left and the open page peels away over the
// next one; swipe left to right and the one before folds back over it (paperPeel.ts). The neighbour is drawn only while
// a page is moving. Taps still work: a swipe that turned a page does not also click what it started on. Things inside a
// page that move sideways themselves are marked data-no-flip.
import { animate, useReducedMotionConfig, type AnimationPlaybackControls } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { clearPeel, drawPeel } from './paperPeel';
import peel from './paperPeel.module.css';
import styles from './PaperPages.module.css';

interface Props {
  /** Changes when the open page changes (a new page settles flat). */
  pageKey: string;
  /** The open page. */
  children: ReactNode;
  /** The page after (1) or before (-1) the open one, or null when there is none. */
  neighbour: (dir: 1 | -1) => ReactNode | null;
  /** Open the page after (1) or before (-1). */
  onTurn: (dir: 1 | -1) => void;
  className?: string;
}

export function PaperPages({ pageKey, children, neighbour, onTurn, className = '' }: Props) {
  const reduce = useReducedMotionConfig();
  const box = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLDivElement>(null);
  const other = useRef<HTMLDivElement>(null);
  const flap = useRef<HTMLDivElement>(null);
  const flapPaper = useRef<HTMLDivElement>(null);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const gesture = useRef<{ id: number; x: number; y: number; t: number; dir: 0 | 1 | -1; edge: boolean; p: number } | null>(null);
  const swallow = useRef(false);
  // the neighbour drawn while a page moves, and whether it lies under the open page (1) or over it (-1)
  const [moving, setMoving] = useState<1 | -1 | null>(null);
  const [settled, setSettled] = useState(false);

  const shade = (el: HTMLElement | null) => el?.querySelector<HTMLElement>(`:scope > .${styles.shade}`) ?? null;
  const settle = () => {
    clearPeel(current.current, other.current, shade(current.current), shade(other.current), flap.current, flapPaper.current);
  };

  // a new page open: flat, without the page's own entry animation (it has just been turned to)
  useLayoutEffect(() => {
    settle();
    setMoving(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);
  useEffect(() => () => anim.current?.stop(), []);

  const paint = (dir: 1 | -1, p: number) => {
    const leaf = dir === 1 ? current.current : other.current;
    const under = dir === 1 ? other.current : current.current;
    if (!leaf) return;
    const w = box.current?.clientWidth ?? leaf.offsetWidth;
    const h = box.current?.clientHeight ?? leaf.offsetHeight;
    drawPeel({ leaf, leafShade: shade(leaf), underShade: shade(under), flap: flap.current, flapPaper: flapPaper.current }, dir === 1 ? p : 1 - p, w, h);
  };

  const run = (dir: 1 | -1, from: number, to: 0 | 1) => {
    anim.current?.stop();
    if (reduce) {
      settle();
      setMoving(null);
      if (to === 1) onTurn(dir);
      return;
    }
    anim.current = animate(from, to, {
      type: 'spring',
      stiffness: to === 1 ? 170 : 260,
      damping: 26,
      restDelta: 0.002,
      onUpdate: (p) => paint(dir, p),
      onComplete: () => {
        anim.current = null;
        if (to === 1) {
          setSettled(true);
          onTurn(dir);
        } else {
          settle();
          setMoving(null);
        }
      },
    });
  };

  // the turned-to page lies flat at once (its own entry animation is for pages opened another way)
  useEffect(() => {
    if (!settled) return;
    const t = window.setTimeout(() => setSettled(false), 600);
    return () => window.clearTimeout(t);
  }, [settled]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (anim.current || e.button !== 0) return;
    if ((e.target as Element).closest('[data-no-flip], input, textarea, select, video, [role="slider"]')) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dir: 0, edge: false, p: 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.dir) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (gesture.current = null); // a scroll
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      g.dir = dx < 0 ? 1 : -1;
      g.edge = neighbour(g.dir) == null;
      if (!g.edge) setMoving(g.dir);
      try {
        box.current?.setPointerCapture(e.pointerId);
      } catch {
        // the pointer is already gone: the turn still follows its moves
      }
    }
    const w = box.current?.clientWidth || 320;
    const raw = Math.min(1, Math.max(0, (g.dir === 1 ? -dx : dx) - 10) / (w * 0.85));
    g.p = g.edge ? raw * 0.12 : raw;
    g.t = e.timeStamp;
    if (g.edge) {
      if (g.dir === 1 && current.current) paint(1, g.p);
    } else if (other.current || g.dir === 1) paint(g.dir, g.p);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.id !== e.pointerId || !g.dir) return;
    swallow.current = true;
    window.setTimeout(() => (swallow.current = false), 50);
    if (g.edge) return settle();
    const fast = Math.abs(e.clientX - g.x) / Math.max(1, e.timeStamp - g.t + 1) > 0.5;
    run(g.dir, g.p, g.p > 0.33 || fast ? 1 : 0);
  };

  // the neighbour, drawn as soon as a page starts to move (under the open page, or over it coming back)
  const shown = moving ? neighbour(moving) : null;
  useLayoutEffect(() => {
    // the page coming back starts folded right away, so it never flashes flat over the open one
    if (moving === -1 && other.current) paint(-1, gesture.current?.p ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving]);

  return (
    <div
      ref={box}
      className={`${styles.pages} ${className}`}
      data-settled={settled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (swallow.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {shown != null && (
        <div ref={other} className={styles.page} style={{ zIndex: moving === 1 ? 0 : 2 }} aria-hidden="true" {...{ inert: '' }}>
          {shown}
          <span className={styles.shade} aria-hidden="true" />
        </div>
      )}
      <div ref={current} className={styles.page} style={{ zIndex: 1 }}>
        {children}
        <span className={styles.shade} aria-hidden="true" />
      </div>
      <div className={`${peel.host} ${styles.flapHost}`} aria-hidden="true">
        <div ref={flap} className={peel.flap}>
          <div ref={flapPaper} className={peel.paper} />
        </div>
      </div>
    </div>
  );
}
