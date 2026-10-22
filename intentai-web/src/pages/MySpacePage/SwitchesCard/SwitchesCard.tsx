import flag from '../../../assets/my-space/switch-flag.svg';
import local from '../../../assets/my-space/switch-local.svg';
import mic from '../../../assets/my-space/switch-mic.svg';
import shield from '../../../assets/my-space/switch-shield.svg';
import Toggle from '../../../components/Toggle/Toggle';
import type { SettingKey } from '../../../data/domain';
import { usePersistentStore } from '../../../data/persistentStore';
import { settingsStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import styles from './SwitchesCard.module.css';

const SWITCHES: { key: SettingKey; label: string; hint: string; icon: string; nodeId: string }[] = [
  { key: 'occasions', label: 'Flag occasions', hint: 'Reads calendar titles only', icon: flag, nodeId: '21:1396' },
  { key: 'local', label: 'Answer as a local', hint: 'Confirm entries for others', icon: local, nodeId: '21:1403' },
  { key: 'rehearse', label: 'Rehearse with AI', hint: 'Practice chats, never saved', icon: mic, nodeId: '21:1410' },
  { key: 'judgement', label: 'No-judgement mode', hint: 'Sources only, no advice', icon: shield, nodeId: '21:1417' },
];

/** "Card / Switches" (21:1384). Figma notes: every switch starts off. v2 drops "Daily card" (21:1389): Moments always shows today's three. */
export default function SwitchesCard({ nodeId }: { nodeId: string }) {
  const [settings, setSettings] = usePersistentStore(settingsStore);

  const change = (key: SettingKey, on: boolean) => {
    setSettings((previous) => ({ ...previous, [key]: on }));
    // Figma notes: "Flag occasions" is what creates the AI notice.
    if (key === 'occasions' && on) showToast('Thursday dinner notice added to Notices');
  };

  return (
    <div className={styles.card} data-node-id={nodeId}>
      {SWITCHES.map((item) => (
        <div key={item.key} className={styles.row}>
          <img src={item.icon} alt="" width={18} height={18} />
          <div className={styles.text}>
            <p className={styles.label}>{item.label}</p>
            <p className={styles.hint}>{item.hint}</p>
          </div>
          <Toggle label={item.label} checked={settings[item.key]} onChange={(on) => change(item.key, on)} nodeId={item.nodeId} />
        </div>
      ))}
    </div>
  );
}
