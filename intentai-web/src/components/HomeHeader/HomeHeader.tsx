import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { visitedSet } from '../../data/ura/ura';
import { useExplorePersonal } from '../../features/nearby/actions';
import { paths } from '../../routes';
import styles from './HomeHeader.module.css';

interface Props {
  logoSrc: string;
}

/** Home's header: the logo, and the passport chip (places explored, to the passport in Mine). */
export default function HomeHeader({ logoSrc }: Props) {
  const personal = useExplorePersonal();
  const explored = useMemo(() => visitedSet(personal).size, [personal]);
  const label = `${explored} ${explored === 1 ? 'place' : 'places'}`;
  return (
    <header className={`a-up ${styles.header}`}>
      <img className={styles.logo} src={logoSrc} alt="FindSG" width={44} height={44} />
      <span className={styles.spacer} />
      <Link to={paths.mySpace} className={`press ${styles.passport}`} aria-label={`${label} explored. Open your passport`}>
        <span className={styles.stamp} aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
          >
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <circle cx="12" cy="10.5" r="3" />
            <path d="M9 16.5h6" />
          </svg>
        </span>
        <span className={styles.count} aria-hidden="true">
          {explored}
        </span>
        <span className={styles.unit} aria-hidden="true">
          {explored === 1 ? 'place' : 'places'}
        </span>
      </Link>
    </header>
  );
}
