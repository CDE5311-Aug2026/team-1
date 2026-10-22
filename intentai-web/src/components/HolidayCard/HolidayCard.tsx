import type { Holiday } from '../../data/holiday';
import styles from './HolidayCard.module.css';

interface HolidayCardProps {
  holiday: Holiday;
  onLearnMore: () => void;
}

/** Today's holiday card (v2): replaces v1's Singlish progress card. Holds the page's h1. */
export default function HolidayCard({ holiday, onLearnMore }: HolidayCardProps) {
  return (
    <section className={styles.card} aria-labelledby="holiday-title">
      <p className={styles.kicker}>{holiday.today}</p>
      <h1 id="holiday-title" className={styles.title}>
        {holiday.cardTitle}
      </h1>
      <div className={styles.row}>
        <p className={styles.body}>{holiday.cardBody}</p>
        <button type="button" className={styles.more} onClick={onLearnMore}>
          Learn more
        </button>
      </div>
    </section>
  );
}
