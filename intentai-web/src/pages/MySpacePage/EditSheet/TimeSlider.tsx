import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { OnbTime } from '../../../data/domain';
import { TIMES } from '../../Onboarding/options';
import styles from './TimeSlider.module.css';

const SHORT = ['< 3 mo', '3–12 mo', '1–3 yr', '3+ yr'] as const;
const METER = [100, 86, 70, 54] as const;
export const TIME_HELPER = 'Drag along the timeline. Cards add less background the longer you stay.';

/** Canvas S4: the four-stop "time in Singapore" timeline (drag, tap, or arrow keys). */
export default function TimeSlider({ value, onChange }: { value: OnbTime | null; onChange: (value: OnbTime) => void }) {
  const idx = Math.max(0, TIMES.findIndex((t) => t.code === value));
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const stop = TIMES[idx];

  const setIndex = (i: number) => {
    const next = Math.min(3, Math.max(0, i));
    if (TIMES[next].code !== value) onChange(TIMES[next].code);
  };

  const fractionAt = (clientX: number) => {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return idx / 3;
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
  };

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerdown') e.currentTarget.setPointerCapture?.(e.pointerId);
    else if (drag === null) return;
    const f = fractionAt(e.clientX);
    setDrag(f);
    setIndex(Math.round(f * 3));
  };

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowRight: idx + 1, ArrowUp: idx + 1, ArrowLeft: idx - 1, ArrowDown: idx - 1, Home: 0, End: 3 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    setIndex(moves[e.key]);
  };

  const position = drag ?? idx / 3;

  return (
    <div>
      <div className={styles.summary}>
        <span key={stop.code} className={styles.icon} aria-hidden="true">
          {idx + 1}
        </span>
        <span className={styles.summaryText}>
          <span className={styles.summaryTitle}>{stop.label}</span>
          <span className={styles.summarySub}>{stop.sub}</span>
        </span>
        <span className={styles.meter} aria-hidden="true">
          {METER.map((w, j) => (
            <span key={w} className={`${styles.bar} ${j === 0 ? styles.barFirst : ''}`} style={{ width: `${w}%`, opacity: j < 4 - idx ? 1 : 0 }} />
          ))}
        </span>
      </div>
      <div
        className={styles.box}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <div ref={trackRef} className={styles.track}>
          <span className={`${styles.fill} ${drag === null ? styles.snap : ''}`} style={{ width: `${position * 100}%` }} />
          {TIMES.map((t, j) => (
            <span key={t.code} className={`${styles.stop} ${j <= idx ? styles.stopOn : ''}`} style={{ left: `${(j / 3) * 100}%` }} />
          ))}
          <span
            role="slider"
            tabIndex={0}
            aria-label="Time in Singapore"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={idx}
            aria-valuetext={stop.label}
            className={`${styles.thumb} ${drag === null ? styles.snap : ''}`}
            style={{ left: `${position * 100}%` }}
            onKeyDown={onKey}
          />
        </div>
        <div className={styles.labels} aria-hidden="true">
          {SHORT.map((s, j) => (
            <span key={s} className={j === idx ? styles.labelOn : undefined} style={{ left: `${(j / 3) * 100}%` }}>
              {s}
            </span>
          ))}
        </div>
      </div>
      <p className={styles.helper}>{TIME_HELPER}</p>
    </div>
  );
}
