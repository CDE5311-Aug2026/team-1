import type { Expression } from '../../types';
import ContextChip from '../ContextChip/ContextChip';
import Icon from '../Icon/Icon';
import PlayAudioButton from '../PlayAudioButton/PlayAudioButton';
import styles from './ExpressionCard.module.css';

interface ExpressionCardProps {
  expression: Expression;
  active?: boolean;
  onDetail?: () => void;
}

export default function ExpressionCard({ expression, active = false, onDetail }: ExpressionCardProps) {
  const cardClass = active ? `${styles.card} ${styles.active}` : styles.card;

  return (
    <div className={cardClass} data-node-id={expression.nodeId}>
      <div className={styles.numberCol}>
        <span className={styles.iconTile} data-part="tile">
          <Icon name={expression.icon} size={36} />
        </span>
        <span className={styles.number}>{expression.number}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.topRow}>
          <ContextChip icon={expression.context.icon} label={expression.context.label} />
          <PlayAudioButton text={expression.title} />
        </div>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{expression.title}</h3>
          {expression.phonetic && <span className={styles.phonetic}>{expression.phonetic}</span>}
        </div>
        <div className={styles.descRow}>
          <p className={styles.description}>{expression.description}</p>
          <button type="button" className={styles.detailButton} onClick={onDetail}>
            Detail
          </button>
        </div>
      </div>
    </div>
  );
}
