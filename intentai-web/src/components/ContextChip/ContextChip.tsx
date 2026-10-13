import type { IconName } from '../../types';
import Icon from '../Icon/Icon';
import styles from './ContextChip.module.css';

interface ContextChipProps {
  icon: IconName;
  label: string;
}

export default function ContextChip({ icon, label }: ContextChipProps) {
  return (
    <span className={styles.chip} data-part="chip">
      <Icon name={icon} size={14} />
      <span className={styles.label}>{label}</span>
    </span>
  );
}
