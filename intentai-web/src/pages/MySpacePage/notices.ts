import { useNavigate } from 'react-router-dom';
import type { NoticeStatus } from '../../data/domain';
import { noticesStore } from '../../data/stores';
import { paths } from '../../routes';

/** How the AI occasion notice shows: hidden while "Flag occasions" is off. */
export type OccasionState = NoticeStatus | 'hidden';
export type Outcome = Exclude<NoticeStatus, 'pending'>;

/** The segment badge counts notices still waiting for the user: the local fix and a pending AI notice. */
export function noticeCount(dismissed: boolean, occasion: OccasionState): number {
  return (dismissed ? 0 : 1) + (occasion === 'pending' ? 1 : 0);
}

/** Confirm / Not right: store the outcome and open its result screen (Figma 14:730 / 14:850). */
export function useResolveNotice() {
  const navigate = useNavigate();
  return (outcome: Outcome) => {
    noticesStore.set((previous) => ({ ...previous, status: outcome }));
    navigate(outcome === 'confirmed' ? paths.noticeConfirmed : paths.noticeRejected);
  };
}
