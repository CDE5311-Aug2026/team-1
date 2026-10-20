import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import backChevron from '../../../assets/nearby/back-chevron.svg';
import HomeLink from '../../../components/HomeLink/HomeLink';
import { paths } from '../../../routes';
import { isPersisting } from '../actions';
import styles from './Nearby.module.css';

/** Title row shared by the Nearby sections: mascot, title, optional location/area chip. */
export function NearbyHeader({ title, chip }: { title: string; chip?: ReactNode }) {
  return (
    <header className={styles.header}>
      <HomeLink className={styles.logo} />
      <h1 className={styles.title}>{title}</h1>
      {chip}
    </header>
  );
}

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

/** Explore / Collections / Saved — navigation inside Nearby (the five bottom tabs stay as they are). */
export function SectionNav() {
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? `${styles.section} ${styles.sectionActive}` : styles.section);
  return (
    <nav className={styles.sections} aria-label="Nearby sections">
      <NavLink to={paths.nearby} end className={cls}>
        Explore
      </NavLink>
      <NavLink to={paths.collections} className={cls}>
        Collections
      </NavLink>
      <NavLink to={paths.saved} className={cls}>
        Saved
      </NavLink>
    </nav>
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
