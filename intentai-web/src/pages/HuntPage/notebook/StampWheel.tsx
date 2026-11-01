// The stamp wheel: a printed paper volvelle under the display case. A navy card, gold-foiled, is riveted over a cream
// disk printed with one sector per story; a wedge cut in the card shows the sector turned under it: the volume's
// header, how far the story has got, and one pill per stop (sage where you were stamped on site, butter where you
// solved it from afar, an empty outline where nothing is done yet). Turn it by dragging round the rivet, with the brass
// tabs, or the arrow keys; when a story settles under the window the shelf picks that book.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { BookId } from './Bookshelf';
import { clock, took, type StopRow, type StoryRecord } from './record';
import s from './stampWheel.module.css';

// ---- the drawing: a 400-unit square, the rivet at its centre ----
const C = 200;
const R_UNDER = 198; // the cream disk; its rim shows round the card
const R_CARD = 190; // the navy card on top
const W_IN = 30; // the window: an annular wedge about 12 o'clock
const W_OUT = 173;
const W_HALF = 36; // degrees either side of 12 o'clock
const NAVY = '#17203d';
const rad = (d: number) => (d * Math.PI) / 180;
const n2 = (v: number) => Math.round(v * 100) / 100;
/** A point `r` from the centre, `deg` clockwise from 12 o'clock. */
const at = (r: number, deg: number) => [n2(C + r * Math.sin(rad(deg))), n2(C - r * Math.cos(rad(deg)))] as const;
const circle = (r: number) => `M${C - r} ${C}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
/** An annular sector from r1 to r2, between two bearings. */
function band(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = at(r2, a1),
    [x2, y2] = at(r2, a2),
    [x3, y3] = at(r1, a2),
    [x4, y4] = at(r1, a1);
  return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
}
/** The window's outline, grown outwards by `d` (its straight edges stay parallel to the cut). */
function windowPath(d = 0) {
  const a = rad(W_HALF);
  const pt = (side: 1 | -1, R: number) => {
    const t = Math.sqrt(R * R - d * d);
    return [n2(C + t * side * Math.sin(a) + d * side * Math.cos(a)), n2(C - t * Math.cos(a) + d * Math.sin(a))];
  };
  const ro = W_OUT + d,
    ri = Math.max(4, W_IN - d);
  const [lox, loy] = pt(-1, ro),
    [rox, roy] = pt(1, ro),
    [rix, riy] = pt(1, ri),
    [lix, liy] = pt(-1, ri);
  return `M${lix} ${liy}L${lox} ${loy}A${ro} ${ro} 0 0 1 ${rox} ${roy}L${rix} ${riy}A${ri} ${ri} 0 0 0 ${lix} ${liy}Z`;
}
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
/** A crescent of radius r opening to the right, centred on 0,0. */
const crescent = (r: number) => `M0 ${-r}A${r} ${r} 0 1 0 0 ${r}A${r * 1.25} ${r * 1.25} 0 0 1 0 ${-r}Z`;

// ---- the pills: short printed labels, and which stops share a row so the long ones get the wide rows ----
const PILL_FONT = 9.2;
const CHAR = 0.5; // Oswald's average advance, in ems (an estimate is enough to choose a layout)
const TOP0 = 56;
const R_TEXT = 153; // the header band's rules: the pills stay inside this
const tan = Math.tan(rad(W_HALF));

/** The labels as a printer would set them in a narrow window; any stop not listed is shortened by rule. */
const LABELS: Record<string, string> = {
  'Fuk Tak Chi Museum': 'Fuk Tak Chi',
  'Nagore Dargah Indian Muslim Heritage Centre': 'Nagore Dargah',
  'Former Keng Teck Whay Building / Singapore Yu Huang Gong': 'Keng Teck Whay',
  'Thian Hock Keng Temple': 'Thian Hock Keng',
  'Telok Ayer Chinese Methodist Church': 'Methodist Church',
  'Bussorah Street · Former Kampong Kaji stretch': 'Bussorah Street',
  'Gedung Kuning · The Yellow Mansion': 'Gedung Kuning',
  "Aliwal Arts Centre · Former Chong Cheng School and Chong Pun Girls' School": 'Aliwal Arts Centre',
  'The Sultan · Former Al-Ahmadiah and HARMY Press': 'The Sultan',
  'Madrasah Alsagoff Al-Arabiah': 'Madrasah Alsagoff',
  'Istana Kampong Gelam · Malay Heritage Centre': 'Istana Kg Gelam',
  'Goh Chor Tua Pek Kong Temple and Old Opera Stage': 'Tua Pek Kong',
  'Sim Kwong Ho Shophouses': 'Sim Kwong Ho',
  'Lam Yeo Coffee Powder Factory': 'Lam Yeo Coffee',
  'Kwan Yow Luen Shophouses': 'Kwan Yow Luen',
  'Boon Teck Road Water Kiosk': 'Water Kiosk',
  'Burmese Buddhist Temple': 'Burmese Temple',
  'Former Malay Film Productions Studio': 'Malay Film Studio',
  'The family side of the Old Hill Street Police Station': 'Hill Street Police',
  'The Siamese bronze elephant at Old Parliament House': 'Bronze Elephant',
  'The surveying benchmark story at Cavenagh Bridge': 'Cavenagh Bridge',
  'The Victoria clock tower and an old name that never disappeared': 'Victoria Tower',
  'Waterfront public promenade · Clues of water and a donor': 'Waterfront',
  'Tan Kim Seng Fountain: the missing 25 years': 'Tan Kim Seng',
};
/** "Some Long Place · Its Other Name" → "Some Long Place", "The X at Old Y House" → "Old Y House". */
export function shortName(name: string) {
  if (LABELS[name]) return LABELS[name];
  let n = name.split(/ · |: | \/ /)[0].trim();
  if (n.split(' ').length > 4) {
    const atIdx = n.lastIndexOf(' at ');
    const ofIdx = n.indexOf(' of the ');
    const andIdx = n.indexOf(' and ');
    if (atIdx > 0) n = n.slice(atIdx + 4);
    else if (ofIdx > 0) n = n.slice(ofIdx + 8);
    else if (andIdx > 0) n = n.slice(0, andIdx);
  }
  n = n.replace(/^Former /, '');
  if (/^The /.test(n) && n.split(' ').length > 2) n = n.slice(4);
  return n.charAt(0).toUpperCase() + n.slice(1);
}
const timeOf = (t?: number) => clock(t).split(', ').pop() ?? '';
function suffix(r: StopRow, wide: boolean) {
  if (r.stamped) return r.stampedAt ? (wide ? clock(r.stampedAt) : timeOf(r.stampedAt)) : '';
  if (r.solved) return 'from afar';
  return '';
}
const need = (r: StopRow, wide: boolean) => {
  const x = suffix(r, wide);
  return shortName(r.name).length * CHAR * PILL_FONT + (x ? x.length * 0.5 * 6.4 + 2.2 : 0) + 9;
};

interface Row {
  y: number;
  h: number;
  w: number;
  /** Type set a little tighter where a row is short of room (down to 86%), as a compositor would. */
  fit: number;
  stops: StopRow[];
}
/** Rows of pills, top down, and where the status stamp goes under them (above the rivet's edge of the window). */
function layout(rows: StopRow[], finished: boolean): { rows: Row[]; status: number } {
  const list = rows.slice(0, 8);
  const n = list.length;
  if (!n) return { rows: [], status: TOP0 };
  const m = n >= 7 ? 6 : Math.min(n, 5);
  const stamp = 15 + (finished ? 8 : 0); // the status stamp, and the time taken under it
  const room = C - W_IN - 2 - stamp - 2.5 - TOP0; // from the first row's top to the last row's foot
  const pitch = Math.min(23, (room + 2.4) / m);
  const h = Math.min(16, pitch - 2.4);
  const width = (i: number) => {
    const top = C - (TOP0 + i * pitch + 3),
      mid = C - (TOP0 + i * pitch + h / 2);
    return Math.min(2 * Math.sqrt(Math.max(0, R_TEXT * R_TEXT - top * top)), 2 * mid * tan - 9);
  };
  const plans: number[][] = [];
  const split = (left: number, rowsLeft: number, acc: number[]) => {
    if (!rowsLeft) return void (left === 0 && plans.push(acc));
    for (const k of [1, 2]) if (k <= left) split(left - k, rowsLeft - 1, [...acc, k]);
  };
  split(n, m, []);
  let best: Row[] = [],
    score = Infinity;
  for (const plan of plans) {
    let i = 0,
      worst = 0;
    const out = plan.map((k, r) => {
      const stops = list.slice(i, (i += k));
      const w = width(r);
      const over = stops.reduce((a, st) => a + need(st, k === 1), 0) / (w - (k - 1) * 3);
      worst = Math.max(worst, over);
      return { y: TOP0 + r * pitch, h, w, fit: Math.max(0.86, Math.min(1, 1 / over)), stops };
    });
    if (worst < score) ((score = worst), (best = out));
  }
  return { rows: best, status: TOP0 + (m - 1) * pitch + h + 2.5 };
}

// ---- turning ----
const SPRING = 230; // stiffness and damping: a little overshoot, then it settles like a paper detent
const DAMP = 22;
const reducedMotion = () => document.documentElement.classList.contains('reduce-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const wrapIdx = (i: number, n: number) => ((i % n) + n) % n;

export interface StampWheelProps {
  records: StoryRecord[];
  rows: Partial<Record<BookId, StopRow[]>>;
  selected?: BookId;
  onPick(id: BookId): void;
}

export function StampWheel({ records, rows, selected, onPick }: StampWheelProps) {
  const uid = useId().replace(/:/g, '');
  const N = records.length;
  const STEP = 360 / N;
  const startIdx = Math.max(
    0,
    records.findIndex((r) => r.id === selected),
  );
  const [initial] = useState(() => -startIdx * STEP);
  const [current, setCurrent] = useState(startIdx);
  const disk = useRef<HTMLDivElement>(null);
  const under = useRef<HTMLDivElement>(null);
  const st = useRef({
    angle: initial,
    vel: 0,
    target: initial,
    raf: 0,
    drag: null as null | { id: number; prev: number; cx: number; cy: number; r: number; samples: { t: number; a: number }[] },
  });
  const picked = useRef(selected);
  picked.current = selected;
  const pick = useRef(onPick);
  pick.current = onPick;

  const paint = (a: number) => {
    if (under.current) under.current.style.transform = `rotate(${a.toFixed(3)}deg)`;
  };
  const settle = () => {
    const S = st.current;
    const idx = wrapIdx(Math.round(-S.target / STEP), N);
    setCurrent(idx);
    const el = disk.current;
    if (el && !reducedMotion()) {
      el.classList.remove(s.tick);
      void el.offsetWidth;
      el.classList.add(s.tick);
    }
    const id = records[idx]?.id;
    if (id && id !== picked.current) {
      picked.current = id;
      pick.current(id);
    }
  };
  const run = () => {
    const S = st.current;
    cancelAnimationFrame(S.raf);
    if (reducedMotion()) {
      S.angle = S.target;
      S.vel = 0;
      paint(S.angle);
      settle();
      return;
    }
    let prev = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      S.vel += (-SPRING * (S.angle - S.target) - DAMP * S.vel) * dt;
      S.angle += S.vel * dt;
      if (Math.abs(S.angle - S.target) < 0.04 && Math.abs(S.vel) < 1.5) {
        S.angle = S.target;
        S.vel = 0;
        S.raf = 0;
        paint(S.angle);
        settle();
        return;
      }
      paint(S.angle);
      S.raf = requestAnimationFrame(step);
    };
    S.raf = requestAnimationFrame(step);
  };
  /** Turn by whole sectors: +1 brings the next story under the window. */
  const turn = (by: number) => {
    const S = st.current;
    if (S.drag || !by) return;
    S.target = Math.round(S.target / STEP) * STEP - by * STEP;
    run();
  };
  const goTo = (idx: number) => {
    const cur = wrapIdx(Math.round(-st.current.target / STEP), N);
    let d = wrapIdx(idx - cur, N);
    if (d > N / 2) d -= N;
    turn(d);
  };

  // the shelf picked another book: turn the wheel to it (without picking it again)
  useEffect(() => {
    const idx = records.findIndex((r) => r.id === selected);
    if (idx >= 0 && !st.current.drag) goTo(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);
  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);

  const angleAt = (x: number, y: number, d: { cx: number; cy: number }) => (Math.atan2(y - d.cy, x - d.cx) * 180) / Math.PI;
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = disk.current!;
    const b = el.getBoundingClientRect();
    const S = st.current;
    const d = { cx: b.left + b.width / 2, cy: b.top + b.height / 2, r: b.width / 2 };
    cancelAnimationFrame(S.raf);
    S.vel = 0;
    S.drag = { id: e.pointerId, prev: angleAt(e.clientX, e.clientY, d), ...d, samples: [{ t: performance.now(), a: S.angle }] };
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const S = st.current,
      d = S.drag;
    if (!d || d.id !== e.pointerId) return;
    const a = angleAt(e.clientX, e.clientY, d);
    let delta = a - d.prev;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.prev = a;
    // near the rivet a small slip is a big angle: ease it off there
    const near = Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.r;
    if (near < 0.18) delta *= near / 0.18;
    S.angle += delta;
    paint(S.angle);
    const t = performance.now();
    d.samples.push({ t, a: S.angle });
    while (d.samples.length > 2 && t - d.samples[0].t > 90) d.samples.shift();
  };
  const release = (e: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const S = st.current,
      d = S.drag;
    if (!d || d.id !== e.pointerId) return;
    S.drag = null;
    const first = d.samples[0],
      last = d.samples[d.samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    const v = !cancelled && dt > 0.01 && performance.now() - last.t < 80 ? Math.max(-1100, Math.min(1100, (last.a - first.a) / dt)) : 0;
    S.vel = v;
    S.target = Math.round((S.angle + v * 0.13) / STEP) * STEP;
    run();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') turn(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') turn(-1);
    else return;
    e.preventDefault();
  };

  const layouts = useMemo(() => records.map((r) => layout(rows[r.id] ?? [], r.finished)), [records, rows]);
  const rec = records[current];
  const label = (r: StoryRecord) => `Vol. ${r.roman}, ${r.title} (${r.place})`;
  const state = (r: StoryRecord) => (r.finished ? `finished${took(r) ? `, took ${took(r)}` : ''}` : `${r.done} of ${r.total} found`);
  const prevRec = records[wrapIdx(current - 1, N)],
    nextRec = records[wrapIdx(current + 1, N)];

  return (
    <div className={s.root} role="group" aria-labelledby={`${uid}-t`}>
      <h3 id={`${uid}-t`} className={s.sr}>
        Stamp wheel
      </h3>
      <div className={s.wheel}>
        <div
          ref={disk}
          className={s.disk}
          role="slider"
          tabIndex={0}
          aria-label="Stamp wheel: turn to a story"
          aria-valuemin={1}
          aria-valuemax={N}
          aria-valuenow={current + 1}
          aria-valuetext={rec ? `${label(rec)}: ${state(rec)}` : undefined}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => release(e)}
          onPointerCancel={(e) => release(e, true)}
          onLostPointerCapture={(e) => release(e, true)}
        >
          <div className={s.clip}>
            <div ref={under} className={s.under} style={{ transform: `rotate(${initial}deg)` }} aria-hidden="true">
              <UnderDisk uid={uid} records={records} step={STEP} />
              {records.map((r, k) => (
                <Sector key={r.id} record={r} layout={layouts[k]} turn={k * STEP} />
              ))}
            </div>
          </div>
          <Card uid={uid} />
          <i className={s.grain} aria-hidden="true" />
          <i className={s.light} aria-hidden="true" />
        </div>
        <button
          type="button"
          className={`${s.tab} ${s.prev}`}
          onClick={() => turn(-1)}
          aria-label={prevRec ? `Previous story: ${label(prevRec)}` : 'Previous story'}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M12.5 4.5 7 10l5.5 5.5" />
          </svg>
        </button>
        <button type="button" className={`${s.tab} ${s.next}`} onClick={() => turn(1)} aria-label={nextRec ? `Next story: ${label(nextRec)}` : 'Next story'}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7.5 4.5 13 10l-5.5 5.5" />
          </svg>
        </button>
      </div>
      <p className={s.legend} aria-hidden="true">
        <span>
          <i className={s.kStamped} />
          Stamped on site
        </span>
        <span>
          <i className={s.kAfar} />
          From afar
        </span>
        <span>
          <i className={s.kNone} />
          Not yet
        </span>
      </p>
      <p className={s.sr} aria-live="polite">
        {rec ? `In the window: ${label(rec)}, ${state(rec)}.` : ''}
      </p>
      <div className={s.sr}>
        {records.map((r) => (
          <ul key={r.id} aria-label={`${label(r)}: ${state(r)}`}>
            {(rows[r.id] ?? []).map((row) => (
              <li key={row.id}>
                {row.name}: {row.stamped ? `stamped on site${row.stampedAt ? `, ${clock(row.stampedAt)}` : ''}` : row.solved ? 'solved from afar' : 'not yet'}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/** One story's sector of the cream disk: its pills, and its status stamped under them (the header is in the SVG). */
function Sector({ record: r, layout: { rows, status }, turn }: { record: StoryRecord; layout: ReturnType<typeof layout>; turn: number }) {
  const t = r.finished ? took(r) : null;
  return (
    <div className={s.sector} style={{ transform: `rotate(${turn}deg)` }}>
      {rows.map((row, i) => (
        <div
          key={i}
          className={s.row}
          style={{ top: `${row.y / 4}%`, height: `${row.h / 4}%`, width: `${row.w / 4}%`, left: `${(400 - row.w) / 8}%`, ['--fit' as string]: row.fit }}
        >
          {row.stops.map((stop) => {
            const extra = suffix(stop, row.stops.length === 1);
            return (
              <span key={stop.id} className={`${s.pill} ${stop.stamped ? s.stamped : stop.solved ? s.afar : s.none}`}>
                <span className={s.name}>{shortName(stop.name)}</span>
                {extra && <small>{extra}</small>}
              </span>
            );
          })}
        </div>
      ))}
      <div className={s.mark} style={{ top: `${status / 4}%` }}>
        <span className={`${s.status} ${r.finished ? s.finished : s.open}`}>{r.finished ? 'Finished' : `${r.done} of ${r.total}`}</span>
        {t && <small>took {t}</small>}
      </div>
    </div>
  );
}

/** The cream disk: paper, a coloured header band per story with its title set round the arc, and the rim's scale. */
function UnderDisk({ uid, records, step }: { uid: string; records: StoryRecord[]; step: number }) {
  const id = (k: string) => `${uid}-${k}`;
  const [hx1, hy1] = at(163, -33),
    [hx2, hy2] = at(163, 33);
  const half = step / 2;
  return (
    <svg className={s.art} viewBox="0 0 400 400">
      <defs>
        <radialGradient id={id('cream')} cx="50%" cy="46%" r="52%">
          <stop offset="0" stopColor="#f4ecd6" />
          <stop offset="0.7" stopColor="#efe4c9" />
          <stop offset="1" stopColor="#e2d3b0" />
        </radialGradient>
        <path id={id('hdr')} d={`M${hx1} ${hy1}A163 163 0 0 1 ${hx2} ${hy2}`} />
        <filter id={id('fox')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <circle cx={C} cy={C} r={R_UNDER} fill={`url(#${id('cream')})`} />
      {/* foxing: the paper has aged a little */}
      <g fill="#b98a4a" opacity="0.13" filter={`url(#${id('fox')})`}>
        <circle cx="120" cy="92" r="7" />
        <circle cx="286" cy="70" r="5" />
        <circle cx="318" cy="250" r="9" />
        <circle cx="94" cy="300" r="6" />
        <circle cx="210" cy="140" r="4" />
      </g>
      {/* the rim's scale, seen round the card */}
      <g stroke="#5a4630" strokeWidth="0.6" opacity="0.55">
        {Array.from({ length: 120 }, (_, i) => {
          const a = i * 3;
          const long = i % 4 === 0;
          const [x1, y1] = at(190.5, a),
            [x2, y2] = at(long ? 196.5 : 194, a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <circle cx={C} cy={C} r={R_UNDER - 0.6} fill="none" stroke="#7a6243" strokeWidth="0.8" opacity="0.5" />
      {records.map((r, k) => (
        <g key={r.id} transform={`rotate(${n2(k * step)} ${C} ${C})`}>
          {/* a wash of the book's cloth across its sector */}
          <path d={band(W_IN - 6, 156, -half, half)} fill={r.tone} opacity="0.07" />
          {/* the volume's header band, its rules, and its title round the arc */}
          <path d={band(159.5, 181, -half, half)} fill={r.tone} />
          <path d={band(159.5, 181, -half, half)} fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="0.6" />
          <path
            d={`M${at(161.4, -half + 1).join(' ')}A161.4 161.4 0 0 1 ${at(161.4, half - 1).join(' ')}`}
            fill="none"
            stroke="#f1e2bd"
            strokeOpacity="0.55"
            strokeWidth="0.5"
          />
          <path d={`M${at(157.4, -half + 1).join(' ')}A157.4 157.4 0 0 1 ${at(157.4, half - 1).join(' ')}`} fill="none" stroke={r.tone} strokeWidth="0.7" />
          <path d={`M${at(155.6, -half + 1).join(' ')}A155.6 155.6 0 0 1 ${at(155.6, half - 1).join(' ')}`} fill="none" stroke={r.tone} strokeWidth="0.35" />
          <text className={s.hdr} fill="#f6ead0" fontSize="10.2" letterSpacing="1.5">
            <textPath href={`#${id('hdr')}`} startOffset="50%" textAnchor="middle">
              {`VOL. ${r.roman} · ${r.place.toUpperCase()}`}
            </textPath>
          </text>
          {/* the boundary with the next sector */}
          <line
            x1={at(W_IN - 4, half)[0]}
            y1={at(W_IN - 4, half)[1]}
            x2={at(156, half)[0]}
            y2={at(156, half)[1]}
            stroke="#5a4630"
            strokeOpacity="0.4"
            strokeWidth="0.6"
            strokeDasharray="1 2.4"
          />
          {/* the rim tab: the volume's number */}
          <path d={band(189.5, 198, -6, 6)} fill={r.tone} />
          <text x={C} y={C - 191.2} className={s.rimNum} fontSize="6.4" textAnchor="middle" fill="#f6ead0">
            {r.roman}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** The navy card riveted on top: foil motifs, the window and its hinges, the title, the brass rivet. */
function Card({ uid }: { uid: string }) {
  const id = (k: string) => `${uid}-${k}`;
  const url = (k: string) => `url(#${id(k)})`;
  const gold = url('gold');
  const cardPath = `${circle(R_CARD)}${windowPath(0)}`;
  const hinge = (r: number, side: 1 | -1) => (
    <g key={`${r}${side}`} transform={`rotate(${side * W_HALF} ${C} ${C}) translate(${C} ${C - r}) scale(${side} 1)`}>
      <path d="M0 -3.4H8.2A4.6 4.6 0 1 1 8.2 3.4H0Z" fill={gold} />
      <path d="M3 -3.4L4.6 -5.6L6.2 -3.4M3 3.4L4.6 5.6L6.2 3.4" fill={gold} />
      <circle cx="11.6" cy="0" r="1.5" fill={NAVY} />
      <rect x="-2.6" y="-7" width="3.6" height="14" rx="1.6" fill={gold} />
      <path d="M-2.6 -2.4H1M-2.6 2.4H1" stroke={NAVY} strokeWidth="0.6" />
    </g>
  );
  return (
    <svg className={s.art} viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id={id('navy')} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#283863" />
          <stop offset="0.55" stopColor="#1b2649" />
          <stop offset="1" stopColor="#111832" />
        </radialGradient>
        <linearGradient id={id('gold')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9c7631" />
          <stop offset="0.2" stopColor="#f1dc9c" />
          <stop offset="0.34" stopColor="#b88e3e" />
          <stop offset="0.5" stopColor="#ecd18a" />
          <stop offset="0.63" stopColor="#94702e" />
          <stop offset="0.8" stopColor="#f3dea0" />
          <stop offset="1" stopColor="#b2883a" />
        </linearGradient>
        <radialGradient id={id('brass')} cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#fff1c2" />
          <stop offset="0.28" stopColor="#e2bd68" />
          <stop offset="0.68" stopColor="#a47a2c" />
          <stop offset="1" stopColor="#5b4013" />
        </radialGradient>
        {/* card stock: fine grain, and the ink lying a little unevenly on it */}
        <filter id={id('stock')} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="4" result="fine" />
          <feColorMatrix in="fine" type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1" result="g1" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="11" result="mott" />
          <feColorMatrix in="mott" type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1" result="g2" />
          <feComposite in="SourceGraphic" in2="g1" operator="arithmetic" k1="0" k2="1" k3="0.12" k4="-0.06" result="a" />
          <feComposite in="a" in2="g2" operator="arithmetic" k1="0" k2="1" k3="0.065" k4="-0.0325" result="b" />
          <feComposite in="b" in2="SourceAlpha" operator="in" />
        </filter>
        {/* hot foil: pressed in (a hair of shadow), lit from the upper left, with the odd dull speck */}
        <filter id={id('foil')} x="-2%" y="-2%" width="104%" height="104%">
          <feOffset in="SourceAlpha" dx="0.35" dy="0.55" result="off" />
          <feGaussianBlur in="off" stdDeviation="0.35" result="offb" />
          <feFlood floodColor="#03050c" floodOpacity="0.75" />
          <feComposite in2="offb" operator="in" result="press" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.55" result="bump" />
          <feSpecularLighting in="bump" surfaceScale="1.8" specularConstant="0.95" specularExponent="20" lightingColor="#fff4d2" result="spec">
            <feDistantLight azimuth="225" elevation="48" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.75" k4="0" result="lit" />
          <feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="1" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.3 0 0 0 0 0.22 0 0 0 0 0.08 -1.6 0 0 0 0.95" result="speck" />
          <feComposite in="speck" in2="SourceAlpha" operator="in" result="speckIn" />
          <feMerge>
            <feMergeNode in="press" />
            <feMergeNode in="lit" />
            <feMergeNode in="speckIn" />
          </feMerge>
        </filter>
        <filter id={id('soft')} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={id('blur1')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* the card's shadow: on the rim round it, and into the window on the disk below */}
      <path d={cardPath} fillRule="evenodd" fill="#1a1006" opacity="0.6" filter={url('soft')} transform="translate(0.4 1.8)" />
      <path d={cardPath} fillRule="evenodd" fill={url('navy')} filter={url('stock')} />
      {/* cut edges: the card's pale core shows where it was cut */}
      <path d={windowPath(0.5)} fill="none" stroke="#d8cbb0" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx={C} cy={C} r={R_CARD - 0.5} fill="none" stroke="#d8cbb0" strokeOpacity="0.35" strokeWidth="1" />
      {/* a blind-printed ring of lighter navy, the second ink */}
      <circle cx={C} cy={C} r="160" fill="none" stroke="#2b3b6c" strokeWidth="0.6" strokeDasharray="0.5 3.5" strokeLinecap="round" opacity="0.9" />

      <g filter={url('foil')}>
        {/* border: a rule, a row of dots, a rule */}
        <circle cx={C} cy={C} r="186.2" fill="none" stroke={gold} strokeWidth="0.9" />
        <circle cx={C} cy={C} r="182" fill="none" stroke={gold} strokeWidth="2.3" strokeDasharray="0 5.717" strokeLinecap="round" />
        <circle cx={C} cy={C} r="178" fill="none" stroke={gold} strokeWidth="0.55" />
        <path d="M196.6 16.8L200 11.2L203.4 16.8Z" fill={gold} />
        {/* the window's frame: a rule and a row of dots, hinged at its edges, a star at each corner */}
        <path d={windowPath(3.6)} fill="none" stroke={gold} strokeWidth="0.85" strokeLinejoin="round" />
        <path d={windowPath(7)} fill="none" stroke={gold} strokeWidth="1.5" strokeDasharray="0 3.6" strokeLinecap="round" />
        {[82, 142].flatMap((r) => [hinge(r, 1), hinge(r, -1)])}
        <path d={sparkle(...at(W_OUT + 2, -W_HALF - 6.5), 4.2)} fill={gold} />
        <path d={sparkle(...at(W_OUT + 2, W_HALF + 6.5), 4.2)} fill={gold} />

        {/* a junk under sail, off the old shore */}
        <g transform="translate(64 206)">
          <path d="M-31 -14L-24 -6H21L30 -12L27 -3Q23 4 14 4H-17Q-25 3 -28 -5Z" fill={gold} />
          <path d="M-25 -1.2H24" stroke={NAVY} strokeWidth="0.7" />
          <path d="M-2 -6V-47M17 -6V-33M-21 -6V-29" stroke={gold} strokeWidth="1" />
          <path d="M-2 -45C8 -45 16 -41 21 -34L18 -10H-2Z" fill={gold} />
          <path d="M17 -32C22 -32 27 -29 29 -25L27 -12H17Z" fill={gold} />
          <path d="M-21 -28C-16 -28 -11 -25 -9 -21L-10 -11H-21Z" fill={gold} />
          <path d="M-2 -38H19.6M-2 -31H20.6M-2 -24H20M-2 -17H19.2M17 -26H28M17 -19H27.6M-21 -22H-9.6M-21 -16H-9.5" stroke={NAVY} strokeWidth="0.65" />
          <path d="M-2 -47l6.5 1.7-6.5 1.7Z" fill={gold} />
          <path d="M-36 9q3-2.6 6 0t6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0" fill="none" stroke={gold} strokeWidth="0.9" />
          <path d="M-24 14q3-2.2 6 0t6 0 6 0 6 0 6 0 6 0 6 0" fill="none" stroke={gold} strokeWidth="0.7" />
        </g>

        {/* a row of shophouses: tiled roofs, shuttered windows, the five-foot way */}
        <g transform="translate(335 208)">
          {[-33, -11, 11].map((x, i) => {
            const top = i === 1 ? -36 : -30;
            return (
              <g key={x}>
                <path d={`M${x - 1.6} ${top}L${x + 3} ${top - 6}H${x + 19}L${x + 23.6} ${top}Z`} fill={gold} />
                <path d={`M${x + 1} ${top - 3}H${x + 21}`} stroke={NAVY} strokeWidth="0.55" />
                {i === 1 && <path d={`M${x + 5} ${top - 6}Q${x + 11} ${top - 13} ${x + 17} ${top - 6}Z`} fill={gold} />}
                <path d={`M${x} 0V${top}M${x + 22} ${top}V0`} stroke={gold} strokeWidth="0.9" />
                {[x + 4, x + 13].map((w) => (
                  <g key={w}>
                    <path d={`M${w} ${top + 16}V${top + 8}a2.5 2.5 0 0 1 5 0V${top + 16}Z`} fill={gold} />
                    <path d={`M${w + 2.5} ${top + 7}V${top + 16}`} stroke={NAVY} strokeWidth="0.5" />
                  </g>
                ))}
                <path d={`M${x} -12.5H${x + 22}`} stroke={gold} strokeWidth="0.8" />
                <path d={`M${x + 4} 0V-5a7 5 0 0 1 14 0V0`} fill="none" stroke={gold} strokeWidth="0.9" />
              </g>
            );
          })}
          <path d="M-37 0H37" stroke={gold} strokeWidth="1.1" />
        </g>

        {/* the golden dome, its drum and its minarets */}
        <g transform="translate(84 298)">
          <path d="M-22 0V-12H22V0" fill="none" stroke={gold} strokeWidth="0.9" />
          {[-2, -1, 0, 1, 2].map((i) => (
            <path key={i} d={`M${i * 8.4 - 2.6} 0V-5a2.6 2.6 0 0 1 5.2 0V0`} fill="none" stroke={gold} strokeWidth="0.75" />
          ))}
          <path d="M-23.5 -12H23.5" stroke={gold} strokeWidth="1.3" />
          <path d="M-13 -12V-18H13V-12Z" fill={gold} />
          <path d="M-8 -13.4V-16.6M-3 -13.4V-16.6M2 -13.4V-16.6M7 -13.4V-16.6" stroke={NAVY} strokeWidth="1.1" />
          <path d="M-14 -18C-16 -28 -9 -35 0 -41C9 -35 16 -28 14 -18Z" fill={gold} />
          <path d="M0 -40V-19M-7 -36Q-9.5 -28 -8 -19M7 -36Q9.5 -28 8 -19" stroke={NAVY} strokeWidth="0.5" opacity="0.8" />
          <path d="M0 -41V-46" stroke={gold} strokeWidth="0.9" />
          <path d={crescent(2.6)} transform="translate(0.6 -49) rotate(-30)" fill={gold} />
          {[-26, 26].map((x) => (
            <g key={x}>
              <path d={`M${x - 2} 0V-30H${x + 2}V0Z`} fill={gold} />
              <path d={`M${x - 3.4} -23H${x + 3.4}M${x - 3} -14H${x + 3}`} stroke={gold} strokeWidth="1.1" />
              <path d={`M${x - 2.7} -30Q${x} -38 ${x + 2.7} -30Z`} fill={gold} />
              <path d={`M${x} -37.5V-40`} stroke={gold} strokeWidth="0.7" />
            </g>
          ))}
        </g>

        {/* a compass rose under the title */}
        <g transform="translate(200 334)">
          <circle r="12.5" fill="none" stroke={gold} strokeWidth="0.75" />
          <circle r="15.6" fill="none" stroke={gold} strokeWidth="1" strokeDasharray="0 2.45" strokeLinecap="round" />
          {[0, 90, 180, 270].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <path d="M0 -21.5L3.4 -3.4L0 0Z" fill={gold} />
              <path d="M0 -21.5L-3.4 -3.4L0 0Z" fill="none" stroke={gold} strokeWidth="0.55" />
            </g>
          ))}
          {[45, 135, 225, 315].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <path d="M0 -13L2.2 -2.2L0 0Z" fill={gold} />
              <path d="M0 -13L-2.2 -2.2L0 0Z" fill="none" stroke={gold} strokeWidth="0.45" />
            </g>
          ))}
          <circle r="1.6" fill={gold} />
          <text y="-24.5" textAnchor="middle" fontSize="6.5" fill={gold} className={s.fell}>
            N
          </text>
        </g>

        {/* the moon over the water, clouds and stars */}
        <path d={crescent(13)} transform="translate(314 280) rotate(-28)" fill={gold} />
        <g fill="none" stroke={gold} strokeWidth="0.85" strokeLinecap="round">
          <path d="M80 132a4.5 4.5 0 0 1 4-6.6a6 6 0 0 1 11-2.4a4.6 4.6 0 0 1 8.4 2.6a3.8 3.8 0 0 1 3.4 6.4Z" />
          <path d="M84 136.5H101M88 140H97" />
          <path d="M296 130a4.5 4.5 0 0 1 4-6.6a6 6 0 0 1 11-2.4a4.6 4.6 0 0 1 8.4 2.6a3.8 3.8 0 0 1 3.4 6.4Z" />
          <path d="M300 134.5H318M305 138H314" />
          <path d="M282 316a3.4 3.4 0 0 1 3-5a4.5 4.5 0 0 1 8.2-1.8a3.4 3.4 0 0 1 6.3 2a2.8 2.8 0 0 1 2.5 4.8Z" />
        </g>
        <g fill={gold}>
          {(
            [
              [112, 96, 4.6],
              [72, 112, 3],
              [124, 74, 2.4],
              [52, 168, 2.4],
              [100, 156, 1.8],
              [288, 98, 4.2],
              [326, 108, 2.8],
              [352, 150, 2.2],
              [270, 72, 2.2],
              [338, 252, 3.6],
              [292, 252, 2],
              [334, 306, 2.4],
              [40, 238, 2.6],
              [128, 262, 1.8],
              [166, 346, 2.6],
              [234, 346, 2.6],
              [366, 236, 2.2],
              [54, 300, 2.2],
            ] as const
          ).map(([x, y, r]) => (
            <path key={`${x},${y}`} d={sparkle(x, y, r)} />
          ))}
          {(
            [
              [96, 112],
              [62, 146],
              [312, 94],
              [276, 116],
              [352, 196],
              [48, 196],
              [116, 230],
              [290, 300],
              [150, 316],
              [250, 316],
              [70, 268],
              [342, 278],
            ] as const
          ).map(([x, y]) => (
            <circle key={`${x},${y}`} cx={x} cy={y} r="0.9" />
          ))}
        </g>

        {/* the title, set in the foil */}
        <text x={C} y="252" textAnchor="middle" fontSize="25" fill={gold} className={s.fell}>
          Stamp Wheel
        </text>
        <text x={C} y="270" textAnchor="middle" fontSize="12.5" fill={gold} className={s.fellItalic}>
          for the stories of Singapore.
        </text>
        <path d="M152 280.5H193M207 280.5H248" stroke={gold} strokeWidth="0.6" />
        <path d="M200 277.6L202.9 280.5L200 283.4L197.1 280.5Z" fill={gold} />
      </g>

      {/* the small print, in cream ink, a hair off register */}
      <text x={C + 0.45} y="295.4" textAnchor="middle" fontSize="7" fill="#c9604a" opacity="0.35" className={s.small}>
        Printed for the FindSG field archive.
      </text>
      <text x={C} y="295" textAnchor="middle" fontSize="7" fill="#eadfc4" opacity="0.85" className={s.small}>
        Printed for the FindSG field archive.
      </text>

      {/* the rivet: a printed washer, then brass with a crescent struck in it */}
      <g filter={url('foil')}>
        <circle cx={C} cy={C} r="21.5" fill="none" stroke={gold} strokeWidth="0.8" />
        <circle cx={C} cy={C} r="18.4" fill="none" stroke={gold} strokeWidth="1.2" strokeDasharray="0 2.89" strokeLinecap="round" />
      </g>
      <circle cx={C + 0.8} cy={C + 1.8} r="13.6" fill="#050308" opacity="0.6" filter={url('blur1')} />
      <circle cx={C} cy={C} r="13" fill={url('brass')} />
      <circle cx={C} cy={C} r="12.9" fill="none" stroke="#4d360f" strokeWidth="0.7" />
      <circle cx={C} cy={C} r="11.6" fill="none" stroke="#fff2c8" strokeOpacity="0.45" strokeWidth="0.6" />
      <g transform={`translate(${C - 1.4} ${C}) rotate(-24) scale(0.62)`}>
        <path d={crescent(10)} fill="#5c4212" transform="translate(0.7 0.9)" opacity="0.8" />
        <path d={crescent(10)} fill="#fff3cc" transform="translate(-0.5 -0.6)" opacity="0.6" />
        <path d={crescent(10)} fill="#c69d4b" />
      </g>
      <path d={sparkle(C + 4.6, C - 2.8, 2.2)} fill="#6b4d17" opacity="0.85" />
      <ellipse cx={C - 4.5} cy={C - 5.2} rx="4" ry="2.2" fill="#fffbe8" opacity="0.4" transform={`rotate(-30 ${C - 4.5} ${C - 5.2})`} filter={url('blur1')} />
    </svg>
  );
}
