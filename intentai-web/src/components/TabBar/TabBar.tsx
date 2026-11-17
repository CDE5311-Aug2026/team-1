// v2 (Redesign · Tourism 2040): a floating frosted pill with Home · Hunt · Passport, and a round Search button beside it.
// A page that fills the screen drops it through AppShell's chrome (an open place, Nearby, a Hunt stop on a phone).
import { paths } from '../../routes';
import { staticCopy } from '../../data/expressions';
import styles from './TabBar.module.css';

interface TabBarProps {
  active: string;
  onNavigate: (path: string) => void;
  nodeId?: string;
  /** The active tab pops in (Home only). */
  pop?: boolean;
}

/** Stroke marks from the v2 wireframes (24 × 24). The active tab fills its mark. */
function TabIcon({ label, active }: { label: string; active: boolean }) {
  const cut = active ? 'var(--v2-surface)' : 'currentColor';
  const common = {
    className: styles.icon,
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (label === 'Home')
    return (
      <svg {...common} fill={active ? 'currentColor' : 'none'}>
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
    );
  if (label === 'Hunt')
    return (
      <svg {...common} fill="none">
        <circle cx="12" cy="12" r="9" fill={active ? 'currentColor' : 'none'} />
        <path d="m15.5 8.5-2 5-5 2 2-5z" stroke={cut} />
      </svg>
    );
  return (
    <svg {...common} fill="none">
      <rect x="5" y="3" width="14" height="18" rx="2" fill={active ? 'currentColor' : 'none'} />
      <circle cx="12" cy="10" r="3" stroke={cut} />
      <path d="M9 16.5h6" stroke={cut} />
    </svg>
  );
}

export default function TabBar({ active, onNavigate, nodeId, pop = false }: TabBarProps) {
  const tabs = staticCopy.tabs;
  const at = tabs.findIndex((t) => t.path === active);
  const searchOn = active === paths.search;

  return (
    <nav className={styles.wrap} aria-label="Primary" data-node-id={nodeId}>
      <div className={styles.row}>
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
                <TabIcon label={tab.label} active={isActive} />
                <span className={styles.label}>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={searchOn ? `${styles.search} ${styles.searchOn}` : styles.search}
          onClick={() => onNavigate(paths.search)}
          aria-label="Search"
          aria-current={searchOn ? 'page' : undefined}
        >
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4.5 4.5" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
