import { useEffect, useId, useReducer, useRef, useState, type PointerEvent } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './SampleVideo.module.css';

interface SampleVideoProps {
  poster: { src: string; alt: string };
  title: string;
  /** Clip length in seconds. */
  duration: number;
  /** Four captions, 5 s each, looped. */
  captions: readonly [string, string, string, string];
  /** Top margin: 18 (Berlin cards) or 16 (Spread / Chinatown cards). */
  top?: 16 | 18;
}

const TICK_MS = 250;
const CAPTION_S = 5;

interface Clock {
  playing: boolean;
  t: number;
}

function clock(state: Clock, action: { type: 'toggle' } | { type: 'tick'; duration: number }): Clock {
  if (action.type === 'toggle') return { ...state, playing: !state.playing };
  if (!state.playing) return state;
  const t = state.t + TICK_MS / 1000;
  return t >= action.duration ? { playing: false, t: 0 } : { playing: true, t };
}

export function formatClock(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const REST = { rx: 0, ry: 0, gx: 50, gy: 40, glare: 0, mx: 0, my: 0 };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Mock video (no media file): poster with Ken Burns, a 1x clock and four looped captions.
 * Mouse/pen pointers tilt the frame and show a glare; touch and reduced motion do not.
 */
export function SampleVideo({ poster, title, duration, captions, top = 18 }: SampleVideoProps) {
  const [{ playing, t }, dispatch] = useReducer(clock, { playing: false, t: 0 });
  const [tilt, setTilt] = useState(REST);
  const reduced = useReducedMotion();
  const orbitId = useId();
  const playRef = useRef<HTMLButtonElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  // Set when the control that had focus is about to be swapped out (D16), consumed after render.
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (document.activeElement === pauseRef.current) moveFocus.current = true;
      dispatch({ type: 'tick', duration });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, duration]);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (playing ? pauseRef : playRef).current?.focus();
  }, [playing]);

  // A tick that does not end the clip leaves focus where it is.
  useEffect(() => {
    if (playing) moveFocus.current = false;
  }, [playing, t]);

  const toggle = () => {
    moveFocus.current = true;
    dispatch({ type: 'toggle' });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'touch') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = clamp((e.clientX - r.left) / (r.width || 1), 0, 1);
    const py = clamp((e.clientY - r.top) / (r.height || 1), 0, 1);
    setTilt({
      ry: r2((px - 0.5) * 10),
      rx: r2(-(py - 0.5) * 8),
      gx: Math.round(px * 100),
      gy: Math.round(py * 100),
      glare: 1,
      mx: r2(clamp((px - 0.5) * el.offsetWidth * 0.12, -16, 16)),
      my: r2(clamp((py - 0.5) * el.offsetHeight * 0.12, -12, 12)),
    });
  };
  const view = reduced ? REST : tilt;

  const total = formatClock(duration);
  const caption = captions[Math.floor(t / CAPTION_S) % 4];
  const captionIndex = Math.floor(t / CAPTION_S);

  return (
    <section aria-label="Video" className={`a-up ${styles.video} ${top === 16 ? styles.top16 : ''}`} style={{ animationDelay: '.2s' }}>
      <div
        data-testid="video-frame"
        className={styles.frame}
        style={{ transform: `rotateX(${view.rx}deg) rotateY(${view.ry}deg)` }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setTilt(REST)}
      >
        <img className={`kb ${styles.poster}`} src={poster.src} alt={poster.alt} />
        <span aria-hidden="true" className={styles.shade} style={{ background: `rgba(24, 22, 19, ${playing ? 0.12 : 0.36})` }} />
        <span
          aria-hidden="true"
          data-testid="video-glare"
          className={styles.glare}
          style={{
            background: `radial-gradient(260px circle at ${view.gx}% ${view.gy}%, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0) 65%)`,
            opacity: view.glare,
          }}
        />

        {!playing && (
          <>
            <span className={styles.duration}>{total}</span>
            <div className={styles.cluster} style={{ transform: `translate(${view.mx}px, ${view.my}px)` }}>
              <svg aria-hidden="true" className={`orbit ${styles.orbit}`} width="124" height="124" viewBox="0 0 124 124">
                <defs>
                  <path id={orbitId} d="M62,62 m-51,0 a51,51 0 1,1 102,0 a51,51 0 1,1 -102,0" />
                </defs>
                <text fill="#FFFFFF" fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fontWeight="600" letterSpacing="2">
                  <textPath href={`#${orbitId}`} textLength="316" lengthAdjust="spacing">
                    {`PLAY · SAMPLE CLIP · ${total} · WATCH ·`}
                  </textPath>
                </text>
              </svg>
              <button ref={playRef} type="button" className={`press ${styles.play}`} aria-label={`Play video: ${title}`} onClick={toggle}>
                <span aria-hidden="true" className={`ring ${styles.ring}`} />
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
            <span className={styles.label}>
              <span className={styles.labelTitle}>{title}</span>
              <span className={styles.labelSub}>Video · Sample clip · Captions on</span>
            </span>
          </>
        )}

        {playing && (
          <span className={styles.nowPlaying} data-testid="now-playing">
            <span aria-hidden="true" className={styles.eqBars}>
              <span className={`eq ${styles.eqBar}`} />
              <span className={`eq ${styles.eqBar}`} style={{ animationDelay: '.2s' }} />
              <span className={`eq ${styles.eqBar}`} style={{ animationDelay: '.4s' }} />
            </span>
            {title}
          </span>
        )}
        {/* Mounted while idle too, so the first caption is announced when play starts. */}
        <div aria-live="polite" className={styles.captions}>
          {playing && (
            <span key={captionIndex} className={`a-cap ${styles.caption}`}>
              {caption}
            </span>
          )}
        </div>
        {playing && (
          <div className={styles.controls}>
            <button ref={pauseRef} type="button" className={`press ${styles.pause}`} aria-label="Pause video" onClick={toggle}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            </button>
            <span aria-hidden="true" className={styles.track}>
              <span data-testid="video-progress" className={styles.progress} style={{ width: `${((t / duration) * 100).toFixed(2)}%` }} />
            </span>
            <span className={styles.time}>{`${formatClock(t)} / ${total}`}</span>
          </div>
        )}
      </div>
    </section>
  );
}
