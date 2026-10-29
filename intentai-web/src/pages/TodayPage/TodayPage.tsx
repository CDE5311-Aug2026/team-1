import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import homeLogo from '../../assets/home/logo.png';
import AppShell from '../../components/AppShell/AppShell';
import HomeGreeting from '../../components/HomeGreeting/HomeGreeting';
import HomeHeader from '../../components/HomeHeader/HomeHeader';
import { NearbySection } from '../../components/NearbySection/NearbySection';
import { TodayHero } from '../../components/TodayHero/TodayHero';
import { todaysHoliday } from '../../data/holiday';
import { usePersistentStore } from '../../data/persistentStore';
import { testerStore } from '../../data/stores';
import { paths } from '../../routes';

/** Router state for Home: the Nearby place to select on arrival. */
export interface HomeRouteState {
  focusPlace?: string;
  /** Also bring the Nearby map into view (links that promise the map). */
  showMap?: boolean;
}

function showMapOf(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as HomeRouteState).showMap === true;
}

function focusPlaceOf(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null) return undefined;
  const id = (state as HomeRouteState).focusPlace;
  return typeof id === 'string' ? id : undefined;
}

/** Home: greeting, today's holiday hero, then the Nearby map and place carousel. */
export default function TodayPage() {
  const [tester] = usePersistentStore(testerStore);
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const [focusPlace] = useState(() => focusPlaceOf(location.state));
  const [showMap] = useState(() => showMapOf(location.state));
  const selected = useRef(focusPlace);
  const heading = useRef<HTMLHeadingElement>(null);

  // A new visit starts at the top with the h1 focused; Back/Forward keeps the browser's scroll position.
  useEffect(() => {
    if (navigationType === 'POP' || showMap) return;
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
    // Mount-only.
  }, []);

  /** Leaving for a place: this entry remembers it first, so Back selects its card again. */
  const leaveFor = (placeId: string, to: string) => {
    navigate(location, { replace: true, state: { focusPlace: placeId } satisfies HomeRouteState });
    navigate(to);
  };

  return (
    <AppShell tabBarNodeId="1:317" homeIndicatorNodeId="1:338" tabPop>
      <HomeHeader logoSrc={homeLogo} />
      <HomeGreeting ref={heading} date={todaysHoliday.today} name={tester.name} />
      <TodayHero
        holiday={todaysHoliday}
        onOpenHoliday={() => navigate(paths.holiday)}
        onOpenAlso={(id) => leaveFor(selected.current ?? id, paths.placeCard(id, 'festival'))}
      />
      <NearbySection
        focusId={focusPlace}
        revealMap={showMap && navigationType !== 'POP'}
        onSelectionChange={(id) => {
          selected.current = id;
        }}
        onOpenPlace={(id) => leaveFor(id, paths.homePlace(id))}
        onExplore={() => navigate(paths.nearby)}
      />
    </AppShell>
  );
}
