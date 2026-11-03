// Small pieces shared by the Routes list and a route's page: text with its language, a stop's picture.
import type { LocalText } from '../../../data/atlas/atlas';
import groundUrl from '../../../assets/nearby/sg-ground.webp';
import { groundCrop, placePicture } from '../../../data/home/nearbyCards';
import { Icon } from '../components/icons';
import thumbStyles from '../components/PlaceCard.module.css';
import type { RouteStop } from './model';
import styles from './Routes.module.css';

/** Text that may still be the atlas's Chinese (before the translation arrives): marked with its language. */
export function Txt({ t, className }: { t: LocalText | undefined; className?: string }) {
  if (!t?.text) return null;
  return (
    <span className={className} lang={t.lang === 'zh-Hans' ? 'zh-Hans' : undefined}>
      {t.text}
    </span>
  );
}

/**
 * A stop's picture, best first: the Nearby place's own picture (culture-card photo → Commons photo → 3D view) when
 * the stop is in the catalogue, else a category tile. The atlas's own photos have no reuse licence and are never used.
 */
export function StopPicture({ stop, size = 'row' }: { stop: RouteStop; size?: 'row' | 'small' }) {
  const cls = size === 'small' ? `${styles.pic} ${styles.picSmall}` : styles.pic;
  const pic = stop.curated ? placePicture(stop.curated) : undefined;
  if (pic?.src) return <img className={cls} src={pic.src} alt="" loading="lazy" decoding="async" width={size === 'small' ? 44 : 64} height={size === 'small' ? 44 : 64} />;
  // No photo yet: the 2D ground map around the stop (as Home's cards do), with its category icon on top.
  if (stop.location) {
    return (
      <span
        className={`${cls} ${styles.ground}`}
        style={{ backgroundImage: `url("${groundUrl}")`, ...groundCrop(stop.location, 2000) }}
        aria-hidden="true"
      >
        <span className={`${styles.groundIcon} ${thumbStyles[stop.pinCategory]}`}>
          <Icon name={stop.pinCategory} size={size === 'small' ? 14 : 18} />
        </span>
      </span>
    );
  }
  return (
    <span className={`${cls} ${thumbStyles.tile} ${thumbStyles[stop.pinCategory]}`} aria-hidden="true">
      <Icon name={stop.pinCategory} size={size === 'small' ? 20 : 26} />
    </span>
  );
}

export function modeLabel(mode: 'walking' | 'transit'): string {
  return mode === 'walking' ? 'Walking' : 'Walking + transit';
}
