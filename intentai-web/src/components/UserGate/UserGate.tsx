// User test start screen: before the app opens, the person types a test name (e.g. P01). Every timing and
// press recorded afterwards carries it, on this device and (when connected) on the server. Turn it off for a
// normal build with VITE_USER_GATE=0. The dashboard (/admin) and the A/B desk (/test) are never behind it.
import { useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { usePersistentStore } from '../../data/persistentStore';
import { testerStore, type TestVersion } from '../../data/stores';
import { ADMIN_PATH, TEST_PATH } from '../../routes';
import { isTestName } from '../../usage/event';
import styles from './UserGate.module.css';

export const USER_GATE_ENABLED = import.meta.env.VITE_USER_GATE !== '0';

export default function UserGate({ children }: { children: ReactNode }) {
  const [tester, setTester] = usePersistentStore(testerStore);
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState('');
  // The facilitator picks the version; /test's phone links preselect it with ?v=A or ?v=B.
  const asked = params.get('v');
  const [version, setVersion] = useState<TestVersion | null>(asked === 'A' || asked === 'B' ? asked : null);
  const [error, setError] = useState<string | null>(null);

  if (!USER_GATE_ENABLED || tester.name || pathname.startsWith(ADMIN_PATH) || pathname.startsWith(TEST_PATH)) return <>{children}</>;

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
