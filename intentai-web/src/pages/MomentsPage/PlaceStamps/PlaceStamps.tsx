import { Link } from 'react-router-dom';
import { useExplorePersonal } from '../../../features/nearby/actions';
import { MAIN_COLLECTION, collectionProgress, collectionTitle, curatedPlace } from '../../../features/nearby/catalogue';
import { PlaceThumb } from '../../../features/nearby/components/PlaceCard';
import { shortDate } from '../../../features/nearby/personal';
import { paths } from '../../../routes';
import styles from './PlaceStamps.module.css';

/** How many stamps the strip shows; the rest are under "See all". */
const STRIP = 8;

/**
 * Nearby check-ins (打卡) as passport stamps: the newest first, each opening its place. They come from the same
 * self-reported records as Nearby (no location is stored), so checking in or undoing there updates this at once.
 */
export default function PlaceStamps() {
  const personal = useExplorePersonal();
  const stamps = personal.places
    .filter((s) => s.visited)
    .map((s) => ({ s, place: curatedPlace(s.placeKey) }))
    .filter((x): x is { s: typeof x.s; place: NonNullable<typeof x.place> } => !!x.place)
    .sort((a, b) => ((a.s.visitedOn ?? '') === (b.s.visitedOn ?? '') ? (a.s.updatedAt < b.s.updatedAt ? 1 : -1) : (a.s.visitedOn ?? '') < (b.s.visitedOn ?? '') ? 1 : -1));
  const collection = MAIN_COLLECTION;
  const progress = collection ? collectionProgress(collection, personal) : null;

  return (
    <section className={styles.section} aria-labelledby="place-stamps-heading">
      <div className={styles.head}>
        <h2 id="place-stamps-heading" className={styles.heading}>
          My places
        </h2>
        <span className={styles.count} data-stat="places">
          {stamps.length}
        </span>
        {stamps.length > 0 && (
          <Link className={styles.more} to={`${paths.saved}?tab=visited`}>
            See all
          </Link>
        )}
      </div>

      {stamps.length === 0 ? (
        <p className={styles.empty}>
          Check in at places in Nearby to collect stamps here.{' '}
          <Link className={styles.link} to={paths.nearby}>
            Open Nearby
          </Link>
        </p>
      ) : (
        <ul className={styles.strip} aria-label="Places checked in">
          {stamps.slice(0, STRIP).map(({ s, place }) => (
            <li key={place.id}>
              <Link className={styles.stamp} to={paths.nearbyPlace(place.id)}>
                <span className={styles.ring}>
                  <PlaceThumb id={place.id} category={place.category} size="row" />
                </span>
                <span className={styles.name}>{place.name}</span>
                <span className={styles.date}>{s.visitedOn ? shortDate(s.visitedOn) : 'Checked in'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {collection && progress && progress.total > 0 && (
        <Link className={styles.checklist} to={paths.collection(collection.id)}>
          <span className={styles.checklistText}>
            <span className={styles.checklistTitle}>{collectionTitle(collection)}</span>
            <span className={styles.checklistMeta}>
              {progress.visited} of {progress.total} checked in
            </span>
          </span>
          <span className={styles.bar} aria-hidden="true">
            <span style={{ width: `${Math.max(progress.percent, progress.visited ? 2 : 0)}%` }} />
          </span>
        </Link>
      )}
    </section>
  );
}
