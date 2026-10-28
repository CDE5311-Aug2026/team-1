import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Segmented } from '../../components/story';
import { THIAN_HOCK_KENG } from '../../data/stories/chinatown';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './ThenNow.module.css';

type View = 'then' | 'compare' | 'now';

const VIEWS = [
  { value: 'then', label: 'c.1890' },
  { value: 'compare', label: 'Compare' },
  { value: 'now', label: '2006' },
] as const;
const VIEW_PCT: Record<View, number> = { then: 100, compare: 50, now: 0 };

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/**
 * Before/after photo slider: drag, keys or the three presets move the divider.
 * `target` is where it should be; `pct` eases towards it (snaps under reduced motion).
 * Its state is its own; the video above keeps a separate clock.
 */
export function ThenNow() {
  const { thenNow } = THIAN_HOCK_KENG;
  const reduced = useReducedMotion();
  const [target, setTarget] = useState(50);
  const [pct, setPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const pctRef = useRef(50);
  const touched = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const show = (v: number) => {
    pctRef.current = v;
    setPct(v);
  };

  // Ease the divider towards the target.
  useEffect(() => {
    if (dragging) return;
    if (reduced) {
      show(target);
      return;
    }
    const id = window.setInterval(() => {
      const d = target - pctRef.current;
      if (Math.abs(d) > 0.05) show(pctRef.current + d * 0.14);
      else {
        show(target);
        window.clearInterval(id);
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [target, dragging, reduced]);

  // Intro demo: sweep once to hint at the drag, unless the visitor got there first.
  useEffect(() => {
    if (reduced) return;
    const ids = [74, 26, 50].map((v, i) =>
      window.setTimeout(() => {
        if (!touched.current) setTarget(v);
      }, [1400, 2300, 3200][i]),
    );
    return () => ids.forEach(window.clearTimeout);
  }, [reduced]);

  const moveTo = (clientX: number) => {
    const r = boxRef.current!.getBoundingClientRect();
    const v = clamp(((clientX - r.left) / (r.width || 1)) * 100);
    show(v);
    setTarget(v);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    touched.current = true;
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is optional; dragging still works while the pointer stays inside.
    }
    moveTo(e.clientX);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) moveTo(e.clientX);
  };
  const onUp = () => setDragging(false);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 20 : 5;
    let v: number;
    if (e.key === 'ArrowLeft') v = target - step;
    else if (e.key === 'ArrowRight') v = target + step;
    else if (e.key === 'Home') v = 0;
    else if (e.key === 'End') v = 100;
    else return;
    e.preventDefault();
    touched.current = true;
    setTarget(clamp(v));
  };

  const view: View = target >= 99 ? 'then' : target <= 1 ? 'now' : 'compare';
  const rounded = Math.round(pct);
  const captionKey = pct >= 70 ? 'then' : pct <= 30 ? 'now' : 'mid';
  const caption = thenNow.captions[captionKey];

  return (
    <section aria-label="Then and now" className={`a-up ${styles.section}`} style={{ animationDelay: '.46s' }}>
      <div className={styles.head}>
        <p className={styles.kicker}>THEN AND NOW</p>
        <span className={styles.hint}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />
          </svg>
          Drag to compare
        </span>
      </div>

      <div
        ref={boxRef}
        data-testid="then-now-box"
        className={styles.box}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <img className={styles.photo} src={thenNow.now.src} alt={thenNow.now.alt} draggable={false} />
        <div className={styles.thenLayer} style={{ clipPath: `inset(0 ${(100 - pct).toFixed(2)}% 0 0)` }}>
          <img className={styles.photo} src={thenNow.then.src} alt={thenNow.then.alt} draggable={false} />
          <span aria-hidden="true" className={styles.vignette} />
        </div>
        <span data-testid="label-then" className={`${styles.label} ${styles.labelThen}`} style={{ opacity: clamp((pct - 8) / 12, 0, 1) }}>
          c.1890
        </span>
        <span data-testid="label-now" className={`${styles.label} ${styles.labelNow}`} style={{ opacity: clamp((92 - pct) / 12, 0, 1) }}>
          2006
        </span>
        <span aria-hidden="true" className={styles.divider} style={{ left: `${pct.toFixed(2)}%` }} />
        <button
          type="button"
          role="slider"
          aria-label={thenNow.sliderLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
          aria-valuetext={`${rounded}% of the 1890 photo shown`}
          className={styles.knob}
          style={{ left: `${pct.toFixed(2)}%`, transform: `scale(${dragging ? 1.12 : 1})` }}
          onKeyDown={onKey}
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </button>
      </div>

      <Segmented
        label="Show"
        options={VIEWS}
        value={view}
        className={styles.segmented}
        onChange={(v) => {
          touched.current = true;
          setTarget(VIEW_PCT[v]);
        }}
      />

      <div aria-live="polite" className={styles.caption}>
        <p key={captionKey} className={`a-cap ${styles.captionText}`}>
          <b>{caption.lead}</b>
          {caption.text}
        </p>
      </div>
    </section>
  );
}
