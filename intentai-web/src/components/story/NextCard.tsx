import { Link } from 'react-router-dom';
import type { Facet } from '../../data/placeStories';
import { paths } from '../../routes';
import styles from './NextCard.module.css';

interface NextCardProps {
  placeId: string;
  /** The card this links to. */
  facet: Facet;
  title: string;
  /** Thumbnail src (decorative, alt ""). */
  thumb: string;
  /** Fade-up delay, s. */
  delay: number;
  /** Top margin: 18 (default) or 16. */
  top?: 16 | 18;
}

/** Dark "NEXT · FACET" footer link to the next card. Replaces the entry so Back leaves the chain (D14). */
export function NextCard({ placeId, facet, title, thumb, delay, top = 18 }: NextCardProps) {
  return (
    <Link
      to={paths.placeCard(placeId, facet)}
      replace
      className={`press a-up ${styles.next} ${top === 16 ? styles.top16 : ''}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <img className={styles.thumb} src={thumb} alt="" />
      <span className={styles.text}>
        <span className={styles.kicker}>{`NEXT · ${facet.toUpperCase()}`}</span>
        <span className={styles.title}>{title}</span>
      </span>
      <span aria-hidden="true" className={styles.go}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
