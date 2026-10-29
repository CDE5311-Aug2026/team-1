import { useId, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Holiday } from '../../data/holiday';
import { BERLIN_THUMB } from '../../data/homePlaces';
import styles from './TodayHero.module.css';

interface Props {
  holiday: Holiday;
  onOpenHoliday: () => void;
  onOpenAlso: (placeId: string) => void;
}

/** Spotlight rest position (px from the card's top-left). */
const SPOT_REST = { x: 300, y: 20 };

/** Twinkling confetti dots, top right: colour, size and lift as drawn. */
const TWINKLES = [
  { color: '#f4b389', size: 6, lift: 0 },
  { color: '#e4671f', size: 7, lift: 5 },
  { color: '#c2410c', size: 6, lift: 8 },
  { color: '#e4671f', size: 7, lift: 5 },
  { color: '#f4b389', size: 6, lift: 0 },
];

export function TodayHero({ holiday, onOpenHoliday, onOpenAlso }: Props) {
  const titleId = useId();
  const { also } = holiday;
  const [spot, setSpot] = useState(SPOT_REST);
  // "Sat 7 Nov · Long weekend": the part after the last dot shimmers.
  const cut = holiday.kicker.lastIndexOf(' · ');
  const lead = cut >= 0 ? holiday.kicker.slice(0, cut + 3) : '';
  const shine = cut >= 0 ? holiday.kicker.slice(cut + 3) : holiday.kicker;

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSpot({ x: Math.round(e.clientX - r.left), y: Math.round(e.clientY - r.top) });
  };

  return (
    <section
      className={`a-up ${styles.card}`}
      aria-labelledby={titleId}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setSpot(SPOT_REST)}
      style={{ '--spot-x': `${spot.x}px`, '--spot-y': `${spot.y}px` } as CSSProperties}
      data-testid="today-hero"
    >
      <span className={styles.spot} aria-hidden="true" />
      <span className={styles.dots} aria-hidden="true">
        {TWINKLES.map((t, i) => (
          <span
            key={i}
            className={`tw ${styles.twinkle}`}
            style={{ width: t.size, height: t.size, background: t.color, marginBottom: t.lift, animationDelay: `${(i * 0.3).toFixed(1)}s` }}
          />
        ))}
      </span>
      <p className={styles.kicker}>
        {lead}
        <span className="shiny">{shine}</span>
      </p>
      <h2 className={styles.title}>
        <button type="button" id={titleId} className={styles.main} onClick={onOpenHoliday}>
          {holiday.cardTitle}
        </button>
      </h2>
      <p className={styles.body}>{holiday.cardBody}</p>
      <button type="button" className={`press ${styles.row}`} onClick={() => onOpenAlso(also.placeId)}>
        <img className={styles.thumb} src={BERLIN_THUMB} alt="" width={44} height={44} />
        <span className={styles.rowText}>
          <span className={styles.rowKicker}>{also.when}</span>
          <span className={styles.rowTitle}>{also.title}</span>
        </span>
        <span className={styles.go} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </button>
    </section>
  );
}
