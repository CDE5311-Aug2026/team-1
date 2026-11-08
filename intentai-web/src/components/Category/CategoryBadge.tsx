// A category label: a filled pill (on photos, board 05/08) or a coloured kicker line (cards, board 10/07).
import { TOURISM_INFO, type TourismCategory } from '../../data/tourism';
import CategoryGlyph from './CategoryGlyph';
import styles from './Category.module.css';

interface Props {
  category: TourismCategory;
  variant?: 'pill' | 'kicker';
  /** Text after the label, e.g. "Place" or "Weekend". */
  suffix?: string;
  className?: string;
}

export default function CategoryBadge({ category, variant = 'pill', suffix, className }: Props) {
  const info = TOURISM_INFO[category];
  const style = { '--cat': info.fill, '--cat-ink': info.ink } as React.CSSProperties;
  return (
    <span className={`${variant === 'pill' ? styles.pill : styles.kicker} ${className ?? ''}`} style={style}>
      <CategoryGlyph category={category} size={variant === 'pill' ? 11 : 12} />
      <span>{info.label}</span>
      {suffix ? <span className={styles.suffix}>· {suffix}</span> : null}
    </span>
  );
}
