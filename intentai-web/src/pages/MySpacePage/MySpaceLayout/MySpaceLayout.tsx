import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeLink from '../../../components/HomeLink/HomeLink';
import AppShell from '../../../components/AppShell/AppShell';
import { paths } from '../../../routes';
import { ChevronLeft } from '../icons';
import styles from './MySpaceLayout.module.css';

interface MySpaceLayoutProps {
  children: ReactNode;
  /** Figma node id of the frame's tab bar; omit for the edit frame, which shows the keyboard instead. */
  tabBarNodeId?: string;
  /** Shown at the right end of the header (My Space: the Settings gear). */
  headerAction?: ReactNode;
  /** Sub-pages (Settings, Privacy, Licences): back button to My Space and their own h1 under the header. */
  subPage?: { title: string };
}

/** Shared My Space chrome: mascot and the "My Space" title, or a back button and the sub-page title. */
export default function MySpaceLayout({ children, tabBarNodeId, headerAction, subPage }: MySpaceLayoutProps) {
  const navigate = useNavigate();
  const withTabBar = tabBarNodeId !== undefined;
  return (
    <AppShell background="var(--bg-screen-b)" chrome={withTabBar ? 'full' : 'status'} tabBarNodeId={tabBarNodeId}>
      <div className={withTabBar ? `${styles.screen} ${styles.withTabBar}` : styles.screen}>
        <header className={styles.header}>
          {subPage && (
            <button type="button" className={styles.back} aria-label="Back to My Space" onClick={() => navigate(paths.mySpace)}>
              <ChevronLeft />
            </button>
          )}
          <HomeLink className={styles.logo} />
          {!subPage && <h1 className={styles.title}>My Space</h1>}
          {headerAction && <span className={styles.action}>{headerAction}</span>}
        </header>
        {subPage && <h1 className={styles.pageTitle}>{subPage.title}</h1>}
        {children}
      </div>
    </AppShell>
  );
}
