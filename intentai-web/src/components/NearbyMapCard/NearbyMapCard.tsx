// Today's way into Nearby: a picture of the Nearby map of Singapore with a dot for every place, like a maps app's
// map tile. The picture is made from the app's own EARTH ONLINE map (scripts/today/map-preview.mjs); the counts are
// live (places in the catalogue, places you checked in on this device). One tap opens Nearby Explore.
import mapPicture from '../../assets/today-map.webp';
import stats from '../../data/explore/stats.json';
import { usePersistentStore } from '../../data/persistentStore';
import { explorePersonalStore } from '../../data/stores';
import styles from './NearbyMapCard.module.css';

interface NearbyMapCardProps {
  /** The phrase setting picked for "Near you" (its phrases are one tap away in Nearby). */
  place: string;
  onOpen?: () => void;
  nodeId?: string;
}

export default function NearbyMapCard({ place, onOpen, nodeId }: NearbyMapCardProps) {
  const [personal] = usePersistentStore(explorePersonalStore);
  const checkedIn = personal.places.filter((p) => p.visited).length;
  return (
    <button type="button" className={styles.card} onClick={onOpen} data-node-id={nodeId}>
      <img className={styles.map} src={mapPicture} alt="" width={350} height={160} decoding="async" />
      <span className={styles.shade} aria-hidden="true" />
      <span className={styles.chip}>
        <span className={styles.liveDot} aria-hidden="true" data-part="live-dot" />
        <span className={styles.near}>Near you</span> · {place}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>Nearby map</span>
        <span className={styles.sub}>
          {stats.publishedPlaces} places to explore{checkedIn > 0 ? ` · ${checkedIn} checked in` : ''}
        </span>
        <span className={styles.credit}>EARTH ONLINE map · © OpenStreetMap contributors</span>
      </span>
      <span className={styles.go} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
