import { staticCopy } from '../../data/expressions';
import homeIcon from '../../assets/v3/nav/home.svg';
import askIcon from '../../assets/v3/nav/ask-inactive.svg';
import askActive from '../../assets/v3/nav/ask.svg';
import communityIcon from '../../assets/v3/nav/community.svg';
import communityActive from '../../assets/v3/nav/community-active.svg';
import momentsIcon from '../../assets/v3/nav/moments.svg';
import momentsActive from '../../assets/v3/nav/moments-active.svg';
import profileIcon from '../../assets/v3/nav/profile.svg';
import styles from './TabBar.module.css';

/** Intent v3 / ZIP prototype navigation icons: outline, and filled where the design has an active form. */
const ICONS: Record<string, { idle: string; active: string }> = {
  'tab-today': { idle: homeIcon, active: homeIcon },
  'tab-ask': { idle: askIcon, active: askActive },
  'tab-community': { idle: communityIcon, active: communityActive },
  'tab-moments': { idle: momentsIcon, active: momentsActive },
  'tab-my-space': { idle: profileIcon, active: profileIcon },
};

interface TabBarProps {
  active: string;
  onNavigate: (path: string) => void;
  nodeId?: string;
}

export default function TabBar({ active, onNavigate, nodeId }: TabBarProps) {
  return (
    <nav className={styles.bar} aria-label="Primary" data-node-id={nodeId}>
      {staticCopy.tabs.map((tab) => {
        const isActive = tab.path === active;
        const icon = ICONS[tab.icon][isActive ? 'active' : 'idle'];
        return (
          <button
            key={tab.path}
            type="button"
            className={isActive ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => onNavigate(tab.path)}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Masked so the glyph takes the tab's text colour: only the active tab is orange. */}
            <span
              className={styles.icon}
              aria-hidden="true"
              // Quoted: in production Vite inlines small SVGs as data: URIs containing quotes.
              style={{ maskImage: `url("${icon}")`, WebkitMaskImage: `url("${icon}")` }}
            />
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
