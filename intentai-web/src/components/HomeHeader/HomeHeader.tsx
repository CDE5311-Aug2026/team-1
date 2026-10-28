import { Link } from 'react-router-dom';
import { usePersistentStore } from '../../data/persistentStore';
import { currentStreak } from '../../data/progress';
import { streakStore } from '../../data/stores';
import useToday from '../../hooks/useToday';
import { paths } from '../../routes';
import styles from './HomeHeader.module.css';

interface Props {
  logoSrc: string;
}

/** Home's header: logo, the streak chip (to Moments) and the bell (to Community). */
export default function HomeHeader({ logoSrc }: Props) {
  const [streak] = usePersistentStore(streakStore);
  const count = currentStreak(streak, useToday());
  return (
    <header className={`a-up ${styles.header}`}>
      <img className={styles.logo} src={logoSrc} alt="IntentAI" width={44} height={44} />
      <span className={styles.spacer} />
      <Link to={paths.moments} className={`press ${styles.streak}`} aria-label={`${count} day streak. See your rank and badges`}>
        <span className={styles.flame} aria-hidden="true">
          <svg className="flick" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.2 2.2-5.3 3.6-7.4.3 1.9 1.3 3 2.4 3.6C11.3 7.6 12.6 5 15.2 3c-.3 2.8.6 4.6 1.9 6.2 1 1.3 1.9 2.8 1.9 5C19 18.4 16.1 21 12 21Z" />
          </svg>
        </span>
        {/* The count rolls up from the day before to today's. */}
        <span className={styles.digits} aria-hidden="true" data-testid="streak-count">
          <span className={`roll ${styles.strip}`}>
            <span>{count - 1}</span>
            <span>{count}</span>
          </span>
        </span>
        <span className={styles.day} aria-hidden="true">
          day
        </span>
      </Link>
      <Link to={paths.community} className={`press ${styles.bell}`} aria-label="Notifications: Mei answered your question">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15Z" />
          <path d="M10 20.5a2 2 0 0 0 4 0" />
        </svg>
        <span className={styles.dot} aria-hidden="true" data-testid="bell-dot">
          <span className={`ping ${styles.dotRing}`} />
          <span className={styles.dotCore} />
        </span>
      </Link>
    </header>
  );
}
