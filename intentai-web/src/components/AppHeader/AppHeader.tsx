import { staticCopy } from '../../data/expressions';
import { usePersistentStore } from '../../data/persistentStore';
import { currentStreak } from '../../data/progress';
import { streakStore } from '../../data/stores';
import useToday from '../../hooks/useToday';
import HomeLink from '../HomeLink/HomeLink';
import Icon from '../Icon/Icon';
import StreakChip from '../StreakChip/StreakChip';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  onBell?: () => void;
  /** Extra reset when the mascot is pressed on Today itself (e.g. leave the lesson). */
  onHome?: () => void;
}

export default function AppHeader({ onBell, onHome }: AppHeaderProps) {
  const [streak] = usePersistentStore(streakStore);
  const count = currentStreak(streak, useToday());
  return (
    <header className={styles.header}>
      <HomeLink className={styles.logo} onClick={onHome} />
      <p className={styles.greeting}>
        {staticCopy.greeting}
        <Icon name="wave" size={17} />
      </p>
      <div className={styles.actions}>
        <StreakChip count={count} />
        <button type="button" className={styles.bellButton} onClick={onBell} aria-label="Notifications">
          <Icon name="bell" size={32} />
          <span className={styles.bellDot} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
