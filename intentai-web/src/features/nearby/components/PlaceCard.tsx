import { Link } from 'react-router-dom';
import { paths } from '../../../routes';
import { toggleSave } from '../actions';
import { CATEGORY_INFO, type PersonalPlaceState } from '../domain';
import { formatDistance } from '../geo';
import { originPhrase, type ExploreItem, type OriginKind } from '../ranking';
import styles from './Nearby.module.css';

interface PlaceCardProps {
  item: ExploreItem;
  state?: PersonalPlaceState;
  originKind?: OriginKind;
  selected?: boolean;
  onSelect?: () => void;
  /** Shorter card (no reason line). */
  compact?: boolean;
  /** Distinguishes two cards of the same place on one page (preview + list) so ids stay unique. */
  idPrefix?: string;
}

/** One place in a list: name, category, distance origin, reason, Save, View details. */
export default function PlaceCard({ item, state, originKind, selected, onSelect, compact, idPrefix = 'place' }: PlaceCardProps) {
  const headingId = `${idPrefix}-${item.key}`;
  const info = CATEGORY_INFO[item.category];
  const distance =
    item.distanceM !== undefined && originKind ? `${formatDistance(item.distanceM)} ${originPhrase(originKind)}` : null;
  return (
    <article
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      aria-labelledby={headingId}
      data-place={item.key}
    >
      <div className={styles.cardTop}>
        <span className={`${styles.catTile} ${styles[`cat_${item.category}`]}`} aria-hidden="true">
          {info.emoji}
        </span>
        <div className={styles.cardText}>
          <h3 id={headingId} className={styles.cardName}>
            {onSelect ? (
              <button type="button" className={styles.cardSelect} onClick={onSelect} aria-pressed={!!selected}>
                {item.name}
              </button>
            ) : (
              item.name
            )}
          </h3>
          {item.place.nameZh && (
            <p className={styles.nameZh} lang="zh-Hans">
              {item.place.nameZh}
            </p>
          )}
          <p className={styles.meta}>
            <span>{info.label}</span> · <span>{item.kindLabel}</span>
            {distance && <> · <span>{distance}</span></>}
          </p>
          {!compact && <p className={styles.reason}>{item.reason}</p>}
          {state?.visited && <p className={styles.visitedBadge}>✓ Visited{state.visitedOn ? ` · ${state.visitedOn}` : ''}</p>}
        </div>
      </div>
      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.ghostButton}
          aria-pressed={!!state?.saved}
          onClick={() => toggleSave(item.key, item.name)}
          aria-label={`${state?.saved ? 'Saved' : 'Save'} ${item.name}`}
        >
          {state?.saved ? '★ Saved' : '☆ Save'}
        </button>
        <Link className={styles.linkButton} to={paths.nearbyPlace(item.key)} aria-label={`View details: ${item.name}`}>
          View details
        </Link>
      </div>
    </article>
  );
}
