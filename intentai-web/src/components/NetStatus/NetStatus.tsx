// Two things the app could not do without saying so (user test round 1, heuristic 9): work offline, and keep data in a
// browser that refuses to store it (private browsing, full storage). A slip drops from the top when either happens, in
// plain words with what still works and what to do. Offline clears itself when the connection is back.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { isStorageBlocked, onStorageBlocked } from '../../data/persistentStore';
import { showToast } from '../../hooks/useToast';
import Icon from '../../pages/OnboardingPage/v3/icons';
import styles from './NetStatus.module.css';

export default function NetStatus() {
  const reduce = useReducedMotion();
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const [blocked, setBlocked] = useState(isStorageBlocked);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const off = () => setOffline(true);
    const on = () => {
      setOffline(false);
      showToast('Back online');
    };
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    const unsub = onStorageBlocked(() => setBlocked(true));
    return () => {
      window.removeEventListener('offline', off);
      window.removeEventListener('online', on);
      unsub();
    };
  }, []);

  const slip = offline
    ? { key: 'offline', title: 'You are offline', text: 'Your journal and saved places still open. Maps, 3D and films load when you are back online.' }
    : blocked && !hidden
      ? {
          key: 'storage',
          title: 'Progress is not being saved',
          text: 'This browser is not keeping data (private browsing or full storage). Open FindSG in a normal window to keep your progress.',
        }
      : null;

  return (
    <AnimatePresence>
      {slip && (
        <motion.div
          key={slip.key}
          className={styles.slip}
          role="status"
          initial={reduce ? { opacity: 0 } : { y: -80, opacity: 0, rotate: -1 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={reduce ? { opacity: 0 } : { y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          <span className={styles.icon} aria-hidden="true">
            <Icon name={slip.key === 'offline' ? 'globe' : 'download'} size={18} />
          </span>
          <span className={styles.words}>
            <b>{slip.title}</b>
            <span>{slip.text}</span>
          </span>
          {slip.key === 'storage' && (
            <button type="button" className={styles.close} onClick={() => setHidden(true)} aria-label="Hide this note">
              <Icon name="close" size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
