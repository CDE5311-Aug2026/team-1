import styles from './HomeIndicator.module.css';

export default function HomeIndicator({ nodeId }: { nodeId?: string }) {
  return <span className={styles.indicator} aria-hidden="true" data-node-id={nodeId} />;
}
