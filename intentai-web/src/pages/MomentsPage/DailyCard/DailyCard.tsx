import iconDailyCard from '../../../assets/moments/icon-daily-card.svg';
import Toggle from '../../../components/Toggle/Toggle';
import type { Lookup } from '../../../data/domain';
import styles from './DailyCard.module.css';

interface DailyCardProps {
  on: boolean;
  /** Today's phrase while the card is on; undefined when nothing is saved. */
  today?: Lookup;
  onChange: (on: boolean) => void;
}

/** Figma "Setting / Daily card" (4:937): off by default; when on, it shows one saved phrase a day. */
export default function DailyCard({ on, today, onChange }: DailyCardProps) {
  let title = 'Show a daily card';
  let subtitle = 'One saved phrase a day · off by default';
  if (on) {
    title = today ? `Today's card: ${today.word}` : 'No saved phrases yet';
    subtitle = today ? today.meaning : 'Look up a phrase to start.';
  }

  return (
    <section className={styles.card} aria-label="Daily card" data-node-id="4:937">
      <span className={styles.tile}>
        <img src={iconDailyCard} alt="" width={18} height={18} />
      </span>
      <div className={styles.text} aria-live="polite">
        <p className={styles.title}>{title}</p>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <Toggle label="Show a daily card" checked={on} onChange={onChange} nodeId="4:941" />
    </section>
  );
}
