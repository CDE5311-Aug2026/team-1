// The v2 chip row: All · Attractions · Wellness · Leisure · Cruise (boards 05, 07, 10, 13). One row of toggle buttons;
// the picked one fills with its colour. State lives with the caller (useCategoryParam keeps it in the URL as ?cat=).
import { useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TOURISM_CATEGORIES, TOURISM_INFO, isTourismCategory, type TourismFilter } from '../../data/tourism';
import CategoryGlyph from './CategoryGlyph';
import styles from './Category.module.css';

/** A chip that is not a Tourism 2040 category (Home's Eat), shown after All. */
export interface ExtraChip {
  id: string;
  label: string;
  fill: string;
  ink: string;
  icon: ReactNode;
  on: boolean;
  onClick(): void;
}

interface Props {
  /** null: none of these is picked (an extra chip is). */
  value: TourismFilter | null;
  onChange: (next: TourismFilter) => void;
  /** Optional counts shown after each label (e.g. results per category). */
  counts?: Partial<Record<TourismFilter, number>>;
  className?: string;
  /** Accessible name of the group. */
  label?: string;
  extra?: ExtraChip;
}

export default function CategoryChips({ value, onChange, counts, className, label = 'Categories', extra }: Props) {
  const items: TourismFilter[] = ['all', ...TOURISM_CATEGORIES];
  const extraChip = extra ? (
    <button
      key={extra.id}
      type="button"
      aria-pressed={extra.on}
      className={extra.on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
      style={{ '--cat': extra.fill, '--cat-ink': extra.ink } as React.CSSProperties}
      onClick={extra.onClick}
    >
      <span className={styles.dot} aria-hidden="true">
        {extra.icon}
      </span>
      <span>{extra.label}</span>
    </button>
  ) : null;
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
      }).flatMap((chip, i) => (i === 0 && extraChip ? [chip, extraChip] : [chip]))}
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
