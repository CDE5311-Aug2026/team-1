import AppShell from '../../components/AppShell/AppShell';
import DiscoveryHome from '../../components/Discovery/DiscoveryHome';

/** Home (Discovery redesign, 31 Oct 2026): the map of Singapore's planning areas and the region → area → place deck. */
export default function TodayPage() {
  return (
    <AppShell layout="fill" tabBarNodeId="1:317" tabPop>
      <DiscoveryHome />
    </AppShell>
  );
}
