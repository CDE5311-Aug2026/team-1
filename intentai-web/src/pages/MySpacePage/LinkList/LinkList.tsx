import type { ReactNode } from 'react';
import { ChevronRight } from '../icons';
import styles from './LinkList.module.css';

export interface LinkRow {
  label: string;
  value?: string;
  icon: ReactNode;
  /** Icon chip colours: background and foreground. */
  tone: readonly [string, string];
  onSelect: () => void;
  /** Overrides the accessible name (defaults to label and value). */
  ariaLabel?: string;
  /** The value shows the user's answers: keep this row's tap out of usage timings. */
  noTrack?: boolean;
}

/** White card of tappable rows: icon chip, label, optional value, chevron. */
export default function LinkList({ rows, label }: { rows: LinkRow[]; label?: string }) {
  return (
    <ul className={styles.card} aria-label={label}>
      {rows.map((row) => (
        <li key={row.label} className={styles.item} data-no-track={row.noTrack || undefined}>
          <button type="button" className={styles.row} onClick={row.onSelect} aria-label={row.ariaLabel}>
            <span className={styles.chip} style={{ background: row.tone[0], color: row.tone[1] }} aria-hidden="true">
              {row.icon}
            </span>
            <span className={styles.text}>
              <span className={styles.label}>{row.label}</span>
              {row.value && <span className={styles.value}>{row.value}</span>}
            </span>
            <span className={styles.chevron} aria-hidden="true">
              <ChevronRight />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
