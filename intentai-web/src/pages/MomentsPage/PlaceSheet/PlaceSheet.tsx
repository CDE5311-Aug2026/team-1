import { Link } from 'react-router-dom';
import inkDrop from '../../../assets/v3/moments/ink-drop.svg';
import lockIcon from '../../../assets/v3/moments/lock.svg';
import { nearbyHref } from '../../../data/cultureLinks';
import { longDate, stampVisits, type Stamp as StampData } from '../../../data/moments/moments';
import { usePersistentStore } from '../../../data/persistentStore';
import { explorePersonalStore } from '../../../data/stores';
import { paths } from '../../../routes';
import { shapeAt, stampDate } from '../parts';
import Sheet from '../Sheet/Sheet';
import Stamp from '../Stamp/Stamp';
import styles from './PlaceSheet.module.css';

interface PlaceSheetProps {
  stamp: StampData;
  /** Position in the passport (stamp shape). */
  index: number;
  onClose: () => void;
}

/** M2: tap a stamp → the places you checked in at in that area (culture cards removed in the Discovery redesign). */
export default function PlaceSheet({ stamp, index, onClose }: PlaceSheetProps) {
  const { subject } = stamp;
  const [personal] = usePersistentStore(explorePersonalStore);
  const visits = stampVisits(stamp, personal);
  const inNearby = nearbyHref({ kind: 'area', id: subject.id, label: subject.name });

  return (
    <Sheet title={subject.short} hideTitle onClose={onClose}>
      <div className={styles.top}>
        {stamp.collected ? (
          <span className={shapeAt(index) === 'card' ? styles.bigCard : styles.bigRound}>
            <Stamp shape={shapeAt(index)} name={subject.short} date={stampDate(stamp.checkedInOn)} ink={stamp.ink} />
          </span>
        ) : (
          <span className={styles.bigOutline} aria-hidden="true">
            <img src={lockIcon} alt="" width={22} height={22} />
          </span>
        )}
        <p className={styles.name} aria-hidden="true">
          {subject.short}
        </p>
        <p className={styles.meta}>
          <img src={inkDrop} alt="" width={13} height={14} />
          <span>{stamp.collected && stamp.checkedInOn ? `Checked in ${longDate(stamp.checkedInOn)}` : 'Not checked in yet'}</span>
        </p>
      </div>

      {visits.length > 0 && (
        <ul className={styles.visits} aria-label="Places you checked in at">
          {visits.map((v) => (
            <li key={v.key}>
              <Link to={v.key.startsWith('story:') ? paths.nearby : paths.nearbyPlace(v.key)} className={styles.visit}>
                <span className={styles.visitName}>{v.name}</span>
                {v.on && <span className={styles.visitDate}>{longDate(v.on)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!stamp.collected && <p className={styles.note}>Check in at a place in {subject.name} in Nearby to collect this stamp.</p>}

      <div className={styles.actions}>
        <Link to={inNearby} className={stamp.collected ? styles.primary : styles.secondary}>
          Open in Nearby
        </Link>
        {!stamp.collected && (
          <Link to={inNearby} className={styles.primary}>
            Check in in Nearby
          </Link>
        )}
      </div>
    </Sheet>
  );
}
