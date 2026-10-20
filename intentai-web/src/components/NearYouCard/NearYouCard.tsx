import Icon from '../Icon/Icon';
import styles from './NearYouCard.module.css';

interface NearYouCardProps {
  /** Headline word; Figma says "Near you". */
  label?: string;
  place: string;
  subtitle: string;
  onOpen?: () => void;
  nodeId?: string;
}

export default function NearYouCard({ label = 'Near you', place, subtitle, onOpen, nodeId }: NearYouCardProps) {
  return (
    <button type="button" className={styles.card} onClick={onOpen} data-node-id={nodeId}>
      <span className={styles.iconTile}>
        📍
        <span className={styles.liveDot} aria-hidden="true" data-part="live-dot" />
      </span>
      <span className={styles.text}>
        <span className={styles.headline}>
          <span className={styles.near}>{label}</span> <span className={styles.place}>· {place}</span>
        </span>
        <span className={styles.subtitle}>{subtitle}</span>
      </span>
      <span className={styles.chevron}>
        <Icon name="chevron" size={16} />
      </span>
    </button>
  );
}
