import type { Expression } from '../../types';
import ContextChip from '../ContextChip/ContextChip';
import Icon from '../Icon/Icon';
import PlayAudioButton from '../PlayAudioButton/PlayAudioButton';
import StepProgressBar from '../StepProgressBar/StepProgressBar';
import styles from './ExpressionCardExpanded.module.css';

interface ExpressionCardExpandedProps {
  expression: Expression;
  total: number;
  current: number;
  onNext: () => void;
  nodeId?: string;
}

export default function ExpressionCardExpanded({
  expression,
  total,
  current,
  onNext,
  nodeId,
}: ExpressionCardExpandedProps) {
  return (
    <>
    <div className={styles.card} data-node-id={nodeId}>
      <div className={styles.photo}>
        {expression.photo ? (
          <img
            data-testid="photo-image"
            src={expression.photo}
            alt=""
            className={styles.photoImg}
          />
        ) : (
          <div data-testid="photo-placeholder" className={styles.photoPlaceholder}>
            <Icon name={expression.icon} size={48} />
          </div>
        )}
      </div>
      <div className={styles.body}>
      <div className={styles.topRow}>
        <ContextChip icon={expression.context.icon} label={expression.context.label} />
        <PlayAudioButton text={expression.title} />
      </div>
      <div className={styles.titleRow}>
        <span className={styles.number}>{expression.number}</span>
        <h3 className={styles.title}>{expression.title}</h3>
        {expression.phonetic && <span className={styles.phonetic}>{expression.phonetic}</span>}
      </div>
      <div className={styles.descRow}>
        <p className={styles.description}>{expression.description}</p>
        <button type="button" className={styles.nextButton} onClick={onNext}>
          Next
        </button>
      </div>
      </div>
    </div>
    <div className={styles.steps}>
      <StepProgressBar total={total} current={current} />
    </div>
    </>
  );
}
