import chevronLeftDisabled from '../../../assets/moments/chevron-left-disabled.svg';
import chevronRight from '../../../assets/moments/chevron-right.svg';
import { pageItems } from '../paging';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  total: number;
  onChange: (page: number) => void;
}

/**
 * Figma "Pagination" (7:1095). Figma draws a grey left chevron for the disabled Prev and a dark right
 * chevron for Next; the other two states mirror those two assets.
 */
export default function Pagination({ page, total, onChange }: PaginationProps) {
  const atStart = page <= 1;
  const atEnd = page >= total;

  return (
    <nav className={styles.pagination} aria-label="Lookup pages" data-node-id="7:1095">
      <button
        type="button"
        className={styles.page}
        aria-label="Previous page"
        disabled={atStart}
        onClick={() => onChange(page - 1)}
      >
        <img src={atStart ? chevronLeftDisabled : chevronRight} alt="" width={16} height={16} className={atStart ? undefined : styles.flip} />
      </button>
      {pageItems(page, total).map((item, index) =>
        item === 'gap' ? (
          // Up to two gaps can appear, so the key needs their position.
          <span key={`gap-${index}`} className={styles.gap} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={item === page ? styles.current : styles.page}
            aria-label={`Page ${item}`}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" className={styles.page} aria-label="Next page" disabled={atEnd} onClick={() => onChange(page + 1)}>
        <img src={atEnd ? chevronLeftDisabled : chevronRight} alt="" width={16} height={16} className={atEnd ? styles.flip : undefined} />
      </button>
    </nav>
  );
}
