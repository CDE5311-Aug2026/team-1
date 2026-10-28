import type { ReactNode } from 'react';
import styles from './InfoCard.module.css';

interface InfoCardProps {
  /** Section name for assistive tech, e.g. "Visit". */
  label: string;
  /** Upper-case mono kicker, e.g. "VISIT". */
  kicker: string;
  /** Shown at the right of the kicker row (e.g. an open-now chip). */
  aside?: ReactNode;
  children: ReactNode;
  /** Card fade-up delay, s. Omit for a static card. */
  delay?: number;
  /** Kicker-only fade-up delay, s ("Look for"). */
  kickerDelay?: number;
  /** Top margin: 16 (default), 12 or 18. */
  top?: 12 | 16 | 18;
}

/** Surface panel with a mono kicker, then content. */
export function InfoCard({ label, kicker, aside, children, delay, kickerDelay, top = 16 }: InfoCardProps) {
  const kickerEl = (
    <p
      className={`${kickerDelay !== undefined ? 'a-up ' : ''}${styles.kicker}`}
      style={kickerDelay !== undefined ? { animationDelay: `${kickerDelay}s` } : undefined}
    >
      {kicker}
    </p>
  );
  return (
    <section
      aria-label={label}
      className={`${delay !== undefined ? 'a-up ' : ''}${styles.card} ${top === 12 ? styles.top12 : top === 18 ? styles.top18 : ''}`}
      style={delay !== undefined ? { animationDelay: `${delay}s` } : undefined}
    >
      {aside ? (
        <div className={styles.head}>
          {kickerEl}
          {aside}
        </div>
      ) : (
        kickerEl
      )}
      {children}
    </section>
  );
}
