// Checking in is a rubber stamp pressed into the book: the wooden stamp comes down, the page takes the blow, and a red
// postmark is left in the ink. Once stamped, the page keeps the mark.
import { useEffect, useRef, useState } from 'react';
import styles from './rubberStamp.module.css';

const reduced = () => document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function RubberStamp({
  place,
  date,
  done,
  label,
  onStamp,
}: {
  /** Printed round the rim of the mark. */
  place: string;
  /** In the middle of the mark. */
  date: string;
  done: boolean;
  /** What pressing it means (shown until stamped). */
  label: string;
  onStamp(): void;
}) {
  const [phase, setPhase] = useState<'idle' | 'down' | 'up'>('idle');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function press() {
    if (done || phase !== 'idle') return;
    if (reduced()) return onStamp();
    setPhase('down');
    // the moment it hits the paper: the mark is made and the page records it; then the stamp lifts away
    timers.current.push(window.setTimeout(() => onStamp(), 430));
    timers.current.push(window.setTimeout(() => setPhase('up'), 520));
    timers.current.push(window.setTimeout(() => setPhase('idle'), 1300));
  }

  const ring = `${place.toUpperCase()} · CHECKED IN · FINDSG · `;
  return (
    <div className={styles.pad} data-nodrag data-phase={phase} data-done={done || undefined}>
      {/* the postmark, inked once the stamp has come down */}
      <svg className={styles.mark} viewBox="0 0 120 120" aria-hidden={!done} role="img" aria-label={done ? `Checked in at ${place}` : undefined}>
        <defs>
          <path id="stamp-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <circle cx="60" cy="60" r="56" />
        <circle cx="60" cy="60" r="33" />
        <text className={styles.ringText}>
          <textPath href="#stamp-ring" textLength="272">
            {ring}
          </textPath>
        </text>
        <text x="60" y="56" className={styles.mid}>
          ARRIVED
        </text>
        <text x="60" y="72" className={styles.date}>
          {date}
        </text>
      </svg>
      {/* it stays in the hand until it has lifted away */}
      {(!done || phase !== 'idle') && (
        <button type="button" className={styles.stamp} onClick={press} aria-label={label} disabled={done}>
          <span className={styles.knob} aria-hidden="true" />
          <span className={styles.neck} aria-hidden="true" />
          <span className={styles.block} aria-hidden="true" />
        </button>
      )}
      {!done && phase === 'idle' && <p className={styles.hint}>{label}</p>}
    </div>
  );
}
