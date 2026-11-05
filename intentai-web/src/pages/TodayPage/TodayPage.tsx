import { useState } from 'react';
import AppShell from '../../components/AppShell/AppShell';
import DiscoveryHome from '../../components/Discovery/DiscoveryHome';

/** Home (Discovery redesign, 31 Oct 2026): the map of Singapore's planning areas and the region → area → place deck. */
export default function TodayPage() {
  const [placeOpen, setPlaceOpen] = useState(false);
  return (
    <AppShell layout="fill" background="#c8a87a" chrome={placeOpen ? 'status' : 'full'} tabBarNodeId="1:317" tabPop>
      <DiscoveryHome onPlaceOpenChange={setPlaceOpen} />
    </AppShell>
  );
}
