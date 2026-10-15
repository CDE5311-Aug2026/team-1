import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { staticCopy } from '../../data/expressions';
import { undoToast, useToastState } from '../../hooks/useToast';
import HomeIndicator from '../HomeIndicator/HomeIndicator';
import StatusBar from '../StatusBar/StatusBar';
import TabBar from '../TabBar/TabBar';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
  background?: string;
  /** full: status bar + tab bar; status: status bar only (e.g. a keyboard screen); none: neither. */
  chrome?: 'full' | 'status' | 'none';
  tabBarNodeId?: string;
  /** Figma node id of the frame's home indicator. Only frames that draw one (Home 1:2) pass it. */
  homeIndicatorNodeId?: string;
}

function activeTab(pathname: string): string {
  const match = staticCopy.tabs.find(
    (tab) => tab.path !== '/' && (pathname === tab.path || pathname.startsWith(`${tab.path}/`)),
  );
  return match?.path ?? '/';
}

export default function AppShell({
  children,
  background = 'var(--bg-app)',
  chrome = 'full',
  tabBarNodeId,
  homeIndicatorNodeId,
}: AppShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showChrome = chrome === 'full';
  const toast = useToastState();
  // Each page mounts its own shell. Screen readers ignore text already present when a live region
  // mounts, so the region starts empty and fills a tick later (announces toasts raised just
  // before navigating, e.g. "Question withdrawn").
  const [regionReady, setRegionReady] = useState(false);
  useEffect(() => setRegionReady(true), []);
  const visibleToast = regionReady ? toast : null;

  return (
    <div className={styles.shell} style={{ background }}>
      {chrome !== 'none' && <StatusBar />}
      <main className={styles.page} tabIndex={-1}>{children}</main>
      {showChrome && (
        <div className={styles.tabBarWrap}>
          <TabBar active={activeTab(pathname)} onNavigate={navigate} nodeId={tabBarNodeId} />
        </div>
      )}
      {homeIndicatorNodeId && <HomeIndicator nodeId={homeIndicatorNodeId} />}
      <div className={visibleToast ? styles.toast : styles.toastIdle}>
        {/* The live region stays mounted so screen readers announce each new message. */}
        <span role="status" aria-live="polite">
          {visibleToast?.message}
        </span>
        {visibleToast?.undo && (
          <button type="button" className={styles.undo} onClick={undoToast}>
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
