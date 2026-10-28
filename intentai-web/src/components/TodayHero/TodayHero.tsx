import { useId } from 'react';
import type { Holiday } from '../../data/holiday';
import { BERLIN_THUMB } from '../../data/homePlaces';
import styles from './TodayHero.module.css';

interface Props {
  holiday: Holiday;
  onOpenHoliday: () => void;
  onOpenAlso: (placeId: string) => void;
}

export function TodayHero({ holiday, onOpenHoliday, onOpenAlso }: Props) {
  const titleId = useId();
  const { also } = holiday;
  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <svg className={styles.dots} viewBox="0 0 48 32" aria-hidden="true" focusable="false">
        <circle cx="6" cy="26" r="2" />
        <circle cx="14" cy="14" r="2.4" />
        <circle cx="25" cy="7" r="2.8" />
        <circle cx="37" cy="6" r="2.4" />
        <circle cx="44" cy="14" r="2" />
      </svg>
      <p className={styles.kicker}>{holiday.kicker}</p>
      <h2 className={styles.title}>
        <button type="button" id={titleId} className={styles.main} onClick={onOpenHoliday}>
          {holiday.cardTitle}
        </button>
      </h2>
      <p className={styles.body}>{holiday.cardBody}</p>
      <button type="button" className={styles.row} onClick={() => onOpenAlso(also.placeId)}>
        <img className={styles.thumb} src={BERLIN_THUMB} alt="" width={40} height={40} />
        <span className={styles.rowText}>
          <span className={styles.rowKicker}>{also.when}</span>
          <span className={styles.rowTitle}>{also.title}</span>
        </span>
        <span className={styles.go} aria-hidden="true">
          →
        </span>
      </button>
    </section>
  );
}
