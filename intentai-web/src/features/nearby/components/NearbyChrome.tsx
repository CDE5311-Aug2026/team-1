import { useNavigate } from 'react-router-dom';
import backChevron from '../../../assets/nearby/back-chevron.svg';
import { isPersisting } from '../actions';
import styles from './Nearby.module.css';

/** Back button + title for detail screens. Back restores the previous exploration state (history). */
export function BackHeader({ title, fallback }: { title: string; fallback: string }) {
  const navigate = useNavigate();
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback);
  };
  return (
    <header className={styles.backHeader}>
      <button type="button" className={styles.back} onClick={back} aria-label="Back">
        <img src={backChevron} alt="" width={16} height={16} />
      </button>
      <h1 className={styles.detailTitle}>{title}</h1>
    </header>
  );
}

/** Storage failed: be honest that nothing is kept after this tab closes. */
export function StorageWarning() {
  if (isPersisting()) return null;
  return (
    <p className={styles.warning} role="status">
      Changes will not be saved on this device.
    </p>
  );
}
