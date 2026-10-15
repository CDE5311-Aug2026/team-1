import { usePersistentStore } from '../../data/persistentStore';
import { noticesStore, settingsStore } from '../../data/stores';
import MySpaceLayout from './MySpaceLayout/MySpaceLayout';
import NoticesView from './NoticesView/NoticesView';

/** Figma 12:182 "2 My Space — Notices". The AI notice exists only while "Flag occasions" is on. */
export default function NoticesPage() {
  const [notices] = usePersistentStore(noticesStore);
  const [settings] = usePersistentStore(settingsStore);

  return (
    <MySpaceLayout tabBarNodeId="12:297">
      <NoticesView
        occasion={settings.occasions ? notices.status : 'hidden'}
        nodeIds={{
          segment: { root: '21:1419', about: '21:1420', notices: '21:1422' },
          localFix: '21:1426',
          occasion: '21:1440',
          yourData: '21:1458',
          deleteAll: '21:1462',
        }}
      />
    </MySpaceLayout>
  );
}
