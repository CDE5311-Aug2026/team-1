// One place: its story card (header, photo or sample clip, key numbers, then and now, text, "Look for"), then
// practical info, the dataset's intro, sourced fun facts, a language tip, collection membership, Save / Visited
// (self-reported), Directions and the 3D view (NBR 18–21, 24).
import { placeCard } from '../../data/explore/placeCards';
import { lazy, Suspense, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { useExplorePersonal } from '../../features/nearby/actions';
import { area as areaById, curatedPlace, placeByEarthKey } from '../../features/nearby/catalogue';
import { BackHeader, StorageWarning } from '../../features/nearby/components/NearbyChrome';
import View3D from '../../features/nearby/components/View3D';
import PlaceStoryCard from '../../features/nearby/card/PlaceStoryCard';
import PlaceInfo from '../../features/nearby/components/PlaceInfo';
import { view3dTarget } from '../../features/nearby/links';
import { fixInSingapore } from '../../features/nearby/components/LocationFlow';
import styles from '../../features/nearby/components/Nearby.module.css';
import type { CuratedPlace } from '../../features/nearby/domain';
import { distanceM, formatDistance } from '../../features/nearby/geo';
import { parsePlaceKey } from '../../features/nearby/identity';
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
  if (!place) return <NotFound />;
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
  const selectedArea = areaById(personal.selectedAreaId);

  const fix = location.status === 'active' && fixInSingapore(location) && isPrecise(location.fix) ? location.fix : undefined;
  const distance = fix
    ? `${formatDistance(distanceM(fix, place.coordinates))} from you`
    : selectedArea && !selectedArea.overview
      ? `${formatDistance(distanceM(selectedArea.center, place.coordinates))} from ${selectedArea.name}`
      : null;

  return (
    <AppShell background="var(--bg-screen-b)">
      <div className={styles.screen}>
        <BackHeader title={place.name} fallback={paths.nearby} />
        <PlaceStoryCard place={place} distance={distance} />
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

        <PlaceInfo place={place} storyAbove={!!placeCard(place.id)} />
      </div>
    </AppShell>
  );
}
