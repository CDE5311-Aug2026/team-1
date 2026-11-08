// The v2 chip row: All · Attractions · Wellness · Leisure · Cruise (boards 05, 07, 10, 13). One row of toggle buttons;
// the picked one fills with its colour. State lives with the caller (useCategoryParam keeps it in the URL as ?cat=).
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TOURISM_CATEGORIES, TOURISM_INFO, isTourismCategory, type TourismFilter } from '../../data/tourism';
import CategoryGlyph from './CategoryGlyph';
import styles from './Category.module.css';

interface Props {
  value: TourismFilter;
  onChange: (next: TourismFilter) => void;
  /** Optional counts shown after each label (e.g. results per category). */
  counts?: Partial<Record<TourismFilter, number>>;
  className?: string;
  /** Accessible name of the group. */
  label?: string;
}

export default function CategoryChips({ value, onChange, counts, className, label = 'Categories' }: Props) {
  const items: TourismFilter[] = ['all', ...TOURISM_CATEGORIES];
  return (
    <div role="group" aria-label={label} className={`${styles.chips} ${className ?? ''}`}>
      {items.map((k) => {
        const on = value === k;
        const info = k === 'all' ? null : TOURISM_INFO[k];
        const n = counts?.[k];
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
            style={info ? ({ '--cat': info.fill, '--cat-ink': info.ink } as React.CSSProperties) : undefined}
            onClick={() => onChange(k)}
          >
            {info ? (
              <span className={styles.dot} aria-hidden="true">
                <CategoryGlyph category={info.id} size={10} />
              </span>
            ) : null}
            <span>{info ? info.label : 'All'}</span>
            {n !== undefined ? <span className={styles.count}>{n}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** ?cat= in the URL (replace, not push, so Back leaves the page rather than stepping through chips). */
export function useCategoryParam(): [TourismFilter, (next: TourismFilter) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('cat');
  const value: TourismFilter = isTourismCategory(raw) ? raw : 'all';
  const set = useCallback(
    (next: TourismFilter) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'all') p.delete('cat');
          else p.set('cat', next);
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [value, set];
}
