import Icon from '../Icon/Icon';
import styles from './StreakChip.module.css';

interface StreakChipProps {
  count: number;
}

export default function StreakChip({ count }: StreakChipProps) {
  return (
    <span className={styles.chip} aria-label={`${count} day streak`}>
      <Icon name="fire" size={18} />
      <span className={styles.count}>{count}</span>
    </span>
  );
}
