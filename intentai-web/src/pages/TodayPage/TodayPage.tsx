import { useNavigate } from 'react-router-dom';
import homeLogo from '../../assets/home/logo.png';
import AppShell from '../../components/AppShell/AppShell';
import AppHeader from '../../components/AppHeader/AppHeader';
import HomeGreeting from '../../components/HomeGreeting/HomeGreeting';
import { NearbySection } from '../../components/NearbySection/NearbySection';
import { TodayHero } from '../../components/TodayHero/TodayHero';
import { todaysHoliday } from '../../data/holiday';
import { usePersistentStore } from '../../data/persistentStore';
import { testerStore } from '../../data/stores';
import { paths } from '../../routes';

/** Home: greeting, today's holiday hero, then the Nearby map and place carousel. */
export default function TodayPage() {
  const [tester] = usePersistentStore(testerStore);
  const navigate = useNavigate();
  const openPlace = (id: string) => navigate(paths.homePlace(id));

  return (
    <AppShell tabBarNodeId="1:317" homeIndicatorNodeId="1:338">
      <AppHeader greeting={false} logoSrc={homeLogo} onBell={() => navigate(paths.notices)} />
      <HomeGreeting date={todaysHoliday.today} name={tester.name} />
      <TodayHero holiday={todaysHoliday} onOpenHoliday={() => navigate(paths.holiday)} onOpenAlso={(id) => navigate(paths.placeCard(id, 'festival'))} />
      <NearbySection onOpenPlace={openPlace} onSearch={() => navigate(paths.nearby)} />
    </AppShell>
  );
}
