import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import HomeLink from '../../components/HomeLink/HomeLink';
import AppShell from '../../components/AppShell/AppShell';
import Toggle from '../../components/Toggle/Toggle';
import { usePersistentStore } from '../../data/persistentStore';
import { settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import styles from './CommunityLayout.module.css';

/** Figma node ids differ per frame (3:728 list, 7:1119 detail); the layout is the same. */
interface NodeIds {
  tabBar: string;
  segment: string;
  switch: string;
}

interface CommunityLayoutProps {
  nodeIds: NodeIds;
  /** True on the list, where "My questions" is the current page. */
  onList: boolean;
  children: ReactNode;
}

/** Shared Community chrome: logo + title header and the "My questions / Answer as a local" segment. */
export default function CommunityLayout({ nodeIds, onList, children }: CommunityLayoutProps) {
  const [settings, setSettings] = usePersistentStore(settingsStore);

  return (
    <AppShell background="var(--bg-screen-b)" tabBarNodeId={nodeIds.tabBar}>
      <div className={styles.screen}>
        <header className={styles.header}>
          <HomeLink className={styles.logo} />
          <h1 className={styles.title}>Community</h1>
        </header>
        <div className={styles.body}>
          <div className={styles.segment} data-node-id={nodeIds.segment}>
            <Link to={paths.community} className={styles.segActive} aria-current={onList ? 'page' : undefined}>
              My questions
            </Link>
            <div className={styles.segSwitch}>
              <span className={styles.segLabel} aria-hidden="true">
                Answer as a local
              </span>
              <Toggle
                label="Answer as a local"
                checked={settings.local}
                nodeId={nodeIds.switch}
                onChange={(local) => setSettings((prev) => ({ ...prev, local }))}
              />
            </div>
          </div>
          {children}
        </div>
      </div>
    </AppShell>
  );
}
