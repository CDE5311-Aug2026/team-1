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
  /** Show the "Good Morning" greeting (default). When false a spacer keeps streak + bell right-aligned. */
  greeting?: boolean;
  /** Replaces the mascot image (Home passes its own logo). */
  logoSrc?: string;
}

export default function AppHeader({ onBell, onHome, greeting = true, logoSrc }: AppHeaderProps) {
  const [streak] = usePersistentStore(streakStore);
  const count = currentStreak(streak, useToday());
  return (
    <header className={styles.header}>
      <HomeLink
        className={logoSrc ? `${styles.logo} ${styles.logoCustom}` : styles.logo}
        src={logoSrc}
        onClick={onHome}
      />
      {greeting ? (
        <p className={styles.greeting}>
          {staticCopy.greeting}
          <Icon name="wave" size={17} />
        </p>
      ) : (
        <span className={styles.spacer} aria-hidden="true" />
      )}
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
