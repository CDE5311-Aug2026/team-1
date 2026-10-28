import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OnbField } from '../../data/domain';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import EditSheet from './EditSheet/EditSheet';
import KnowsGrid from './KnowsGrid/KnowsGrid';
import LinkList from './LinkList/LinkList';
import MySpaceLayout from './MySpaceLayout/MySpaceLayout';
import MySwitches from './MySwitches/MySwitches';
import PassportSummary from './PassportSummary/PassportSummary';
import PrivacyCard from './PrivacyCard/PrivacyCard';
import { EyeClosed, Gear, Help, Redo } from './icons';
import { redoOnboarding } from './redo';
import styles from './MySpacePage.module.css';

export const FEEDBACK_TOAST = 'Feedback is collected in the user test';

/** My Space (canvas S1): passport, what the app knows, switches, privacy summary and links. */
export default function MySpacePage() {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<OnbField | null>(null);

  return (
    <MySpaceLayout
      tabBarNodeId="12:155"
      headerAction={
        <button type="button" className={styles.gear} aria-label="Settings" onClick={() => navigate(paths.mySpaceSettings)}>
          <Gear />
        </button>
      }
    >
      <div className={styles.body}>
        <PassportSummary />
        <div className={styles.headingRow}>
          <h2 className={styles.heading}>What the app knows</h2>
          <span className={styles.legend}>
            <EyeClosed /> Closed eye = private
          </span>
        </div>
        <KnowsGrid onEdit={setEditing} />
        <h2 className={`${styles.heading} ${styles.section}`}>Switches</h2>
        <MySwitches />
        <PrivacyCard />
        <LinkList
          rows={[
            { label: 'Settings', icon: <Gear />, tone: ['#f6f5f2', '#23211d'], onSelect: () => navigate(paths.mySpaceSettings) },
            {
              label: 'Redo onboarding',
              value: '6 questions',
              icon: <Redo />,
              tone: ['#fff3ea', '#a3410b'],
              onSelect: () => {
                redoOnboarding();
                navigate(paths.onboarding);
              },
            },
            { label: 'Help & feedback', icon: <Help />, tone: ['#dce7ff', '#1e3a8a'], onSelect: () => showToast(FEEDBACK_TOAST) },
          ]}
        />
      </div>
      {editing && <EditSheet field={editing} onClose={() => setEditing(null)} />}
    </MySpaceLayout>
  );
}
