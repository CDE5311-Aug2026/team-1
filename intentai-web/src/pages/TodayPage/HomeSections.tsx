// The v2 Home sections around the kept 3D map (boards 05 Home A "hunting together" and 11 Home B "solo"):
// - the region leaderboard card (together mode only; Passport shows the same card). Its fastest three always show, and
//   each opens Hunt's speed board. Players wear the cute animal
//   icons from components/Avatar (decorative; names stay as text). The other hunters and their times are Hunt's
//   SAMPLE players (stories.ts, as on Hunt's boards), noted as samples under them; your own line is real (your time in this weekend's challenge,
//   from your stamps at its stops, if any).
// - Challenges: Hunt's public challenges (together mode only, owner 10 Nov 2026; was both modes, plan B6). "Open" goes to
//   the challenge's volume (its story, /hunt#story/<route>): the challenge page was retired (second canvas, 8 Nov 2026).
// - Picked for you: real published places by your categories, then distance when Locate has found you.
// User test (UT01-1, UT02-1, UT01-2): the filter chips sit right above the cards they filter (HomeFilterBar): All and
// the four Tourism 2040 categories only (no Eat chip: 11 Nov 2026, the row follows STB's four categories). "Places to
// eat" (EatEntry) just over the chips is the way into the Eat filter, and shows when it is on. Eat is the
// catalogue's own food places (Nearby category "food": hawker centres, stalls and restaurants), nothing added. Each
// challenge card shows its level (data/hunt/level.ts).
import { forwardRef, useMemo, useState, type CSSProperties } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/Avatar/Avatar';
import CategoryBadge from '../../components/Category/CategoryBadge';
import CategoryGlyph from '../../components/Category/CategoryGlyph';
import CategoryChips from '../../components/Category/CategoryChips';
import LevelBadge from '../../components/Level/LevelBadge';
import { routeLevel } from '../../data/hunt/level';
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

/** Home's filter: a Tourism 2040 category, or Eat (the catalogue's food places, across categories). */
export type HomeFilter = TourismFilter | 'eat';

/** The catalogue's published food places (Nearby category "food"); drafts (planned) are never shown. */
export const FOOD_PLACES = PUBLISHED_PLACES.filter((p) => p.category === 'food' && p.operatingStatus !== 'planned');

/** Eat's colours (a warm chilli red; the ink keeps white chip text over 4.5:1). */
export const EAT_COLOURS = { fill: '#d0533a', ink: '#9b2f1c', tint: '#f6e0d8' };

/** A bowl with chopsticks. */
export function BowlGlyph({ size = 10, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h18a9 9 0 0 1-18 0Z" />
      <path d="M14 3 9.5 10M20 4l-7.5 6" />
    </svg>
  );
}

const MEDAL = ['var(--medal-gold, #e0b23c)', 'var(--medal-silver, #c3c6cc)', 'var(--medal-bronze, #c98a5a)'];

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

function ChallengeCard({ c }: { c: Challenge }) {
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
          <LevelBadge level={routeLevel(c.stops.map((s) => s.pin))} />
          <span className={styles.challengeMetaText}>
            {dateRange(c.from, c.to)} · {c.stops.length} stops
          </span>
        </span>
        <div className={styles.challengeFoot}>
          <Link to={volume} className={`${styles.join} ${styles.open}`} style={info ? ({ '--join': info.fill } as CSSProperties) : undefined} aria-label={`Open ${c.title}`}>
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ChallengesSection({ filter }: { filter: TourismFilter }) {
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
            <ChallengeCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No open challenges in this category right now.</p>
      )}
    </section>
  );
}

const PAGE = 8;
/** How many cards "Show more places" has opened, kept for the visit: Back from a place page finds them still open (and
 *  the page tall enough to land where you were). */
const SHOWN_KEY = 'home.pickedShown';
function readShown(): number {
  try {
    const n = Number(sessionStorage.getItem(SHOWN_KEY));
    return Number.isFinite(n) && n > PAGE ? n : PAGE;
  } catch {
    return PAGE;
  }
}

export function PickedSection({ filter, here }: { filter: HomeFilter; here: LatLng | null }) {
  const [profile] = usePersistentStore(profileV3Store);
  const order = useMemo(() => tourismOrder(profile), [profile]);
  const eat = filter === 'eat';
  const all = useMemo(
    () => (eat ? pickedForYou(FOOD_PLACES, order, 'all', here) : pickedForYou(PUBLISHED_PLACES, order, filter, here)),
    [eat, order, filter, here],
  );
  const [shown, setShownState] = useState(readShown);
  const setShown = (n: number) => {
    setShownState(n);
    try {
      sessionStorage.setItem(SHOWN_KEY, String(n));
    } catch {
      /* private mode: not kept */
    }
  };
  const list = all.slice(0, shown);
  return (
    <section className={styles.section} aria-labelledby="home-picked">
      <div className={styles.sectionHead}>
        <h2 id="home-picked" className={styles.sectionTitle}>
          {eat ? (
            <BowlGlyph size={14} color={EAT_COLOURS.ink} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--assist-ink)" aria-hidden="true">
              <path d="M10 6c.6 4.2 1.8 5.4 6 6-4.2.6-5.4 1.8-6 6-.6-4.2-1.8-5.4-6-6 4.2-.6 5.4-1.8 6-6z" />
              <path d="M18 2c.3 2.1.9 2.7 3 3-2.1.3-2.7.9-3 3-.3-2.1-.9-2.7-3-3 2.1-.3 2.7-.9 3-3z" />
            </svg>
          )}
          {eat ? 'Places to eat' : 'Picked for you'}
        </h2>
        <span className={styles.sectionMeta}>
          {eat ? `${all.length} places${here ? ' · nearest first' : ''}` : here ? 'Personalised · nearest first' : 'Personalised to your picks'}
        </span>
      </div>
      <ul className={styles.grid} aria-label={eat ? 'Places to eat' : 'Places picked for you'}>
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
                {eat ? (
                  <span className={`${styles.pickBadge} ${styles.eatBadge}`}>
                    <BowlGlyph size={11} color="#fff" />
                    Eat
                  </span>
                ) : (
                  <CategoryBadge category={category} className={styles.pickBadge} />
                )}
                {m !== undefined && <span className={styles.pickDist}>{shortDistance(m)}</span>}
              </Link>
              <div className={styles.pickText}>
                <h3 className={styles.pickTitle}>
                  <Link to={paths.nearbyPlace(place.id)}>{place.name}</Link>
                </h3>
                {/* Eat: what kind of place it is (the catalogue's own words: "Hawker centre", "Cantonese restaurant") */}
                {eat && <span className={styles.pickKind}>{place.kind}</span>}
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
        <button type="button" className={styles.more} onClick={() => setShown(shown + PAGE)}>
          Show more places
        </button>
      )}
    </section>
  );
}

/**
 * The filter right above the cards it filters (UT02-1: a chip at the top of Home changed cards a screen below): All,
 * then the four Tourism 2040 categories. While Places to eat is on, no chip is picked. The caller scrolls the cards
 * into view after a tap.
 */
export const HomeFilterBar = forwardRef<HTMLDivElement, { value: HomeFilter; onChange(next: HomeFilter): void }>(function HomeFilterBar(
  { value, onChange },
  ref,
) {
  return (
    <div ref={ref} className={styles.filterBar}>
      <CategoryChips
        value={value === 'eat' ? null : value}
        onChange={onChange}
        label="Filter the cards below"
        className={styles.chips}
      />
    </div>
  );
});

/** Under the map (and the leaderboard), just over the filter (UT01-1): one tap to the places to eat. */
export function EatEntry({ onOpen, on }: { onOpen(): void; on: boolean }) {
  return (
    <button type="button" className={styles.eatEntry} onClick={onOpen} aria-pressed={on}>
      <span className={styles.eatIcon} aria-hidden="true">
        <BowlGlyph size={22} color={EAT_COLOURS.ink} />
      </span>
      <span className={styles.eatText}>
        <span className={styles.eatTitle}>Places to eat</span>
        <span className={styles.eatSub}>{FOOD_PLACES.length} food places · hawker centres, stalls, restaurants</span>
      </span>
      <Chevron />
    </button>
  );
}
