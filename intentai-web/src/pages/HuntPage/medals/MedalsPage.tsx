// Your medals (owner, batch 3: the bookshelf's display case, as a page of its own; reached from Hunt's Medals tile and
// from Passport). From real progress only (story/record.ts): a medal for each hunt you finish, a stamp for each stop
// checked in on site, and the time a finished hunt took. A hunt not finished yet shows its medal as an outline.
import { useMemo, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../../../components/AppShell/AppShell';
import Icon from '../../OnboardingPage/v3/icons';
import { paths } from '../../../routes';
import { huntHash } from '../hunts';
import { chapters, shortChapter } from '../story/chapters';
import { dayOf, routeRows, STAMP_TOTAL, storyRecords, took, type StopRow, type StoryRecord } from '../story/record';
import styles from './MedalsPage.module.css';

function stopRows(r: StoryRecord): StopRow[] {
  if (r.id === 'short') {
    const ch = shortChapter();
    return ch.stops.map((s) => {
      const stamp = r.stamps.find((x) => x.stop === s.id);
      return { id: s.id, name: s.name, solved: s.done, stamped: !!stamp, stampedAt: stamp?.at || undefined };
    });
  }
  const ch = chapters().find((c) => c.routeId === r.id);
  return ch ? routeRows(r.id, ch.stops) : [];
}

export default function MedalsPage() {
  const navigate = useNavigate();
  const { key } = useLocation();
  const records = useMemo(() => storyRecords(), []);
  const won = records.filter((r) => r.finished).length;
  const stamps = records.reduce((n, r) => n + r.stamps.length, 0);
  // back where you came from; opened from a link, back to Hunt
  const back = () => (key !== 'default' ? navigate(-1) : navigate(paths.hunt, { replace: true }));

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.bar}>
          <button type="button" className={styles.back} aria-label="Back" title="Back" onClick={back}>
            <Icon name="back" size={22} />
          </button>
          <h1 className={styles.title}>Medals</h1>
          <span className={styles.gap} aria-hidden="true" />
        </header>
        <p className={styles.tally}>
          <span>
            <b>{won}</b> / {records.length} medals
          </span>
          <span>
            <b>{stamps}</b> / {STAMP_TOTAL} stamps
          </span>
        </p>
        <ul className={styles.list}>
          {records.map((r) => {
            const rows = stopRows(r);
            const time = took(r);
            return (
              <li key={r.id} className={styles.card}>
                <div className={styles.top}>
                  <span
                    className={`${styles.medal} ${r.finished ? styles.won : ''}`}
                    style={{ '--tone': r.tone } as CSSProperties}
                    role="img"
                    aria-label={r.finished ? 'Medal won' : 'Medal not won yet'}
                  >
                    {r.roman}
                  </span>
                  <div className={styles.text}>
                    <h2 className={styles.name}>{r.title}</h2>
                    <p className={styles.meta}>
                      {r.place} ·{' '}
                      {r.finished
                        ? `Finished${r.finishedAt ? ` ${dayOf(r.finishedAt)}` : ''}${time ? ` in ${time}` : ''}`
                        : r.done
                          ? `${r.done} of ${r.total} stops`
                          : 'Not started'}
                    </p>
                  </div>
                  <Link className={styles.play} to={{ pathname: paths.hunt, hash: huntHash(r.id) }} aria-label={`${r.finished ? 'Open' : r.done ? 'Continue' : 'Start'} ${r.title}`}>
                    <Icon name="chevron" size={18} />
                  </Link>
                </div>
                <ol className={styles.stops} aria-label={`Stamps for ${r.title}`}>
                  {rows.map((s, i) => (
                    <li key={s.id} className={s.stamped ? styles.stamped : undefined}>
                      <span className={styles.stamp} aria-hidden="true">
                        {s.stamped ? '✓' : i + 1}
                      </span>
                      <span className={styles.stopName}>{s.stamped || s.solved ? s.name.replace(/ · .*/, '') : `Stop ${i + 1}`}</span>
                      <span className={styles.when}>{s.stamped ? (s.stampedAt ? dayOf(s.stampedAt) : 'Stamped') : 'Not yet'}</span>
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
        <p className={styles.fine}>A medal is won when every stop of a hunt is passed; a stamp, when a stop is checked in with a recognised photo. Saved on this phone.</p>
      </div>
    </AppShell>
  );
}
