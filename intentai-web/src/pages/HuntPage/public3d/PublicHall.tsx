// Public, in the same room as the story shelf: the weekend challenges pinned to a cork board (3D), the boards' top three
// on a podium (3D), and along the bottom the board switch and your own brass plate. One screen, no scrolling.
// The clock on each challenge runs live. Without WebGL, `onFail` hands the page back to the flat list.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { GAME_STORIES, imageFor } from '../../../findsg';
import { HUNT_CHALLENGES, rankAmong, SAMPLE_EXPLORERS, SAMPLE_SPEED } from '../../../data/hunt/stories';
import Icon from '../../OnboardingPage/v3/icons';
import type { HuntGo } from '../HuntPage';
import { NoticeBoardScene } from './NoticeBoardScene';
import type { PosterDef } from './paint';
import { PodiumScene, type PodiumRow } from './PodiumScene';
import styles from './public3d.module.css';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const NOTICE = 'own-story';

const startOf = (d: string) => new Date(`${d}T00:00:00`).getTime();
const endOf = (d: string) => new Date(`${d}T23:59:59`).getTime();

function span(from: string, to: string) {
  const [, m, d] = from.split('-');
  const [, m2, d2] = to.split('-');
  return m === m2 ? `${+d}–${+d2} ${MONTHS[+m - 1]}` : `${+d} ${MONTHS[+m - 1]} – ${+d2} ${MONTHS[+m2 - 1]}`;
}

/** "4d 12:03:55" */
function left(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${d ? `${d}d ` : ''}${hh}:${mm}:${ss}`;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function PublicHall({
  go,
  openRoute,
  explored,
  onFail,
}: {
  go: HuntGo;
  openRoute(id: string): void;
  explored: number;
  onFail(): void;
}) {
  const now = useNow();
  const today = useMemo(() => Date.now(), []);
  const posters: PosterDef[] = useMemo(
    () => [
      ...HUNT_CHALLENGES.map((c, i) => {
        const days = Math.ceil((startOf(c.from) - today) / 86400000);
        const stops = GAME_STORIES[c.routeId]?.stops.length ?? 0;
        return {
          id: c.id,
          kind: 'challenge' as const,
          kicker: 'WEEKEND CHALLENGE',
          title: c.title.replace(/^Weekend challenge · /, ''),
          dates: span(c.from, c.to),
          facts: `${stops} PLACES`,
          stamp: days > 0 ? `IN ${days} DAY${days === 1 ? '' : 'S'}` : 'ON NOW',
          hot: i === 0,
          routeId: c.routeId,
          story: GAME_STORIES[c.routeId]?.title,
          image: imageFor(c.routeId),
        };
      }),
      {
        id: NOTICE,
        kind: 'notice' as const,
        kicker: 'COMING SOON',
        title: 'A story from your streets',
        dates: '',
        facts: 'Pick an area and a theme, and real places near you become a route.',
        stamp: '',
        hot: false,
      },
    ],
    [today],
  );
  const [selected, setSelected] = useState(posters[0].id);
  const [open, setOpen] = useState<string | null>(null);
  const [board, setBoard] = useState<'speed' | 'explore'>('speed');

  const challenge = HUNT_CHALLENGES.find((c) => c.id === (open ?? selected));
  const clock = (() => {
    if (!challenge) return { text: 'Not open yet', soon: true };
    const a = startOf(challenge.from),
      b = endOf(challenge.to);
    if (now < a) return { text: `Starts in ${left(a - now)}`, soon: true };
    if (now <= b) return { text: `Ends in ${left(b - now)}`, soon: false };
    return { text: 'Finished', soon: true };
  })();

  const rows: PodiumRow[] = useMemo(
    () =>
      board === 'speed'
        ? SAMPLE_SPEED.slice(0, 3).map((r) => ({ name: r.name, value: `${r.value} min` }))
        : SAMPLE_EXPLORERS.slice(0, 3).map((r) => ({ name: r.name, value: `${r.value} places` })),
    [board],
  );
  const rank = rankAmong(SAMPLE_EXPLORERS, explored);
  const openPoster = posters.find((p) => p.id === open);
  const openChallenge = HUNT_CHALLENGES.find((c) => c.id === open);

  return (
    <div className={styles.hall} role="tabpanel" aria-label="Public">
      <section className={`${styles.stageBox} ${styles.boardBox}`} aria-label="Challenges">
        <NoticeBoardScene posters={posters} selected={selected} open={open} onSelect={setSelected} onOpen={setOpen} onFail={onFail} />
        <ul className={styles.sr}>
          {posters.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => (setSelected(p.id), setOpen(p.id))}
                aria-label={p.kind === 'challenge' ? `Weekend challenge · ${p.title}` : p.title}
              >
                {p.title}
              </button>
            </li>
          ))}
        </ul>
        <div className={open ? `${styles.caption} ${styles.captionAway}` : styles.caption}>
          <span className={styles.dots}>
            {posters.map((p) => (
              <button key={p.id} type="button" aria-label={p.title} aria-current={p.id === selected} onClick={() => setSelected(p.id)} />
            ))}
          </span>
          <span className={styles.clock} data-soon={clock.soon || undefined}>
            <i aria-hidden="true" />
            {clock.text}
          </span>
        </div>
        {openPoster && (
          <div className={styles.bar} key={openPoster.id}>
            <span>
              <b>{openPoster.title}</b>
              <small>{openChallenge ? `${openPoster.dates} · ${clock.text}` : 'Not open yet'}</small>
            </span>
            {openChallenge ? (
              <button type="button" className={openChallenge === HUNT_CHALLENGES[0] ? styles.go : `${styles.go} ${styles.ghost}`} onClick={() => openRoute(openChallenge.routeId)}>
                {openChallenge === HUNT_CHALLENGES[0] ? 'Join' : 'Preview'}
              </button>
            ) : (
              <span />
            )}
            <button type="button" className={styles.close} aria-label="Pin it back" onClick={() => setOpen(null)}>
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
      </section>

      <section className={`${styles.stageBox} ${styles.podiumBox}`} aria-label={board === 'speed' ? 'Fastest' : 'Explorers'}>
        <PodiumScene rows={rows} board={board} onOpen={() => go({ board })} onFail={onFail} />
        <ol className={styles.sr}>
          {rows.map((r) => (
            <li key={r.name}>
              {r.name} · {r.value}
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.foot}>
        <div className={styles.switch} role="tablist" aria-label="Board" style={{ '--at': board === 'speed' ? 0 : 1 } as CSSProperties}>
          <button type="button" role="tab" aria-selected={board === 'speed'} onClick={() => setBoard('speed')}>
            Fastest
          </button>
          <button type="button" role="tab" aria-selected={board === 'explore'} onClick={() => setBoard('explore')}>
            Explorers
          </button>
          <span aria-hidden="true" />
        </div>
        <button type="button" className={styles.you} onClick={() => go({ board })} aria-label="You. Open the leaderboards">
          <span className={styles.rank}>{board === 'speed' ? '–' : `#${rank}`}</span>
          <span>
            <b>You</b>
            <small>{board === 'speed' ? 'Join a challenge for a time' : `${explored} places explored`}</small>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      </div>
    </div>
  );
}
