// "In Nearby": the places a Today article, video or holiday names, one tap from the map (the place selected with its
// details, its area, or an editor's pick). A place you have checked in at says so.
import { Link } from 'react-router-dom';
import type { NearbyLink } from '../../data/cultureLinks';
import { nearbyHref } from '../../data/cultureLinks';
import { usePersistentStore } from '../../data/persistentStore';
import { explorePersonalStore } from '../../data/stores';
import styles from './NearbyLinks.module.css';

const PIN = 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11ZM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z';
const LIST = 'M4 7h16M4 12h16M4 17h16';
const AREA = 'M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2ZM9 4.5v13M15 6.5v13';

export default function NearbyLinks({ links, label = 'In Nearby' }: { links: readonly NearbyLink[] | undefined; label?: string }) {
  const [personal] = usePersistentStore(explorePersonalStore);
  if (!links || links.length === 0) return null;
  const visited = new Set(personal.places.filter((p) => p.visited).map((p) => p.placeKey as string));
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <ul className={styles.list}>
        {links.map((l) => {
          const done = l.kind === 'place' && visited.has(l.id);
          const name = l.kind === 'place' && l.why === 'try' ? `Try it: ${l.label}` : l.label;
          return (
            <li key={`${l.kind}:${l.id}`}>
              <Link className={styles.chip} to={nearbyHref(l)} aria-label={`${name}${done ? ', checked in' : ''} (opens Nearby)`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={l.kind === 'place' ? PIN : l.kind === 'list' ? LIST : AREA} />
                </svg>
                <span className={styles.name}>{name}</span>
                {done && <span className={styles.done}>✓</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
