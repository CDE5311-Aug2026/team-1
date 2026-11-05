// The app's four tabs: a dark wooden bar along the bottom of the screen, one tap from anywhere. A page that fills the
// screen drops it through AppShell's chrome (an open place, Nearby, a Hunt stop on a phone). A brass inlay and brighter
// ink mark the tab you are on.
import { staticCopy } from '../../data/expressions';
import styles from './TabBar.module.css';

interface TabBarProps {
  active: string;
  onNavigate: (path: string) => void;
  nodeId?: string;
  /** The active tab pops in (Home only). */
  pop?: boolean;
}

/** Solid marks: they stay legible at this size on the dark wood. */
const ICONS: Record<string, string> = {
  Home: 'M12 3.2 2.8 11.4a.8.8 0 0 0 .53 1.4H5.5V20a1 1 0 0 0 1 1h3.7v-5.6a1.8 1.8 0 0 1 3.6 0V21h3.7a1 1 0 0 0 1-1v-7.2h2.17a.8.8 0 0 0 .53-1.4Z',
  Moments:
    'M5 7.5h10.5a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.500a2 2 0 0 1 2-2Zm.4 11.100h9.700l-2.500-4.300-2 2.300-1.700-1.700ZM8 3.900l10.700-1.500a2 2 0 0 1 2.260 1.700l1.300 9.300a2 2 0 0 1-1.700 2.260l-1.260.17V9.500a3 3 0 0 0-3-3H7.600l-.26-1.340A1.100 1.100 0 0 1 8 3.900Z',
  Hunt: 'M12 2.500a9.500 9.500 0 1 0 0 19 9.500 9.500 0 0 0 0-19Zm4.700 4.800-2.800 6.600-6.600 2.800 2.800-6.600Z',
  Passport:
    'M6.500 2.500h11a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2ZM12 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2.100a1.900 1.900 0 1 1 0 3.800 1.900 1.900 0 0 1 0-3.800ZM8.500 16.500v1.700h7v-1.700Z',
};

export default function TabBar({ active, onNavigate, nodeId, pop = false }: TabBarProps) {
  const tabs = staticCopy.tabs;
  const at = Math.max(
    0,
    tabs.findIndex((t) => t.path === active),
  );

  return (
    <nav className={styles.wrap} aria-label="Primary" data-node-id={nodeId}>
      <div className={styles.bar}>
        {tabs.map((tab, i) => {
          const isActive = i === at;
          return (
            <button
              key={tab.path}
              type="button"
              className={isActive ? `${styles.tab} ${styles.active}${pop ? ' a-pill' : ''}` : styles.tab}
              onClick={() => onNavigate(tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <svg className={styles.icon} viewBox="0 0 24 24" fillRule="evenodd" aria-hidden="true">
                <path d={ICONS[tab.label]} />
              </svg>
              <span className={styles.label}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
