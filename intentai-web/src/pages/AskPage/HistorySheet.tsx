// Ask History (ZIP prototype: header History button → sheet): New chat, search, chats grouped by time, reopen.
import { useState } from 'react';
import Dialog from '../../components/Dialog/Dialog';
import type { AskThread } from '../../data/domain';
import arrowRight from '../../assets/v3/arrow-right.svg';
import historyIcon from '../../assets/v3/history.svg';
import plusIcon from '../../assets/v3/plus.svg';
import styles from './HistorySheet.module.css';

const DAY = 86_400_000;

/** Today / Yesterday / Previous 7 days / Earlier chats, newest first, empty groups left out. */
export function groupThreads(threads: readonly AskThread[], now: Date = new Date()): [string, AskThread[]][] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups: Record<string, AskThread[]> = { Today: [], Yesterday: [], 'Previous 7 days': [], 'Earlier chats': [] };
  for (const t of [...threads].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const key = t.updatedAt >= today ? 'Today' : t.updatedAt >= today - DAY ? 'Yesterday' : t.updatedAt >= today - 7 * DAY ? 'Previous 7 days' : 'Earlier chats';
    groups[key].push(t);
  }
  return Object.entries(groups).filter(([, list]) => list.length > 0);
}

/** A chat matches when any of its questions contains the search. */
export function matches(thread: AskThread, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || thread.turns.some((t) => t.question.toLowerCase().includes(q));
}

function subtitle(thread: AskThread): string {
  const last = thread.turns[thread.turns.length - 1];
  if (thread.turns.length > 1) return last.question;
  return last.kind === 'meaning' ? 'Understanding the meaning' : 'Learning culture';
}

export function HistorySheet({
  threads,
  currentId,
  onOpen,
  onNew,
  onClose,
}: {
  threads: readonly AskThread[];
  currentId?: string;
  onOpen: (thread: AskThread) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const groups = groupThreads(threads.filter((t) => matches(t, query)));
  return (
    <Dialog title="History" onClose={onClose}>
      <div className={styles.sheet}>
        <button type="button" className={styles.newChat} onClick={onNew}>
          <img src={plusIcon} alt="" width={16} height={16} /> New chat
        </button>
        <label className={styles.search}>
          <span className={styles.srOnly}>Search conversations</span>
          <input type="search" placeholder="Search conversations" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        {groups.length === 0 ? (
          <div className={styles.empty}>
            <img src={historyIcon} alt="" width={28} height={28} />
            <h3>{query.trim() ? 'No matching conversations' : 'Your conversations start here'}</h3>
            <p>{query.trim() ? 'Try a different word.' : 'Every chat stays here. Save the useful parts to Moments.'}</p>
          </div>
        ) : (
          groups.map(([label, list]) => (
            <section key={label} className={styles.group} aria-label={label}>
              <h3>{label}</h3>
              {list.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.chat}
                  onClick={() => onOpen(t)}
                  aria-current={t.id === currentId ? 'true' : undefined}
                >
                  <span className={styles.chatText}>
                    <strong>{t.title}</strong>
                    <small>
                      {subtitle(t)}
                      {t.turns.length > 1 ? ` · ${t.turns.length} questions` : ''}
                    </small>
                  </span>
                  <img src={arrowRight} alt="" width={16} height={16} />
                </button>
              ))}
            </section>
          ))
        )}
      </div>
    </Dialog>
  );
}
