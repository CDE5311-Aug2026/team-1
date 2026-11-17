// v2 board 02: "What would you like to explore?" — four photo tiles, tap in order to rank; the order sets what Home shows
// first. Shared by onboarding step 1, the onboarding review and Settings (plan A8). Photos are existing licensed place
// photos (placePicture); a place without one shows its category tint.
import { useReducedMotionConfig, motion } from 'motion/react';
import { curatedPlace } from '../../features/nearby/catalogue';
import type { CuratedId } from '../../features/nearby/domain';
import { placePicture } from '../../data/home/nearbyCards';
import { TOURISM_CATEGORIES, TOURISM_INFO, type TourismCategory } from '../../data/tourism';
import CategoryGlyph from '../Category/CategoryGlyph';
import styles from './ProfileEditors.module.css';

/** The place each tile pictures and the line under its name (board 02). */
export const CATEGORY_PLACE: Record<TourismCategory, { id: CuratedId; caption: string }> = {
  att: { id: 'curated:sg-jewel-changi-airport', caption: 'Jewel Changi Airport' },
  wel: { id: 'curated:sg-fort-canning-park-fort-gate-fort-canning-centre', caption: 'Fort Canning Park' },
  lei: { id: 'curated:sg-cavenagh-bridge', caption: 'Civic District' },
  cru: { id: 'curated:sg-boat-quay', caption: 'Singapore River' },
};

export function categoryPhoto(c: TourismCategory): { src: string; alt: string } | undefined {
  const place = curatedPlace(CATEGORY_PLACE[c].id);
  const pic = place && placePicture(place);
  return place && pic?.src ? { src: pic.src, alt: place.name } : undefined;
}

/** Tap-in-order ranking: tapping a ranked category removes it and the order closes up. */
export function rankCategory(list: readonly TourismCategory[], c: TourismCategory): TourismCategory[] {
  return list.includes(c) ? list.filter((x) => x !== c) : [...list, c];
}

interface Props {
  value: TourismCategory[];
  onChange: (next: TourismCategory[]) => void;
}

export default function TourismRanker({ value, onChange }: Props) {
  const reduce = useReducedMotionConfig();
  return (
    <div className={styles.stack}>
      <div className={styles.rankHead}>
        <p className={styles.hint}>Choose one or more. The order you tap sets what Home shows first.</p>
        <button type="button" className={styles.reset} onClick={() => onChange([])} disabled={value.length === 0}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
          </svg>
          Reset
        </button>
      </div>
      <div className={styles.tiles} role="group" aria-label="Categories, tap in order">
        {TOURISM_CATEGORIES.map((c) => {
          const info = TOURISM_INFO[c];
          const rank = value.indexOf(c) + 1;
          const photo = categoryPhoto(c);
          return (
            <motion.button
              key={c}
              type="button"
              className={rank ? `${styles.tile} ${styles.tileOn}` : styles.tile}
              style={{ '--cat': info.fill, '--cat-tint': info.tint } as React.CSSProperties}
              aria-pressed={rank > 0}
              aria-label={rank ? `${info.label}, ranked ${rank}` : info.label}
              onClick={() => onChange(rankCategory(value, c))}
              whileTap={reduce ? undefined : { scale: 0.97 }}
            >
              {photo ? <img src={photo.src} alt="" className={styles.tileImg} /> : null}
              <span className={styles.tileShade} aria-hidden="true" />
              <span className={styles.tileGlyph} aria-hidden="true">
                <CategoryGlyph category={c} size={16} color="#fff" />
              </span>
              <span className={rank ? `${styles.tileRank} ${styles.tileRankOn}` : styles.tileRank} aria-hidden="true">
                {rank || ''}
              </span>
              <span className={styles.tileText}>
                <span className={styles.tileName}>{info.label}</span>
                <span className={styles.tileCaption}>{CATEGORY_PLACE[c].caption}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
