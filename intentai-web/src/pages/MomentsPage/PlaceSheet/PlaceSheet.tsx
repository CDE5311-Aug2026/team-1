import { Link } from 'react-router-dom';
import { homePlaceHref } from '../../../data/homeLinks';
import inkDrop from '../../../assets/v3/moments/ink-drop.svg';
import lockIcon from '../../../assets/v3/moments/lock.svg';
import { nearbyHref } from '../../../data/cultureLinks';
import { huntKey, longDate, stampVisits, type Stamp as StampData } from '../../../data/moments/moments';
import { chapters } from '../../HuntPage/story/chapters';
import { usePersistentStore } from '../../../data/persistentStore';
import { explorePersonalStore } from '../../../data/stores';
import { paths } from '../../../routes';
import { shapeAt, stampDate } from '../parts';
import Sheet from '../Sheet/Sheet';
import Stamp from '../Stamp/Stamp';
import styles from './PlaceSheet.module.css';
import v2 from './v2Sheet.module.css';

interface PlaceSheetProps {
  stamp: StampData;
  /** Position in the passport (stamp shape). */
  index: number;
  onClose: () => void;
}

/** Where a visit leads: its hunt for a Hunt stop (the Golden Dome too). */
function visitLink(key: string): { to: string; onClick?: () => void } {
  const hunt = huntKey(key);
  if (hunt) return { to: `${paths.hunt}#story/${hunt.story}` };
  return { to: key.startsWith('story:') ? paths.today : homePlaceHref(key) };
}

/** M2 (v2 light sheet, owner 9 Nov 2026): tap a stamp → the places you checked in at in that area (culture cards removed in the Discovery redesign). */
export default function PlaceSheet({ stamp, index, onClose }: PlaceSheetProps) {
  const { subject } = stamp;
  const [personal] = usePersistentStore(explorePersonalStore);
  // Rebuilding the stories reads every saved game, so do it once, and only for a sheet that lists a stop.
  let stories: ReturnType<typeof chapters> | undefined;
  const visits = stampVisits(stamp, personal, (story, stop) => {
    stories ??= chapters();
    return stories.find((c) => c.routeId === story)?.stops.find((s) => s.id === stop)?.name ?? stop;
  });
  const inNearby = nearbyHref({ kind: 'area', id: subject.id, label: subject.name });
  // a Hunt-only area has no place on Nearby's map
  const onMap = !subject.id.startsWith('hunt-');

  return (
    <Sheet title={subject.short} hideTitle onClose={onClose} className={v2.sheet}>
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
              <Link {...visitLink(v.key)} className={styles.visit}>
                <span className={styles.visitName}>{v.name}</span>
                {v.on && <span className={styles.visitDate}>{longDate(v.on)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!stamp.collected && <p className={styles.note}>Check in at a place in {subject.name} to collect this stamp.</p>}

      <div className={styles.actions}>
        {onMap && (
          <Link to={inNearby} className={stamp.collected ? v2.primary : v2.secondary}>
            Show on the map
          </Link>
        )}
        {!stamp.collected && (
          <Link to={inNearby} className={v2.primary}>
            Find a place to check in
          </Link>
        )}
      </div>
    </Sheet>
  );
}
