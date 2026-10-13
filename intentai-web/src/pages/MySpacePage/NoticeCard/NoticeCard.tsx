import type { ReactNode } from 'react';
import dotAmber from '../../../assets/my-space/dot-amber.svg';
import dotGreen from '../../../assets/my-space/dot-green.svg';
import dotRed from '../../../assets/my-space/dot-red.svg';
import styles from './NoticeCard.module.css';

const TONES = {
  green: { dot: dotGreen, chip: styles.chipGreen },
  amber: { dot: dotAmber, chip: styles.chipAmber },
  red: { dot: dotRed, chip: styles.chipRed },
};

interface NoticeCardProps {
  chip: string;
  tone: keyof typeof TONES;
  time: string;
  title: string;
  description?: string;
  /** Card border: the default grey, or the outcome colour of a resolved notice (Figma 21:1487 / 21:1528). */
  border?: 'default' | 'confirmed' | 'rejected';
  /** Rendered at the right of the header row (the Dismiss button). */
  headerAction?: ReactNode;
  children?: ReactNode;
  nodeId: string;
}

/** "Notice / …" card: status chip + time, title, optional description and footer actions. */
export default function NoticeCard({
  chip,
  tone,
  time,
  title,
  description,
  border = 'default',
  headerAction,
  children,
  nodeId,
}: NoticeCardProps) {
  return (
    <article className={border === 'default' ? styles.card : `${styles.card} ${styles[border]}`} data-node-id={nodeId}>
      <div className={styles.header}>
        <span className={`${styles.chip} ${TONES[tone].chip}`}>
          <img src={TONES[tone].dot} alt="" width={6} height={6} />
          {chip}
        </span>
        <span className={styles.time}>{time}</span>
        {headerAction}
      </div>
      <div className={styles.text}>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {children}
    </article>
  );
}
