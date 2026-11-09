// Home (Redesign v2, boards 05 "hunting together" and 11 "solo"). The kept 3D map and its region → area → place deck
// (owner decision D-keep, Discovery redesign of 31 Oct 2026) is always the first block (owner, 10 Nov 2026: "the map
// must stay at the very top"). Under it: the region leaderboard card (together mode only), then the filter chips (?cat=,
// they also filter the map) with Places to eat, right above the cards they filter, Challenges and Picked for you.
// User test UT02-1: the chips used to sit at the top, so a tap changed cards a screen below; now they sit over the cards
// and a tap scrolls the cards into view (at once when motion is reduced). A place, from the map or a card, opens on its
// own page (/nearby/place/:id), the same M-page either way.
import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReducedMotionConfig } from 'motion/react';
import AppShell from '../../components/AppShell/AppShell';
import DiscoveryHome, { readHomeHere } from '../../components/Discovery/DiscoveryHome';
import { openChallenges } from '../../data/hunt/challenges';
import { usePersistentStore } from '../../data/persistentStore';
import { isTourismCategory } from '../../data/tourism';
import { huntModeStore, isTogether } from '../../data/v2Stores';
import { localToday } from '../../features/nearby/personal';
import type { LatLng } from '../../features/nearby/types';
import { ChallengesSection, EatEntry, HomeFilterBar, PickedSection, RegionLeaderboard, type HomeFilter } from './HomeSections';

/** ?cat= in the URL: a category, or "eat" (replace, not push, so Back leaves Home rather than stepping through chips). */
function useHomeFilter(): [HomeFilter, (next: HomeFilter) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('cat');
  const value: HomeFilter = raw === 'eat' ? 'eat' : isTourismCategory(raw) ? raw : 'all';
  const set = useCallback(
    (next: HomeFilter) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'all') p.delete('cat');
          else p.set('cat', next);
          return p;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [value, set];
}

export default function TodayPage() {
  const [filter, setFilter] = useHomeFilter();
  const [mode] = usePersistentStore(huntModeStore);
  const together = isTogether(mode);
  const [here, setHere] = useState<LatLng | null>(readHomeHere);
  const challenges = useMemo(() => openChallenges(localToday()), []);
  const reduce = useReducedMotionConfig();
  const bar = useRef<HTMLDivElement>(null);
  // pick, then bring the chips and the cards under them into view once the new cards are drawn
  const choose = (next: HomeFilter) => {
    setFilter(next);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = bar.current;
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }),
    );
  };
  // Home is a page the window scrolls, as every other page is: a wheel over the tab bar, the keys (Space, Page Down)
  // and the scrollbar all reach it, which an inner scroller missed (owner, 8 Nov 2026: "Home still cannot scroll").
  return (
    <AppShell layout="page" chrome="full" tabBarNodeId="1:317" tabPop>
      <DiscoveryHome
        category={filter === 'eat' ? 'all' : filter}
        onHere={setHere}
        bottom={
          <>
            {/* map first (DiscoveryHome), then the leaderboard (hunting together only), Places to eat, then the filter
                right over the cards it filters */}
            {together ? <RegionLeaderboard region={mode.region ?? 'central'} challenges={challenges} /> : null}
            <EatEntry on={filter === 'eat'} onOpen={() => choose(filter === 'eat' ? 'all' : 'eat')} />
            <HomeFilterBar ref={bar} value={filter} onChange={choose} />
            {/* Eat has no challenges of its own: its places come straight under the chips */}
            {filter !== 'eat' && <ChallengesSection filter={filter} />}
            <PickedSection filter={filter} here={here} />
          </>
        }
      />
    </AppShell>
  );
}
