import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { usePersistentStore } from '../../data/persistentStore';
import { placeState } from '../../data/placeStories';
import { todayKey } from '../../data/progress';
import { placeStoriesStore, setStamped } from '../../data/stores';
import { paths } from '../../routes';
import { StoryIcon, type StoryIconName } from './StoryIcon';
import styles from './CollectCard.module.css';

interface CollectCardProps {
  placeId: string;
  /** e.g. "That’s all 4 cards here". */
  title: string;
  /** Note under the title before and after the stamp is collected. */
  note: { before: string; after: string };
  stampIcon: StoryIconName;
  /** White button next to the primary one, e.g. "Back to place" or "Home". */
  secondary: { label: string; to: string; state?: unknown; replace?: boolean };
  onCollect?: () => void;
}

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
const SPARK_MS = 700;

/** "Collection complete" card on the last card of a place: collect the story stamp (persisted). */
export function CollectCard({ placeId, title, note, stampIcon, secondary, onCollect }: CollectCardProps) {
  const [stories] = usePersistentStore(placeStoriesStore);
  const stamped = placeState(stories, placeId).stamped;
  const [sparking, setSparking] = useState(false);
  const passport = useRef<HTMLAnchorElement>(null);
  const justCollected = useRef(false);

  useEffect(() => {
    if (!sparking) return;
    const id = window.setTimeout(() => setSparking(false), SPARK_MS);
    return () => window.clearTimeout(id);
  }, [sparking]);

  useEffect(() => {
    if (stamped && justCollected.current) {
      justCollected.current = false;
      passport.current?.focus();
    }
  }, [stamped]);

  const collect = () => {
    if (stamped) return;
    justCollected.current = true;
    setStamped(placeId, todayKey());
    setSparking(true);
    onCollect?.();
  };

  return (
    <section aria-label="Collection complete" className={`a-up ${styles.card}`} style={{ animationDelay: '1.5s' }}>
      <div className={styles.row}>
        <span aria-hidden="true" className={styles.stampWrap}>
          {sparking && RAYS.map((r) => <span key={r} className="spark spark-lg" style={{ '--r': `${r}deg` } as CSSProperties} />)}
          <span className={`${styles.stamp} ${stamped ? styles.stamped : ''}`}>
            <StoryIcon name={stampIcon} size={22} />
          </span>
        </span>
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          <span className={styles.note}>{stamped ? note.after : note.before}</span>
        </span>
      </div>
      <div className={styles.actions}>
        {stamped ? (
          <Link ref={passport} to={paths.moments} className={`press ${styles.passport}`}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            Stamped · see passport
          </Link>
        ) : (
          <button type="button" className={`press ${styles.collect}`} onClick={collect}>
            Collect stamp
          </button>
        )}
        <Link to={secondary.to} state={secondary.state} replace={secondary.replace} className={`press ${styles.secondary}`}>
          {secondary.label}
        </Link>
      </div>
    </section>
  );
}
