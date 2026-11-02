import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { readPassword, writePassword } from '../AdminPage/password';
import {
  COMPARE,
  IMPROVE,
  ITEMS,
  OUTCOMES,
  PHONES,
  PREFS,
  QUICK,
  STEPS,
  TASKS,
  USE_AGAIN,
  fmt,
  itemKey,
  median,
  nextStep,
  openCount,
  preference,
  tasksDone,
  textAmount,
  toCsv,
  toggleOption,
  versionAt,
  type AbResponse,
  type Session,
  type Version,
} from './abTest';
import styles from './AbTestPage.module.css';

/**
 * The A/B test desk, for three phones: the left phone opens version A, the right phone version B, and the
 * third runs the session (the facilitator ticks tasks, then hands it over for the questions). Answers save
 * to /api/abtest after every step; the results need the team password from /admin. Not linked from the app.
 */
type View = 'phones' | 'session' | 'results';
const VIEWS: View[] = ['phones', 'session', 'results'];

// Kept on this phone only: which version it shows, and the session in progress (so a reload loses nothing).
const PHONE_KEY = 'intentai:abtest-phone';
const SESSION_KEY = 'intentai:abtest-session';
const MIN_KEY = 'intentai:abtest-min';
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function keep(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode: the phone just doesn't remember.
  }
}
const toTop = () => window.scrollTo({ top: 0 });

const viewFromHash = (): View => {
  const h = window.location.hash.slice(1) as View;
  return VIEWS.includes(h) ? h : 'session';
};

export default function AbTestPage() {
  const [view, setView] = useState<View>(viewFromHash);
  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (v: View) => {
    window.history.replaceState(null, '', '#' + v);
    setView(v);
    toTop();
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>A/B Test</h1>
          <p className={styles.sub}>A Clean · left phone &nbsp;/&nbsp; B Pirate · right phone</p>
        </div>
        <nav className={styles.switch} aria-label="Views">
          {VIEWS.map((v) => (
            <button key={v} type="button" aria-current={view === v ? 'page' : undefined} onClick={() => go(v)}>
              {v}
            </button>
          ))}
        </nav>
      </header>
      {view === 'phones' ? <PhonesView /> : view === 'results' ? <ResultsView /> : <SessionView />}
    </main>
  );
}

const Tag = ({ v, big }: { v: Version; big?: boolean }) => (
  <span className={`${styles.tag} ${styles['tag' + v]} ${big ? styles.tagBig : ''}`} aria-hidden="true">
    {v}
  </span>
);

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`${styles.card} ${className}`}>{children}</section>
);

/* ---------- phones ---------- */

function PhonesView() {
  const [phone, setPhone] = useState<Version | null>(() => load<Version | null>(PHONE_KEY, null));
  const pick = (v: Version | null) => {
    keep(PHONE_KEY, v);
    setPhone(v);
  };
  if (!phone)
    return (
      <Card>
        <h2 className={styles.h2}>Which phone is this?</h2>
        <div className={styles.pick}>
          {(['A', 'B'] as Version[]).map((v) => (
            <button key={v} type="button" onClick={() => pick(v)}>
              <Tag v={v} big />
              {PHONES[v].name} · {PHONES[v].side}
            </button>
          ))}
        </div>
        <p className={styles.mute}>The third phone runs Session.</p>
      </Card>
    );
  const P = PHONES[phone];
  return (
    <Card className={styles['phone' + phone]}>
      <div className={styles.row}>
        <Tag v={phone} />
        <h2 className={styles.h2}>
          {P.name} · {P.side} phone
        </h2>
      </div>
      <div className={styles.links}>
        {P.links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.title}
            <span>{l.task}</span>
          </a>
        ))}
      </div>
      <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.small}`} onClick={() => pick(null)}>
        Change phone
      </button>
    </Card>
  );
}

/* ---------- session ---------- */

const answersOf = (s: Session): AbResponse => {
  const { step, ...rest } = s;
  return { ...rest, status: step === 'done' ? 'done' : 'started' };
};

async function post(body: unknown): Promise<Response> {
  return fetch('/api/abtest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

function SessionView() {
  const [s, setS] = useState<Session | null>(() => load<Session | null>(SESSION_KEY, null));
  const [missing, setMissing] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (next: Session | null) => {
    keep(SESSION_KEY, next);
    setS(next);
  };
  const save = async (next: Session) => {
    try {
      const res = await post({ type: 'save', response: answersOf(next) });
      setNote(res.ok ? '' : 'Could not save just now. The answers stay on this phone and save at the next step.');
    } catch {
      setNote('Offline. The answers stay on this phone and save at the next step.');
    }
  };

  const begin = async () => {
    setBusy(true);
    try {
      const res = await post({ type: 'start' });
      if (!res.ok) throw new Error(await res.text());
      const started = (await res.json()) as AbResponse;
      update({ ...started, step: 'start' });
      setNote('');
    } catch (e) {
      setNote(e instanceof Error && e.message.startsWith('Storage') ? e.message : 'Could not start. Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!s)
    return (
      <>
        {note && <p className={styles.banner}>{note}</p>}
        <Card>
          <h2 className={styles.h2}>Next participant</h2>
          <p>Odd numbers start on A, even numbers on B, so the order balances out. About 30 minutes.</p>
          <button type="button" className={styles.btn} onClick={begin} disabled={busy}>
            Start session
          </button>
        </Card>
      </>
    );

  const open = openCount(s);
  const advance = () => {
    if (open > 0) {
      setMissing(true);
      requestAnimationFrame(() => document.querySelector(`.${styles.missing}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }));
      return;
    }
    const next = { ...s, step: nextStep(s.step) };
    setMissing(false);
    update(next);
    toTop();
    void save(next);
  };
  const set = (part: 'tasks' | 'ratings' | 'quick', v: Version, key: string, value: unknown) =>
    update({ ...s, [part]: { ...s[part], [v]: { ...s[part][v], [key]: value } } });
  const setCompare = (key: string, value: number | string) => update({ ...s, compare: { ...s.compare, [key]: value } });

  const pct = Math.round((STEPS.indexOf(s.step) / (STEPS.length - 1)) * 100);
  const v = versionAt(s);
  const n = s.step.endsWith('2') ? 2 : 1;
  const nextLabel = open ? `${open} left` : undefined;
  const miss = (val: unknown) => (missing && (val == null || (Array.isArray(val) && !val.length)) ? styles.missing : '');
  const versionHead = (title: string, sub?: string) => (
    <div className={styles.row}>
      <Tag v={v} />
      <div>
        <h2 className={styles.h2}>{title}</h2>
        {sub && <p className={styles.mute}>{sub}</p>}
      </div>
    </div>
  );

  let body: ReactNode;
  if (s.step === 'start')
    body = (
      <Card>
        <p className={styles.code}>{s.code}</p>
        <p className={styles.say}>“We are testing two designs, not you. Please think aloud as you go.”</p>
        <button type="button" className={styles.btn} onClick={advance}>
          Begin with phone {s.first}
        </button>
      </Card>
    );
  else if (s.step.startsWith('tasks')) {
    const t = s.tasks[v] ?? {};
    body = (
      <Card>
        {versionHead(`Phone ${v} · ${PHONES[v].name}`, 'Read each task aloud. Tick how it went.')}
        {TASKS.map((task, i) => (
          <div key={task.key} className={`${styles.q} ${miss(t[task.key])}`}>
            <p className={styles.qt}>
              {i + 1}. {task.name}
            </p>
            <p className={styles.say}>“{task.say}”</p>
            <div className={styles.out} role="group" aria-label={task.name}>
              {OUTCOMES.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className={`${styles.chip} ${styles[o.key]}`}
                  aria-pressed={t[task.key] === o.key}
                  onClick={() => set('tasks', v, task.key, o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className={styles.mute}>One hint after 60 seconds stuck counts as “With help”.</p>
        <div className={styles.hand}>
          <HandIcon />
          <p>Hand this phone to the participant.</p>
        </div>
        <button type="button" className={styles.btn} onClick={advance}>
          {nextLabel ?? 'Hand over'}
        </button>
      </Card>
    );
  } else if (s.step.startsWith('rate')) {
    const r = s.ratings[v] ?? {};
    body = (
      <Card>
        {versionHead(`Your experience with ${v}`, '1 = strongly disagree, 5 = strongly agree.')}
        {ITEMS.map((text, i) => {
          const k = itemKey(i);
          return (
            <div key={k} className={`${styles.q} ${miss(r[k])}`}>
              <p className={styles.qt}>
                {i + 1}. {text}
              </p>
              <Scale value={r[k]} label={text} onPick={(x) => set('ratings', v, k, x)} />
              {i === 0 && <Ends left="Strongly disagree" right="Strongly agree" />}
            </div>
          );
        })}
        <button type="button" className={styles.btn} onClick={advance}>
          {nextLabel ?? 'Next'}
        </button>
      </Card>
    );
  } else if (s.step.startsWith('quick')) {
    const q = s.quick[v] ?? {};
    body = (
      <Card>
        {versionHead(`A few quick ones about ${v}`)}
        {QUICK.map((x, i) => (
          <div key={x.key} className={`${styles.q} ${miss(q[x.key])}`}>
            <p className={styles.qt}>
              {i + 1}. {x.text}
              {x.max === 2 && <span className={styles.mute}> (up to two)</span>}
            </p>
            {x.scale ? (
              <>
                <Scale value={q[x.key]} label={x.text} onPick={(val) => set('quick', v, x.key, val)} />
                <Ends left={x.scale[0]} right={x.scale[1]} />
              </>
            ) : (
              <div className={styles.multi} role="group" aria-label={x.text}>
                {x.options!.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={styles.chip}
                    aria-pressed={Array.isArray(q[x.key]) && (q[x.key] as string[]).includes(o)}
                    onClick={() => set('quick', v, x.key, toggleOption(q[x.key], o, x.max))}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <button type="button" className={styles.btn} onClick={advance}>
          {nextLabel ?? (n === 1 ? 'Give the phone back' : 'Compare A and B')}
        </button>
      </Card>
    );
  } else if (s.step === 'compare') {
    const c = s.compare;
    body = (
      <Card>
        <h2 className={styles.h2}>Which version do you prefer?</h2>
        <p className={styles.mute}>Lean towards the one you prefer, or pick = if there is no difference.</p>
        {PREFS.map((p, i) => (
          <div key={p.key} className={`${styles.q} ${miss(c[p.key])}`}>
            <p className={styles.qt}>{p.label}</p>
            <div className={styles.scale} role="group" aria-label={p.label}>
              {COMPARE.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.chip} ${o.value < 3 ? styles.favA : o.value > 3 ? styles.favB : ''}`}
                  aria-pressed={c[p.key] === o.value}
                  aria-label={o.name}
                  onClick={() => setCompare(p.key, o.value)}
                >
                  {o.label}
                </button>
              ))}
              <button type="button" className={`${styles.chip} ${styles.na}`} aria-pressed={c[p.key] === 'na'} onClick={() => setCompare(p.key, 'na')}>
                N/A
              </button>
            </div>
            {i === 0 && <Ends left="A+ strongly A" mid="= same" right="B+ strongly B" />}
          </div>
        ))}
        <OneOf label="Which version would you use again?" options={USE_AGAIN} value={c.useAgain} missing={missing} onPick={(o) => setCompare('useAgain', o)} />
        <OneOf label="What should we improve first?" options={IMPROVE} value={c.improve} missing={missing} onPick={(o) => setCompare('improve', o)} />
        <div className={styles.q}>
          <label className={styles.qt} htmlFor="ab-comment">
            Reason or example <span className={styles.mute}>(optional)</span>
          </label>
          <textarea
            id="ab-comment"
            className={styles.text}
            rows={3}
            maxLength={1000}
            value={typeof c.comment === 'string' ? c.comment : ''}
            onChange={(e) => setCompare('comment', e.target.value)}
          />
        </div>
        <button type="button" className={styles.btn} onClick={advance}>
          {nextLabel ?? 'Finish'}
        </button>
      </Card>
    );
  } else
    body = (
      <Card className={styles.center}>
        <h2 className={styles.h2}>Thank you</h2>
        <p>{s.code} is saved. Please hand the phone back.</p>
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            update(null);
            toTop();
          }}
        >
          Next participant
        </button>
      </Card>
    );

  return (
    <>
      <div className={styles.progress} role="progressbar" aria-label={`${s.code} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: pct + '%' }} />
      </div>
      {note && <p className={styles.banner}>{note}</p>}
      {body}
    </>
  );
}

function Scale({ value, label, onPick }: { value: unknown; label: string; onPick: (v: number | 'na') => void }) {
  return (
    <div className={styles.scale} role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((x) => (
        <button key={x} type="button" className={styles.chip} aria-pressed={value === x} onClick={() => onPick(x)}>
          {x}
        </button>
      ))}
      <button type="button" className={`${styles.chip} ${styles.na}`} aria-pressed={value === 'na'} onClick={() => onPick('na')}>
        N/A
      </button>
    </div>
  );
}

const Ends = ({ left, mid, right }: { left: string; mid?: string; right: string }) => (
  <div className={styles.ends} aria-hidden="true">
    <span>{left}</span>
    {mid && <span>{mid}</span>}
    <span>{right}</span>
  </div>
);

function OneOf({ label, options, value, missing, onPick }: { label: string; options: string[]; value: unknown; missing: boolean; onPick: (o: string) => void }) {
  return (
    <div className={`${styles.q} ${missing && !value ? styles.missing : ''}`}>
      <p className={styles.qt}>{label}</p>
      <div className={styles.multi} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" className={styles.chip} aria-pressed={value === o} onClick={() => onPick(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

const HandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 11V6a1.5 1.5 0 0 1 3 0v4m0-1V4.5a1.5 1.5 0 0 1 3 0V10m0-4a1.5 1.5 0 0 1 3 0v5m0-3a1.5 1.5 0 0 1 3 0v5.5A6.5 6.5 0 0 1 12.5 21h-1a6 6 0 0 1-4.6-2.2L3.6 14.6a1.5 1.5 0 0 1 2.3-1.9L7 14" />
  </svg>
);

/* ---------- results ---------- */

function ResultsView() {
  const [password, setPassword] = useState(readPassword);
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState<AbResponse[] | null>(null);
  const [error, setError] = useState('');
  const [min, setMin] = useState(() => load(MIN_KEY, 8));
  const [confirm, setConfirm] = useState<string | null>(null);

  const fetchRows = useCallback(async (pw: string) => {
    setError('');
    try {
      const res = await fetch('/api/abtest', { headers: { 'x-admin-password': pw } });
      if (res.status === 401) {
        writePassword(null);
        setPassword('');
        setError('Wrong password.');
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setRows(((await res.json()) as { responses: AbResponse[] }).responses);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Could not load the answers.');
    }
  }, []);
  useEffect(() => {
    if (password) void fetchRows(password);
  }, [password, fetchRows]);

  if (!password)
    return (
      <Card>
        <form
          className={styles.signIn}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            writePassword(draft);
            setPassword(draft);
          }}
        >
          <label htmlFor="ab-password" className={styles.qt}>
            Team password
          </label>
          <input id="ab-password" type="password" autoComplete="current-password" value={draft} onChange={(e) => setDraft(e.target.value)} />
          {error && <p className={styles.bad}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={!draft}>
            Show results
          </button>
        </form>
      </Card>
    );
  if (!rows)
    return error ? (
      <Card>
        <p className={styles.bad}>{error}</p>
        <button type="button" className={styles.btn} onClick={() => fetchRows(password)}>
          Try again
        </button>
      </Card>
    ) : (
      <Card className={styles.center}>Loading answers…</Card>
    );

  const remove = async (code: string) => {
    const res = await fetch('/api/abtest?code=' + encodeURIComponent(code), { method: 'DELETE', headers: { 'x-admin-password': password } });
    setConfirm(null);
    if (res.ok) setRows(rows.filter((r) => r.code !== code));
    else setError('Could not remove that entry.');
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'findsg-ab-results.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const done = rows.filter((r) => r.status === 'done').length;
  const paired = rows.filter((r) => Object.keys(r.compare).length > 0);
  const tA = tasksDone(rows, 'A');
  const tB = tasksDone(rows, 'B');
  const ease = preference('ease', paired, min);
  const interest = preference('interest', paired, min);
  const pill = (side: Version | null, label: string) => <span className={`${styles.pill} ${side ? styles['pill' + side] : ''}`}>{label}</span>;
  const textA = textAmount(rows, 'A');
  const textB = textAmount(rows, 'B');

  return (
    <>
      {error && <p className={styles.banner}>{error}</p>}
      <Card>
        <div className={styles.top}>
          <h3 className={styles.h3}>Answers</h3>
          <span className={styles.mono}>
            {done} done · {rows.length - done} unfinished
          </span>
        </div>
        <div className={styles.row}>
          <label htmlFor="ab-min" className={styles.mute}>
            Minimum paired answers
          </label>
          <input
            id="ab-min"
            className={styles.num}
            type="number"
            min={1}
            max={99}
            value={min}
            onChange={(e) => {
              const m = Math.max(1, parseInt(e.target.value, 10) || 8);
              keep(MIN_KEY, m);
              setMin(m);
            }}
          />
        </div>
      </Card>

      <Card>
        <h3 className={styles.h3}>Hypotheses</h3>
        <div className={styles.verdict}>
          <b>H1 Ease</b>
          {pill(ease.side, ease.verdict)}
          <span />
          <span className={styles.mute}>
            {ease.a} favour A · {ease.same} same · {ease.b} favour B. Tasks done alone: A {tA.alone}/{tA.tried}, B {tB.alone}/{tB.tried}.
          </span>
          <b>H2 Interest</b>
          {pill(interest.side, interest.verdict)}
          <span />
          <span className={styles.mute}>
            {interest.a} favour A · {interest.same} same · {interest.b} favour B.
          </span>
        </div>
      </Card>

      <Card>
        <h3 className={styles.h3}>Preferences</h3>
        {!paired.length ? (
          <p className={styles.empty}>No comparisons yet.</p>
        ) : (
          PREFS.map((p) => {
            const r = preference(p.key, paired, min);
            const w = (x: number) => (r.valid ? (x / r.valid) * 100 : 0) + '%';
            return (
              <div key={p.key} className={styles.pref}>
                <div className={styles.top}>
                  <span>{p.label}</span>
                  <span className={styles.mute}>
                    {r.na ? `${r.na} N/A ` : ''}
                    {pill(r.side, r.short)}
                  </span>
                </div>
                <div className={styles.bar} role="img" aria-label={`${p.label}: ${r.a} favour A, ${r.same} no preference, ${r.b} favour B`}>
                  <i className={styles.fa} style={{ width: w(r.a) }}>{r.a || ''}</i>
                  <i className={styles.fn} style={{ width: w(r.same) }}>{r.same || ''}</i>
                  <i className={styles.fb} style={{ width: w(r.b) }}>{r.b || ''}</i>
                </div>
              </div>
            );
          })
        )}
        <p className={styles.mute}>Orange favours A, grey no preference, blue favours B. A majority is more than half the valid answers.</p>
      </Card>

      <Card>
        <h3 className={styles.h3}>Tasks done alone</h3>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Task</th>
                <th className={styles.n}>A</th>
                <th className={styles.n}>B</th>
              </tr>
            </thead>
            <tbody>
              {TASKS.map((t) => {
                const a = tA.by[t.key] ?? { alone: 0, tried: 0 };
                const b = tB.by[t.key] ?? { alone: 0, tried: 0 };
                return (
                  <tr key={t.key}>
                    <td>
                      {t.name}
                      {t.key === 't2' && <span className={styles.mute}> (prepared start)</span>}
                    </td>
                    <td className={styles.n}>
                      {a.alone}/{a.tried}
                    </td>
                    <td className={styles.n}>
                      {b.alone}/{b.tried}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className={styles.h3}>Ratings · median</h3>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Statement</th>
                <th className={styles.n}>A</th>
                <th className={styles.n}>B</th>
                <th className={styles.n}>N/A</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((text, i) => {
                const k = itemKey(i);
                const va = rows.map((r) => r.ratings.A?.[k]);
                const vb = rows.map((r) => r.ratings.B?.[k]);
                const na = [...va, ...vb].filter((x) => x === 'na').length;
                return (
                  <tr key={k}>
                    <td>{text}</td>
                    <td className={styles.n}>{fmt(median(va))}</td>
                    <td className={styles.n}>{fmt(median(vb))}</td>
                    <td className={styles.n}>{na || ''}</td>
                  </tr>
                );
              })}
              {[
                ['q2', 'Wanted to keep exploring'],
                ['q5', 'Learned about Singapore'],
              ].map(([k, label]) => (
                <tr key={k}>
                  <td>{label}</td>
                  <td className={styles.n}>{fmt(median(rows.map((r) => r.quick.A?.[k])))}</td>
                  <td className={styles.n}>{fmt(median(rows.map((r) => r.quick.B?.[k])))}</td>
                  <td />
                </tr>
              ))}
              <tr>
                <td>
                  Amount of text <span className={styles.mute}>(little · right · much)</span>
                </td>
                <td className={styles.n}>{textA.join('·')}</td>
                <td className={styles.n}>{textB.join('·')}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className={styles.h3}>Order check</h3>
        <p>
          Overall median when A came first <b className={styles.mono}>{fmt(median(paired.filter((r) => r.first === 'A').map((r) => r.compare.overall)))}</b>, when B came
          first <b className={styles.mono}>{fmt(median(paired.filter((r) => r.first === 'B').map((r) => r.compare.overall)))}</b> (1 = A, 5 = B). A big gap means the order
          sways people.
        </p>
        <p>
          Would use again:{' '}
          {USE_AGAIN.map((o) => `${o} ${paired.filter((r) => r.compare.useAgain === o).length}`).join(' · ')}
        </p>
      </Card>

      <Card>
        <div className={styles.top}>
          <h3 className={styles.h3}>Participants</h3>
          <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.small}`} onClick={download} disabled={!rows.length}>
            Export CSV
          </button>
        </div>
        {!rows.length ? (
          <p className={styles.empty}>No sessions yet.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>First</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.code}>
                    <td className={styles.mono}>{r.code}</td>
                    <td>{r.first}</td>
                    <td>{r.status === 'done' ? 'Done' : 'Unfinished'}</td>
                    <td className={styles.mono}>{new Date(r.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</td>
                    <td>
                      {confirm === r.code ? (
                        <span className={styles.row}>
                          <button type="button" className={`${styles.btn} ${styles.small} ${styles.danger}`} onClick={() => remove(r.code)}>
                            Delete
                          </button>
                          <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.small}`} onClick={() => setConfirm(null)}>
                            Keep
                          </button>
                        </span>
                      ) : (
                        <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.small}`} onClick={() => setConfirm(r.code)}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
