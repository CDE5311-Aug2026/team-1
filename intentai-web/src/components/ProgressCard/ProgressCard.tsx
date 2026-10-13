import Icon from '../Icon/Icon';
import styles from './ProgressCard.module.css';

interface ProgressCardProps {
  variant: 'full' | 'compact';
  learnedCount: number;
  total: number;
  onStart?: () => void;
  title?: string;
  nodeId?: string;
}

export default function ProgressCard({ variant, learnedCount, total, onStart, title, nodeId }: ProgressCardProps) {
  const cardClass = variant === 'compact' ? `${styles.card} ${styles.compact}` : `${styles.card} ${styles.full}`;

  return (
    <div className={cardClass} data-node-id={nodeId}>
      {title && <h1 className={styles.title}>{title}</h1>}
      <div className={styles.row}>
        <span className={styles.iconTile}>
          <Icon name="sunrise" size={30} />
        </span>
        <div className={styles.body}>
          <p className={styles.label}>
            {learnedCount} of {total} learned today
          </p>
          <div className={styles.segments} role="progressbar" aria-label="Expressions learned today" aria-valuemin={0} aria-valuemax={total} aria-valuenow={learnedCount}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={i < learnedCount ? `${styles.segment} ${styles.filled}` : styles.segment} />
            ))}
          </div>
        </div>
        {variant === 'full' && (
          <button type="button" className={styles.startButton} onClick={onStart}>
            Start
          </button>
        )}
      </div>
    </div>
  );
}
