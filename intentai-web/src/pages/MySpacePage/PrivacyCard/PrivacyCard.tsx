import { useNavigate } from 'react-router-dom';
import { usePersistentStore } from '../../../data/persistentStore';
import { formatBytes, useStorageReport } from '../../../data/storage';
import { onboardingStore } from '../../../data/stores';
import { paths } from '../../../routes';
import { ChevronRight, Shield } from '../icons';
import styles from './PrivacyCard.module.css';

/** Bar colours per storage row, shared with the Privacy page. */
export const SEGMENTS = [
  ['passport', '#e4671f'],
  ['ask', '#f4b389'],
  ['community', '#1e3a8a'],
  ['profile', '#8a7f72'],
  ['timing', '#cfc9bf'],
] as const;

/** Canvas S1 privacy summary: real size on this phone, private details, a bar by storage row. */
export default function PrivacyCard() {
  const navigate = useNavigate();
  const { bytes } = useStorageReport();
  const [{ hidden }] = usePersistentStore(onboardingStore);
  const size = formatBytes(bytes.total);
  const details = `${hidden.length} ${hidden.length === 1 ? 'detail' : 'details'} private`;

  return (
    <button type="button" className={styles.card} aria-label={`Privacy and data: ${size} on this phone`} onClick={() => navigate(paths.mySpacePrivacy)}>
      <span className={styles.top}>
        <span className={styles.chip} aria-hidden="true">
          <Shield />
        </span>
        <span className={styles.text}>
          <span className={styles.title}>Privacy &amp; data</span>
          <span className={styles.sub}>
            {size} · on this phone only · {details}
          </span>
        </span>
        <span className={styles.chevron} aria-hidden="true">
          <ChevronRight />
        </span>
      </span>
      <span className={styles.bar} aria-hidden="true">
        {SEGMENTS.filter(([key]) => bytes[key] > 0).map(([key, color]) => (
          <span key={key} style={{ flexGrow: bytes[key], background: color }} />
        ))}
      </span>
    </button>
  );
}
