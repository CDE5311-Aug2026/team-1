import { staticCopy } from '../../data/expressions';
import { iconSrc } from '../Icon/Icon';
import styles from './TabBar.module.css';

interface TabBarProps {
  active: string;
  onNavigate: (path: string) => void;
  nodeId?: string;
  /** The active tab pops in (Home only). */
  pop?: boolean;
}

export default function TabBar({ active, onNavigate, nodeId, pop = false }: TabBarProps) {
  return (
    <nav className={styles.bar} aria-label="Primary" data-node-id={nodeId}>
      {staticCopy.tabs.map((tab) => {
        const isActive = tab.path === active;
        return (
          <button
            key={tab.path}
            type="button"
            className={isActive ? `${styles.tab} ${styles.active}${pop ? ' a-pill' : ''}` : styles.tab}
            onClick={() => onNavigate(tab.path)}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Masked so the glyph takes the tab's text colour: only the active tab is orange (Figma). */}
            <span
              className={styles.icon}
              aria-hidden="true"
              // Quoted: in production Vite inlines small SVGs as data: URIs containing quotes.
              style={{ maskImage: `url("${iconSrc(tab.icon)}")`, WebkitMaskImage: `url("${iconSrc(tab.icon)}")` }}
            />
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
