import type { ReactNode } from 'react';
import styles from './Timeline.module.css';

export interface TimelineRow {
  /** Mono date label, e.g. "1989 · 9 NOV". */
  date: string;
  text: ReactNode;
  /** ring = white with orange ring, fill = orange, here = dark "you are here / today" dot. */
  dot: 'ring' | 'fill' | 'here';
  /** Row fade-up delay, s. */
  delay: number;
  /** Dot pop delay, s (default delay + .1). */
  dotDelay?: number;
  /** Full-width photo under the text, 132 high, with its credit line. */
  image?: { src: string; alt: string; credit: string };
  /** 64 px photo beside the text. */
  thumb?: { src: string; alt: string };
  /** Anything else under the text (map crop, chips). */
  extra?: ReactNode;
}

interface TimelineProps {
  rows: readonly TimelineRow[];
  /** Footer source line. */
  source: ReactNode;
  /** Spine ends 44 px above the bottom and grows over 2 s (p11) instead of 40 px / 1.6 s. */
  longSpine?: boolean;
}

const round = (s: number) => Math.round(s * 100) / 100;

/** Timeline card: spine, rows with dots, optional photos, source line. */
export function Timeline({ rows, source, longSpine = false }: TimelineProps) {
  return (
    <section aria-label="Timeline" className={styles.card}>
      <span aria-hidden="true" className={`a-line ${longSpine ? 'a-line-long' : ''} ${styles.spine} ${longSpine ? styles.spineLong : ''}`} />
      <ol className={styles.rows}>
        {rows.map((row) => (
          <li key={row.date} className={`a-up ${styles.row}`} style={{ animationDelay: `${row.delay}s` }}>
            <span
              aria-hidden="true"
              data-dot={row.dot}
              className={`a-dot ${styles.dot} ${styles[row.dot]}`}
              style={{ animationDelay: `${round(row.dotDelay ?? row.delay + 0.1)}s` }}
            />
            <p className={styles.date}>{row.date}</p>
            {row.thumb ? (
              <div className={styles.withThumb}>
                <p className={`${styles.text} ${styles.textBeside}`}>{row.text}</p>
                <img className={styles.thumb} src={row.thumb.src} alt={row.thumb.alt} />
              </div>
            ) : (
              <p className={styles.text}>{row.text}</p>
            )}
            {row.image && (
              <>
                <img className={styles.image} src={row.image.src} alt={row.image.alt} />
                <p className={styles.credit}>{row.image.credit}</p>
              </>
            )}
            {row.extra}
          </li>
        ))}
      </ol>
      <p className={styles.source}>{source}</p>
    </section>
  );
}
