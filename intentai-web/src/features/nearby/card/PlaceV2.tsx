// v2 place page (boards 08, 12): hero photo (or the category tint and glyph), back / Save / Share, the category pill,
// name, where it is, Directions, sourced hours, key facts from the dataset card, a sourced tip, the story, a Hunt
// challenge that stops here, nearby places, and the sticky "Stamp here" bar. Each section shows only with its data
// (plan A9): no hours, tiles, tip, story, challenge or nearby places are made up. The stamp is the existing
// self-reported check-in; the hint under it follows the plan's range rules (PlaceV2Proximity).
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CategoryBadge from '../../../components/Category/CategoryBadge';
import CategoryGlyph from '../../../components/Category/CategoryGlyph';
import { SourceLine } from '../../../components/story';
import { placePicture } from '../../../data/home/nearbyCards';
import { challengesAt, dateRange } from '../../../data/search/hunt';
import { TOURISM_INFO, tourismOf, type TourismCategory } from '../../../data/tourism';
import { showToast } from '../../../hooks/useToast';
import { paths } from '../../../routes';
import { markVisited, stillReached, toggleSave, useExplorePersonal, type Milestone } from '../actions';
import { area as areaById, PUBLISHED_PLACES, regionName } from '../catalogue';
import ShareButton from '../components/ShareButton';
import { fixInSingapore, useLocationFlow } from '../components/LocationFlow';
import type { CuratedPlace, SourceReference } from '../domain';
import { distanceM, formatDistance } from '../geo';
import { directionsUrl } from '../links';
import { useLocationState } from '../location';
import { localToday, shortDate, stateOf } from '../personal';
import { byDistance, toItem } from '../ranking';
import { placeShare } from '../share';
import { distanceLabel, hintText, stampHint } from './PlaceV2Proximity';
import styles from './PlaceV2.module.css';

/** How far the Nearby strip looks, and how many it shows. */
export const NEARBY_RADIUS_M = 1500;
export const NEARBY_MAX = 8;

const PATH = {
  back: 'M15 5l-7 7 7 7',
  bookmark: 'M6.5 3.5h11v17L12 16.5l-5.5 4z',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11ZM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7.5V12l3 2',
  arrow: 'M20 4 3.5 10.5l7 3 3 7Z',
  spark: 'M12 3.5l1.6 4.9 4.9 1.6-4.9 1.6L12 16.5l-1.6-4.9L5.5 10l4.9-1.6zM18.5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  stamp: 'M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0zM12 7v6M9 10h6',
  check: 'm5 12 5 5L20 7',
};

function Svg({ d, size = 20, filled = false }: { d: string; size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function SourceLink({ s, children }: { s: SourceReference; children: ReactNode }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer">
      {children}
      <span className={styles.srOnly}> (opens in a new tab)</span>
    </a>
  );
}

/** A real photo of the place (a culture card's or a licensed one), or nothing: the hero then shows the category tint. */
export function placePhoto(place: Pick<CuratedPlace, 'id'>): { src: string; credit: string } | null {
  const pic = placePicture(place);
  return (pic.kind === 'card' || pic.kind === 'photo') && pic.src ? { src: pic.src, credit: pic.credit } : null;
}

export function catStyle(category: TourismCategory | undefined): CSSProperties {
  if (!category) return {};
  const info = TOURISM_INFO[category];
  return { '--cat': info.fill, '--cat-ink': info.ink, '--cat-tint': info.tint } as CSSProperties;
}

/** Up to three tiles, only from the dataset card's quick facts. */
export function factTiles(place: Pick<CuratedPlace, 'quickFacts'>): { value: string; label: string }[] {
  const q = place.quickFacts;
  if (!q) return [];
  return [
    q.year ? { value: q.year, label: 'built' } : null,
    q.heightM ? { value: `${q.heightM} m`, label: 'tall' } : null,
    q.floors ? { value: String(q.floors), label: q.floors === 1 ? 'floor' : 'floors' } : null,
  ]
    .filter((t): t is { value: string; label: string } => !!t)
    .slice(0, 3);
}

/** The first fact that links a source: the "Picked for you" tip. */
export const tipFact = (place: Pick<CuratedPlace, 'facts'>) => place.facts.find((f) => f.sources.length > 0);

export function nearbyPlaces(place: CuratedPlace, all: readonly CuratedPlace[] = PUBLISHED_PLACES) {
  const origin = { kind: 'map' as const, point: place.coordinates, label: place.name };
  return byDistance(
    all.filter((p) => p.id !== place.id && p.operatingStatus !== 'planned' && distanceM(place.coordinates, p.coordinates) <= NEARBY_RADIUS_M).map((p) => toItem(p, origin)),
  ).slice(0, NEARBY_MAX);
}

/** Back: the previous screen, or the fallback when the page was opened directly. */
export function useBack(fallback: string) {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback);
  };
}

/** Re-renders every 15 s while there is a fix, so "out of date" appears without a tap. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

function Hero({ place, category, actions }: { place: CuratedPlace; category: TourismCategory | undefined; actions: ReactNode }) {
  const back = useBack(paths.nearby);
  const photo = placePhoto(place);
  return (
    <section className={styles.hero} style={catStyle(category)} data-photo={photo ? 'yes' : 'no'}>
      {photo ? (
        <img className={styles.heroImg} src={photo.src} alt={place.name} decoding="async" />
      ) : (
        <span className={styles.heroTint} aria-hidden="true">
          {category && <CategoryGlyph category={category} size={72} />}
        </span>
      )}
      <span className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroBar}>
        <button type="button" className={styles.round} onClick={back} aria-label="Back">
          <Svg d={PATH.back} />
        </button>
        <span className={styles.heroActions}>{actions}</span>
      </div>
      {category && <CategoryBadge category={category} className={styles.heroBadge} />}
      {photo && <span className={styles.credit}>Photo: {photo.credit.replace(/^Photo:\s*/, '')}</span>}
    </section>
  );
}

/** The stamp's date line and its editor (change the date, or take the stamp back). */
function StampRecord({ place, visitedOn, onMilestones }: { place: CuratedPlace; visitedOn?: string; onMilestones: (m: Milestone[]) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = localToday();
  const save = (date: string) => {
    const result = markVisited(place.id, place.name, true, date);
    if (result.error) return setError(result.error);
    setError(null);
    setDraft(null);
    if (result.milestones.length) onMilestones(result.milestones);
  };
  return (
    <div className={styles.record}>
      {draft === null ? (
        <p className={styles.recordLine}>
          <span className={styles.recordText}>
            <Svg d={PATH.check} size={16} />
            {visitedOn ? `Stamped on ${shortDate(visitedOn)}` : 'Stamped'} · self-reported
          </span>
          <button type="button" className={styles.textButton} onClick={() => setDraft(visitedOn ?? today)}>
            Change date
          </button>
          <button type="button" className={styles.textButton} onClick={() => markVisited(place.id, place.name, false)}>
            Remove stamp
          </button>
        </p>
      ) : (
        <form
          className={styles.recordForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save(draft);
          }}
        >
          <label className={styles.recordLabel}>
            Stamp date{' '}
            <input type="date" value={draft} max={today} onChange={(e) => setDraft(e.target.value)} aria-describedby={error ? 'stamp-date-error' : undefined} />
          </label>
          <button type="submit" className={styles.smallPrimary}>
            Save date
          </button>
          <button type="button" className={styles.smallSecondary} onClick={() => setDraft(null)}>
            Cancel
          </button>
        </form>
      )}
      {error && (
        <p id="stamp-date-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function StampBar({ place, visitedOn, visited, onMilestones, milestones }: { place: CuratedPlace; visited: boolean; visitedOn?: string; onMilestones: (m: Milestone[]) => void; milestones: string[] }) {
  const location = useLocationState();
  const flow = useLocationFlow();
  const inSg = fixInSingapore(location);
  const now = useNow(location.status === 'active');
  const hint = stampHint(place, location, inSg, now);
  const stamp = () => {
    if (visited) {
      // stamping twice changes nothing: it says when the stamp was made
      showToast(visitedOn ? `Already stamped on ${shortDate(visitedOn)}` : 'Already stamped');
      return;
    }
    const result = markVisited(place.id, place.name, true);
    if (result.milestones.length) onMilestones(result.milestones);
  };
  const canAsk = hint.kind === 'ask' || hint.kind === 'stale' || hint.kind === 'unavailable';
  return (
    <div className={styles.stampWrap}>
      {flow.dialog}
      <button type="button" className={visited ? `${styles.stamp} ${styles.stamped}` : styles.stamp} onClick={stamp} aria-describedby="stamp-hint">
        <Svg d={visited ? PATH.check : PATH.stamp} size={22} />
        {visited ? (visitedOn ? `Stamped · ${shortDate(visitedOn)}` : 'Stamped') : 'Stamp here'}
      </button>
      <p id="stamp-hint" className={styles.stampHint} data-hint={hint.kind} role="status">
        {milestones.length ? milestones.join(' ') : hintText(hint)}
        {!milestones.length && canAsk && (
          <>
            {' · '}
            <button type="button" className={styles.hintButton} onClick={flow.start}>
              {hint.kind === 'ask' ? 'Check distance' : 'Try again'}
            </button>
          </>
        )}
      </p>
    </div>
  );
}

export default function PlaceV2({ place, children }: { place: CuratedPlace; children?: ReactNode }) {
  const personal = useExplorePersonal();
  const location = useLocationState();
  const state = stateOf(personal, place.id);
  const category = tourismOf(place);
  const info = category ? TOURISM_INFO[category] : undefined;
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const shownMilestones = milestones.filter((m) => stillReached(m, personal)).map((m) => `${m.percent}% of ${m.title} stamped.`);

  const distance = distanceLabel(place, location, fixInSingapore(location));
  const where = [areaById(place.areaId)?.name, regionName(place.regionId), distance && `${distance} away`].filter(Boolean).join(' · ');
  const hours = place.details?.hours;
  const tiles = factTiles(place);
  const tip = tipFact(place);
  const challenges = useMemo(() => challengesAt(place, PUBLISHED_PLACES), [place]);
  const nearby = useMemo(() => nearbyPlaces(place), [place]);

  return (
    <div className={styles.page} style={catStyle(category)}>
      <Hero
        place={place}
        category={category}
        actions={
          <>
            <button type="button" className={styles.round} aria-label="Save" aria-pressed={!!state?.saved} data-on={state?.saved ? 'yes' : 'no'} onClick={() => toggleSave(place.id, place.name)}>
              <Svg d={PATH.bookmark} filled={!!state?.saved} />
            </button>
            <ShareButton className={styles.round} label={`Share ${place.name}`} content={() => placeShare(place, personal)} />
          </>
        }
      />

      <div className={styles.head}>
        <h1 className={styles.title}>{place.name}</h1>
        <p className={styles.where}>
          <Svg d={PATH.pin} size={15} />
          <span>{where}</span>
        </p>
        <div className={styles.actions}>
          <a className={styles.directions} href={directionsUrl(place)} target="_blank" rel="noopener noreferrer" aria-label="Directions (opens Google Maps)">
            <span className={styles.directionsIcon}>
              <Svg d={PATH.arrow} size={16} filled />
            </span>
            Directions
          </a>
          {hours && (
            <span className={styles.hours}>
              <Svg d={PATH.clock} size={16} />
              <span>{hours.text}</span>
            </span>
          )}
        </div>
        {hours && (
          <p className={styles.fine}>
            Hours: <SourceLink s={hours.source}>{hours.source.publisher}</SourceLink>, checked {hours.source.checkedAt}
          </p>
        )}
        {state?.visited && <StampRecord place={place} visitedOn={state.visitedOn} onMilestones={setMilestones} />}
      </div>

      {tiles.length > 0 && (
        <section className={styles.tilesWrap} aria-label="Key facts">
          <div className={styles.tiles}>
            {tiles.map((t) => (
              <div key={t.label} className={styles.tile}>
                <span className={styles.tileValue}>{t.value}</span>
                <span className={styles.tileLabel}>{t.label}</span>
              </div>
            ))}
          </div>
          <p className={styles.fine}>From the EARTH ONLINE Singapore dataset card; not yet linked to individual sources.</p>
        </section>
      )}

      {tip && info && (
        <section className={styles.tip} aria-labelledby="place-tip-title">
          <span className={styles.tipIcon}>
            <Svg d={PATH.spark} size={18} />
          </span>
          <div className={styles.tipBody}>
            <h2 id="place-tip-title" className={styles.tipTitle}>
              Picked for you · {info.label}
            </h2>
            <p className={styles.tipText}>{tip.text}</p>
            <p className={styles.tipSource}>
              Source:{' '}
              {tip.sources.map((s, i) => (
                <span key={s.url + i}>
                  {i > 0 && '; '}
                  <SourceLink s={s}>{s.publisher}</SourceLink>
                </span>
              ))}
            </p>
          </div>
        </section>
      )}

      {place.description && (
        <article className={styles.story} aria-labelledby="place-story-title">
          <h2 id="place-story-title" className={styles.storyTitle}>
            The story
          </h2>
          <p className={styles.storyText}>{place.description.en}</p>
          <SourceLine inArticle>
            Intro from the <SourceLink s={place.description.source}>EARTH ONLINE Singapore dataset</SourceLink>; not yet linked to individual sources.
          </SourceLine>
        </article>
      )}

      {challenges.map(({ challenge, volume, stop, stops }) => (
        <section key={challenge.id} className={styles.challenge} aria-label="Part of a challenge">
          <span className={styles.challengeVol} aria-hidden="true">
            {volume ? `Vol. ${volume.roman}` : 'Hunt'}
          </span>
          <span className={styles.challengeText}>
            <span className={styles.challengeKicker}>
              {category && <CategoryBadge category={category} variant="kicker" />}
              <span className={styles.challengeKind}>Weekend challenge</span>
            </span>
            <span className={styles.challengeTitle}>{volume?.title ?? challenge.title}</span>
            <span className={styles.challengeLine}>
              Stop {stop} of {stops} · {dateRange(challenge.from, challenge.to)}
            </span>
          </span>
          <Link className={styles.view} to={paths.challenge(challenge.id)} aria-label={`View ${challenge.title}`}>
            View
          </Link>
        </section>
      ))}

      {nearby.length > 0 && (
        <section className={styles.nearby} aria-labelledby="place-nearby-title">
          <h2 id="place-nearby-title" className={styles.sectionTitle}>
            Nearby
          </h2>
          <ul className={styles.strip}>
            {nearby.map((n) => {
              const c = tourismOf(n.place);
              const photo = placePhoto(n.place);
              return (
                <li key={n.key}>
                  <Link className={styles.near} to={paths.nearbyPlace(n.key)}>
                    <span className={styles.nearPic} style={catStyle(c)}>
                      {photo ? <img src={photo.src} alt="" loading="lazy" decoding="async" /> : c && <CategoryGlyph category={c} size={30} className={styles.nearGlyph} />}
                      {c && <CategoryBadge category={c} className={styles.nearBadge} />}
                    </span>
                    <span className={styles.nearName}>{n.name}</span>
                    <span className={styles.nearDist}>{formatDistance(n.distanceM ?? NaN)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {children}

      <StampBar place={place} visited={!!state?.visited} visitedOn={state?.visitedOn} onMilestones={setMilestones} milestones={shownMilestones} />
    </div>
  );
}

/** A planned place (a draft): shown as "coming soon", never stampable. */
export function PlaceV2ComingSoon({ place }: { place: CuratedPlace }) {
  const category = tourismOf(place);
  return (
    <div className={`${styles.page} ${styles.soon}`} style={catStyle(category)}>
      <Hero place={place} category={category} actions={null} />
      <div className={styles.head}>
        <p className={styles.soonBadge}>Coming soon</p>
        <h1 className={styles.title}>{place.name}</h1>
        <p className={styles.where}>
          <Svg d={PATH.pin} size={15} />
          <span>{[place.kind, areaById(place.areaId)?.name ?? regionName(place.regionId)].filter(Boolean).join(' · ')}</span>
        </p>
        <p className={styles.soonText}>This place is planned and not open yet. It can't be stamped or counted until it opens.</p>
        <Link className={styles.smallSecondary} to={paths.search}>
          Search open places
        </Link>
      </div>
    </div>
  );
}
