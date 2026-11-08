// v2 board 09: Challenge detail, a labelled demo (owner decision D1). One of Hunt's public challenges, seen through its
// story route: the cover, the category and dates, your stamps and clock, the stops (any order), Join (kept on this
// phone only) and the way into the story itself (#story/<route>, never gated by location: plan B8).
// Hunter counts and best times are SAMPLE data and say so ("Example"); in solo mode they are not shown at all.
import type { CSSProperties } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import CategoryBadge from '../../components/Category/CategoryBadge';
import CategoryGlyph from '../../components/Category/CategoryGlyph';
import { placePicture } from '../../data/home/nearbyCards';
import {
  challengeById,
  joinChallenge,
  leaveChallenge,
  longDates,
  timerText,
  useChallengeProgress,
  useJoinedChallenges,
  type Challenge,
  type ChallengeTimer,
  type Stamp,
} from '../../data/hunt/challenges';
import { SAMPLE_SPEED } from '../../data/hunt/stories';
import { usePersistentStore } from '../../data/persistentStore';
import { TOURISM_INFO } from '../../data/tourism';
import { isTogether, huntModeStore } from '../../data/v2Stores';
import { curatedPlace } from '../../features/nearby/catalogue';
import { showToast } from '../../hooks/useToast';
import Icon from '../OnboardingPage/v3/icons';
import { paths } from '../../routes';
import styles from './ChallengePage.module.css';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function stampText(s: Stamp): string {
  if (s.exact) {
    const d = new Date(s.at);
    return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const [y, m, dd] = s.day.split('-').map(Number);
  const d = new Date(y, m - 1, dd);
  return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

function timerLine(t: ChallengeTimer): string {
  if (t.kind === 'none') return 'starts at your first stamp';
  if (t.kind === 'running') return `since ${stampText(t.since)}`;
  return t.finished ? 'first to last stamp' : 'so far, first to last stamp';
}

/** The challenge's book: drawn in its category colour (no wireframe photo is shipped). */
export function ChallengeBook({ c, size = 'large' }: { c: Challenge; size?: 'large' | 'small' }) {
  const info = c.category ? TOURISM_INFO[c.category] : undefined;
  return (
    <span
      className={size === 'large' ? styles.book : `${styles.book} ${styles.bookSmall}`}
      style={{ '--book': info?.fill ?? 'var(--v2-muted)' } as CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.bookFrame}>
        {c.category && <CategoryGlyph category={c.category} size={size === 'large' ? 26 : 18} color="rgba(255, 244, 214, 0.92)" />}
        <span className={styles.bookTitle}>{c.title}</span>
      </span>
      <span className={styles.bookRibbon} />
    </span>
  );
}

function Example() {
  return <span className={styles.example}>Example</span>;
}

export default function ChallengePage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { key } = useLocation();
  const c = challengeById(challengeId);
  const joined = useJoinedChallenges();
  const [mode] = usePersistentStore(huntModeStore);
  const together = isTogether(mode);
  const progress = useChallengeProgress(c);
  const back = () => (key === 'default' ? navigate(paths.today) : navigate(-1));

  const header = (
    <header className={styles.bar}>
      <button type="button" className={styles.round} aria-label="Back" onClick={back}>
        <Icon name="back" size={20} />
      </button>
      <h1 className={styles.barTitle}>Challenge</h1>
      {c ? (
        <button
          type="button"
          className={styles.round}
          aria-label="Share"
          onClick={() => {
            const url = window.location.href;
            const data = { title: `FindSG · ${c.title}`, url };
            if (typeof navigator.share === 'function') void navigator.share(data).catch(() => undefined);
            else
              void navigator.clipboard
                ?.writeText(url)
                .then(() => showToast('Link copied'))
                .catch(() => showToast('Could not copy the link'));
          }}
        >
          <Icon name="share" size={20} />
        </button>
      ) : (
        <span />
      )}
    </header>
  );

  if (!c || !progress) {
    return (
      <AppShell chrome="status">
        <div className={styles.page}>
          {header}
          <section className={styles.card}>
            <h2 className={styles.title}>Challenge not found</h2>
            <p className={styles.meta}>This challenge is not on this phone.</p>
            <Link className={styles.playLink} to={paths.hunt}>
              Go to Hunt
            </Link>
          </section>
        </div>
      </AppShell>
    );
  }

  const isJoined = !!joined[c.id];
  const total = c.stops.length;
  const storyHref = `${paths.hunt}#story/${c.routeId}`;
  const next = progress.stops.find((s) => !s.stamp);

  return (
    <AppShell chrome="status">
      <div className={styles.page}>
        {header}
        <p className={styles.demo}>Demo challenge: built on the story route. Counts marked Example are sample data.</p>

        <section className={`${styles.card} ${styles.hero}`} aria-labelledby="challenge-title">
          <ChallengeBook c={c} />
          <div className={styles.heroText}>
            <span className={styles.kicker}>
              {c.category ? <CategoryBadge category={c.category} variant="kicker" /> : null}
              <span className={styles.kickerRule} aria-hidden="true">
                |
              </span>
              <span>{c.kind} challenge</span>
            </span>
            <h2 id="challenge-title" className={styles.title}>
              {c.title}
            </h2>
            <span className={styles.meta}>
              {longDates(c.from, c.to)} · {total} stops{c.areaName ? ` · ${c.areaName}` : ''}
            </span>
            {together && c.example.players > 0 && (
              <span className={styles.social}>
                <span className={styles.faces} aria-hidden="true">
                  {SAMPLE_SPEED.slice(0, 3).map((r) => (
                    <span key={r.name} className={styles.face}>
                      {r.name[0]}
                    </span>
                  ))}
                </span>
                <span>
                  <b>{c.example.players + (isJoined ? 1 : 0)} joined</b>
                </span>
                <Example />
              </span>
            )}
            <Link className={styles.playLink} to={storyHref}>
              Play the story
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </section>

        <section className={styles.stats} aria-label="Your progress">
          <div className={styles.stat}>
            <span className={styles.statBig}>
              {progress.stamped}/{total}
            </span>
            <span className={styles.statLabel}>stops stamped</span>
          </div>
          <div className={styles.stat} role="timer" aria-label={`Your time: ${timerText(progress.timer)}`}>
            <span className={styles.statBig}>{progress.timer.kind === 'none' ? '–' : timerText(progress.timer)}</span>
            <span className={styles.statLabel}>your time · {timerLine(progress.timer)}</span>
          </div>
          {together && c.example.bestMinutes > 0 && (
            <div className={styles.stat}>
              <span className={styles.statBig}>{c.example.bestMinutes} min</span>
              <span className={styles.statLabel}>
                fastest · {SAMPLE_SPEED[0].name}
              </span>
              <Example />
            </div>
          )}
        </section>

        <section className={styles.stopsBox} aria-labelledby="stops-title">
          <div className={styles.sectionHead}>
            <h3 id="stops-title" className={styles.sectionTitle}>
              Stops
            </h3>
            <span className={styles.sectionMeta}>any order · self-reported</span>
          </div>
          <ol className={styles.stops}>
            {progress.stops.map(({ stop, name, address, stamp }) => {
              const place = stop.placeId ? curatedPlace(stop.placeId) : undefined;
              const pic = place ? placePicture(place) : undefined;
              const cat = place?.tourism?.category;
              const label = name || place?.name || `Stop ${stop.n}`;
              return (
                <li key={stop.id} className={styles.stop} aria-label={`Stop ${stop.n}: ${label}, ${stamp ? 'stamped' : 'not stamped yet'}`}>
                  <span className={stamp ? `${styles.stopNum} ${styles.stopDone}` : styles.stopNum} aria-hidden="true">
                    {stamp ? <Icon name="check" size={14} /> : stop.n}
                  </span>
                  <span className={styles.thumb} style={cat ? ({ background: TOURISM_INFO[cat].tint } as CSSProperties) : undefined}>
                    {pic?.src ? (
                      <img src={pic.src} alt="" loading="lazy" />
                    ) : cat ? (
                      <CategoryGlyph category={cat} size={18} color={TOURISM_INFO[cat].ink} />
                    ) : null}
                  </span>
                  <span className={styles.stopText}>
                    {place ? (
                      <Link className={styles.stopName} to={paths.nearbyPlace(place.id)}>
                        {label}
                      </Link>
                    ) : (
                      <span className={styles.stopName}>{label}</span>
                    )}
                    <span className={styles.stopSub}>{place && name ? place.name : (address ?? '')}</span>
                  </span>
                  <span className={stamp ? `${styles.stopState} ${styles.stopStateDone}` : styles.stopState}>
                    {stamp ? `Stamped ${stampText(stamp)}` : ''}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>How it works</h3>
          <ul className={styles.how}>
            <li>Your clock starts at your first stamp and stops at your last.</li>
            <li>Do the stops in any order. A stamp is self-reported: in the story, or by checking in at the place.</li>
            <li>Nothing is shared: your time stays on this phone.</li>
            {together && <li>Hunter counts and the fastest time are examples until a leaderboard service exists.</li>}
          </ul>
          {isJoined && (
            <button type="button" className={styles.leave} onClick={() => leaveChallenge(c.id)}>
              Leave this challenge
            </button>
          )}
        </section>
      </div>

      <div className={styles.dock}>
        {isJoined ? (
          <Link className={`${styles.join} ${styles.joined}`} to={storyHref}>
            Joined · {next ? `go to stop ${next.stop.n}` : 'all stops stamped'}
            <Icon name="arrow" size={20} />
          </Link>
        ) : (
          <button
            type="button"
            className={styles.join}
            style={c.category ? ({ '--join': TOURISM_INFO[c.category].fill } as CSSProperties) : undefined}
            onClick={() => joinChallenge(c.id)}
          >
            Join this challenge
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>
    </AppShell>
  );
}
