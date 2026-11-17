// v2 Home without the card deck (owner, 8 Nov 2026): what the deck listed now lies over the map card's lower edge as
// one compact row of pills: an area's places, Editor's Pick walks and lists, a pick's stops, what is near you. A tap
// opens the place, or a pick's stops on the map. When a level has nothing to show, a polite status line takes the
// row's place (an area with no places yet, a category with none here).
import type { CSSProperties } from 'react';
import CategoryGlyph from '../Category/CategoryGlyph';
import { TOURISM_INFO, type TourismCategory } from '../../data/tourism';
import styles from './MapShelf.module.css';

export interface ShelfItem {
  id: string;
  title: string;
  /** The short second line: a distance, "Walk · 6 stops", the area. */
  sub?: string;
  /** The leading mark: a category's glyph, a stop's number, or a pick's star. */
  mark: { kind: 'cat'; cat?: TourismCategory } | { kind: 'num'; n: number } | { kind: 'pick' };
  /** Checked in (a place), or every stop checked in (a pick). */
  done?: boolean;
  /** For screen readers, after the title (the visible line may be shorter). */
  detail?: string;
}

interface Props {
  /** The row's name (the level's title: "Clementi places", "Editor's Pick", "Near you · 2 km"). */
  label: string;
  items: readonly ShelfItem[];
  /** The selected item (the map follows it, ↵ opens it). */
  currentId?: string;
  onPick(id: string): void;
}

function Mark({ item }: { item: ShelfItem }) {
  const m = item.mark;
  if (m.kind === 'num')
    return (
      <span className={`${styles.mark} ${styles.markNum}`} aria-hidden="true">
        {m.n}
      </span>
    );
  if (m.kind === 'pick')
    return (
      <span className={`${styles.mark} ${styles.markPick}`} aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      </span>
    );
  const info = m.cat ? TOURISM_INFO[m.cat] : undefined;
  return (
    <span className={styles.mark} style={info ? ({ '--mark': info.fill } as CSSProperties) : undefined} aria-hidden="true">
      {m.cat && <CategoryGlyph category={m.cat} size={12} color="#fff" />}
    </span>
  );
}

export function MapShelf({ label, items, currentId, onPick }: Props) {
  return (
    <ul className={styles.shelf} aria-label={label}>
      {items.map((it) => (
        <li key={it.id}>
          <button
            type="button"
            className={styles.pill}
            aria-current={it.id === currentId || undefined}
            aria-label={[it.title, it.detail ?? it.sub, it.done ? 'checked in' : ''].filter(Boolean).join(', ')}
            onClick={() => onPick(it.id)}
          >
            <span className={styles.markWrap}>
              <Mark item={it} />
              {it.done && <span className={styles.tick} data-tick="" aria-hidden="true" />}
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{it.title}</span>
              {it.sub && <span className={styles.sub}>{it.sub}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** A level with nothing to list: said politely, in the row's place; the level stays as it is. Always mounted (empty
 *  when there is nothing to say), so screen readers hear the message when it comes. */
export function MapNotice({ children }: { children?: string }) {
  return (
    <p className={children ? styles.notice : styles.noticeIdle} role="status" data-testid="map-notice">
      {children}
    </p>
  );
}
