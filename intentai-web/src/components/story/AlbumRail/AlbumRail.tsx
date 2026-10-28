import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import styles from './AlbumRail.module.css';

/** One sleeve on the rail plus the info panel shown while it is in front. */
export interface RailItem {
  key: string;
  /** Cover photo (sleeve and record label). */
  image: string;
  /** Sleeve name for screen readers; the front sleeve appends its record state. */
  label: string;
  /** Card already opened: orange tick badge. */
  done: boolean;
  kicker: string;
  title: string;
  blurb: string;
  /** e.g. "Article · Video". */
  format: string;
  /** "Open card" target. */
  href: string;
}

interface AlbumRailProps {
  items: readonly RailItem[];
  initialIndex?: number;
  /** Called with the front index when "Open card" is followed. */
  onOpen?(index: number): void;
}

// Rail geometry and timing.
const C = 156; // sleeve size
const SP = 0.58 * C; // px between neighbours (90.48), and px of drag per card
const STACK = 0.5; // items beyond the neighbours are packed at half spacing
const FAN = 6; // deg of rotateZ per card offset (clamped to 2)
const TURN = 22; // deg of rotateY at one card offset
const DEPTH = 0.5;
const DIM = 0.45;
const VISIBLE = 3;
const TICK = 30; // ruler px per card
const RULER_CENTRE = 100;
const INTERVAL = 4000; // autoplay
const FRAME = 16;
const EASE = 0.13;
const DRAG_THRESHOLD = 6;
const RULER_THRESHOLD = 4;
const EDGE = 0.3; // drag resistance past the ends
const MOMENTUM = 120;
const STAGE_H = 230;
// Wide screens scale the whole stage up: 1 on a phone, up to MAX_SCALE on desktop.
const SCALE_BASE = 520;
const MAX_SCALE = 1.8;

export function stageScale(width: number): number {
  return width > 0 ? Math.min(MAX_SCALE, Math.max(1, width / SCALE_BASE)) : 1;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Transform, stacking and visibility of a sleeve at offset `o` (item index minus rail position). */
export function coverStyle(o: number, playing: boolean): { transform: string; zIndex: number; opacity: number } {
  const a = Math.abs(o);
  const sg = o < 0 ? -1 : 1;
  let x = a <= 1 ? o * SP : sg * (SP + (a - 1) * SP * (1 - STACK));
  if (playing) x += o > 0.5 ? 46 : o < -0.5 ? -26 : 0;
  const tz = -Math.min(a, 3) * DEPTH * 120;
  const sc = 1 - Math.min(a, 3) * DEPTH * 0.16;
  const fixed = (v: number, d: number) => (v === 0 ? 0 : v).toFixed(d);
  return {
    transform:
      `translateX(${fixed(x, 1)}px) translateZ(${fixed(tz, 1)}px) rotateY(${fixed(-clamp(o, -1, 1) * TURN, 2)}deg) ` +
      `rotateZ(${fixed(clamp(o, -2, 2) * FAN, 2)}deg) scale(${sc.toFixed(3)})`,
    zIndex: 50 - Math.round(a * 10),
    opacity: a > VISIBLE + 0.5 ? 0 : 1,
  };
}

export interface RulerTick {
  major: boolean;
  /** px from the ruler's left edge. */
  left: number;
  opacity: number;
}

/** 3 ticks per card; they fade out near the centre (play button) and towards the ruler ends. */
export function rulerTicks(pos: number, last: number): RulerTick[] {
  const ticks: RulerTick[] = [];
  for (let k = 0; k <= last * 3; k++) {
    const major = k % 3 === 0;
    const x = RULER_CENTRE + (k / 3 - pos) * TICK;
    const d = Math.abs(x - RULER_CENTRE);
    const op = d < 26 ? 0 : Math.max(0, 1 - Math.max(0, d - 60) / 40);
    ticks.push({ major, left: x - 0.75, opacity: op * (major ? 0.75 : 0.3) });
  }
  return ticks;
}

interface Held {
  x: number;
  p: number;
  lx: number;
  lt: number;
  v: number;
}

interface RulerHold {
  x: number;
  p: number;
  moved: boolean;
  lx: number;
}

interface Engine {
  pos: number;
  target: number;
  held: Held | null;
  ruler: RulerHold | null;
  moved: boolean;
  hover: number;
  railHover: boolean;
  playing: boolean;
  autoplay: boolean;
  lastAuto: number;
  lastIdx: number;
}

const ARIA = 'Album rail: cards for this place. Drag, use the arrows, or tap the front sleeve.';

/** Album Rail: card sleeves on a 3D rail, record slide-out, ruler scrubber and the front card's info panel. */
export function AlbumRail({ items, initialIndex = 0, onOpen }: AlbumRailProps) {
  const reduced = useReducedMotion();
  const last = items.length - 1;
  const [, render] = useReducer((c: number) => c + 1, 0);
  const [engine] = useState<Engine>(() => {
    const start = clamp(Math.round(initialIndex), 0, last);
    return {
      pos: start,
      target: start,
      held: null,
      ruler: null,
      moved: false,
      hover: -1,
      railHover: false,
      playing: false,
      autoplay: true,
      lastAuto: Date.now(),
      lastIdx: start,
    };
  });
  const [width, setWidth] = useState(0);
  const k = stageScale(width);
  const stageRef = useRef<HTMLDivElement>(null);
  const loop = useRef<number | null>(null);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const s = engine;
  const idxOf = (p: number) => clamp(Math.round(p), 0, last);

  /** Front card changed: the record goes back in. Returns true if it changed. */
  const syncIndex = () => {
    const i = idxOf(s.pos);
    if (i === s.lastIdx) return false;
    s.lastIdx = i;
    s.playing = false;
    return true;
  };

  const autoplayOn = () => s.autoplay && !reducedRef.current;

  const stopLoop = () => {
    if (loop.current !== null) window.clearInterval(loop.current);
    loop.current = null;
  };

  const step = () => {
    let changed = false;
    if (!s.held && !s.ruler) {
      const d = s.target - s.pos;
      if (reducedRef.current && d !== 0) {
        s.pos = s.target;
        changed = true;
      } else if (Math.abs(d) > 0.0008) {
        s.pos += d * EASE;
        changed = true;
      } else if (d !== 0) {
        s.pos = s.target;
        changed = true;
      }
    }
    if (syncIndex()) changed = true;
    if (autoplayOn() && !s.railHover && !s.held && !s.ruler && !s.playing && Date.now() - s.lastAuto > INTERVAL) {
      const i = idxOf(s.pos);
      s.target = i >= last ? 0 : i + 1;
      s.lastAuto = Date.now();
      changed = true;
    }
    if (changed) render();
    // Nothing left to animate or wait for: stop ticking until the next interaction.
    if (s.pos === s.target && !s.held && !s.ruler && !autoplayOn()) stopLoop();
  };
  const stepRef = useRef(step);
  stepRef.current = step;

  const kick = () => {
    if (loop.current === null) loop.current = window.setInterval(() => stepRef.current(), FRAME);
  };

  useEffect(() => {
    kick();
    return stopLoop;
    // Mount-only; the loop reads the latest step through stepRef.
  }, []);

  // Reduced motion switched on: snap to the target; switched off: autoplay may resume if still allowed.
  useEffect(() => {
    if (reduced && s.pos !== s.target && !s.held && !s.ruler) {
      s.pos = s.target;
      syncIndex();
      render();
    }
    kick();
  }, [reduced]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stopAuto = () => {
    if (!s.autoplay) return;
    s.autoplay = false;
    render(); // the info panel's live region switches on
  };

  const go = (i: number) => {
    s.target = clamp(i, 0, last);
    s.lastAuto = Date.now();
    if (reducedRef.current) {
      s.pos = s.target;
      syncIndex();
    }
    render();
    kick();
  };

  // Steps count from where the rail is heading, so fast double taps move two cards.
  const prev = () => {
    stopAuto();
    go(idxOf(s.target) - 1);
  };
  const next = () => {
    stopAuto();
    go(idxOf(s.target) + 1);
  };
  const togglePlay = () => {
    stopAuto();
    s.playing = !s.playing;
    render();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    }
  };

  // Stage drag.
  const down = (e: PointerEvent) => {
    stopAuto();
    s.moved = false;
    s.held = { x: e.clientX, p: s.pos, lx: e.clientX, lt: Date.now(), v: 0 };
    kick();
  };
  const move = (e: PointerEvent) => {
    const h = s.held;
    if (!h) return;
    const dx = e.clientX - h.x;
    if (Math.abs(dx) > DRAG_THRESHOLD) s.moved = true;
    let p = h.p - dx / (SP * k);
    if (p < 0) p *= EDGE;
    if (p > last) p = last + (p - last) * EDGE;
    s.pos = p;
    s.target = p;
    const now = Date.now();
    const dt = now - h.lt;
    if (dt > 0) h.v = (e.clientX - h.lx) / dt;
    h.lx = e.clientX;
    h.lt = now;
    syncIndex();
    render();
  };
  const up = () => {
    const h = s.held;
    if (!h) return;
    s.held = null;
    go(Math.round(s.pos - (h.v * MOMENTUM) / (SP * k)));
  };
  const railIn = () => {
    s.railHover = true;
  };
  const railOut = () => {
    s.railHover = false;
    up();
    s.lastAuto = Date.now();
  };

  // Ruler: drag to scrub, tap to jump by the tap's offset from the centre.
  const rDown = (e: PointerEvent<HTMLDivElement>) => {
    stopAuto();
    const r = e.currentTarget.getBoundingClientRect();
    s.ruler = { x: e.clientX, p: s.pos, moved: false, lx: e.clientX - r.left };
    kick();
  };
  const rMove = (e: PointerEvent) => {
    const r = s.ruler;
    if (!r) return;
    const dx = e.clientX - r.x;
    if (Math.abs(dx) > RULER_THRESHOLD) r.moved = true;
    if (r.moved) {
      s.pos = clamp(r.p - dx / TICK, -0.3, last + 0.3);
      s.target = s.pos;
      syncIndex();
      render();
    }
  };
  const rUp = () => {
    const r = s.ruler;
    if (!r) return;
    s.ruler = null;
    go(r.moved ? Math.round(s.pos) : Math.round(r.p + (r.lx - RULER_CENTRE) / TICK));
  };

  const pick = (i: number) => (e: MouseEvent) => {
    // A pointer click ending a drag is not a tap. Keyboard clicks (detail 0) always count.
    if (e.detail !== 0 && s.moved) {
      s.moved = false;
      return;
    }
    stopAuto();
    if (i === idxOf(s.pos)) togglePlay();
    else go(i);
  };

  const focus = idxOf(s.pos);
  const playing = s.playing;
  const dragging = s.held !== null || s.ruler !== null;
  const transition = dragging || reduced ? 'none' : 'transform .18s linear';
  const left = width > 0 ? `${(width / k - C) / 2}px` : undefined;
  const current = items[focus];

  return (
    <section aria-label={ARIA} className={styles.rail} onKeyDown={onKeyDown} onFocus={stopAuto}>
      <div
        ref={stageRef}
        data-rail-stage=""
        className={styles.stage}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerEnter={railIn}
        onPointerLeave={railOut}
        style={{ height: `${STAGE_H * k}px` }}
      >
        <div
          className={styles.scene}
          style={width > 0 ? { width: `${width / k}px`, transform: `scale(${k})` } : undefined}
        >
        {items.map((item, i) => {
          const o = i - s.pos;
          const a = Math.abs(o);
          const on = i === focus;
          const peek = on && s.hover === i && !playing;
          const cover = coverStyle(o, playing);
          const recX = on ? (playing ? C * 0.58 : peek ? C * 0.2 : C * 0.05) : 3;
          const sleeveX = on && playing ? -C * 0.24 : 0;
          const dim = s.hover === i ? 0 : (DIM * Math.min(a, 1.5)) / 1.5;
          const suffix = on ? (playing ? '. Record out.' : '. Tap to slide the record out.') : '';
          return (
            <div
              key={item.key}
              className={styles.item}
              style={{ left, transform: cover.transform, zIndex: cover.zIndex, opacity: cover.opacity, transition }}
            >
              <div aria-hidden="true" className={styles.record} style={{ transform: `translateX(${recX.toFixed(1)}px)` }}>
                <div className={`vinyl ${styles.disc}`} style={{ animationPlayState: on && playing ? 'running' : 'paused' }}>
                  <img src={item.image} alt="" draggable={false} className={styles.label} />
                  <span className={styles.spindle} />
                </div>
                <span className={styles.sheen} />
              </div>
              <button
                type="button"
                aria-label={item.label + suffix}
                className={styles.sleeve}
                style={{ transform: `translateX(${sleeveX.toFixed(1)}px)` }}
                onClick={pick(i)}
                onPointerEnter={() => {
                  s.hover = i;
                  render();
                }}
                onPointerLeave={() => {
                  s.hover = -1;
                  render();
                }}
              >
                <img src={item.image} alt="" draggable={false} className={styles.cover} />
                <span aria-hidden="true" className={styles.dim} style={{ opacity: Number(dim.toFixed(3)) }} />
                <span aria-hidden="true" className={styles.hairline} />
                {item.done && (
                  <span aria-hidden="true" data-done="" className={styles.done}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          );
        })}
        </div>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          aria-label="Previous card"
          className={`press ${styles.arrow} ${styles.prev}`}
          aria-disabled={focus === 0 ? 'true' : undefined}
          style={{ opacity: focus === 0 ? 0.35 : 1 }}
          onClick={prev}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div
          aria-hidden="true"
          data-rail-ruler=""
          className={styles.ruler}
          onPointerDown={rDown}
          onPointerMove={rMove}
          onPointerUp={rUp}
          onPointerLeave={rUp}
        >
          {rulerTicks(s.pos, last).map((k, i) => (
            <span
              key={i}
              className={k.major ? `${styles.tick} ${styles.major}` : styles.tick}
              style={{ left: `${k.left.toFixed(1)}px`, opacity: Number(k.opacity.toFixed(3)) }}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label={playing ? 'Stop the record' : 'Slide the record out'}
          className={`press ${styles.play}`}
          onClick={togglePlay}
        >
          {playing ? (
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          aria-label="Next card"
          className={`press ${styles.arrow} ${styles.next}`}
          aria-disabled={focus === last ? 'true' : undefined}
          style={{ opacity: focus === last ? 0.35 : 1 }}
          onClick={next}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div aria-live={autoplayOn() ? 'off' : 'polite'} className={styles.panel}>
        {current && (
          <div key={current.key} className="a-swap">
            <p className={styles.kicker}>{current.kicker}</p>
            <h2 className={styles.title}>{current.title}</h2>
            <p className={styles.blurb}>{current.blurb}</p>
            <div className={styles.row}>
              <span className={styles.format}>{current.format}</span>
              <Link to={current.href} className={`press ${styles.open}`} onClick={(e) => {
                  // Modified and non-primary clicks (new tab / window) are the browser's; the rail keeps its place.
                  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                  onOpen?.(focus);
                }}
              >
                Open card
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4B389" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
