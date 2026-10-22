import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import back from '../../assets/my-space/back-chevron.svg';
import AppShell from '../../components/AppShell/AppShell';
import { todaysHoliday } from '../../data/holiday';
import { recordLearningDay } from '../../data/progress';
import { streakStore } from '../../data/stores';
import { paths } from '../../routes';
import styles from './HolidayPage.module.css';

/** Today's holiday in depth (v2): opened from the holiday card's Learn more. */
export default function HolidayPage() {
  const navigate = useNavigate();
  const holiday = todaysHoliday;

  // Reading the holiday counts as today's learning for the streak (decided 2026-10-19).
  useEffect(() => {
    streakStore.set((streak) => recordLearningDay(streak));
  }, []);

  return (
    <AppShell>
      <div className={styles.body}>
        <button type="button" className={styles.back} onClick={() => navigate(paths.today)}>
          <img src={back} alt="" width={16} height={16} />
          Back to Today
        </button>
        <article className={styles.card}>
          <img
            className={styles.photo}
            src={holiday.image.src}
            alt={holiday.image.alt}
            width={1280}
            height={720}
          />
          <p className={styles.kicker}>{holiday.today}</p>
          <h1 className={styles.title}>{holiday.name}</h1>
          <p className={styles.lede}>{holiday.cardBody}</p>

          <h2 className={styles.heading}>{holiday.detailHeading}</h2>
          <ul className={styles.facts}>
            {holiday.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>

          <h2 className={styles.heading}>The deeper read</h2>
          {holiday.deeper.map((paragraph) => (
            <p key={paragraph} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
          <div className={styles.source}>
            <p>Source: {holiday.source}</p>
            <a className={styles.credit} href={holiday.image.url} target="_blank" rel="noopener noreferrer">
              {holiday.image.credit}
            </a>
          </div>
        </article>
      </div>
    </AppShell>
  );
}
