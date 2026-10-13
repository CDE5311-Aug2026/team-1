import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import lock from '../../../assets/my-space/section-lock.svg';
import trash from '../../../assets/my-space/delete-trash.svg';
import dismissIcon from '../../../assets/my-space/notice-dismiss.svg';
import chevron from '../../../assets/my-space/link-chevron.svg';
import Dialog from '../../../components/Dialog/Dialog';
import { usePersistentStore } from '../../../data/persistentStore';
import { deleteAllData, noticesStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import { paths } from '../../../routes';
import AskLocalDialog from '../AskLocalDialog/AskLocalDialog';
import NoticeCard from '../NoticeCard/NoticeCard';
import cardStyles from '../NoticeCard/NoticeCard.module.css';
import OccasionNotice from '../OccasionNotice/OccasionNotice';
import SectionHeading from '../SectionHeading/SectionHeading';
import SegmentNav, { type SegmentNodeIds } from '../SegmentNav/SegmentNav';
import pageStyles from '../MySpacePage.module.css';
import { noticeCount, useResolveNotice, type OccasionState } from '../notices';
import styles from './NoticesView.module.css';

export interface NoticesNodeIds {
  segment: SegmentNodeIds;
  localFix: string;
  occasion: string;
  yourData: string;
  deleteAll: string;
}

interface NoticesViewProps {
  occasion: OccasionState;
  nodeIds: NoticesNodeIds;
}

type OpenDialog = 'change' | 'delete' | 'ask' | null;

/** Body of the Notices frames (12:182, 14:730, 14:850): local fix, AI occasion notice, data controls. */
export default function NoticesView({ occasion, nodeIds }: NoticesViewProps) {
  const [notices, setNotices] = usePersistentStore(noticesStore);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const navigate = useNavigate();
  const resolve = useResolveNotice();

  const dismiss = () => {
    setNotices((previous) => ({ ...previous, dismissed: true }));
    showToast('Notice dismissed', { undo: () => setNotices((previous) => ({ ...previous, dismissed: false })) });
  };

  const deleteEverything = () => {
    deleteAllData();
    navigate(paths.welcome);
  };

  return (
    <div className={pageStyles.body}>
      <SegmentNav active="notices" count={noticeCount(notices.dismissed, occasion)} nodeIds={nodeIds.segment} />

      {!notices.dismissed && (
        <NoticeCard
          chip="Local fix"
          tone="green"
          time="2h"
          title="A local updated “chope”"
          description="It also means saving a spot in a queue."
          nodeId={nodeIds.localFix}
          headerAction={
            <button type="button" className={cardStyles.dismiss} aria-label="Dismiss local update" onClick={dismiss}>
              <img src={dismissIcon} alt="" width={14} height={14} />
            </button>
          }
        >
          <button type="button" className={cardStyles.link} onClick={() => setDialog('change')}>
            See change
            <img src={chevron} alt="" width={13} height={13} />
          </button>
        </NoticeCard>
      )}

      {occasion !== 'hidden' && (
        <OccasionNotice
          status={occasion}
          nodeId={nodeIds.occasion}
          onDetails={() => navigate(paths.noticeDetails)}
          onConfirm={() => resolve('confirmed')}
          onReject={() => resolve('rejected')}
          onAskLocal={() => setDialog('ask')}
        />
      )}

      <SectionHeading icon={lock} title="Your data" aside="On this phone only" nodeId={nodeIds.yourData} />
      <button type="button" className={styles.deleteAll} onClick={() => setDialog('delete')} data-node-id={nodeIds.deleteAll}>
        <img src={trash} alt="" width={15} height={15} />
        Delete all my data
      </button>

      {dialog === 'change' && (
        <Dialog title="A local updated “chope”" onClose={() => setDialog(null)}>
          <p>
            <strong>Before:</strong> to reserve a seat by leaving tissues on it.
          </p>
          <p>
            <strong>Added by a local:</strong> it also means saving a spot in a queue.
          </p>
          <div className="dialog-row">
            <button type="button" className="dialog-primary" onClick={() => setDialog(null)}>
              Got it
            </button>
          </div>
        </Dialog>
      )}

      {dialog === 'delete' && (
        <Dialog title="Delete your data?" onClose={() => setDialog(null)}>
          <p>Delete your profile, settings, questions, lookups and learning progress from this device?</p>
          <div className="dialog-row">
            <button type="button" className="dialog-secondary" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button type="button" className="dialog-primary" onClick={deleteEverything}>
              Delete all my data
            </button>
          </div>
        </Dialog>
      )}

      {dialog === 'ask' && <AskLocalDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
