import hero from '../../../assets/moments/passport-hero.jpg';
import type { PassportStats } from '../../../data/collection';
import type { Level } from '../../../data/domain';
import styles from './PassportCard.module.css';

interface PassportCardProps {
  stats: PassportStats;
  /** Onboarding quiz level; no stamp without one. */
  level?: Level;
}

const STATS: { key: keyof PassportStats; one: string; many: string }[] = [
  { key: 'phrases', one: 'phrase', many: 'phrases' },
  { key: 'topics', one: 'topic', many: 'topics' },
  { key: 'days', one: 'day', many: 'days' },
];

/** v2 passport hero (BellyBook-style): what the user has collected, over a local hawker photo. */
export default function PassportCard({ stats, level }: PassportCardProps) {
  return (
    <section className={styles.card} aria-label="Singlish passport">
      <img className={styles.photo} src={hero} alt="" width={960} height={345} />
      <div className={styles.overlay}>
        <p className={styles.kicker}>Singlish passport</p>
        <h2 className={styles.title}>My phrasebook</h2>
        <dl className={styles.stats}>
          {STATS.map(({ key, one, many }) => (
            <div key={key} className={styles.stat}>
              <dt className={styles.label}>{stats[key] === 1 ? one : many}</dt>
              <dd className={styles.number} data-stat={key}>
                {stats[key]}
              </dd>
            </div>
          ))}
        </dl>
        {stats.phrases === 0 && <p className={styles.hint}>Open a card below to collect your first phrase.</p>}
      </div>
      {level && <span className={styles.stamp}>{level}</span>}
    </section>
  );
}
