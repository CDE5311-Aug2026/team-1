import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { AlbumRail, SourceLine, type RailItem } from '../../components/story';
import { usePersistentStore } from '../../data/persistentStore';
import { FACETS, placeState } from '../../data/placeStories';
import { placeStoriesStore, setCheckedIn } from '../../data/stores';
import { storyPlace, type StoryPlace } from '../../data/stories/places';
import { initialRailIndex, type PlaceRouteState } from '../../data/stories/railMemory';
import { paths } from '../../routes';
import PlaceNotFound from './PlaceNotFound';
import styles from './PlacePage.module.css';

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
const SPARK_MS = 600;

/** Place page (Berlin Wall Fragments, Chinatown): hero with check-in, name, progress, Album Rail of 4 cards. */
export default function PlacePage() {
  const { placeId = '' } = useParams();
  const place = storyPlace(placeId);
  if (!place) return <PlaceNotFound />;
  return <PlaceView key={place.id} place={place} />;
}

function PlaceView({ place }: { place: StoryPlace }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [stories] = usePersistentStore(placeStoriesStore);
  const state = placeState(stories, place.id);
  const opened = new Set(state.opened);
  const [railIndex] = useState(() => initialRailIndex(location.state, place.id));
  const [entryState] = useState(() => location.state);
  const [sparking, setSparking] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // "Open card" flagged this entry; the flag has now been consumed, so later Back/Forward visits use railIndex.
  useEffect(() => {
    const s = entryState as PlaceRouteState | null;
    if (s && typeof s === 'object' && s.railFrom === 'open') {
      const { railFrom: _consumed, ...rest } = s;
      navigate(location, { replace: true, state: rest });
    }
    // Mount-only.
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!sparking) return;
    const id = window.setTimeout(() => setSparking(false), SPARK_MS);
    return () => window.clearTimeout(id);
  }, [sparking]);

  const checkIn = () => {
    if (state.checkedIn) {
      setCheckedIn(place.id, false);
      setSparking(false);
      return;
    }
    setCheckedIn(place.id, true);
    setSparking(true);
  };

  const openedKey = state.opened.join(',');
  const items: RailItem[] = useMemo(() => {
    const doneSet = new Set(openedKey ? openedKey.split(',') : []);
    return place.cards.map((card) => {
        const done = doneSet.has(card.facet);
        return {
          key: card.facet,
          image: card.image.src,
          label: done ? `${card.label}, opened` : card.label,
          done,
          kicker: done ? `${card.kicker} · OPENED` : card.kicker,
          title: card.title,
          blurb: card.blurb,
          format: card.format,
          href: paths.placeCard(place.id, card.facet),
        };
      });
  }, [place, openedKey]);

  // Leaving through "Open card": this entry remembers the rail card, so browser Back returns to it.
  const onOpen = (index: number) => {
    const back: PlaceRouteState = { railIndex: index, railFrom: 'open' };
    navigate(paths.homePlace(place.id), { replace: true, state: back });
  };

  const count = opened.size;

  return (
    <AppShell variant="story">
      <div className={styles.hero}>
        <img className={`a-hero ${styles.heroImg}`} src={place.hero.src} alt={place.hero.alt} />
        <Link
          to={paths.today}
          state={{ focusPlace: place.id }}
          className={`press ${styles.back}`}
          aria-label="Back to Home"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <button
          type="button"
          className={`press ${styles.checkIn} ${state.checkedIn ? styles.checked : ''}`}
          aria-label="Check in"
          aria-pressed={state.checkedIn}
          onClick={checkIn}
        >
          <span aria-hidden="true" className={styles.checkIcon}>
            {sparking && RAYS.map((r) => <span key={r} className="spark" style={{ '--r': `${r}deg` } as CSSProperties} />)}
            {state.checkedIn ? (
              <svg className="a-pop" width="18" height="18" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9.5" fill="#E4671F" />
                <path d="M8 12.5l2.7 2.7L16 9.8" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E4671F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
                <path d="M8 12.5l2.7 2.7L16 9.8" />
              </svg>
            )}
          </span>
          {state.checkedIn ? 'Checked in' : 'Check in'}
        </button>
      </div>

      <div className={styles.sheet}>
        <h1 ref={heading} tabIndex={-1} className={`a-up ${styles.title}`}>
          {place.name}
        </h1>
        <p className={`a-up ${styles.location}`} style={{ animationDelay: '.06s' }}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E4671F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {place.location}
        </p>
        <div className={`a-up ${styles.progress}`} style={{ animationDelay: '.1s' }}>
          <div aria-hidden="true" className={styles.bars}>
            {FACETS.map((f) => (
              <span key={f} data-bar={opened.has(f) ? 'done' : 'todo'} className={`${styles.bar} ${opened.has(f) ? styles.barDone : ''}`} />
            ))}
          </div>
          <span className={styles.count}>{`${count} of ${FACETS.length} cards opened`}</span>
        </div>
      </div>

      <AlbumRail items={items} initialIndex={railIndex} onOpen={onOpen} />

      <SourceLine>{place.hero.credit}</SourceLine>
    </AppShell>
  );
}
