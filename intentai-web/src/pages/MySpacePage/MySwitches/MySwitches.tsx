import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Toggle from '../../../components/Toggle/Toggle';
import { usePersistentStore } from '../../../data/persistentStore';
import { settingsStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import { paths } from '../../../routes';
import { Arrow, Calendar, LocalPin } from '../icons';
import styles from './MySwitches.module.css';

interface SwitchRow {
  key: 'occasions' | 'local';
  label: string;
  sub: string;
  icon: ReactNode;
  on: string;
  off: string;
  chip: string;
  to: string;
}

const ROWS: SwitchRow[] = [
  {
    key: 'occasions',
    label: 'Flag occasions',
    sub: 'Reads calendar titles only',
    icon: <Calendar />,
    on: 'Occasions will show on Home',
    off: 'Occasions off',
    chip: 'Occasions show on Home',
    to: paths.today,
  },
  {
    key: 'local',
    label: 'Answer as a local',
    sub: 'Same switch as in Community',
    icon: <LocalPin />,
    on: 'You’ll see visitor questions near your places',
    off: 'Answering as a local is off',
    chip: 'Visitor questions in Community',
    to: paths.community,
  },
];

/** Canvas S1 "Switches": two settings shared with Home and Community, each with a link chip while on. */
export default function MySwitches() {
  const navigate = useNavigate();
  const [settings, setSettings] = usePersistentStore(settingsStore);

  return (
    <ul className={styles.card}>
      {ROWS.map((row) => {
        const on = settings[row.key];
        return (
          <li key={row.key} className={styles.item}>
            <div className={styles.row}>
              <span className={`${styles.chip} ${on ? styles.chipOn : ''}`} aria-hidden="true">
                {row.icon}
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{row.label}</span>
                <span className={styles.sub}>{row.sub}</span>
              </span>
              <Toggle
                label={row.label}
                checked={on}
                onChange={(next) => {
                  setSettings((s) => ({ ...s, [row.key]: next }));
                  showToast(next ? row.on : row.off);
                }}
              />
            </div>
            {on && (
              <button type="button" className={styles.preview} onClick={() => navigate(row.to)}>
                {row.chip}
                <Arrow />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
