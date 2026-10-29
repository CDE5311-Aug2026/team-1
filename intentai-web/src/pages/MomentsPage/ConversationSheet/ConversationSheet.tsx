import type { SavedConversation } from '../../../data/community/social';
import { longDate } from '../../../data/moments/moments';
import Sheet from '../Sheet/Sheet';
import styles from './ConversationSheet.module.css';

function isoDay(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A Community conversation saved to Moments whose question no longer exists: the snapshot, read-only. */
export default function ConversationSheet({ saved, onClose }: { saved: SavedConversation; onClose: () => void }) {
  return (
    <Sheet title={saved.title} onClose={onClose}>
      <p className={styles.meta}>
        {saved.topic} · saved {longDate(isoDay(saved.savedAt))}
      </p>
      {saved.body && <p className={styles.body}>{saved.body}</p>}
      {saved.replies.length > 0 ? (
        <ul className={styles.replies} aria-label="Replies">
          {saved.replies.map((reply, i) => (
            <li key={i}>
              <strong>{reply.author}</strong>
              <p>{reply.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.meta}>No replies were saved with it.</p>
      )}
      <p className={styles.note}>This question is no longer in Community. This is the copy you saved.</p>
    </Sheet>
  );
}
