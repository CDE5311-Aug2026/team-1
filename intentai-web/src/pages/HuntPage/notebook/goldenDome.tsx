// The hunt's own pieces for Beneath the Golden Dome, each one page of the book:
// - the viewfinder: frame the detail on the building plate, then press the shutter (on site, your own camera opens);
// - the shutter: swipe the louvres open, and the parcel hidden behind them is there;
// - the composing stick: its metal type reads backwards until you slide a mirror along it;
// - the sketch: a rough drawing of what is around; the line on the stick says which place to go to.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { SHORT_EPISODE as EP, shortDirections, type ShortLandmark } from '../../../findsg/book';
import g from './goldenDome.module.css';

/** The photos taken this visit (kept on the phone, in memory only). */
const photos: Record<string, string> = {};
export const photoOf = (id: string): string | undefined => photos[id];

const reduced = () => document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---------- the viewfinder ---------- */

export function Shutter({ id, ready, onSite, onShot }: { id: string; ready: boolean; onSite: boolean; onShot(): void }) {
  const input = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState(false);
  const shoot = () => {
    setFlash(true);
    window.setTimeout(onShot, reduced() ? 0 : 420);
  };
  return (
    <div className={g.shutterRow} data-nodrag>
      {flash && <span className={g.flash} aria-hidden="true" />}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label="Take a photo of the detail"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file || !file.type.startsWith('image/')) return;
          photos[id] = URL.createObjectURL(file);
          shoot();
        }}
      />
      <button
        type="button"
        className={g.shutter}
        disabled={!ready}
        aria-label={ready ? 'Take the photo' : 'Frame the detail first'}
        onClick={() => (onSite ? input.current?.click() : shoot())}
      >
        <span aria-hidden="true" />
      </button>
      <div className={g.shutterText}>
        <b>{ready ? 'Take the photo' : 'Frame it first'}</b>
        {onSite && ready && (
          <button type="button" className={g.quiet} onClick={shoot}>
            No camera? Use the plate
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- behind the shutter ---------- */

export function ShutterReveal({ photo, done, onFound }: { photo?: string; done: boolean; onFound(): void }) {
  const [open, setOpen] = useState(done ? 1 : 0);
  const drag = useRef<{ x: number; from: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const opened = open > 0.72;
  const down = (e: ReactPointerEvent) => {
    if (done) return;
    drag.current = { x: e.clientX, from: open };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    const w = box.current?.offsetWidth || 200;
    setOpen(Math.max(0, Math.min(1, drag.current.from + Math.abs(e.clientX - drag.current.x) / (w * 0.55))));
  };
  const up = () => {
    drag.current = null;
    setOpen((o) => (o > 0.72 ? 1 : o < 0.2 ? 0 : o));
  };
  return (
    <div className={g.reveal} data-nodrag>
      <figure className={g.polaroid}>
        {photo ? <img src={photo} alt="Your photo of the arch" /> : <ArchSketch />}
        <figcaption>Your photo · No. 101</figcaption>
      </figure>
      <div
        ref={box}
        className={g.window}
        style={{ '--open': open } as CSSProperties}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="slider"
        aria-label="Swipe the shutters open"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(open * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => Math.min(1, o + 0.34));
          }
        }}
      >
        <div className={g.behind}>
          <Parcel />
        </div>
        <span className={`${g.leaf} ${g.leafL}`} />
        <span className={`${g.leaf} ${g.leafR}`} />
        {!opened && <span className={g.swipe} aria-hidden="true">⟷</span>}
      </div>
      {opened &&
        (done ? (
          <p className={g.found}>✓ The parcel joins your clues</p>
        ) : (
          <button type="button" className={g.ribbon} onClick={onFound}>
            Take the parcel
          </button>
        ))}
    </div>
  );
}

function Parcel() {
  return (
    <span className={g.parcel} aria-label="A paper parcel tied with string">
      <i className={g.stringH} />
      <i className={g.stringV} />
      <b className={g.tag}>last line</b>
    </span>
  );
}

function ArchSketch() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <rect width="120" height="120" fill="#e6dcc4" />
      <path d="M30,118 V56 A30,30 0 0 1 90,56 V118" fill="#c9bb98" stroke="#5a4630" strokeWidth="2" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M36,${66 + i * 6} H84`} stroke="#3f5a48" strokeWidth="2.4" />
      ))}
      <path d="M30,56 A30,30 0 0 1 90,56" fill="none" stroke="#9b2c1c" strokeWidth="2.5" strokeDasharray="4 3" />
    </svg>
  );
}

/** What was inside the parcel, laid out under its wrapping. */
export function ParcelContents() {
  return (
    <ul className={g.contents}>
      {EP.parcel.map((item) => (
        <li key={item.id}>
          <span className={`${g.thing} ${g[`thing_${item.id}`]}`} aria-hidden="true" />
          <span>
            <b>{item.name}</b>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- the composing stick and the mirror ---------- */

const BUCKETS = 10;
export function MirrorStick({ done, onRead }: { done: boolean; onRead(): void }) {
  const [x, setX] = useState(0); // the mirror's left edge, 0..(1 - LENS)
  const [seen, setSeen] = useState<boolean[]>(() => Array(BUCKETS).fill(done));
  const read = done || seen.every(Boolean);
  const LENS = 0.36;
  const stick = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; from: number } | null>(null);
  const fired = useRef(done);
  const place = (nx: number) => {
    const v = Math.max(0, Math.min(1 - LENS, nx));
    setX(v);
    setSeen((s) => s.map((b, i) => b || ((i + 0.5) / BUCKETS >= v && (i + 0.5) / BUCKETS <= v + LENS)));
  };
  useEffect(() => {
    place(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (read && !fired.current) {
      fired.current = true;
      onRead();
    }
  }, [read, onRead]);
  const lines = EP.mirrorLines.map((l, i) => <span key={i}>{l}</span>);
  return (
    <div className={g.stickStage} data-nodrag>
      <div ref={stick} className={g.stick}>
        <span className={g.stickEnd} aria-hidden="true" />
        <div className={`${g.type} ${g.backwards}`} aria-hidden={read}>
          {lines}
        </div>
        <div
          className={g.type}
          style={{ clipPath: read ? 'none' : `inset(0 ${(1 - x - LENS) * 100}% 0 ${x * 100}%)` }}
          aria-hidden={!read}
        >
          {lines}
        </div>
        {!read && (
          <div
            className={g.mirror}
            style={{ left: `${x * 100}%`, width: `${LENS * 100}%` }}
            role="slider"
            tabIndex={0}
            aria-label="Slide the mirror along the type"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((x / (1 - LENS)) * 100)}
            onPointerDown={(e) => {
              drag.current = { px: e.clientX, from: x };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const w = stick.current?.offsetWidth || 300;
              place(drag.current.from + (e.clientX - drag.current.px) / w);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') place(x + 0.08);
              if (e.key === 'ArrowLeft') place(x - 0.08);
            }}
          >
            <span className={g.mirrorGrip} aria-hidden="true">⟷</span>
          </div>
        )}
      </div>
      <div className={g.progress} aria-hidden="true">
        {seen.map((b, i) => (
          <i key={i} className={b ? g.lit : undefined} />
        ))}
      </div>
    </div>
  );
}

/* ---------- the sketch of what is around ---------- */

const ICONS: Record<string, ReactNode> = {
  mansion: (
    <svg viewBox="0 0 40 32">
      <path d="M4,14 L20,4 L36,14 Z" fill="#e5b93f" />
      <rect x="6" y="14" width="28" height="15" fill="#efcc5a" />
      <path d="M11,16 V29 M17,16 V29 M23,16 V29 M29,16 V29" stroke="#7a5a1e" strokeWidth="1.6" />
    </svg>
  ),
  dome: (
    <svg viewBox="0 0 40 36">
      <path d="M8,22 C8,10 32,10 32,22 Z" fill="#d9a62b" />
      <path d="M20,3 V9" stroke="#7a5a1e" strokeWidth="1.6" />
      <path d="M17.5,4.5 a3,3 0 1 0 4,2.5 a2.2,2.2 0 1 1 -4,-2.5" fill="#7a5a1e" />
      <rect x="7" y="22" width="26" height="4" fill="#3c2f22" />
      <rect x="9" y="26" width="22" height="8" fill="#e9dcc0" stroke="#7a5a1e" strokeWidth="1" />
    </svg>
  ),
  lane: (
    <svg viewBox="0 0 40 32">
      <path d="M4,30 L14,4 M36,30 L26,4" stroke="#5a4630" strokeWidth="1.6" fill="none" />
      <path d="M6,24 l3,-6 l3,4 l2,-7" stroke="#c04a6a" strokeWidth="2" fill="none" />
      <path d="M34,24 l-3,-6 l-3,5 l-2,-8" stroke="#3a7fb0" strokeWidth="2" fill="none" />
    </svg>
  ),
  shops: (
    <svg viewBox="0 0 40 32">
      <path d="M3,10 H37 L34,15 H6 Z" fill="#a8452c" />
      <rect x="6" y="15" width="28" height="15" fill="#efe3c7" stroke="#5a4630" strokeWidth="1" />
      <circle cx="13" cy="24" r="4" fill="#3d6b8a" />
      <circle cx="21" cy="24" r="4" fill="#c97c2a" />
      <circle cx="29" cy="24" r="4" fill="#5d8a4a" />
    </svg>
  ),
};

export function AreaSketch({ done, onSolved }: { done: boolean; onSolved(): void }) {
  const [pick, setPick] = useState<string | null>(done ? 'dome' : null);
  const [shake, setShake] = useState<string | null>(null);
  const miss = pick && pick !== 'dome' ? EP.landmarks.find((l) => l.id === pick)?.miss : null;
  const right = pick === 'dome';
  const choose = (l: ShortLandmark) => {
    if (right) return;
    setPick(l.id);
    if (l.id !== 'dome') {
      setShake(l.id);
      window.setTimeout(() => setShake(null), 500);
    }
  };
  const mosque = EP.places[1];
  return (
    <>
      <div className={g.sketch} data-nodrag>
        <svg className={g.sketchLines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2,64 C24,60 44,52 70,40 S96,24 99,20" />
          <path d="M30,99 C34,72 40,40 46,2" />
          <path d="M2,86 C30,84 62,80 99,74" />
        </svg>
        <span className={g.here} style={{ left: `${EP.pressAt.x}%`, top: `${EP.pressAt.y}%` }}>
          <i /> You are here
        </span>
        {EP.landmarks.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`${g.mark} ${pick === l.id ? (l.id === 'dome' ? g.markRight : g.markMiss) : ''} ${shake === l.id ? g.shake : ''}`}
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
            onClick={() => choose(l)}
            aria-pressed={pick === l.id}
          >
            <span className={g.icon} aria-hidden="true">
              {ICONS[l.id]}
            </span>
            <small>{l.label}</small>
          </button>
        ))}
        <span className={g.scale}>A rough sketch · not to scale</span>
      </div>
      {right ? (
        <div className={g.answer}>
          <p>
            <b>{mosque.name}</b> · {mosque.address.split(',')[0]}
          </p>
          <div className={g.answerRow}>
            <a href={shortDirections()} target="_blank" rel="noreferrer" data-nodrag>
              Walk there ↗︎
            </a>
            {done ? (
              <span className={g.found}>✓ On your way</span>
            ) : (
              <button type="button" className={g.ribbon} onClick={onSolved}>
                Set off
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className={g.missNote} aria-live="polite">
          {miss ?? 'Tap the place the line points to.'}
        </p>
      )}
    </>
  );
}

/* ---------- the last line, set ---------- */

export function PrintedLine({ filled }: { filled: boolean }) {
  return (
    <div className={g.slip}>
      <span className={g.slipLabel}>Di-chetak oleh</span>
      <span className={`${g.slipBlank} ${filled ? g.slipFilled : ''}`}>{filled ? EP.lastLine.malay.replace('Di-chetak oleh ', '') : '______'}</span>
      {filled && <small>{EP.lastLine.english}</small>}
    </div>
  );
}
