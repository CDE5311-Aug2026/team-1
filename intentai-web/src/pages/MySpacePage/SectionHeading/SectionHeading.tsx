import styles from './SectionHeading.module.css';

interface SectionHeadingProps {
  icon: string;
  title: string;
  aside?: string;
  nodeId: string;
}

/** "Section / …" rows: orange icon, title, optional grey note on the right. */
export default function SectionHeading({ icon, title, aside, nodeId }: SectionHeadingProps) {
  return (
    <div className={styles.heading} data-node-id={nodeId}>
      <img src={icon} alt="" width={16} height={16} />
      <h2 className={styles.title}>{title}</h2>
      {aside && <p className={styles.aside}>{aside}</p>}
    </div>
  );
}
