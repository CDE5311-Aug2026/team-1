// The v2 Home sections around the kept 3D map (boards 05 Home A "hunting together" and 11 Home B "solo"):
// - the region leaderboard card (together mode only; Passport shows the same card). Its fastest three always show, and
//   each opens Hunt's speed board. Players wear the cute animal
//   icons from components/Avatar (decorative; names stay as text). The other hunters and their times are Hunt's
//   SAMPLE players (stories.ts, as on Hunt's boards), noted as samples under them; your own line is real (your time in this weekend's challenge,
//   from your stamps at its stops, if any).
// - Challenges: Hunt's public challenges (both modes; solo leaves out the "joined" social line, plan B6). "Open" goes to
//   the challenge's volume (its story, /hunt#story/<route>): the challenge page was retired (second canvas, 8 Nov 2026).
// - Picked for you: real published places by your categories, then distance when Locate has found you.
import { useMemo, useState, type CSSProperties } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/Avatar/Avatar';
import CategoryBadge from '../../components/Category/CategoryBadge';
import CategoryGlyph from '../../components/Category/CategoryGlyph';
import groundUrl from '../../assets/nearby/sg-ground.webp';
import { groundCrop, placePicture } from '../../data/home/nearbyCards';
import { openChallenges, regionChallenge, timerText, useChallengeProgress, type Challenge } from '../../data/hunt/challenges';
import { dateRange, volumeHref } from '../../data/search/hunt';
import { SAMPLE_SPEED } from '../../data/hunt/stories';
import { tourismOrder, profileV3Store } from '../../data/profile/profile';
import { usePersistentStore } from '../../data/persistentStore';
import { TOURISM_INFO, type TourismFilter } from '../../data/tourism';
import { areaOfPlace, uraRegion, type RegionId } from '../../data/ura/ura';
import { PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import { localToday } from '../../features/nearby/personal';
import type { LatLng } from '../../features/nearby/types';
import { shortDistance } from '../../components/Discovery/nearYou';
import { paths } from '../../routes';
import { pickedForYou } from './picked';
import styles from './HomeSections.module.css';
import cb from './ChallengeBook.module.css';

const MEDAL = ['var(--medal-gold, #e0b23c)', 'var(--medal-silver, #c3c6cc)', 'var(--medal-bronze, #c98a5a)'];

function Example({ className }: { className?: string }) {
  return <span className={`${styles.example} ${className ?? ''}`}>Example</span>;
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** A challenge's small cloth cover, in its category's colour with its glyph. */
export function ChallengeBook({ c }: { c: Challenge }) {
  const info = c.category ? TOURISM_INFO[c.category] : undefined;
  return (
    <span className={cb.book} style={{ '--book': info?.fill ?? 'var(--v2-muted)' } as CSSProperties} aria-hidden="true">
      <span className={cb.frame}>
        {c.category && <CategoryGlyph category={c.category} size={18} color="rgba(255, 244, 214, 0.92)" />}
        <span className={cb.title}>{c.title}</span>
      </span>
      <span className={cb.ribbon} />
    </span>
  );
}

/** Your own line: real, from your stamps in the region's challenge: its catalogue stops and the story's own check-ins,
 *  read from the saved games (Home never loads the game), again each time you come back to Home. */
function YouLine({ challenge }: { challenge: Challenge | undefined }) {
  const progress = useChallengeProgress(challenge, false);
  let text: ReactNode = (
    <>
      no time yet.{' '}
      {/* the region's challenge opens its volume; with none, Hunt lists them all */}
      <Link className={styles.youLink} to={challenge ? volumeHref(challenge.routeId) : paths.hunt}>
        Open a challenge
      </Link>
      .
    </>
  );
  if (challenge && progress) {
    const t = progress.timer;
    if (t.kind === 'minutes' || t.kind === 'days') text = `${timerText(t)} in ${challenge.title}${t.finished ? '' : ' so far'}.`;
    else if (t.kind === 'running') text = `clock running in ${challenge.title}.`;
  }
  return (
    <p className={styles.you}>
      <span className={styles.youFace} aria-hidden="true">
        <Avatar name="You" size={26} />
      </span>
      <span>
        <b>You</b> · {text}
      </span>
    </p>
  );
}

/** The fastest three: Hunt's SAMPLE players (stories.ts), labelled "Example" in the card's head. */
function Podium() {
  const top = SAMPLE_SPEED.slice(0, 3);
  return (
    <ol className={styles.podium} aria-label="Fastest (example players)">
      {top.map((r, i) => (
        <li key={r.name}>
          <Link className={styles.podiumRow} to={`${paths.hunt}?board=speed`} aria-label={`${r.name}, number ${i + 1}, ${r.value} minutes: see the leaderboard`}>
          <span className={styles.face} style={{ '--medal': MEDAL[i] } as CSSProperties} aria-hidden="true">
            <Avatar name={r.name} size={40} />
            <span className={styles.rank}>{i + 1}</span>
          </span>
          <span className={styles.who}>
            <span className={styles.whoName}>{r.name}</span>
            <span className={i === 0 ? `${styles.whoTime} ${styles.whoBest}` : styles.whoTime}>
              {i === 0 ? (
                <>
                  {r.value} min <span className={styles.soft}>fastest</span>
                </>
              ) : (
                <>
                  {r.value} <span className={styles.soft}>+{r.value - top[0].value}</span>
                </>
              )}
            </span>
          </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/**
 * The region's board for today. Its challenge is the one open there (running now, else the next to open), and your
 * line is your time in that one; a region with no open challenge says so under the (example) fastest three.
 */
export function RegionLeaderboard({
  region,
  challenges,
  titleId = 'home-board-title',
  className,
}: {
  region: RegionId;
  challenges: readonly Challenge[];
  /** The heading's id (unique on the page); Passport passes its own. */
  titleId?: string;
  className?: string;
}) {
  const name = uraRegion(region)?.name ?? 'Central';
  const challenge = regionChallenge(region, localToday(), challenges);
  return (
    <section className={className ? `${styles.board} ${className}` : styles.board} aria-labelledby={titleId}>
      <div className={styles.boardHead}>
        <h2 id={titleId} className={styles.boardTitle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.trophy}>
            <path d="M8 21h8M12 17v4M6 3h12v5a6 6 0 0 1-12 0zM6 5H3v3a3 3 0 0 0 3 3M18 5h3v3a3 3 0 0 1-3 3" />
          </svg>
          {/* says what the card is (owner, 8 Nov 2026): "Leaderboard · East · this weekend", also when it is empty */}
          <span className={styles.boardName}>
            <span className={styles.boardKicker}>Leaderboard</span>
            <span className={styles.srDot}> · </span>
            <span>{name} · this weekend</span>
          </span>
        </h2>
        <Link className={styles.boardLink} to={`${paths.hunt}?board=speed`} aria-label="Leaderboards">
          <Chevron />
        </Link>
      </div>
      {/* the fastest three always show (owner, 8 Nov 2026), also in a region with no challenge open right now */}
      <Podium />
      {/* no "Example" pill in the head (owner, 9 Nov 2026); the sample players are still said to be samples, quietly */}
      <p className={styles.sampleNote}>Sample players until real times come in</p>
      {challenge ? (
        <YouLine challenge={challenge} />
      ) : (
        <p className={styles.boardEmpty}>
          No challenge is open in {name} right now. <Link to={paths.hunt}>See all challenges in Hunt</Link>
        </p>
      )}
    </section>
  );
}

function ChallengeCard({ c, together }: { c: Challenge; together: boolean }) {
  const info = c.category ? TOURISM_INFO[c.category] : undefined;
  const volume = volumeHref(c.routeId);
  return (
    <article className={styles.challenge} aria-labelledby={`ch-${c.id}`}>
      <Link to={volume} tabIndex={-1} aria-hidden="true" className={styles.bookLink}>
        <ChallengeBook c={c} />
      </Link>
      <div className={styles.challengeText}>
        <span className={styles.challengeKicker}>
          {c.category ? <CategoryBadge category={c.category} variant="kicker" /> : null}
          <span className={styles.rule} aria-hidden="true">
            |
          </span>
          <span>{c.kind}</span>
        </span>
        <h3 id={`ch-${c.id}`} className={styles.challengeTitle}>
          <Link to={volume}>{c.title}</Link>
        </h3>
        <span className={styles.challengeMeta}>
          {dateRange(c.from, c.to)} · {c.stops.length} stops
          {together && c.example.players > 0 ? ` · ${c.example.players} joined` : ''}
        </span>
        <div className={styles.challengeFoot}>
          {together && c.example.players > 0 && (
            <>
              <span className={styles.faces} aria-hidden="true">
                {SAMPLE_SPEED.slice(0, 3).map((r) => (
                  <span key={r.name} className={styles.miniFace}>
                    <Avatar name={r.name} size={22} />
                  </span>
                ))}
              </span>
              <Example />
            </>
          )}
          <Link to={volume} className={`${styles.join} ${styles.open}`} style={info ? ({ '--join': info.fill } as CSSProperties) : undefined} aria-label={`Open ${c.title}`}>
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ChallengesSection({ filter, together }: { filter: TourismFilter; together: boolean }) {
  const list = openChallenges(localToday()).filter((c) => filter === 'all' || c.category === filter);
  return (
    <section className={styles.section} aria-labelledby="home-challenges">
      <div className={styles.sectionHead}>
        <h2 id="home-challenges" className={styles.sectionTitle}>
          Challenges
        </h2>
        <Link className={styles.sectionMeta} to={paths.hunt} aria-label={`${list.length} open: all challenges in Hunt`}>
          {list.length} open
          <Chevron />
        </Link>
      </div>
      {list.length ? (
        <div className={styles.carousel}>
          {list.map((c) => (
            <ChallengeCard key={c.id} c={c} together={together} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No open challenges in this category right now.</p>
      )}
    </section>
  );
}

const PAGE = 8;

export function PickedSection({ filter, here }: { filter: TourismFilter; here: LatLng | null }) {
  const [profile] = usePersistentStore(profileV3Store);
  const order = useMemo(() => tourismOrder(profile), [profile]);
  const all = useMemo(() => pickedForYou(PUBLISHED_PLACES, order, filter, here), [order, filter, here]);
  const [shown, setShown] = useState(PAGE);
  const list = all.slice(0, shown);
  return (
    <section className={styles.section} aria-labelledby="home-picked">
      <div className={styles.sectionHead}>
        <h2 id="home-picked" className={styles.sectionTitle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--assist-ink)" aria-hidden="true">
            <path d="M10 6c.6 4.2 1.8 5.4 6 6-4.2.6-5.4 1.8-6 6-.6-4.2-1.8-5.4-6-6 4.2-.6 5.4-1.8 6-6z" />
            <path d="M18 2c.3 2.1.9 2.7 3 3-2.1.3-2.7.9-3 3-.3-2.1-.9-2.7-3-3 2.1-.3 2.7-.9 3-3z" />
          </svg>
          Picked for you
        </h2>
        <span className={styles.sectionMeta}>{here ? 'your categories · nearest' : 'by your categories'}</span>
      </div>
      <ul className={styles.grid} aria-label="Places picked for you">
        {list.map(({ place, category, m }) => {
          const info = TOURISM_INFO[category];
          const pic = placePicture(place);
          const area = areaOfPlace(place.id)?.name;
          return (
            <li key={place.id} className={styles.pick} data-category={category}>
              <Link className={styles.pickMedia} to={paths.nearbyPlace(place.id)} aria-label={`Open ${place.name}`} style={{ background: info.tint }}>
                {pic.src ? (
                  <img src={pic.src} alt="" loading="lazy" />
                ) : (
                  // no licensed photo yet (owner, 9 Nov 2026: "does not have an image"): the 2D map around the place, as
                  // a walk's stops show it, with the category's glyph on a tinted disc over its spot
                  <span
                    className={styles.pickGround}
                    style={{ backgroundImage: `url("${groundUrl}")`, ...groundCrop(place.coordinates, 3200) }}
                    aria-hidden="true"
                  >
                    <span className={styles.pickPin} style={{ background: info.tint, borderColor: info.fill }}>
                      <CategoryGlyph category={category} size={20} color={info.ink} />
                    </span>
                  </span>
                )}
                <CategoryBadge category={category} className={styles.pickBadge} />
                {m !== undefined && <span className={styles.pickDist}>{shortDistance(m)}</span>}
              </Link>
              <div className={styles.pickText}>
                <h3 className={styles.pickTitle}>
                  <Link to={paths.nearbyPlace(place.id)}>{place.name}</Link>
                </h3>
                {area && (
                  <span className={styles.pickArea}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11ZM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
                    </svg>
                    <span>{area}</span>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {shown < all.length && (
        <button type="button" className={styles.more} onClick={() => setShown((n) => n + PAGE)}>
          Show more places
        </button>
      )}
    </section>
  );
}
