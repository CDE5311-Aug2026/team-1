// One place (v2 boards 08, 12): the PlaceV2 layout (hero, Directions, sourced hours, key facts, tip, story, challenge,
// nearby places, Stamp here). Under it the older Nearby sections stay, as they have no board but are still used:
// "On routes", the map / 3D view, the place card's "Look for" and ordering guide, practical details, the culture and
// language cards, collections and the correction line. A planned place (a draft) shows as "coming soon".
import { lazy, Suspense, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { InfoCard } from '../../components/story';
import { ORDER_GUIDES } from '../../data/explore/orders';
import { placeCard } from '../../data/explore/placeCards';
import { useExplorePersonal } from '../../features/nearby/actions';
import OrderBuilder from '../../features/nearby/card/OrderBuilder';
import { PlaceSources } from '../../features/nearby/card/PlaceStoryCard';
import PlaceV2, { PlaceV2ComingSoon } from '../../features/nearby/card/PlaceV2';
import v2 from '../../features/nearby/card/PlaceV2.module.css';
import { ALL_PLACES, curatedPlace, placeByEarthKey } from '../../features/nearby/catalogue';
import { BackHeader, StorageWarning } from '../../features/nearby/components/NearbyChrome';
import { fixInSingapore } from '../../features/nearby/components/LocationFlow';
import PlaceInfo from '../../features/nearby/components/PlaceInfo';
import View3D from '../../features/nearby/components/View3D';
import styles from '../../features/nearby/components/Nearby.module.css';
import type { CuratedPlace } from '../../features/nearby/domain';
import { parsePlaceKey } from '../../features/nearby/identity';
import { view3dTarget } from '../../features/nearby/links';
import { isPrecise, useLocationState } from '../../features/nearby/location';
import CityMap from '../../features/nearby/map/CityMap';
import { stateOf } from '../../features/nearby/personal';
import { paths } from '../../routes';

// The atlas (routes and their texts) is large: its "On routes" line loads after the page.
const OnRoutes = lazy(() => import('./OnRoutes'));

export default function PlaceDetailPage() {
  const { placeKey } = useParams();
  const key = parsePlaceKey(placeKey);
  const place = key ? curatedPlace(key) : undefined;
  if (!place) {
    // planned places are drafts: never routed to from the app, but an old or typed link says "coming soon"
    const planned = key ? ALL_PLACES.find((p) => p.id === key && p.editorialStatus === 'draft' && p.operatingStatus === 'planned') : undefined;
    if (planned)
      return (
        <AppShell variant="story">
          <PlaceV2ComingSoon place={planned} />
        </AppShell>
      );
    return <NotFound />;
  }
  return <Detail key={place.id} place={place} />;
}

function NotFound() {
  return (
    <AppShell background="var(--bg-screen-b)">
      <div className={styles.screen}>
        <BackHeader title="Place not found" fallback={paths.nearby} />
        <p className={styles.empty}>
          We could not find this place. It may have been renamed or removed from the catalogue. Your saved and visited records are kept.
        </p>
        <div className={styles.row}>
          <Link className={styles.primary} to={paths.nearby}>
            Explore places
          </Link>
          <Link className={styles.secondary} to={paths.saved}>
            Saved places
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Detail({ place }: { place: CuratedPlace }) {
  const personal = useExplorePersonal();
  const location = useLocationState();
  const [view, setView] = useState<'map' | '3d'>('map');
  const [cardKey, setCardKey] = useState<string | null>(null);
  const otherCard = view === '3d' ? placeByEarthKey(cardKey) : undefined;
  const state = stateOf(personal, place.id);
  const card = placeCard(place.id);
  const fix = location.status === 'active' && fixInSingapore(location) && isPrecise(location.fix) ? location.fix : undefined;

  return (
    <AppShell variant="story" background="var(--bg-app)">
      <PlaceV2 place={place}>
        <div className={`${v2.more} ${styles.screen}`}>
          <StorageWarning />
          <Suspense fallback={null}>
            <OnRoutes placeKey={place.id} />
          </Suspense>

          <div className={styles.row}>
            <div className={styles.segmented} role="group" aria-label="View">
              <button type="button" className={styles.segment} aria-pressed={view === 'map'} onClick={() => setView('map')}>
                Map
              </button>
              <button
                type="button"
                className={styles.segment}
                aria-pressed={view === '3d'}
                onClick={() => {
                  setCardKey(null);
                  setView('3d');
                }}
              >
                3D
              </button>
            </div>
          </div>
          {view === 'map' ? (
            <div className={styles.heroMap} data-allow-bleed>
              <CityMap
                bleed
                label={`Map showing ${place.name}`}
                pins={[{ key: place.id, name: place.name, location: place.coordinates, category: place.category, visited: state?.visited }]}
                selectedKey={place.id}
                onSelect={() => undefined}
                readOnly
                focus={{ id: 1, center: place.coordinates, radiusM: 600 }}
                you={fix ?? null}
              />
            </div>
          ) : (
            <>
              <View3D target={view3dTarget(place)} title={`3D view around ${place.name}`} height={400} hideCards onCard={setCardKey} you={fix ?? null} />
              {otherCard && otherCard.id !== place.id && (
                <p className={styles.note} role="status">
                  {otherCard.name} ·{' '}
                  <Link className={styles.textLink} to={paths.nearbyPlace(otherCard.id)}>
                    Open place →
                  </Link>
                </p>
              )}
            </>
          )}

          {card?.lookFor && card.lookFor.length > 0 && (
            <InfoCard label="Look for" kicker="LOOK FOR">
              <ul className={v2.lookFor}>
                {card.lookFor.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            </InfoCard>
          )}
          {card?.order && <OrderBuilder guide={ORDER_GUIDES[card.order]} />}
          {(card?.lookFor?.length || card?.order) && <PlaceSources place={place} />}

          {/* the story is told above (from the dataset intro), so About keeps the practical lines; without an intro
          above, About gives the summary */}
          <PlaceInfo place={place} part="details" storyAbove={!!place.description} />
        </div>
      </PlaceV2>
    </AppShell>
  );
}
