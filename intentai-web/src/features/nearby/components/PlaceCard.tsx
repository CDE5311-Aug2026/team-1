import { Link } from 'react-router-dom';
import { paths } from '../../../routes';
import { toggleSave } from '../actions';
import { CATEGORY_INFO, type PersonalPlaceState } from '../domain';
import { formatDistance } from '../geo';
import type { ExploreItem, OriginKind } from '../ranking';
import { thumbUrl } from '../thumbs';
import { Icon } from './icons';
import styles from './PlaceCard.module.css';

interface PlaceCardProps {
  item: ExploreItem;
  state?: PersonalPlaceState;
  originKind?: OriginKind;
  selected?: boolean;
  /** Rows in Explore select the place (the map shows it); without it the name opens the place. */
  onSelect?: () => void;
  /** row: a list line (picture, name, type, distance, Save). card: the selected place, with View details. */
  variant?: 'row' | 'card';
  /** Distinguishes two cards of the same place on one page (preview + list) so ids stay unique. */
  idPrefix?: string;
  /** A visited toggle beside Save (collection lists). */
  onToggleVisited?: () => void;
}

/** Distance in a few characters; "from you" only with a precise fix (the sheet header names other origins). */
function shortDistance(m: number | undefined, kind: OriginKind | undefined): string | null {
  if (m === undefined || !kind) return null;
  const d = formatDistance(m).replace('Approx. ', '~');
  return kind === 'you' ? `${d} from you` : d;
}

/** The place's picture from the EARTH ONLINE 3D model, or a plain category tile. */
export function PlaceThumb({ id, category, size }: { id: string; category: ExploreItem['category']; size: 'row' | 'card' }) {
  const url = thumbUrl(id);
  const cls = size === 'card' ? `${styles.thumb} ${styles.thumbCard}` : styles.thumb;
  if (url) return <img className={cls} src={url} alt="" loading="lazy" decoding="async" width={size === 'card' ? 96 : 56} height={size === 'card' ? 72 : 56} />;
  return (
    <span className={`${cls} ${styles.tile} ${styles[category]}`} aria-hidden="true">
      <Icon name={category} size={size === 'card' ? 28 : 22} />
    </span>
  );
}

export default function PlaceCard({ item, state, originKind, selected, onSelect, variant = 'row', idPrefix = 'place', onToggleVisited }: PlaceCardProps) {
  const headingId = `${idPrefix}-${item.key}`;
  const info = CATEGORY_INFO[item.category];
  const distance = shortDistance(item.distanceM, originKind);
  const saveButton = (
    <button
      type="button"
      className={state?.saved ? `${styles.save} ${styles.saved}` : styles.save}
      aria-pressed={!!state?.saved}
      onClick={() => toggleSave(item.key, item.name)}
      aria-label={`${state?.saved ? 'Saved' : 'Save'} ${item.name}`}
    >
      <Icon name="star" filled={!!state?.saved} />
    </button>
  );
  const name = onSelect ? (
    <button type="button" className={styles.select} onClick={onSelect} aria-pressed={!!selected}>
      {item.name}
    </button>
  ) : (
    <Link className={styles.select} to={paths.nearbyPlace(item.key)}>
      {item.name}
    </Link>
  );

  return (
    <article
      className={[styles.card, variant === 'card' ? styles.big : '', selected && variant === 'row' ? styles.selected : ''].join(' ')}
      aria-labelledby={headingId}
      data-place={item.key}
    >
      <span className={styles.thumbWrap}>
        <PlaceThumb id={item.key} category={item.category} size={variant} />
        {state?.visited && (
          <span className={styles.visited} aria-hidden="true">
            ✓
          </span>
        )}
      </span>
      <div className={styles.text}>
        <h3 id={headingId} className={styles.name}>
          {variant === 'card' ? item.name : name}
        </h3>
        {item.place.nameZh && (
          <p className={styles.zh} lang="zh-Hans">
            {item.place.nameZh}
          </p>
        )}
        <p className={styles.meta}>
          <span className={styles.srOnly}>{info.label}: </span>
          {item.kindLabel}
          {distance && <> · {distance}</>}
          {state?.visited && <span className={styles.srOnly}>, visited</span>}
        </p>
        {variant === 'card' && (
          <div className={styles.actions}>
            <Link className={styles.details} to={paths.nearbyPlace(item.key)} aria-label={`View details: ${item.name}`}>
              View details
            </Link>
          </div>
        )}
      </div>
      <span className={styles.buttons}>
        {onToggleVisited && (
          <button
            type="button"
            className={state?.visited ? `${styles.save} ${styles.done}` : styles.save}
            aria-pressed={!!state?.visited}
            onClick={onToggleVisited}
            aria-label={`${state?.visited ? 'Visited' : 'Mark visited'}: ${item.name}`}
          >
            <Icon name="check" />
          </button>
        )}
        {saveButton}
      </span>
    </article>
  );
}
