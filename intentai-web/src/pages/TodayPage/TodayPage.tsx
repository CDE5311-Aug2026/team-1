// Home (Redesign v2, boards 05 "hunting together" and 11 "solo"). The kept 3D map and its region → area → place deck
// (owner decision D-keep, Discovery redesign of 31 Oct 2026) with the v2 sections around it: the category chips
// (?cat=, they also filter the map and the deck), the region leaderboard card (together mode only), Challenges and
// Picked for you. An open place is still a page of its own (no tab bar, no sections).
import { useMemo, useState } from 'react';
import AppShell from '../../components/AppShell/AppShell';
import CategoryChips, { useCategoryParam } from '../../components/Category/CategoryChips';
import DiscoveryHome, { readHomeHere } from '../../components/Discovery/DiscoveryHome';
import { openChallenges } from '../../data/hunt/challenges';
import { usePersistentStore } from '../../data/persistentStore';
import { huntModeStore, isTogether } from '../../data/v2Stores';
import { localToday } from '../../features/nearby/personal';
import type { LatLng } from '../../features/nearby/types';
import { ChallengesSection, PickedSection, RegionLeaderboard } from './HomeSections';
import sections from './HomeSections.module.css';

export default function TodayPage() {
  const [placeOpen, setPlaceOpen] = useState(false);
  const [category, setCategory] = useCategoryParam();
  const [mode] = usePersistentStore(huntModeStore);
  const together = isTogether(mode);
  const [here, setHere] = useState<LatLng | null>(readHomeHere);
  const challenges = useMemo(() => openChallenges(localToday()), []);
  // One screen only while a place is open. Otherwise Home is a page the window scrolls, as every other page is: a wheel
  // over the tab bar, the keys (Space, Page Down) and the scrollbar all reach it, which an inner scroller missed
  // (owner, 8 Nov 2026: "Home still cannot scroll").
  return (
    <AppShell layout={placeOpen ? 'fill' : 'page'} background={placeOpen ? '#c8a87a' : undefined} chrome={placeOpen ? 'status' : 'full'} tabBarNodeId="1:317" tabPop>
      <DiscoveryHome
        onPlaceOpenChange={setPlaceOpen}
        category={category}
        onHere={setHere}
        bar={<CategoryChips value={category} onChange={setCategory} className={sections.chips} />}
        top={together ? <RegionLeaderboard region={mode.region ?? 'central'} challenges={challenges} /> : null}
        bottom={
          <>
            <ChallengesSection filter={category} together={together} />
            <PickedSection filter={category} here={here} />
          </>
        }
      />
    </AppShell>
  );
}
