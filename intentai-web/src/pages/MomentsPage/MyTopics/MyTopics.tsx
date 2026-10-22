import type { TopicProgress } from '../../../data/collection';
import { TOPIC_ICON } from '../../OnboardingPage/topicArt';
import styles from './MyTopics.module.css';

/** BellyBook's "My Cuisines" for Singlish: each onboarding topic and how much of it is collected. */
export default function MyTopics({ progress }: { progress: TopicProgress[] }) {
  return (
    <section className={styles.section} aria-labelledby="my-topics-heading">
      <h2 id="my-topics-heading" className={styles.heading}>
        My topics
      </h2>
      <ul className={styles.grid} aria-label="My topics">
        {progress.map(({ topic, collected, total }) => (
          <li key={topic} className={styles.tile}>
            <span className={styles.name}>{topic}</span>
            <img className={styles.icon} src={TOPIC_ICON[topic]} alt="" width={20} height={20} />
            <span className={styles.count}>
              <span className={styles.number}>{collected}</span> of {total}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
