import type { ReactNode } from 'react';
import HomeLink from '../../../components/HomeLink/HomeLink';
import AppShell from '../../../components/AppShell/AppShell';
import styles from './MySpaceLayout.module.css';

interface MySpaceLayoutProps {
  children: ReactNode;
  /** Figma node id of the frame's tab bar; omit for the edit frame, which shows the keyboard instead. */
  tabBarNodeId?: string;
}

/** Shared My Space chrome (Figma 12:40 → 14:850): white frame, 58px mascot and the "My Space" title. */
export default function MySpaceLayout({ children, tabBarNodeId }: MySpaceLayoutProps) {
  const withTabBar = tabBarNodeId !== undefined;
  return (
    <AppShell background="var(--bg-screen-b)" chrome={withTabBar ? 'full' : 'status'} tabBarNodeId={tabBarNodeId}>
      <div className={withTabBar ? `${styles.screen} ${styles.withTabBar}` : styles.screen}>
        <header className={styles.header}>
          <HomeLink className={styles.logo} />
          <h1 className={styles.title}>My Space</h1>
        </header>
        {children}
      </div>
    </AppShell>
  );
}
