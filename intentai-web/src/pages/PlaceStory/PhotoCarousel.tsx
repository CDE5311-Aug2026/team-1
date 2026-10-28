import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Segmented } from '../../components/story';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './PhotoCarousel.module.css';

export interface CarouselSlide {
  /** Index into `groups`. */
  group: number;
  src: string;
  alt: string;
  title: string;
  /** Caption shown under the controls while this slide is in front. */
  desc: string;
}

interface PhotoCarouselProps {
  /** Section name, e.g. "Photos of The Spread". */
  label: string;
  /** Segmented "Jump to photos of" options; each jumps to its first slide. */
  groups: readonly string[];
  slides: readonly CarouselSlide[];
  /** Fade-up delay, s. */
  delay?: number;
}

const SLIDE_W = 228;
const STEP = 240;
const SHIFT = 20;
const FALLBACK_W = 390;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const two = (n: number) => String(n).padStart(2, '0');

interface Drag {
  x: number;
  from: number;
  k: number;
  lastX: number;
  lastT: number;
  v: number;
}

/**
 * Photo carousel with parallax, drag / keys / buttons, a "jump to photos of" control (not a filter: all
 * photos stay in one sequence), progress line, counter and caption.
 */
export function PhotoCarousel({ label, groups, slides, delay = 0.2 }: PhotoCarouselProps) {
  const reduced = useReducedMotion();
  const n = slides.length - 1;
  const [pos, setPos] = useState(0);
  const [width, setWidth] = useState(FALLBACK_W);
  const [grabbing, setGrabbing] = useState(false);
  const target = useRef(0);
  const drag = useRef<Drag | null>(null);
  const moved = useRef(false);
  const stage = useRef<HTMLDivElement>(null);

  // The slide maths read the measured width, never a fixed 390.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (el.offsetWidth > 0) setWidth(el.offsetWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ease toward the target (12 % per 16 ms frame); idle frames change nothing.
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      if (drag.current) return;
      setPos((p) => {
        const d = target.current - p;
        return Math.abs(d) > 0.0008 ? p + d * 0.12 : target.current;
      });
    }, 16);
    return () => window.clearInterval(id);
  }, [reduced]);

  const active = clamp(Math.round(pos), 0, n);

  const goTo = (i: number) => {
    target.current = clamp(i, 0, n);
    if (reduced) setPos(target.current);
  };
  const prev = () => goTo(Math.round(target.current) - 1);
  const next = () => goTo(Math.round(target.current) + 1);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rectW = el.getBoundingClientRect().width;
    moved.current = false;
    drag.current = {
      x: e.clientX,
      from: pos,
      k: rectW > 0 ? el.offsetWidth / rectW : 1,
      lastX: e.clientX,
      lastT: Date.now(),
      v: 0,
    };
    setGrabbing(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) * d.k;
    if (Math.abs(dx) > 6) moved.current = true;
    let p = d.from - (dx * 1.4) / STEP;
    if (p < 0) p *= 0.35;
    if (p > n) p = n + (p - n) * 0.35;
    target.current = p;
    const now = Date.now();
    const dt = now - d.lastT;
    if (dt > 0) d.v = ((e.clientX - d.lastX) * d.k) / dt;
    d.lastX = e.clientX;
    d.lastT = now;
    setPos(p);
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setGrabbing(false);
    goTo(Math.round(target.current - (d.v * 1.4 * 160) / STEP));
  };

  const group = slides[active].group;
  const thumbW = 100 / slides.length;
  const prog = clamp(pos / n, 0, 1);

  return (
    <section aria-label={label} className={`a-up ${styles.section}`} style={{ animationDelay: `${delay}s` }}>
      <div
        ref={stage}
        className={`${styles.stage} ${grabbing ? styles.grabbing : ''}`}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${label}. Use the left and right arrow keys to browse.`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {slides.map((s, i) => {
          const o = i - pos;
          const shift = reduced ? 0 : -clamp(o, -1, 1) * SHIFT;
          return (
            <figure
              key={s.title}
              aria-label={`Photo ${i + 1} of ${slides.length}`}
              className={styles.slide}
              style={{
                transform: `translateX(${((width - SLIDE_W) / 2 + o * STEP).toFixed(1)}px)`,
                visibility: Math.abs(o) < 2.2 ? 'visible' : 'hidden',
              }}
            >
              <img
                className={styles.photo}
                src={s.src}
                alt={s.alt}
                draggable={false}
                style={{ transform: `translateX(${shift.toFixed(1)}px)` }}
              />
              <span aria-hidden="true" className={styles.shade} />
              <figcaption className={styles.caption}>
                <span className={styles.tag}>{groups[s.group].toUpperCase()}</span>
                <span className={styles.title}>{s.title}</span>
              </figcaption>
              {i !== active && (
                <button
                  type="button"
                  className={styles.pick}
                  aria-label={`Show ${s.title}`}
                  onClick={() => {
                    if (!moved.current) goTo(i);
                  }}
                />
              )}
            </figure>
          );
        })}
      </div>

      <div className={styles.controls}>
        <Segmented
          className={styles.segmented}
          label="Jump to photos of"
          options={groups.map((g, i) => ({ value: String(i), label: g }))}
          value={String(group)}
          onChange={(v) => goTo(slides.findIndex((s) => s.group === Number(v)))}
        />
        <button
          type="button"
          className={`press ${styles.step}`}
          aria-label="Previous photo"
          aria-disabled={active === 0}
          style={{ opacity: active === 0 ? 0.4 : 1 }}
          onClick={prev}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          className={`press ${styles.step}`}
          aria-label="Next photo"
          aria-disabled={active === n}
          style={{ opacity: active === n ? 0.4 : 1 }}
          onClick={next}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className={styles.progressRow}>
        <span aria-hidden="true" className={styles.line}>
          <span
            data-testid="carousel-thumb"
            className={styles.thumb}
            style={{ left: `${(prog * (100 - thumbW)).toFixed(2)}%`, width: `${thumbW.toFixed(2)}%` }}
          />
        </span>
        <span aria-live="polite" data-testid="carousel-counter" className={styles.counter}>
          {`${two(active + 1)} / ${two(slides.length)}`}
        </span>
      </div>
      <div className={styles.desc}>
        <p key={active} className={`a-cap ${styles.descText}`}>
          {slides[active].desc}
        </p>
      </div>
    </section>
  );
}
