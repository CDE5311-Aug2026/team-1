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
import { culturePrefsStore, placeStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';

export default function TodayPage() {
  const [settings] = usePersistentStore(settingsStore);
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
        // Figma notes: Near you opens Nearby when location is on; otherwise the user picks a place first.
        onOpen={() => navigate(settings.location ? paths.nearby : paths.places)}
      />
      {/* v2: the user's (or the survey top 3) culture picks replace v1's three expression cards. */}
      <CultureTabs categories={categories} />
    </AppShell>
  );
}
