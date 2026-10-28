import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import AppHeader from '../../components/AppHeader/AppHeader';
import { homePlace } from '../../data/homePlaces';
import { paths } from '../../routes';
import styles from './HomePlacePage.module.css';

export default function HomePlacePage() {
  const navigate = useNavigate();
  const { placeId = '' } = useParams();
  const place = homePlace(placeId);

  return (
    <AppShell>
      <div className={styles.page}>
        <AppHeader onBell={() => navigate(paths.notices)} />
        {place ? (
          <article className={styles.body}>
            {place.photo ? (
              <figure className={styles.figure}>
                <img className={styles.photo} src={place.photo} alt={place.photoAlt} />
                {place.credit && <figcaption className={styles.credit}>{place.credit}</figcaption>}
              </figure>
            ) : (
              <div className={styles.noPhoto} aria-hidden="true" />
            )}
            <h1 className={styles.heading}>{place.name}</h1>
            <p className={styles.area}>{place.area}</p>
            <p className={styles.soon}>Culture cards are coming soon</p>
          </article>
        ) : (
          <div className={styles.body}>
            <h1 className={styles.heading}>Place not found</h1>
            <p className={styles.soon}>We could not find that place.</p>
          </div>
        )}
        <button type="button" className={styles.back} onClick={() => navigate(paths.today)}>
          Back to Home
        </button>
      </div>
    </AppShell>
  );
}
