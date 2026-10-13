import check from '../../../assets/my-space/chip-check.svg';
import x from '../../../assets/my-space/chip-x.svg';
import chat from '../../../assets/my-space/link-chat.svg';
import chevron from '../../../assets/my-space/link-chevron.svg';
import type { NoticeStatus } from '../../../data/domain';
import NoticeCard from '../NoticeCard/NoticeCard';
import cardStyles from '../NoticeCard/NoticeCard.module.css';

interface OccasionNoticeProps {
  status: NoticeStatus;
  nodeId: string;
  onDetails: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onAskLocal: () => void;
}

/** The AI occasion notice: pending (21:1440), confirmed (21:1487) or not right (21:1528). */
export default function OccasionNotice({ status, nodeId, onDetails, onConfirm, onReject, onAskLocal }: OccasionNoticeProps) {
  if (status === 'confirmed') {
    return (
      <NoticeCard chip="Confirmed" tone="green" time="Now" title="Seating phrases added for Thursday" border="confirmed" nodeId={nodeId} />
    );
  }

  if (status === 'rejected') {
    return (
      <NoticeCard chip="Not right" tone="red" time="Now" title="We won’t flag events like this" border="rejected" nodeId={nodeId}>
        <button type="button" className={`${cardStyles.link} ${cardStyles.linkGap}`} onClick={onAskLocal}>
          <img src={chat} alt="" width={14} height={14} />
          Ask a local instead
        </button>
      </NoticeCard>
    );
  }

  return (
    <NoticeCard
      chip="AI · Medium confidence"
      tone="amber"
      time="Today"
      title="Thursday dinner may need seating tips"
      description="Based on your calendar title."
      nodeId={nodeId}
    >
      <div className={cardStyles.actions}>
        <button type="button" className={cardStyles.link} onClick={onDetails}>
          Details
          <img src={chevron} alt="" width={13} height={13} />
        </button>
        <button type="button" className={`${cardStyles.pill} ${cardStyles.notRight}`} onClick={onReject}>
          <img src={x} alt="" width={13} height={13} />
          Not right
        </button>
        <button type="button" className={`${cardStyles.pill} ${cardStyles.confirm}`} onClick={onConfirm}>
          <img src={check} alt="" width={13} height={13} />
          Confirm
        </button>
      </div>
    </NoticeCard>
  );
}
