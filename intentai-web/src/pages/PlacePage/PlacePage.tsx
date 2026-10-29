// Place page (Intent v3 Figma 2 / 7): a hero photo with Back and Check in, the place's name and area, "N of M cards
// opened", the Album Rail of its cards, and the front card's details with Open card. Places = Nearby areas with
// culture cards (src/data/home/places.ts); Check in = Nearby's `visited` for the place the front card names.
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import BlurText from '../../components/reactbits/BlurText';
import { ARTICLE_VIDEOS } from '../../data/videos';
import { checkInTarget, formatsOf, homePlace, kindLabel, openedCount, visitedKeys } from '../../data/home/places';
import { usePersistentStore } from '../../data/persistentStore';
import { explorePersonalStore, openedCardsStore } from '../../data/stores';
import { markVisited } from '../../features/nearby/actions';
import { paths } from '../../routes';
import { PLACE_AREAS } from '../AskPage/cards';
import HomeIcon from '../TodayPage/shared/HomeIcon';
import AlbumRail from './AlbumRail';
import styles from './PlacePage.module.css';

export default function PlacePage() {
  const { placeKey = '' } = useParams();
  const navigate = useNavigate();
  // The key is an area id; a Nearby place key opens its area.
  const place = homePlace(placeKey) ?? homePlace(PLACE_AREAS[placeKey]);
  const [opened] = usePersistentStore(openedCardsStore);
  const [personal] = usePersistentStore(explorePersonalStore);
  const [active, setActive] = useState(() => {
    const i = place?.cards.findIndex((c) => !opened.includes(c.article.id)) ?? 0;
    return Math.max(0, i);
  });
  const onActive = useCallback((i: number) => setActive(i), []);

  if (!place) {
    return (
      <AppShell chrome="status">
        <div className={styles.missing}>
          <h1>Place not found</h1>
          <p>This place has no culture cards yet.</p>
          <Link to={paths.today}>Back to Home</Link>
        </div>
      </AppShell>
    );
  }

  const card = place.cards[active] ?? place.cards[0];
  const count = openedCount(place, opened);
  const total = place.cards.length;
  const target = checkInTarget(card, place.id);
  const visited = visitedKeys(personal);
  const checkedIn = !!target && visited.has(target.key);
  const hasVideo = Boolean(ARTICLE_VIDEOS[card.article.id]);

  return (
    <AppShell chrome="status">
      {/* Full-screen place page: the hero photo and the Album Rail run edge to edge. */}
      <div className={styles.page} data-allow-bleed>
        <div className={styles.hero}>
          {place.cover && <img className={styles.heroPhoto} src={place.cover.src} alt={place.cover.alt} />}
          <span className={styles.heroShade} aria-hidden="true" />
          <button type="button" className={styles.back} onClick={() => navigate(paths.today)} aria-label="Back to Home">
            <HomeIcon name="back" size={22} stroke={2.2} />
          </button>
          {target && (
            <button
              type="button"
              className={checkedIn ? `${styles.checkIn} ${styles.checkedIn}` : styles.checkIn}
              aria-pressed={checkedIn}
              aria-label={checkedIn ? `Checked in at ${target.name}. Press to remove the check-in.` : `Check in at ${target.name}`}
              onClick={() => markVisited(target.key, target.name, !checkedIn)}
            >
              <HomeIcon name="checkCircle" size={19} stroke={2} />
              {checkedIn ? 'Checked in' : 'Check in'}
            </button>
          )}
        </div>

        <section className={styles.sheet} aria-label={place.short}>
          <BlurText as="h1" text={place.short} className={styles.title} trigger="load" delay={60} stepDuration={0.32} blur={8} distance={12} />
          <p className={styles.where}>
            <HomeIcon name="pin" size={17} />
            {place.name}
          </p>
          <div className={styles.progressRow}>
            <span className={styles.segments} aria-hidden="true">
              {place.cards.map((c) => (
                <i key={c.article.id} className={opened.includes(c.article.id) ? styles.segOn : undefined} />
              ))}
            </span>
            <span className={styles.progressText}>
              {count} of {total} cards opened
            </span>
          </div>

          <AlbumRail cards={place.cards} opened={opened} active={active} onActive={onActive} />

          <article className={styles.info} aria-live="polite">
            <p className={styles.kicker}>
              {kindLabel(card)} · {active + 1} of {total}
            </p>
            <h2 className={styles.infoTitle}>{card.article.title}</h2>
            <p className={styles.infoBody}>{card.article.summary}</p>
            {target && (
              <p className={styles.infoPlace}>
                <HomeIcon name="pin" size={15} />
                {target.name}
                {checkedIn && <span className={styles.infoDone}> · checked in</span>}
              </p>
            )}
            <div className={styles.infoFoot}>
              <span className={styles.formats}>{formatsOf(hasVideo)}</span>
              <Link className={styles.open} to={paths.card(card.article.id)} state={{ place: place.id }}>
                Open card
                <HomeIcon name="arrow" size={16} stroke={2.2} />
              </Link>
            </div>
          </article>
          {place.cover && <p className={styles.credit}>Top photo: {place.cover.credit}</p>}
        </section>
      </div>
    </AppShell>
  );
}
