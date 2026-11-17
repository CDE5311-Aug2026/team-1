// A hunt's level (data/hunt/level.ts) as a small pill: three bars, as many filled as the level, and its name.
import { LEVEL_NAMES, type HuntLevel } from '../../data/hunt/level';
import styles from './LevelBadge.module.css';

export default function LevelBadge({ level, className }: { level: HuntLevel; className?: string }) {
  return (
    <span className={`${styles.badge} ${className ?? ''}`} data-level={level} aria-label={`Level ${level} of 3, ${LEVEL_NAMES[level]}`} role="img">
      <span className={styles.bars} aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= level ? styles.on : undefined} />
        ))}
      </span>
      <span aria-hidden="true">
        Lv {level} · {LEVEL_NAMES[level]}
      </span>
    </span>
  );
}
