import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { formatDuration, summarize, toCsv, type SummaryRow } from '../../usage/aggregate';
import type { UsageEvent, UsageKind } from '../../usage/event';
import { usePersistentStore } from '../../data/persistentStore';
import { testerStore } from '../../data/stores';
import { clearLocalUsage, fromExport, mergeEvents, readLocalUsage, toExport } from '../../usage/localLog';
import Analysis from './Analysis';
import styles from './AdminPage.module.css';

/** Where the dashboard's events come from: the server (password), this device's own log, or exported files. */
type Source = 'device' | 'files' | 'server';
const SOURCES: { id: Source; label: string }[] = [
  { id: 'device', label: 'This device' },
  { id: 'files', label: 'Files' },
  { id: 'server', label: 'Server' },
];

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

/** File text (FileReader where Blob.text is missing, as in older Safari). */
function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

function downloadJson(events: UsageEvent[], who: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(toExport(events), null, 1)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `intentai-usage-${who || 'device'}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function AdminPage() {
  const [password, setPassword] = useState(readPassword);
  const [draft, setDraft] = useState('');
  const [serverEvents, setEvents] = useState<UsageEvent[] | null>(null);
  // A test runs with no server: this device's own log comes first when it has anything.
  const [source, setSource] = useState<Source>(() => (readLocalUsage().length ? 'device' : 'server'));
  const [deviceEvents, setDeviceEvents] = useState<UsageEvent[]>(readLocalUsage);
  const [fileEvents, setFileEvents] = useState<UsageEvent[] | null>(null);
  const [fileNote, setFileNote] = useState('');
  const [tester, setTester] = usePersistentStore(testerStore);
  const [confirmClear, setConfirmClear] = useState(false);
  const events = source === 'server' ? serverEvents : source === 'device' ? deviceEvents : fileEvents;
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
    if (password && source === 'server') void load(password);
  }, [password, load, source]);

  const openFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const lists: UsageEvent[][] = [];
    const bad: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const got = fromExport(JSON.parse(await readText(file)));
        if (got) lists.push(got);
        else bad.push(file.name);
      } catch {
        bad.push(file.name);
      }
    }
    const merged = mergeEvents(...(fileEvents ? [fileEvents] : []), ...lists);
    setFileEvents(merged);
    setFileNote(`${lists.length} file${lists.length === 1 ? '' : 's'} added · ${merged.length} records${bad.length ? ` · not usage files: ${bad.join(', ')}` : ''}`);
  };

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

      <div className={styles.filters} role="group" aria-label="Data from">
        {SOURCES.map((s) => (
          <button key={s.id} type="button" className={styles.filter} aria-pressed={source === s.id} onClick={() => setSource(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {source === 'device' && (
        <div className={styles.toolbar}>
          <span className={styles.meta}>
            {tester.name ? (
              <>
                Test name on this device: <strong>{tester.name}</strong>
              </>
            ) : (
              'No test running on this device.'
            )}{' '}
            · {deviceEvents.length} records
          </span>
          <button type="button" className={styles.button} onClick={() => setDeviceEvents(readLocalUsage())}>
            Refresh
          </button>
          <button type="button" className={styles.button} disabled={!deviceEvents.length} onClick={() => downloadJson(deviceEvents, tester.name)}>
            Export file (JSON)
          </button>
          <button type="button" className={styles.button} disabled={!deviceEvents.length} onClick={() => downloadCsv(deviceEvents)}>
            Download CSV
          </button>
          {tester.name && (
            <button type="button" className={styles.button} onClick={() => setTester({ name: '' })}>
              End test (next person types a new name)
            </button>
          )}
          {confirmClear ? (
            <span className={styles.confirm}>
              Delete this device's records?
              <button
                type="button"
                className={styles.danger}
                onClick={() => {
                  clearLocalUsage();
                  setDeviceEvents([]);
                  setConfirmClear(false);
                }}
              >
                Yes, delete
              </button>
              <button type="button" className={styles.button} onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className={styles.button} disabled={!deviceEvents.length} onClick={() => setConfirmClear(true)}>
              Clear this device
            </button>
          )}
        </div>
      )}

      {source === 'files' && (
        <div className={styles.toolbar}>
          <label className={`${styles.button} ${styles.fileLabel}`}>
            Add exported files…
            <input
              type="file"
              accept="application/json,.json"
              multiple
              className={styles.fileInput}
              onChange={(e) => {
                void openFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <button type="button" className={styles.button} disabled={!fileEvents?.length} onClick={() => fileEvents && downloadCsv(fileEvents)}>
            Download CSV
          </button>
          <button type="button" className={styles.button} disabled={!fileEvents} onClick={() => (setFileEvents(null), setFileNote(''))}>
            Start over
          </button>
          {fileNote && <span className={styles.meta}>{fileNote}</span>}
        </div>
      )}
      {source === 'files' && !fileEvents && (
        <p className={styles.note}>Add the JSON files exported on each test device (This device → Export file). Files are merged; the same file twice counts once.</p>
      )}

      {source === 'server' && !password ? (
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
          {source === 'server' && (
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
          )}

          {summary && summary.people.length === 0 && <p className={styles.empty}>No usage data yet.</p>}

          {events && events.length > 0 && <Analysis events={events} />}

          {summary && summary.people.length > 0 && (
            <>
              <h2 className={styles.sub}>Totals by person</h2>
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
