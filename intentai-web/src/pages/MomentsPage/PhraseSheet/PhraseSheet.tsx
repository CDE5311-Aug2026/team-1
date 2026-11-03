import type { CollectedItem } from '../../../data/moments/moments';
import Sheet from '../Sheet/Sheet';
import styles from './PhraseSheet.module.css';

type PhraseItem = Extract<CollectedItem, { kind: 'phrase' }>;

interface PhraseSheetProps {
  item: PhraseItem;
  onClose: () => void;
  onPractise: () => void;
  onToggleGot: () => void;
  onDelete: () => void;
}

/** A saved phrase: meaning, source, your example; practise it, ask a local, mark it understood, or delete it. */
export default function PhraseSheet({ item, onClose, onPractise, onToggleGot, onDelete }: PhraseSheetProps) {
  const { lookup } = item;
  const local = item.source === 'Confirmed by a local';
  return (
    <Sheet title={item.word} onClose={onClose}>
      <span className={local ? `${styles.tag} ${styles.local}` : styles.tag}>{item.source}</span>
      <p className={styles.meaning}>{item.meaning}</p>
      {item.example && (
        <p className={styles.example}>
          <span>Example</span>
          {item.example}
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onPractise}>
          Practise
        </button>
        {lookup && (
          <button type="button" className={styles.secondary} onClick={onToggleGot} aria-pressed={!!lookup.got}>
            {lookup.got ? 'Understood' : 'Mark as understood'}
          </button>
        )}
      </div>
      {lookup && (
        <div className={styles.links}>
          <button type="button" className={styles.delete} onClick={onDelete}>
            Delete phrase
          </button>
        </div>
      )}
    </Sheet>
  );
}
