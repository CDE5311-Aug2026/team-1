// O1's backdrop (owner, 31 Oct 2026: "a drifting wall, but of buildings and old photos, like a roll of film"): strips
// of film on a tilted plane, each drifting up or down at its own speed. Every frame is a Singapore building: the old
// public-domain photos from the place cards, then the same kind of buildings today, printed a little faded. Point at a
// frame (or tap it) and it lifts off the strip in full colour with its name and year; its strip stops while you look.
// It is decoration: the welcome text says what the app does, so the wall is hidden from screen readers.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import film from './film.json';
import styles from './FilmWall.module.css';

export interface FilmFrame {
  file: string;
  placeId: string;
  name: string;
  year: string;
  old: boolean;
  credit: string;
}

export const FILM_FRAMES = film as FilmFrame[];

interface Props {
  columns?: number;
  tileWidth?: number;
  tileHeight?: number;
  gap?: number;
  tilt?: number;
  turn?: number;
  roll?: number;
  speed?: number;
  className?: string;
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// golden-ratio spread so neighbouring strips never move at the same speed
const columnFactor = (i: number) => 1 + 0.45 * (((i * 0.618034 + 0.35) % 1) * 2 - 1);
const src = (file: string) => `${import.meta.env.BASE_URL}onboarding/film/${file}`;

export default function FilmWall({ columns = 6, tileWidth = 100, tileHeight = 75, gap = 20, tilt = 20, turn = -12, roll = 5, speed = 16, className }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const tracks = useRef<(HTMLDivElement | null)[]>([]);
  const offsets = useRef<number[]>([]);
  const velocities = useRef<number[]>([]);
  const heldCol = useRef(-1);
  const pointer = useRef({ x: 0, y: 0 });
  const damped = useRef({ x: 0, y: 0 });
  const [height, setHeight] = useState(480);
  const [active, setActive] = useState<string | null>(null);
  const [reduce, setReduce] = useState(reducedMotion);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // old photos and today's buildings take turns down each strip
  const strips = useMemo(() => {
    const old = FILM_FRAMES.filter((f) => f.old);
    const now = FILM_FRAMES.filter((f) => !f.old);
    const mixed: FilmFrame[] = [];
    for (let i = 0; i < Math.max(old.length, now.length) * 2; i++) {
      const f = i % 3 === 0 ? old[Math.floor(i / 3) % old.length] : now[(i - Math.ceil(i / 3)) % now.length];
      if (f && !mixed.includes(f)) mixed.push(f);
    }
    const cols: FilmFrame[][] = Array.from({ length: columns }, () => []);
    mixed.forEach((f, i) => cols[i % columns].push(f));
    return cols;
  }, [columns]);

  const unit = tileHeight + gap;
  const meta = useMemo(
    () =>
      strips.map((col) => {
        const copyHeight = Math.max(unit, col.length * unit);
        // the track slides up by up to one copy, so there must be a copy to spare below the middle
        return { copyHeight, copies: Math.ceil(2 + (height * 1.8) / copyHeight) };
      }),
    [strips, unit, height],
  );
  const base = useMemo(() => strips.map((_, c) => speed * columnFactor(c) * (c % 2 ? -1 : 1)), [strips, speed]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setHeight(e.contentRect.height || 480));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    offsets.current = meta.map((m, c) => m.copyHeight * ((c * 0.37) % 1));
    velocities.current = meta.map((_, c) => base[c] ?? 0);
  }, [meta, base]);

  useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    const frame = (ts: number) => {
      const dt = last === null ? 0 : Math.min(0.05, (ts - last) / 1000);
      last = ts;
      // the plane leans a little toward the pointer
      const k = 1 - Math.exp(-dt / 0.14);
      damped.current.x += (pointer.current.x * 5 - damped.current.x) * k;
      damped.current.y += (-pointer.current.y * 5 - damped.current.y) * k;
      if (plane.current)
        plane.current.style.transform = `translate(-50%, -50%) scale(1.22) rotateX(${tilt + damped.current.y}deg) rotateY(${turn + damped.current.x}deg) rotateZ(${roll}deg) translateZ(-110px)`;
      for (let c = 0; c < meta.length; c++) {
        const m = meta[c];
        if (!reduce) {
          const target = heldCol.current === c ? 0 : base[c];
          velocities.current[c] += (target - velocities.current[c]) * (1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.5)));
          const next = (offsets.current[c] ?? 0) + velocities.current[c] * dt;
          offsets.current[c] = ((next % m.copyHeight) + m.copyHeight) % m.copyHeight;
        }
        const el = tracks.current[c];
        if (el) el.style.transform = `translate3d(0, ${-(offsets.current[c] ?? 0)}px, 0)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [meta, base, reduce, tilt, turn, roll]);

  const pick = useCallback((target: EventTarget | null) => {
    const tile = (target as Element | null)?.closest?.<HTMLElement>('[data-frame]');
    if (!tile) return;
    heldCol.current = Number(tile.dataset.col);
    setActive(tile.dataset.frame ?? null);
  }, []);
  const release = useCallback(() => {
    heldCol.current = -1;
    setActive(null);
  }, []);

  const onMove = (e: React.PointerEvent) => {
    const r = root.current?.getBoundingClientRect();
    if (r && !reduce) pointer.current = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
    if (e.pointerType === 'mouse') pick(document.elementFromPoint(e.clientX, e.clientY));
  };

  const vars = { '--tile-w': `${tileWidth}px`, '--tile-h': `${tileHeight}px`, '--gap': `${gap}px` } as CSSProperties;

  return (
    <div
      ref={root}
      className={`${styles.wall} ${className ?? ''}`}
      style={vars}
      aria-hidden="true"
      onPointerMove={onMove}
      onPointerDown={(e) => (e.pointerType === 'mouse' ? undefined : pick(e.target))}
      onPointerUp={(e) => e.pointerType !== 'mouse' && window.setTimeout(release, 1400)}
      onPointerLeave={() => {
        pointer.current = { x: 0, y: 0 };
        release();
      }}
    >
      <div ref={plane} className={styles.plane}>
        {strips.map((col, c) => (
          <div key={c} className={styles.strip}>
            <div className={styles.track} ref={(el) => void (tracks.current[c] = el)}>
              {Array.from({ length: meta[c].copies }, (_, copy) =>
                col.map((f, i) => {
                  const id = `${c}-${copy}-${i}`;
                  const n = (c * 7 + i * 3) % 36;
                  return (
                    <div key={id} className={styles.cell} data-frame={id} data-col={c} data-active={active === id || undefined} data-old={f.old || undefined}>
                      <span className={styles.edge}>{`${n + 1}${'AB'[i % 2]} ▸`}</span>
                      <span className={styles.frame}>
                        <img src={src(f.file)} alt="" decoding="async" draggable={false} />
                        <span className={styles.tag}>
                          {f.name}
                          <b>{f.year}</b>
                        </span>
                      </span>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
