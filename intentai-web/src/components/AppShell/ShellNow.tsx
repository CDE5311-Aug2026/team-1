// The remind box over the tab bar (user test UT03-5, 10 Nov 2026: "on each screen, or when I open it next time, I know
// what to do"): while a hunt is under way (started, not finished) it names the hunt, the stop and where to go next, with
// Continue (back into the hunt) and ✕. Closing it is remembered for that hunt's stop only (huntNowStore): it comes back
// when the hunt moves to another stop. The hunt played most recently wins when several are under way (now.ts).
// AppShell loads this on demand, and only on phones with a hunt save, so Home's first download stays as it was.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../pages/OnboardingPage/v3/icons';
import { SAVES_CLEARED } from '../../data/deviceKeys';
import { usePersistentStore } from '../../data/persistentStore';
import { huntNowStore } from '../../data/v2Stores';
import { huntHash } from '../../pages/HuntPage/hunts';
import { huntUnderWay, nextAction, stepOf } from '../../pages/HuntPage/play/now';
import { paths } from '../../routes';
import styles from './ShellNow.module.css';

export default function ShellNow() {
  const navigate = useNavigate();
  const [now, setNow] = usePersistentStore(huntNowStore);
  const [under, setUnder] = useState(huntUnderWay);

  // "Delete all" (or another tab) can change the saves while this page is open
  useEffect(() => {
    const read = () => setUnder(huntUnderWay());
    window.addEventListener(SAVES_CLEARED, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(SAVES_CLEARED, read);
      window.removeEventListener('storage', read);
    };
  }, []);

  if (!under) return null;
  const { hunt, stop } = under;
  if (now.dismissed?.hunt === hunt.id && now.dismissed.stop === stop) return null;

  return (
    <aside className={styles.box} aria-labelledby="shell-now-title" data-shell-now="">
      <div className={styles.words}>
        <p className={styles.label}>Now · {stepOf(hunt)}</p>
        <p id="shell-now-title" className={styles.title}>
          {hunt.title}
        </p>
        <p className={styles.action}>{nextAction(hunt)}</p>
      </div>
      <button type="button" className={styles.go} onClick={() => navigate({ pathname: paths.hunt, search: '', hash: huntHash(hunt.id) })}>
        Continue
      </button>
      <button
        type="button"
        className={styles.close}
        aria-label="Dismiss the reminder"
        title="Dismiss"
        onClick={() => setNow({ dismissed: { hunt: hunt.id, stop } })}
      >
        <Icon name="close" size={16} />
      </button>
    </aside>
  );
}
