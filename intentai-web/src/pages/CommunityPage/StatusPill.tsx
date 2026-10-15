import dotAnswered from '../../assets/community/dot-answered.svg';
import dotPending from '../../assets/community/dot-pending.svg';
import type { QuestionStatus } from '../../data/domain';
import styles from './StatusPill.module.css';

/** Figma "pill": Pending (orange) or Answered (green), with a 6px dot. */
export default function StatusPill({ status }: { status: QuestionStatus }) {
  const answered = status === 'Answered';
  return (
    <span className={answered ? styles.answered : styles.pending}>
      <img src={answered ? dotAnswered : dotPending} alt="" className={styles.dot} />
      {status}
    </span>
  );
}
