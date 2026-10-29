import { Link } from 'react-router-dom';
import { usePersistentStore } from '../../data/persistentStore';
import { FACETS, placeState, type Facet } from '../../data/placeStories';
import { placeStoriesStore } from '../../data/stores';
import { paths } from '../../routes';
import styles from './StoryTopBar.module.css';

interface StoryTopBarProps {
  placeId: string;
  facet: Facet;
  /** Place name, read as "Back to {backLabel}". */
  backLabel: string;
}

/** Card top bar: back to the place, 4 progress segments, "N of 4" (this card's position in the place). */
export function StoryTopBar({ placeId, facet, backLabel }: StoryTopBarProps) {
  const [stories] = usePersistentStore(placeStoriesStore);
  const opened = placeState(stories, placeId).opened;
  const index = FACETS.indexOf(facet);

  return (
    <div className={styles.bar}>
      <Link
        to={paths.homePlace(placeId)}
        state={{ railIndex: index }}
        className={`press ${styles.back}`}
        aria-label={`Back to ${backLabel}`}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <div className={styles.segments} aria-hidden="true">
        {FACETS.map((f, i) => {
          if (i === index) {
            return (
              <span key={f} data-segment="current" className={`${styles.segment} ${styles.current}`}>
                <span className={`a-seg ${styles.fill}`} />
              </span>
            );
          }
          const done = opened.includes(f);
          return <span key={f} data-segment={done ? 'done' : 'todo'} className={`${styles.segment} ${done ? styles.done : styles.todo}`} />;
        })}
      </div>
      <span className={styles.count}>{`${index + 1} of ${FACETS.length}`}</span>
    </div>
  );
}
