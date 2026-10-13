import { Navigate, useNavigate } from 'react-router-dom';
import { usePersistentStore } from '../../data/persistentStore';
import { noticesStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import MySpaceLayout from './MySpaceLayout/MySpaceLayout';
import NoticesView, { type NoticesNodeIds } from './NoticesView/NoticesView';
import ResultToast from './ResultToast/ResultToast';
import type { Outcome } from './notices';

interface NoticeResultPageProps {
  outcome: Outcome;
}

const FRAMES: Record<Outcome, { tabBar: string; toast: string; ids: NoticesNodeIds }> = {
  // Figma 14:730 "5 AI output — Confirmed"
  confirmed: {
    tabBar: '14:811',
    toast: '21:1504',
    ids: {
      segment: { root: '21:1466', about: '21:1467', notices: '21:1469' },
      localFix: '21:1473',
      occasion: '21:1487',
      yourData: '21:1496',
      deleteAll: '21:1500',
    },
  },
  // Figma 14:850 "6 AI output — Not right"
  rejected: {
    tabBar: '14:931',
    toast: '21:1547',
    ids: {
      segment: { root: '21:1507', about: '21:1508', notices: '21:1510' },
      localFix: '21:1514',
      occasion: '21:1528',
      yourData: '21:1539',
      deleteAll: '21:1543',
    },
  },
};

/** The Notices screen right after Confirm / Not right, with the frame's own Undo toast. */
export default function NoticeResultPage({ outcome }: NoticeResultPageProps) {
  const navigate = useNavigate();
  const frame = FRAMES[outcome];
  const [notices] = usePersistentStore(noticesStore);
  const [settings] = usePersistentStore(settingsStore);

  const undo = () => {
    noticesStore.set((previous) => ({ ...previous, status: 'pending' }));
    navigate(paths.notices, { replace: true });
  };

  // Only reachable while the notice really has this outcome (not after Undo, a reload, or with
  // Flag occasions off).
  if (!settings.occasions || notices.status !== outcome) return <Navigate to={paths.notices} replace />;

  return (
    <MySpaceLayout tabBarNodeId={frame.tabBar}>
      <NoticesView occasion={outcome} nodeIds={frame.ids} />
      <ResultToast key={outcome} outcome={outcome} nodeId={frame.toast} onUndo={undo} />
    </MySpaceLayout>
  );
}
