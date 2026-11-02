// User test start screen: before the app opens, the person types a test name (e.g. P01). Every timing and
// press recorded afterwards carries it, on this device and (when connected) on the server. Turn it off for a
// normal build with VITE_USER_GATE=0. The dashboard (/admin) and the A/B desk (/test) are never behind it.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { usePersistentStore } from '../../data/persistentStore';
import { clearPhone, restartTest, testerStore, type TestVersion } from '../../data/stores';
import { T4_CLUE } from '../../pages/AbTestPage/abTest';
import { ADMIN_PATH, TEST_PATH } from '../../routes';
import { isTestName } from '../../usage/event';
import styles from './UserGate.module.css';

export const USER_GATE_ENABLED = import.meta.env.VITE_USER_GATE !== '0';

/** Version A is UI1: the app as it was at commit 6fc0d8c (PR #6), built unchanged and served from /ui1/. */
export const UI1_BASE = '/ui1';
export const RESTART_PATH = '/restart';
const ui1Url = (path: string) => UI1_BASE + (path === '/' ? '/' : path);

export default function UserGate({ children }: { children: ReactNode }) {
  const [tester, setTester] = usePersistentStore(testerStore);
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState('');
  // The facilitator picks the version; /test's phone links preselect it with ?v=A or ?v=B.
  const asked = params.get('v');
  const [version, setVersion] = useState<TestVersion | null>(asked === 'A' || asked === 'B' ? asked : null);
  const [error, setError] = useState<string | null>(null);
  const desk = pathname.startsWith(ADMIN_PATH) || pathname.startsWith(TEST_PATH);
  const restarting = pathname === RESTART_PATH;
  const preparing = pathname === T4_CLUE.path;
  const toUi1 = USER_GATE_ENABLED && !desk && !restarting && !preparing && !!tester.name && tester.version === 'A';
  const seed = params.has('seed');

  useEffect(() => {
    // Between participants: /restart clears this phone and opens the start screen with its version picked.
    if (restarting) restartTest();
    // Before T4: /t4 clears the phone (the test name stays), then a fresh load writes the prepared profile, so no
    // store still holding the last person's data can write it back.
    else if (preparing && !seed) {
      clearPhone(true);
      window.location.replace(T4_CLUE.path + '?seed=1');
    } else if (preparing)
      void import('../../pages/AbTestPage/prepare').then((m) => {
        m.seedT4();
        window.location.replace('/');
      });
    else if (toUi1) window.location.replace(ui1Url(window.location.pathname) + window.location.search + window.location.hash);
  }, [restarting, preparing, seed, toUi1]);

  if (restarting || preparing || toUi1) return null;
  if (!USER_GATE_ENABLED || tester.name || desk) return <>{children}</>;

  const start = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.normalize('NFKC').trim().replace(/\s+/g, ' ');
    if (!isTestName(name)) {
      setError('Use 1–40 letters or numbers (spaces, dots, dashes and underscores are fine).');
      return;
    }
    if (!version) {
      setError('Pick version A or B.');
      return;
    }
    setTester({ name, startedAt: Date.now(), version });
  };

  return (
    <main className={styles.gate}>
      <form className={styles.card} onSubmit={start} noValidate>
        <p className={styles.kicker}>User test</p>
        <h1 className={styles.title}>Type your test name to start</h1>
        <p className={styles.body}>
          It labels your session, for example P01. Please don’t use your real name. We record how long each screen and function is open and which
          buttons you press, never what you type.
        </p>
        <label htmlFor="tester-name" className={styles.label}>
          Test name
        </label>
        <input
          id="tester-name"
          className={styles.input}
          value={draft}
          maxLength={40}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="P01"
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          aria-describedby={error ? 'tester-error' : undefined}
          aria-invalid={error ? true : undefined}
        />
        {error && (
          <p id="tester-error" className={styles.error} role="alert">
            {error}
          </p>
        )}
        <span className={styles.label} id="tester-version">
          Version
        </span>
        <div className={styles.versions} role="radiogroup" aria-labelledby="tester-version">
          {(['A', 'B'] as TestVersion[]).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={version === v}
              className={styles.version}
              onClick={() => {
                setVersion(v);
                setError(null);
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <button type="submit" className={styles.start} disabled={!draft.trim() || !version}>
          Start
        </button>
      </form>
    </main>
  );
}
