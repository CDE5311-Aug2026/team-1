import { useId } from 'react';
import type { Lookup } from '../../../data/domain';
import dotAi from '../../../assets/moments/dot-ai.svg';
import dotLocal from '../../../assets/moments/dot-local.svg';
import iconTrash from '../../../assets/moments/icon-trash.svg';
import styles from './LookupCard.module.css';

interface LookupCardProps {
  lookup: Lookup;
  /** Figma node ids of this card slot (cards 1–3 on a page), for the geometry test. */
  nodeId?: string;
  onToggleGot: () => void;
  onMetAgain: () => void;
  onNotSure: () => void;
  onDelete: () => void;
  onPractise: () => void;
}

/** One saved lookup (Figma 4:961 / 4:977 / 4:991). */
export default function LookupCard({ lookup, nodeId, onToggleGot, onMetAgain, onNotSure, onDelete, onPractise }: LookupCardProps) {
  const titleId = useId();
  const local = lookup.source === 'Confirmed by a local';
  const encounters = lookup.encounters ?? 0;
  const metLabel = encounters > 0 ? `Met it again · ${encounters}` : 'Met it again';

  return (
    <article className={styles.card} aria-labelledby={titleId} data-node-id={nodeId}>
      <div className={styles.header}>
        <h3 id={titleId} className={styles.word}>
          {lookup.word}
        </h3>
        <span className={local ? styles.chipLocal : styles.chipAi}>
          <img src={local ? dotLocal : dotAi} alt="" width={6} height={6} />
          {lookup.source}
        </span>
      </div>
      <p className={styles.meaning}>{lookup.meaning}</p>
      <div className={styles.divider} aria-hidden="true" />
      <div className={styles.actions}>
        {local ? (
          <>
            <button
              type="button"
              className={styles.action}
              aria-pressed={lookup.got === true}
              aria-label={`Got it ${lookup.word}`}
              onClick={onToggleGot}
            >
              Got it
            </button>
            <button type="button" className={styles.action} aria-label={`${metLabel} ${lookup.word}`} onClick={onMetAgain}>
              {metLabel}
            </button>
          </>
        ) : (
          // An AI-generated meaning may be wrong: "Not sure" hands it to a local in Community.
          <button type="button" className={styles.action} aria-label={`Not sure about ${lookup.word}`} onClick={onNotSure}>
            Not sure
          </button>
        )}
        <div className={styles.end}>
          <button type="button" className={styles.delete} aria-label={`Delete ${lookup.word}`} onClick={onDelete}>
            <img src={iconTrash} alt="" width={12} height={12} />
            Delete
          </button>
          <button type="button" className={styles.practise} aria-label={`Practise ${lookup.word}`} onClick={onPractise}>
            Practise
          </button>
        </div>
      </div>
    </article>
  );
}
