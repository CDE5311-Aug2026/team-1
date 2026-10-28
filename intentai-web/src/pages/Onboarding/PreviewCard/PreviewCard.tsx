import type { ReactNode } from 'react';
import type { OnbPhoto } from '../options';
import motion from '../Onboarding.module.css';
import styles from './PreviewCard.module.css';

/** Kicker line plus the white card; the border is dashed while the step has no answer yet. */
export function PreviewCard({ kicker, empty, children }: { kicker: string; empty: boolean; children: ReactNode }) {
  return (
    <>
      <p className={styles.kicker}>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8Z" />
        </svg>
        {kicker}
      </p>
      <div className={`${styles.card} ${empty ? styles.cardEmpty : ''}`}>{children}</div>
    </>
  );
}

export interface PreviewRowProps {
  photo: OnbPhoto;
  /** Omitted for the empty state: the row then reads "Your preview" with a greyed thumb. */
  title?: string;
  chip?: string;
  /** Small orange badge on the thumb (topics: the #1 rank). */
  badge?: string;
  body: string;
  /** Extra column on the right (time: the meter). */
  aside?: ReactNode;
}

/** One preview row: thumb, title (+chip), 3-line body. Give it a `key` per answer so the swap animation replays. */
export function PreviewRow({ photo, title, chip, badge, body, aside }: PreviewRowProps) {
  const empty = title === undefined;
  return (
    <div className={`${styles.row} ${motion.aSwap}`}>
      <span className={styles.thumb} aria-hidden="true">
        <img src={photo.src} alt="" className={empty ? styles.thumbEmpty : undefined} />
        {badge !== undefined && <span className={styles.badge}>{badge}</span>}
      </span>
      <span className={styles.text}>
        <span className={styles.titleLine}>
          <span className={`${styles.title} ${empty ? styles.titleEmpty : ''}`}>{empty ? 'Your preview' : title}</span>
          {chip !== undefined && <span className={styles.chip}>{chip}</span>}
        </span>
        <span className={styles.body}>{body}</span>
      </span>
      {aside}
    </div>
  );
}
