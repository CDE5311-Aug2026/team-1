// The "Stored on this phone" bar: one segment per storage area, sized by its real bytes. Shared by My Space's privacy
// summary card (PR #5's PrivacyCard) and the Privacy & data page.
import { STORAGE_AREAS, areaBytes, type StorageAreaId } from '../../../data/profile/storage';
import type { IconName } from '../../OnboardingPage/v3/icons';
import styles from './MySpace.module.css';

export const AREA_LOOK: Record<StorageAreaId, { icon: IconName; color: string }> = {
  passport: { icon: 'cards', color: '#e4671f' },
  ask: { icon: 'chat', color: '#f2b48c' },
  community: { icon: 'people', color: '#2c3e8f' },
  search: { icon: 'grid', color: '#3a8f5c' },
  profile: { icon: 'user', color: '#8f8a82' },
};

/** Decorative: the sizes are given as text next to it. `sizes` defaults to a fresh measure. */
export default function StorageBar({ sizes = STORAGE_AREAS.map((a) => areaBytes(a)) }: { sizes?: number[] }) {
  const sum = sizes.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className={styles.bar} aria-hidden="true">
      {STORAGE_AREAS.map((a, i) => (
        <span key={a.id} style={{ flexGrow: Math.max(sizes[i] / sum, 0.02), background: AREA_LOOK[a.id].color }} />
      ))}
    </div>
  );
}
