import { motion, useReducedMotionConfig } from 'motion/react';
import { useId } from 'react';
import styles from './Stamp.module.css';

export type StampShape = 'round' | 'card';

interface StampArtProps {
  shape: StampShape;
  name: string;
  /** "02 NOV 2026" */
  date?: string;
  filled?: boolean;
}

/** The stamp drawing (no place-specific art: the area name and the check-in date, like a passport entry stamp). */
function StampArt({ shape, name, date, filled }: StampArtProps) {
  const id = useId().replace(/:/g, '');
  const upper = name.toUpperCase();
  const fit = (max: number, size: number) => (upper.length * size * 0.6 > max ? { textLength: max, lengthAdjust: 'spacingAndGlyphs' as const } : {});
  if (shape === 'card') {
    return (
      <svg viewBox="0 0 150 104" className={styles.svg} aria-hidden="true">
        <rect x="2" y="2" width="146" height="100" rx="11" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.13 : 0} stroke="currentColor" strokeWidth="3" />
        <rect x="9" y="9" width="132" height="86" rx="7" fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="3 2.5" />
        <text x="75" y="36" textAnchor="middle" className={styles.name} {...fit(118, 12.5)}>
          {upper}
        </text>
        <path d="M30 50h90" stroke="currentColor" strokeWidth="1.2" />
        <path d="M68 56l7 9 7-9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <text x="75" y="84" textAnchor="middle" className={styles.small}>
          {date ? `${date} · SINGAPORE` : 'SINGAPORE'}
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 104 104" className={styles.svg} aria-hidden="true">
      <defs>
        <path id={`top${id}`} d="M16 52a36 36 0 0 1 72 0" />
        <path id={`bottom${id}`} d="M16 52a36 36 0 0 0 72 0" />
      </defs>
      <circle cx="52" cy="52" r="49" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.13 : 0} stroke="currentColor" strokeWidth="3" />
      <circle cx="52" cy="52" r="42" fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="3 2.5" />
      <text className={styles.ring}>
        <textPath href={`#top${id}`} startOffset="50%" textAnchor="middle">
          INTENTAI · SINGAPORE
        </textPath>
      </text>
      {date && (
        <text className={styles.ring}>
          <textPath href={`#bottom${id}`} startOffset="50%" textAnchor="middle">
            {date}
          </textPath>
        </text>
      )}
      <path d="M52 34l2.4 6.2 6.2 2.4-6.2 2.4L52 51.2l-2.4-6.2-6.2-2.4 6.2-2.4z" fill="currentColor" />
      <text x="52" y="66" textAnchor="middle" className={styles.roundName} {...fit(60, 10)}>
        {upper}
      </text>
    </svg>
  );
}

interface StampProps extends StampArtProps {
  /** 0–1: the share of the place's cards opened. */
  ink: number;
  /** Thump in (a check-in made today). */
  thump?: boolean;
  /** Animation delay, seconds. */
  delay?: number;
  className?: string;
}

/**
 * A collected stamp: a faint print with the ink layer on top, clipped from the bottom up to the share of cards opened.
 * Today's stamp thumps in. Reduced motion: drawn at once.
 */
export default function Stamp({ ink, thump, delay = 0, className, ...art }: StampProps) {
  const reduce = useReducedMotionConfig();
  const top = `${Math.round((1 - Math.max(0, Math.min(1, ink))) * 100)}%`;
  return (
    <motion.span
      className={`${styles.stamp} ${art.shape === 'card' ? styles.card : styles.round} ${className ?? ''}`}
      initial={thump && !reduce ? { scale: 1.6, rotate: -14, opacity: 0 } : false}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 16, mass: 0.9, delay }}
    >
      <span className={styles.base}>
        <StampArt {...art} />
      </span>
      <motion.span
        className={styles.ink}
        initial={reduce ? false : { clipPath: 'inset(100% 0 0 0)' }}
        animate={{ clipPath: `inset(${top} 0 0 0)` }}
        transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.3, 0.8, 0.3, 1], delay: delay + (thump ? 0.35 : 0.15) }}
      >
        <StampArt {...art} filled />
      </motion.span>
    </motion.span>
  );
}
