import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { staticCopy } from '../../data/expressions';
import { releaseStrayScrollLock } from '../../hooks/scrollLock';
import { undoToast, useToastState } from '../../hooks/useToast';
import HomeIndicator from '../HomeIndicator/HomeIndicator';
import StatusBar from '../StatusBar/StatusBar';
import TabBar from '../TabBar/TabBar';
import { usePaperLayer } from './PaperLayer';
import { paths } from '../../routes';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
  background?: string;
  /** full: status bar + tab bar; status: status bar only (e.g. a keyboard screen); none: neither. */
  chrome?: 'full' | 'status' | 'none';
  tabBarNodeId?: string;
  /** Figma node id of the frame's home indicator. Only frames that draw one (Home 1:2) pass it. */
  homeIndicatorNodeId?: string;
  /** page (default): content scrolls, the tab bar follows it. fill: one screen that does not scroll (a full-screen
   *  map); the page lays out its own layers and the tab bar floats over them. */
  layout?: 'page' | 'fill';
  /** story: place and culture-card pages. No tab bar, no inherited side padding (pages set their own gutters). */
  variant?: 'default' | 'story';
  /** The active tab pops in on arrival (Home). */
  tabPop?: boolean;
  /** The app's chart paper behind the page (PaperLayer). Default: on for every page on the app's own light paper
   *  (onboarding too, owner 8 Nov 2026); off for a page that asks for its own colour (a dark desk, a reader). */
  paper?: boolean;
}

/** The app's own light paper colours: a page asking for one of these gets the chart paper instead. */
const PAPER_COLOURS = new Set(['var(--bg-app)', 'var(--bg-screen-b)']);

function activeTab(pathname: string): string {
  // v2: the journal moved into Passport, so Moments lights Passport; Search is the round button beside the bar.
  if (pathname === paths.moments || pathname.startsWith(`${paths.moments}/`)) return paths.mySpace;
  if (pathname === paths.search) return paths.search;
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
  layout = 'page',
  variant = 'default',
  tabPop = false,
  paper,
}: AppShellProps) {
  const onPaper = paper ?? PAPER_COLOURS.has(background);
  usePaperLayer(onPaper);
  const fill = layout === 'fill';
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const story = variant === 'story';
  const showChrome = chrome === 'full' && !story;
  const toast = useToastState();
  // Each page mounts its own shell. Screen readers ignore text already present when a live region
  // mounts, so the region starts empty and fills a tick later (announces toasts raised just
  // before navigating, e.g. "Question withdrawn").
  const [regionReady, setRegionReady] = useState(false);
  useEffect(() => setRegionReady(true), []);
  // A full-screen layer that closed mid-navigation must not leave the next page unable to scroll.
  useEffect(() => releaseStrayScrollLock(), [pathname]);
  // Safari tints its status bar and toolbar from the page: give it this page's own colour (dark on Hunt and Moments),
  // so no pale band of the default paper shows above or below a dark page.
  const shellRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    // on the chart paper the shell is clear: the canvas takes the paper's colour and the body steps out of the way, so the
    // fixed layer (z-index -1) shows between the canvas and the page
    const bg = onPaper ? getComputedStyle(el).getPropertyValue('--bg-app').trim() || '#eceae5' : getComputedStyle(el).backgroundColor;
    if (!bg) return;
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = onPaper ? 'transparent' : bg;
    document.body.style.backgroundImage = onPaper ? 'none' : '';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  }, [background, onPaper]);
  const visibleToast = regionReady ? toast : null;

  return (
    <div
      ref={shellRef}
      className={`${styles.shell} ${fill ? styles.fill : ''} ${onPaper ? styles.onPaper : ''}`}
      style={onPaper ? undefined : { backgroundColor: background }}
      data-paper={onPaper ? 'chart' : undefined}
    >
      {chrome !== 'none' && (fill ? <div className={styles.fillStatus}><StatusBar /></div> : <StatusBar />)}
      <main
        className={fill ? styles.fillPage : story ? `${styles.page} ${styles.story}` : styles.page}
        data-variant={story ? 'story' : undefined}
        tabIndex={-1}
      >{children}</main>
      {showChrome && (
        <div className={fill ? `${styles.tabBarWrap} ${styles.fillTabBar}` : styles.tabBarWrap}>
          <TabBar active={activeTab(pathname)} onNavigate={navigate} nodeId={tabBarNodeId} pop={tabPop} />
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
