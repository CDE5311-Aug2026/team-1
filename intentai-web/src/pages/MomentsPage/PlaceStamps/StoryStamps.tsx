// Team 1's "Place stories" row (merged into the v3 Moments under My Places): the Home place stories whose stamp the
// user collected, newest first, each opening its place story. Hidden until there is one.
import { Link } from 'react-router-dom';
import { usePersistentStore } from '../../../data/persistentStore';
import { placeStoriesStore } from '../../../data/stores';
import { STORY_PLACE_IDS, storyPlace, uniqueCredits } from '../../../data/stories/places';
import { shortDate } from '../../../features/nearby/personal';
import { paths } from '../../../routes';
import styles from './PlaceStamps.module.css';

export default function StoryStamps() {
  const [stories] = usePersistentStore(placeStoriesStore);
  const stamps = STORY_PLACE_IDS.flatMap((id) => {
    const place = storyPlace(id);
    const on = stories[id]?.stamped ? (stories[id].stampedOn ?? '') : null;
    return place && on !== null ? [{ place, on }] : [];
  }).sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0));
  if (stamps.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="place-stories-label">
      <p id="place-stories-label" className={styles.rowLabel}>
        Place stories
      </p>
      <ul className={styles.strip} aria-labelledby="place-stories-label">
        {stamps.map(({ place, on }) => (
          <li key={place.id}>
            <Link className={styles.stamp} to={paths.homePlace(place.id)}>
              <span className={styles.ring}>
                <img src={place.hero.src} alt="" width={56} height={56} loading="lazy" />
              </span>
              <span className={styles.name}>{place.name}</span>
              <span className={styles.date}>{on ? shortDate(on) : 'Stamped'}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.credits}>{`Credits: ${uniqueCredits(stamps.map(({ place }) => place.hero)).join(' · ')}`}</p>
    </section>
  );
}
