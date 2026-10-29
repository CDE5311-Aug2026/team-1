// Settings › Memory: what Ask remembers about you, like Claude's memory. Switch it off, forget one entry, add one,
// clear everything, or reset to what your profile says.
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { usePersistentStore } from '../../../data/persistentStore';
import {
  activeMemories,
  clearMemory,
  forget,
  memoryStore,
  profileMemories,
  remember,
  resetMemory,
  setMemoryEnabled,
  type MemoryItem,
} from '../../../data/memory';
import { localProfileStore, withPrefill } from '../../../data/profile/localProfile';
import { profileV3Store } from '../../../data/profile/profile';
import { showToast } from '../../../hooks/useToast';
import Icon from '../../OnboardingPage/v3/icons';
import { Switch } from './Parts';
import styles from './MySpace.module.css';

const SOURCE_LABEL: Record<MemoryItem['source'], string> = {
  profile: 'From your profile',
  ask: 'Learned in Ask',
  you: 'Added by you',
};

/** The current memory list, for My Space's summary row and this section. */
export function useMemories() {
  const [state] = usePersistentStore(memoryStore);
  const [profile] = usePersistentStore(profileV3Store);
  const [local] = usePersistentStore(localProfileStore);
  const shownLocal = withPrefill(local, profile);
  return { state, items: activeMemories(state, profile, shownLocal), profileIds: profileMemories(profile, shownLocal).map((m) => m.id) };
}

export default function MemorySection({ highlight = false }: { highlight?: boolean }) {
  const { state, items, profileIds } = useMemories();
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState(false);
  const reduce = useReducedMotionConfig();
  const ref = useRef<HTMLElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!highlight) return undefined;
    // After the page's own scroll reset on navigation.
    const t = window.setTimeout(() => ref.current?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 150);
    return () => window.clearTimeout(t);
  }, [highlight, reduce]);

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (remember(draft, 'you')) {
      setDraft('');
      showToast('Added to memory');
    }
  };

  return (
    <section ref={ref} id="memory" aria-labelledby="memory-heading" className={highlight ? styles.memoryFocus : undefined}>
      <h2 id="memory-heading" className={styles.kicker}>
        Memory
      </h2>
      <div className={styles.card}>
        <div className={styles.switchRow}>
          <span className={styles.rowIcon}>
            <Icon name="book" size={18} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Memory</span>
            <span className={styles.rowSub} id="hint-memory">
              {state.enabled ? 'Ask uses what it remembers about you' : 'Off: Ask starts from nothing each time'}
            </span>
          </span>
          <Switch label="Memory" describedBy="hint-memory" checked={state.enabled} onChange={setMemoryEnabled} />
        </div>

        {state.enabled && (
          <>
            <ul className={styles.memoryList} aria-label="What Ask remembers">
              <AnimatePresence initial={false}>
                {items.map((m) => (
                  <motion.li
                    key={m.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
                    className={styles.memoryItem}
                  >
                    <span className={styles.memoryText}>
                      <span>{m.text}</span>
                      <span className={styles.memorySource}>{SOURCE_LABEL[m.source]}</span>
                    </span>
                    <button type="button" className={styles.memoryForget} onClick={() => forget(m.id)} aria-label={`Forget “${m.text}”`}>
                      <Icon name="close" size={16} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
              {items.length === 0 && <li className={styles.memoryEmpty}>Nothing yet. Tell Ask about yourself, or add something here.</li>}
            </ul>

            <form className={styles.memoryAdd} onSubmit={add}>
              <label htmlFor={inputId} className={styles.srOnly}>
                Add something Ask should remember
              </label>
              <input
                id={inputId}
                className={styles.memoryInput}
                value={draft}
                maxLength={140}
                placeholder="e.g. I’m vegetarian"
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className={styles.memoryAddButton} disabled={!draft.trim()}>
                Add
              </button>
            </form>
          </>
        )}

        <div className={styles.memoryActions}>
          {confirm ? (
            <>
              <span className={styles.rowSub}>Forget everything Ask remembers?</span>
              <button type="button" className={styles.memoryGhost} onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.memoryDanger}
                onClick={() => {
                  clearMemory(profileIds);
                  setConfirm(false);
                  showToast('Memory cleared', { undo: () => memoryStore.set(state) });
                }}
              >
                Clear
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.memoryGhost} onClick={() => setConfirm(true)} disabled={items.length === 0}>
                <Icon name="trash" size={16} />
                Clear memory
              </button>
              <button
                type="button"
                className={styles.memoryGhost}
                onClick={() => {
                  const before = memoryStore.get();
                  resetMemory();
                  showToast('Memory reset to your profile', { undo: () => memoryStore.set(before) });
                }}
              >
                <Icon name="reset" size={16} />
                Reset to profile
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
