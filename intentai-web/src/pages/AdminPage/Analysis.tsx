// User test analysis: headline numbers, which pages hold people, warning signs, functions, presses, flows
// and each person's sessions. Charts are plain HTML bars (one hue, value labels in text ink, a title on
// every bar for hover); every chart has a table or list with the same numbers.
import { useMemo, useState } from 'react';
import { formatDuration } from '../../usage/aggregate';
import { analyze, personOf, type PageStat } from '../../usage/analysis';
import type { UsageEvent } from '../../usage/event';
import { TRACKED_PAGE_NAMES } from '../../usage/names';
import styles from './Analysis.module.css';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const secs = (ms: number) => (ms < 60_000 ? `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s` : formatDuration(ms));
const day = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function csvCell(value: string | number) {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function pagesCsv(pages: PageStat[]): string {
  const head = ['page', 'visits', 'people', 'total_s', 'median_s', 'p75_s', 'share_pct', 'entries', 'exits', 'exit_rate_pct', 'under_5s_pct', 'presses', 'presses_per_min', 'repeated_presses'];
  const rows = pages.map((p) =>
    [p.name, p.visits, p.people, Math.round(p.totalMs / 1000), Math.round(p.medianMs / 1000), Math.round(p.p75Ms / 1000), Math.round(p.share * 100), p.entries, p.exits, Math.round(p.exitRate * 100), Math.round(p.quickRate * 100), p.taps, p.tapsPerMin.toFixed(1), p.rapidTaps]
      .map(csvCell)
      .join(','),
  );
  return [head.join(','), ...rows].join('\n');
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Bar({ value, max, title }: { value: number; max: number; title: string }) {
  return (
    <span className={styles.track} title={title}>
      <span className={styles.fill} style={{ width: `${max ? Math.max(1.5, (value / max) * 100) : 0}%` }} />
    </span>
  );
}

export default function Analysis({ events }: { events: UsageEvent[] }) {
  const people = useMemo(() => [...new Set(events.map(personOf))].sort(), [events]);
  const [who, setWho] = useState('');
  const shown = useMemo(() => (who ? events.filter((e) => personOf(e) === who) : events), [events, who]);
  const a = useMemo(() => analyze(shown, TRACKED_PAGE_NAMES), [shown]);
  const [openPath, setOpenPath] = useState<string | null>(null);

  const maxPage = Math.max(0, ...a.pages.map((p) => p.totalMs));
  const maxTap = Math.max(0, ...a.tapsByButton.map((t) => t.count));
  const maxFlow = Math.max(0, ...a.flows.map((f) => f.count));
  const maxFn = Math.max(0, ...a.functions.map((f) => f.totalMs));

  return (
    <section className={styles.analysis} aria-labelledby="analysis-title">
      <div className={styles.headRow}>
        <h2 id="analysis-title" className={styles.h2}>
          User test analysis
        </h2>
        <label className={styles.who}>
          Person{' '}
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Everyone ({people.length})</option>
            {people.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.spacer} />
        <button type="button" className={styles.button} onClick={() => download('intentai-pages.csv', pagesCsv(a.pages), 'text/csv')}>
          Page summary CSV
        </button>
      </div>

      {/* headline numbers */}
      <dl className={styles.kpis}>
        <div>
          <dt>People</dt>
          <dd>{a.people}</dd>
        </div>
        <div>
          <dt>Sessions</dt>
          <dd>{a.sessions}</dd>
        </div>
        <div>
          <dt>Median session</dt>
          <dd>{secs(a.medianSessionMs)}</dd>
        </div>
        <div>
          <dt>Pages per session</dt>
          <dd>{a.medianPagesPerSession}</dd>
        </div>
        <div>
          <dt>Presses</dt>
          <dd>{a.taps}</dd>
        </div>
        <div>
          <dt>Dates</dt>
          <dd className={styles.small}>{a.from ? (day(a.from) === day(a.to) ? day(a.from) : `${day(a.from)} – ${day(a.to)}`) : '–'}</dd>
        </div>
      </dl>

      {/* which pages keep people */}
      <div className={styles.card}>
        <h3 className={styles.h3}>Which pages keep people</h3>
        <p className={styles.note}>Total time on each page (bar), with the median visit. Longest first.</p>
        <ul className={styles.bars}>
          {a.pages.map((p) => (
            <li key={p.name} className={styles.barRow}>
              <span className={styles.barLabel}>{p.name}</span>
              <Bar value={p.totalMs} max={maxPage} title={`${p.name}: ${formatDuration(p.totalMs)} in all, ${p.visits} visits, median ${secs(p.medianMs)}`} />
              <span className={styles.barValue}>
                {formatDuration(p.totalMs)} <span className={styles.muted}>· {pct(p.share)} · median {secs(p.medianMs)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* warning signs */}
      <div className={styles.card}>
        <h3 className={styles.h3}>Warning signs</h3>
        {a.flags.length === 0 ? (
          <p className={styles.note}>Nothing stands out yet (signs need at least 3 visits to a page).</p>
        ) : (
          <ul className={styles.flags}>
            {a.flags.map((f, i) => (
              <li key={i} className={f.level === 'warn' ? styles.warn : styles.info}>
                <span className={styles.flagIcon} aria-hidden="true">
                  {f.level === 'warn' ? '!' : 'i'}
                </span>
                <span>
                  <strong>{f.page}</strong> <span className={styles.srOnly}>{f.level === 'warn' ? 'warning' : 'note'}:</span> {f.text}
                </span>
              </li>
            ))}
          </ul>
        )}
        {a.unusedPages.length > 0 && (
          <p className={styles.note}>
            <strong>Never opened:</strong> {a.unusedPages.join(', ')}
          </p>
        )}
      </div>

      {/* the same numbers as a table, plus exits and presses */}
      <div className={styles.scroll} tabIndex={0} role="region" aria-label="Pages in detail (scrolls sideways)">
        <table className={styles.table}>
          <caption>Pages in detail</caption>
          <thead>
            <tr>
              <th scope="col">Page</th>
              <th scope="col">Visits</th>
              <th scope="col">People</th>
              <th scope="col">Median</th>
              <th scope="col">P75</th>
              <th scope="col">Share</th>
              <th scope="col">Entries</th>
              <th scope="col">Exit rate</th>
              <th scope="col">Under 5 s</th>
              <th scope="col">Presses / min</th>
              <th scope="col">Repeated</th>
            </tr>
          </thead>
          <tbody>
            {a.pages.map((p) => (
              <tr key={p.name}>
                <th scope="row">{p.name}</th>
                <td>{p.visits}</td>
                <td>{p.people}</td>
                <td>{secs(p.medianMs)}</td>
                <td>{secs(p.p75Ms)}</td>
                <td>{pct(p.share)}</td>
                <td>{p.entries}</td>
                <td>{pct(p.exitRate)}</td>
                <td>{pct(p.quickRate)}</td>
                <td>{p.tapsPerMin.toFixed(1)}</td>
                <td>{p.rapidTaps || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.grid}>
        {/* functions inside pages */}
        <div className={styles.card}>
          <h3 className={styles.h3}>Functions</h3>
          <p className={styles.note}>Tabs and tools inside pages (Today tabs, 3D view, practise…). Part of page time.</p>
          {a.functions.length === 0 ? (
            <p className={styles.note}>None recorded yet.</p>
          ) : (
            <ul className={styles.bars}>
              {a.functions.map((f) => (
                <li key={f.kind + f.name} className={styles.barRow}>
                  <span className={styles.barLabel}>{f.name}</span>
                  <Bar value={f.totalMs} max={maxFn} title={`${f.name}: ${formatDuration(f.totalMs)}, ${f.uses} uses by ${f.people}`} />
                  <span className={styles.barValue}>
                    {formatDuration(f.totalMs)} <span className={styles.muted}>· {f.uses}× · median {secs(f.medianMs)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* presses */}
        <div className={styles.card}>
          <h3 className={styles.h3}>Most pressed</h3>
          <p className={styles.note}>Buttons and links by page (button names only; links show the page they open).</p>
          {a.tapsByButton.length === 0 ? (
            <p className={styles.note}>No presses recorded yet.</p>
          ) : (
            <ul className={styles.bars}>
              {a.tapsByButton.slice(0, 15).map((t) => (
                <li key={t.name} className={styles.barRow}>
                  <span className={styles.barLabel}>
                    <span className={styles.muted}>{t.page} ›</span> {t.label}
                  </span>
                  <Bar value={t.count} max={maxTap} title={`${t.name}: ${t.count} presses by ${t.people}`} />
                  <span className={styles.barValue}>
                    {t.count} <span className={styles.muted}>· {t.people} {t.people === 1 ? 'person' : 'people'}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* movement */}
        <div className={styles.card}>
          <h3 className={styles.h3}>How people move</h3>
          <p className={styles.note}>The most common next page.</p>
          {a.flows.length === 0 ? (
            <p className={styles.note}>No moves between pages yet.</p>
          ) : (
            <ul className={styles.bars}>
              {a.flows.slice(0, 12).map((f) => (
                <li key={f.from + f.to} className={styles.barRow}>
                  <span className={styles.barLabel}>
                    {f.from} → {f.to}
                  </span>
                  <Bar value={f.count} max={maxFlow} title={`${f.from} → ${f.to}: ${f.count}`} />
                  <span className={styles.barValue}>{f.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.h3}>Where sessions end</h3>
          <p className={styles.note}>The last page before leaving.</p>
          <ul className={styles.bars}>
            {a.exits.slice(0, 12).map((x) => (
              <li key={x.name} className={styles.barRow}>
                <span className={styles.barLabel}>{x.name}</span>
                <Bar value={x.count} max={a.sessions} title={`${x.count} of ${a.sessions} sessions end on ${x.name}`} />
                <span className={styles.barValue}>
                  {x.count} <span className={styles.muted}>· {pct(a.sessions ? x.count / a.sessions : 0)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* people and their sessions */}
      <div className={styles.scroll} tabIndex={0} role="region" aria-label="People in the test (scrolls sideways)">
        <table className={styles.table}>
          <caption>People in the test</caption>
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Sessions</th>
              <th scope="col">Time</th>
              <th scope="col">Pages seen</th>
              <th scope="col">Presses</th>
              <th scope="col">First</th>
              <th scope="col">Last</th>
            </tr>
          </thead>
          <tbody>
            {a.persons.map((p) => (
              <tr key={p.person}>
                <th scope="row">{p.named ? p.person : <span className={styles.muted}>{p.person}</span>}</th>
                <td>{p.sessions}</td>
                <td>{formatDuration(p.totalMs)}</td>
                <td>{p.pages}</td>
                <td>{p.taps}</td>
                <td>{new Date(p.firstAt).toLocaleString()}</td>
                <td>{new Date(p.lastAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>Sessions, step by step</h3>
        <p className={styles.note}>Each block is one page visit; its width is the time spent. Newest first.</p>
        <ul className={styles.sessions}>
          {a.paths.slice(0, 40).map((s) => (
            <li key={s.key}>
              <button type="button" className={styles.sessionHead} aria-expanded={openPath === s.key} onClick={() => setOpenPath(openPath === s.key ? null : s.key)}>
                <strong>{s.person}</strong> · {new Date(s.at).toLocaleString()} · {formatDuration(s.ms)} · {s.visits.length} pages
              </button>
              <div className={styles.strip} aria-hidden="true">
                {s.visits.map((v, i) => (
                  <span key={i} className={styles.block} style={{ flexGrow: Math.max(v.ms, 1) }} title={`${v.name}: ${secs(v.ms)}, ${v.taps} presses`}>
                    {v.ms / s.ms > 0.12 ? v.name : ''}
                  </span>
                ))}
              </div>
              {openPath === s.key && (
                <ol className={styles.steps}>
                  {s.visits.map((v, i) => (
                    <li key={i}>
                      {v.name} — {secs(v.ms)}
                      {v.taps > 0 && <span className={styles.muted}> · {v.taps} presses</span>}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
