import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import AppHeader from '../../components/AppHeader/AppHeader';
import { paths } from '../../routes';
import styles from './PlaceNotFound.module.css';

/** Unknown place id or card facet: "Place not found" with a way back to Home. */
export default function PlaceNotFound() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className={styles.page}>
        <AppHeader onBell={() => navigate(paths.notices)} />
        <div className={styles.body}>
          <h1 className={styles.heading}>Place not found</h1>
          <p className={styles.soon}>We could not find that place.</p>
        </div>
        <button type="button" className={styles.back} onClick={() => navigate(paths.today)}>
          Back to Home
        </button>
      </div>
    </AppShell>
  );
}
