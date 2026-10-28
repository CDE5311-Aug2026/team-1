import { useNavigate } from 'react-router-dom';
import { usePersistentStore } from '../../../data/persistentStore';
import { onboardingStore, placeStoriesStore, questionsStore } from '../../../data/stores';
import { paths } from '../../../routes';
import { mrzLine } from '../../Onboarding/PassportCard/passport';
import { passportStats } from '../stats';
import styles from './PassportSummary.module.css';

/** Canvas S1 passport: holder row, photo, Explorer rank link, stats and the MRZ line. */
export default function PassportSummary() {
  const navigate = useNavigate();
  const [onboarding] = usePersistentStore(onboardingStore);
  const [stories] = usePersistentStore(placeStoriesStore);
  const [questions] = usePersistentStore(questionsStore);
  const stats = passportStats(stories, questions);
  const rows = [
    ['Stamps', stats.stamps],
    ['Cards', stats.cards],
    ['Tips', stats.tips],
  ] as const;

  return (
    <section aria-label="Your passport" className={styles.card}>
      <span aria-hidden="true" className={styles.texture} />
      <div className={styles.top} aria-hidden="true">
        <span className={styles.holder}>HOLDER</span>
        <span className={styles.rule} />
        <span className={styles.sgp}>SGP</span>
      </div>
      <div className={styles.body}>
        <span aria-hidden="true" className={styles.photo}>
          <span className={styles.avatar}>W</span>
          <span className={styles.sweep} />
        </span>
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>W</span>
            <button type="button" className={styles.rank} onClick={() => navigate(paths.moments)} aria-label="Explorer rank: open Moments">
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="#E4671F">
                <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z" />
              </svg>
              Explorer
            </button>
          </div>
          <dl className={styles.stats}>
            {rows.map(([label, value]) => (
              <div key={label} className={styles.stat}>
                <dt className={styles.statLabel}>{label}</dt>
                <dd className={styles.statValue}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p aria-hidden="true" className={styles.mrz} data-testid="mrz">
        {mrzLine(onboarding)}
      </p>
    </section>
  );
}
