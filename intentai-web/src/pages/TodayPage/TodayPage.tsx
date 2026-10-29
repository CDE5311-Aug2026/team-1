// Home (Intent v3 Figma 1): date and greeting, streak and bell, today's occasion (from src/data/holiday.ts), then
// "Nearby": Nearby's own street map with a Parallax Carousel of the places that have culture cards, synced both ways.
// Below the map, Today's culture tabs stay one scroll away (the Figma has no slot for them).
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import CultureTabs from '../../components/CultureTabs/CultureTabs';
import HomeLink from '../../components/HomeLink/HomeLink';
import Icon from '../../components/Icon/Icon';
import StreakChip from '../../components/StreakChip/StreakChip';
import BlurText from '../../components/reactbits/BlurText';
import { canonicalPrefs } from '../../data/culturePrefs';
import { HOLIDAY_LINKS, nearbyHref } from '../../data/cultureLinks';
import { staticCopy } from '../../data/expressions';
import { todaysHoliday } from '../../data/holiday';
import { HOME_PLACES, dayLabel, greetingFor } from '../../data/home/places';
import { usePersistentStore } from '../../data/persistentStore';
import { currentStreak } from '../../data/progress';
import { culturePrefsStore, explorePersonalStore, placeStore, streakStore } from '../../data/stores';
import { PLACE_AREAS } from '../AskPage/cards';
import stats from '../../data/explore/stats.json';
import { distanceM, formatDistance } from '../../features/nearby/geo';
import { isPrecise, useLocationState } from '../../features/nearby/location';
import CityMap, { type MapFocus } from '../../features/nearby/map/CityMap';
import { thumbUrl } from '../../features/nearby/thumbs';
import useToday from '../../hooks/useToday';
import { paths } from '../../routes';
import NearbyStrip, { type StripItem } from './NearbyStrip';
import { homePlaces } from '../../data/home/nearbyCards';
import HomeIcon from './shared/HomeIcon';
import styles from './TodayPage.module.css';

const NAME = staticCopy.greeting.split(', ')[1] ?? 'W';
const MAP_HEIGHT = 468;
// Close enough that neighbouring places (Kampong Glam, Little India) stay apart as pins (WCAG target size).
const PLACE_RADIUS_M = 900;

/** The occasion's place in Nearby (Deepavali → Little India), with the holiday sentence that names it. */
function occasionLink() {
  const link = HOLIDAY_LINKS[todaysHoliday.name]?.[0];
  if (!link) return undefined;
  const sentence = todaysHoliday.deeper
    .flatMap((p) => p.split(/(?<=[.!?])\s+/))
    .find((s) => s.includes(link.label) || (link.kind === 'place' && s.includes('Serangoon')));
  const area = link.kind === 'place' ? PLACE_AREAS[link.id] : undefined;
  const placeHasCards = area && HOME_PLACES.some((p) => p.id === area);
  return {
    label: link.label,
    text: sentence ?? `See ${link.label} in Nearby`,
    href: placeHasCards ? paths.place(area) : nearbyHref(link),
    thumb: link.kind === 'place' ? thumbUrl(link.id) : undefined,
  };
}

export default function TodayPage() {
  const navigate = useNavigate();
  const [place] = usePersistentStore(placeStore);
  const [prefs] = usePersistentStore(culturePrefsStore);
  const [personal] = usePersistentStore(explorePersonalStore);
  const [streak] = usePersistentStore(streakStore);
  const today = useToday();
  const location = useLocationState();
  // Older saves may hold the picks in another order; tabs always follow survey rank.
  const { categories } = canonicalPrefs(prefs.categories);

  const now = new Date();
  const greeting = `${greetingFor(now.getHours())}, ${NAME}`;
  const nearName = place === 'Hawker centre' ? staticCopy.nearYou.place : place;
  const fix = isPrecise(location.fix) ? location.fix : undefined;

  // Every real Nearby place, nearest first when we know where you are.
  const places = useMemo(() => homePlaces(fix ? (p) => distanceM(fix, p.coordinates) : undefined), [fix]);
  const items: StripItem[] = useMemo(() => {
    const state = new Map(personal.places.map((s) => [s.placeKey as string, s]));
    return places.map((p) => ({
      place: p,
      checkedIn: Boolean(state.get(p.id)?.visited),
      saved: Boolean(state.get(p.id)?.saved),
      distance: fix ? formatDistance(distanceM(fix, p.coordinates)).replace('Approx. ', '') : undefined,
    }));
  }, [places, personal, fix]);

  const [active, setActive] = useState(0);
  const [focus, setFocus] = useState<MapFocus>(() => ({ id: 1, center: places[0]?.coordinates, radiusM: PLACE_RADIUS_M }));
  const goTo = (i: number) => {
    setActive(i);
    setFocus((f) => ({ id: f.id + 1, center: places[i].coordinates, radiusM: PLACE_RADIUS_M }));
  };

  const occasion = occasionLink();

  return (
    <AppShell tabBarNodeId="1:317" homeIndicatorNodeId="1:338">
      <div className={styles.page}>
        <header className={styles.header}>
          <HomeLink className={styles.logo} />
          <div className={styles.actions}>
            <StreakChip count={currentStreak(streak, today)} />
            <button type="button" className={styles.bell} onClick={() => navigate(paths.notices)} aria-label="Notifications">
              <Icon name="bell" size={26} />
              <span className={styles.bellDot} aria-hidden="true" />
            </button>
          </div>
        </header>

        <p className={styles.date}>{dayLabel(now)}</p>
        <BlurText as="h1" text={greeting} className={styles.greeting} trigger="load" delay={80} stepDuration={0.34} blur={10} distance={14} />

        {/* Occasion banner: only today's holiday from src/data/holiday.ts (a fixed demo date until backlog B7). */}
        <section className={styles.occasion} aria-labelledby="occasion-title">
          <span className={styles.occasionDots} aria-hidden="true">
            <i /> <i /> <i /> <i />
          </span>
          <p className={styles.kicker}>
            {todaysHoliday.today} · {todaysHoliday.name}
          </p>
          <h2 id="occasion-title" className={styles.occasionTitle}>
            {todaysHoliday.cardTitle}
          </h2>
          <p className={styles.occasionBody}>{todaysHoliday.cardBody}</p>
          <button type="button" className={styles.learn} onClick={() => navigate(paths.holiday)}>
            Learn more
            <HomeIcon name="arrow" size={15} stroke={2.2} />
          </button>
          {occasion && (
            <Link className={styles.also} to={occasion.href}>
              {occasion.thumb && <img className={styles.alsoThumb} src={occasion.thumb} alt="" width={52} height={52} loading="lazy" />}
              <span className={styles.alsoText}>
                <span className={styles.alsoKicker}>In Nearby · {occasion.label}</span>
                <span className={styles.alsoTitle}>{occasion.text}</span>
              </span>
              <span className={styles.alsoGo} aria-hidden="true">
                <HomeIcon name="arrow" size={18} stroke={2.2} />
              </span>
            </Link>
          )}
        </section>

        <section className={styles.nearby} aria-labelledby="nearby-title">
          <div className={styles.sectionHead}>
            <h2 id="nearby-title" className={styles.sectionTitle}>
              Nearby
            </h2>
            <p className={styles.sectionHint}>Swipe the cards or tap a pin</p>
          </div>

          <div className={styles.mapCard}>
            <CityMap
              label="Street map of the places in Nearby. Each pin is also a card below the map."
              height={MAP_HEIGHT}
              pins={items.map((it) => ({
                key: it.place.id,
                name: it.place.name,
                location: it.place.coordinates,
                category: it.place.category,
                visited: it.checkedIn,
              }))}
              selectedKey={places[active]?.id}
              onSelect={(key) => {
                const i = places.findIndex((p) => p.id === key);
                if (i >= 0) goTo(i);
              }}
              focus={focus}
              you={fix ?? null}
              insets={{ top: 64, bottom: 190 }}
              controlsTop={112}
            />
            <div className={styles.mapTop}>
              <button type="button" className={styles.nearChip} onClick={() => navigate(paths.nearby)}>
                <span className={styles.liveDot} aria-hidden="true" />
                <span className={styles.nearLabel}>Near you</span>
                <span className={styles.nearSep} aria-hidden="true">
                  ·
                </span>
                <span className={styles.nearPlace}>{nearName}</span>
              </button>
              <button type="button" className={styles.searchBtn} onClick={() => navigate(paths.nearby)} aria-label="Search places in Nearby">
                <HomeIcon name="search" size={19} stroke={2} />
              </button>
            </div>
            <p className={styles.count}>
              <strong>{stats.publishedPlaces}</strong> places to explore
            </p>
            <div className={styles.carouselWrap}>
              <NearbyStrip items={items} active={active} onActive={goTo} />
            </div>
          </div>
        </section>

        <section className={styles.more} aria-labelledby="culture-title">
          <h2 id="culture-title" className={styles.sectionTitle}>
            Culture for you
          </h2>
          <CultureTabs categories={categories} />
        </section>
      </div>
    </AppShell>
  );
}
