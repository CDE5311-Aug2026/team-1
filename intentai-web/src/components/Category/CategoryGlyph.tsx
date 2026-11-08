// One glyph per Tourism 2040 category (board 24), so colour never carries the meaning alone.
import type { TourismCategory } from '../../data/tourism';

const PATHS: Record<TourismCategory, string> = {
  // star (Attractions)
  att: 'M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z',
  // leaf (Wellness)
  wel: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19l7-7',
  // ticket (Leisure)
  lei: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10',
  // ship (Cruise)
  cru: 'M3 15l1.5 4h15L21 15H3zM6 15V9h12v6M9 9V6h6v3M2 21c1.5 0 2.25-1 3.5-1s2 1 3.5 1 2.25-1 3.5-1 2 1 3.5 1 2.25-1 3.5-1',
};

interface Props {
  category: TourismCategory;
  size?: number;
  className?: string;
  /** Glyph colour; defaults to the current text colour. */
  color?: string;
}

export default function CategoryGlyph({ category, size = 14, className, color }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-glyph={category}
    >
      <path d={PATHS[category]} />
    </svg>
  );
}
