import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import AppHeader from '../../components/AppHeader/AppHeader';
import CultureTabs from '../../components/CultureTabs/CultureTabs';
import HolidayCard from '../../components/HolidayCard/HolidayCard';
import NearYouCard from '../../components/NearYouCard/NearYouCard';
import { canonicalPrefs } from '../../data/culturePrefs';
import { staticCopy } from '../../data/expressions';
import { todaysHoliday } from '../../data/holiday';
import { usePersistentStore } from '../../data/persistentStore';
import { culturePrefsStore, placeStore } from '../../data/stores';
import { paths } from '../../routes';

export default function TodayPage() {
  const [place] = usePersistentStore(placeStore);
  const [prefs] = usePersistentStore(culturePrefsStore);
  // Older saves may hold the picks in another order; tabs always follow survey rank.
  const { categories } = canonicalPrefs(prefs.categories);
  const navigate = useNavigate();

  return (
    <AppShell tabBarNodeId="1:317" homeIndicatorNodeId="1:338">
      <AppHeader onBell={() => navigate(paths.notices)} />
      {/* v2: today's holiday replaces v1's Singlish progress card and lesson. */}
      <HolidayCard holiday={todaysHoliday} onLearnMore={() => navigate(paths.holiday)} />
      <NearYouCard
        nodeId="18:1949"
        // Figma names the default hawker centre; other picked places show their own name.
        place={place === 'Hawker centre' ? staticCopy.nearYou.place : place}
        subtitle={staticCopy.nearYou.subtitle}
        // Nearby Explore is the Nearby home and opens with location on or off (Nearby PRD §6). Its sheet starts with
        // "Phrases you might hear at <this place>", so the picked place and its phrases stay one tap away.
        onOpen={() => navigate(paths.nearby)}
      />
      {/* v2: the user's (or the survey top 3) culture picks replace v1's three expression cards. */}
      <CultureTabs categories={categories} />
    </AppShell>
  );
}
