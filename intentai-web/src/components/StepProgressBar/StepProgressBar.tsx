import styles from './StepProgressBar.module.css';

interface StepProgressBarProps {
  total: number;
  current: number;
}

export default function StepProgressBar({ total, current }: StepProgressBarProps) {
  return (
    <div className={styles.row} role="progressbar" aria-label="Lesson step" aria-valuemin={0} aria-valuemax={total} aria-valuenow={current}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < current ? `${styles.bar} ${styles.filled}` : styles.bar} />
      ))}
    </div>
  );
}
