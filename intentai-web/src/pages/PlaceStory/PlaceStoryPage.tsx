import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import AppHeader from '../../components/AppHeader/AppHeader';
import { paths } from '../../routes';
import styles from '../HomePlacePage/HomePlacePage.module.css';

/** Culture card route. Cards are filled in by later work; until then every URL shows the not-found state. */
export default function PlaceStoryPage() {
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
