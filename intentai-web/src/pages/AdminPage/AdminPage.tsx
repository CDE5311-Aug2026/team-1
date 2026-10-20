import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { formatDuration, summarize, toCsv, type SummaryRow } from '../../usage/aggregate';
import type { UsageEvent, UsageKind } from '../../usage/event';
import styles from './AdminPage.module.css';

/**
 * Team-only usage dashboard (v2 class user test). Not linked from the app and never tracked.
 * The password lives in sessionStorage for this tab only: a deliberate exception to the stores
 * convention, since it is not app data and must not outlive the tab.
 */
export const PASSWORD_KEY = 'intentai:admin-password';

type SortKey = 'name' | 'people' | 'visits' | 'totalMs' | 'avgPerVisitMs' | 'avgPerPersonMs';

const KINDS: { kind: UsageKind; label: string; caption: string; perPerson: string }[] = [
  { kind: 'page', label: 'Pages', caption: 'Time per page', perPerson: 'Person by page' },
  { kind: 'section', label: 'Sections', caption: 'Time per Today tab', perPerson: 'Person by Today tab' },
  { kind: 'activity', label: 'Activities', caption: 'Time per activity', perPerson: 'Person by activity' },
];

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'people', label: 'People' },
  { key: 'visits', label: 'Visits' },
  { key: 'totalMs', label: 'Total' },
  { key: 'avgPerVisitMs', label: 'Avg per visit' },
  { key: 'avgPerPersonMs', label: 'Avg per person' },
];

function readPassword(): string {
  try {
    return sessionStorage.getItem(PASSWORD_KEY) ?? '';
  } catch {
    return '';
  }
}

function writePassword(value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(PASSWORD_KEY);
    else sessionStorage.setItem(PASSWORD_KEY, value);
  } catch {
    // Private mode: the password just isn't remembered.
  }
}

function downloadCsv(events: UsageEvent[]) {
  const url = URL.createObjectURL(new Blob([toCsv(events)], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'intentai-usage.csv';
  link.click();
  // Revoking in the same tick can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const cellValue = (row: SummaryRow, key: SortKey) =>
  key === 'name' || key === 'people' || key === 'visits' ? String(row[key]) : formatDuration(row[key]);

export default function AdminPage() {
  const [password, setPassword] = useState(readPassword);
  const [draft, setDraft] = useState('');
  const [events, setEvents] = useState<UsageEvent[] | null>(null);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<UsageKind>('page');
  const [sort, setSort] = useState<SortKey>('totalMs');
  const [confirming, setConfirming] = useState(false);

  const request = useCallback(async (pw: string, method: 'GET' | 'DELETE' = 'GET') => {
    const res = await fetch('/api/stats', { method, headers: { 'x-admin-password': pw } });
    if (res.status === 401) {
      writePassword(null);
      setPassword('');
      setEvents(null);
      setError('Wrong password');
      return null;
    }
    if (!res.ok) {
      setError((await res.text()) || `Request failed (${res.status})`);
      return null;
    }
    setError('');
    return res;
  }, []);

  // Only the newest load may update the page (a fast double Refresh can answer out of order).
  const latestLoad = useRef(0);
  const load = useCallback(
    async (pw: string) => {
      const id = ++latestLoad.current;
      const res = await request(pw).catch(() => (setError('Could not reach the server.'), null));
      if (!res) return;
      const { events: loaded } = (await res.json()) as { events: UsageEvent[] };
      if (id === latestLoad.current) setEvents(loaded);
    },
    [request],
  );

  useEffect(() => {
    if (password) void load(password);
  }, [password, load]);

  const signIn = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    writePassword(draft);
    setPassword(draft);
    setDraft('');
  };

  const reset = async () => {
    setConfirming(false);
    if (await request(password, 'DELETE').catch(() => null)) await load(password);
  };

  const summary = useMemo(() => (events ? summarize(events) : null), [events]);
  const rows = useMemo(() => {
    const list = summary?.rows.filter((row) => row.kind === kind) ?? [];
    return [...list].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : b[sort] - a[sort] || a.name.localeCompare(b.name),
    );
  }, [summary, kind, sort]);
  const current = KINDS.find((k) => k.kind === kind)!;
  // Person-by-name grid columns: the current kind's names, most total time first.
  const gridNames = useMemo(
    () =>
      (summary?.rows.filter((row) => row.kind === kind) ?? [])
        .sort((a, b) => b.totalMs - a.totalMs || a.name.localeCompare(b.name))
        .map((row) => row.name),
    [summary, kind],
  );

  return (
    <main className={styles.admin}>
      <h1 className={styles.title}>Usage dashboard</h1>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {!password ? (
        <form className={styles.signIn} onSubmit={signIn}>
          <label htmlFor="admin-password">Admin password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className={styles.primary}>
            Open dashboard
          </button>
        </form>
      ) : (
        <>
          <div className={styles.toolbar}>
            <button type="button" className={styles.button} onClick={() => void load(password)}>
              Refresh
            </button>
            <button type="button" className={styles.button} disabled={!events?.length} onClick={() => events && downloadCsv(events)}>
              Download CSV
            </button>
            {confirming ? (
              <span className={styles.confirm}>
                Delete all usage data?
                <button type="button" className={styles.danger} onClick={() => void reset()}>
                  Yes, delete
                </button>
                <button type="button" className={styles.button} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" className={styles.button} onClick={() => setConfirming(true)}>
                Reset data
              </button>
            )}
          </div>

          {summary && summary.people.length === 0 && <p className={styles.empty}>No usage data yet.</p>}

          {summary && summary.people.length > 0 && (
            <>
              <p className={styles.meta}>
                {summary.people.length} {summary.people.length === 1 ? 'person' : 'people'} · {events!.length} timings
              </p>
              <div className={styles.filters} role="group" aria-label="Show">
                {KINDS.map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    className={styles.filter}
                    aria-pressed={kind === k.kind}
                    onClick={() => setKind(k.kind)}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <p className={styles.note}>
                Section and activity time is part of page time. Each browser tab counts as its own session.
              </p>
              {/* Focusable so keyboard users can scroll a wide table (axe: scrollable-region-focusable). */}
              <div className={styles.scroll} tabIndex={0} role="region" aria-label={`${current.caption} (scrolls sideways)`}>
                <table className={styles.table}>
                  <caption>{current.caption}</caption>
                  <thead>
                    <tr>
                      {COLUMNS.map((column) => (
                        <th
                          key={column.key}
                          scope="col"
                          aria-sort={sort === column.key ? (column.key === 'name' ? 'ascending' : 'descending') : undefined}
                        >
                          <button type="button" className={styles.sort} onClick={() => setSort(column.key)}>
                            {column.label}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.name}>
                        {COLUMNS.map((column) => (
                          <td key={column.key}>{cellValue(row, column.key)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 && <p className={styles.empty}>Nothing recorded here yet.</p>}
              </div>

              <div className={styles.scroll} tabIndex={0} role="region" aria-label={`${current.perPerson} (scrolls sideways)`}>
                <table className={styles.table}>
                  <caption>{current.perPerson}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Person</th>
                      {gridNames.map((name) => (
                        <th key={name} scope="col">
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.people.map((person) => (
                      <tr key={person.uid}>
                        <th scope="row">{person.uid.slice(0, 6)}</th>
                        {gridNames.map((name) => {
                          const ms = person.msByName[kind][name];
                          return (
                            <td key={name}>
                              {ms ? formatDuration(ms) : '–'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.scroll} tabIndex={0} role="region" aria-label="Landing page (scrolls sideways)">
                <table className={styles.table}>
                  <caption>Landing page</caption>
                  <thead>
                    <tr>
                      <th scope="col">First page</th>
                      <th scope="col">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.landing.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{row.sessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.scroll} tabIndex={0} role="region" aria-label="People (scrolls sideways)">
                <table className={styles.table}>
                  <caption>People</caption>
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Sessions</th>
                      <th scope="col">Total time</th>
                      <th scope="col">First seen</th>
                      <th scope="col">Pages in order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.people.map((person) => (
                      <tr key={person.uid}>
                        <td>{person.uid.slice(0, 6)}</td>
                        <td>{person.sessions}</td>
                        <td>{formatDuration(person.totalMs)}</td>
                        <td>{new Date(person.firstSeen).toLocaleString()}</td>
                        <td>
                          {person.pathsBySession[0]?.pages.join(' → ')}
                          {person.pathsBySession.length > 1 && (
                            <details className={styles.more}>
                              <summary>Earlier sessions</summary>
                              {person.pathsBySession.slice(1).map((session) => (
                                <p key={session.sid}>{session.pages.join(' → ')}</p>
                              ))}
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
