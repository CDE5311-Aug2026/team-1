// The app's four tabs as a hand scroll: two rollers tied together in the bottom-right corner (under the thumb), a wax
// seal on the ribbon showing the tab you are on, so pages keep the whole width (Home sets its deck beside it). Tap it
// and the left roller rolls out across the bottom while the right one stays put; both turn and thin as the paper comes
// off them: four icons, one word each. Pick one (or tap a roller, outside, or press Escape) and it rolls back up.
// While it is open the page is told (html[data-guide-open] and a 'guide' event), so what lies under it can make way.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { staticCopy } from '../../data/expressions';
import useTestVersion from '../../hooks/useTestVersion';
import { paths } from '../../routes';
import styles from './TabBar.module.css';

interface TabBarProps {
  active: string;
  onNavigate: (path: string) => void;
  nodeId?: string;
  /** The active tab pops in (Home only). */
  pop?: boolean;
}

/** Engraved stops for the map (line drawings in the ink's colour). */
function GuideIcon({ label }: { label: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg viewBox="0 0 32 32" {...p}>
      {label === 'Home' && (
        <>
          <path d="M5 15 L16 6 L27 15" />
          <path d="M8 13 V26 H24 V13" />
          <path d="M13 26 V19 a3 3 0 0 1 6 0 V26" />
          <path d="M10 16 h3 v3 h-3 Z M19 16 h3 v3 h-3 Z" />
          <path d="M21 9 V6 h2.5 v5" />
          <path d="M4 26 H28" />
        </>
      )}
      {label === 'Moments' && (
        <>
          <path d="M7 9 L22 6.5 L25 23 L10 25.5 Z" opacity=".55" />
          <path d="M5 11 H21 V27 H5 Z" />
          <path d="M7.5 13.5 H18.5 V22 H7.5 Z" />
          <path d="M7.5 22 L11.5 17.5 L14 20 L16 18 L18.5 22" />
          <circle cx="16" cy="15.8" r="1" />
        </>
      )}
      {label === 'Hunt' && (
        <>
          <circle cx="16" cy="17" r="10" />
          <circle cx="16" cy="17" r="7.6" opacity=".5" />
          <path d="M14 5 h4 M16 5 V7" />
          <path d="M19.5 12.5 L17.2 18.2 L12.5 21.5 L14.8 15.8 Z" />
          <circle cx="16" cy="17" r="0.8" />
        </>
      )}
      {label === 'Passport' && (
        <>
          <path d="M8 5 H22 a2 2 0 0 1 2 2 V25 a2 2 0 0 1 -2 2 H8 Z" />
          <path d="M8 5 V27" strokeWidth="2" />
          <circle cx="16" cy="13" r="4.2" />
          <path d="M11.8 13 H20.2 M16 8.8 c-2 2.4 -2 6 0 8.4 c2 -2.4 2 -6 0 -8.4" opacity=".7" />
          <path d="M12 21 H20 M13 23.5 H19" />
        </>
      )}
    </svg>
  );
}

/** React 18 has no `inert` prop. */
const inert = (on: boolean) => (on ? ({ inert: '' } as Record<string, string>) : {});

export default function TabBar({ active, onNavigate, nodeId, pop = false }: TabBarProps) {
  // Version A of the user test has no Hunt.
  const version = useTestVersion();
  const tabs = version === 'A' ? staticCopy.tabs.filter((t) => t.path !== paths.hunt) : staticCopy.tabs;
  const at = Math.max(
    0,
    tabs.findIndex((t) => t.path === active),
  );
  const current = tabs[at];
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const roll = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-guide-open', open);
    window.dispatchEvent(new CustomEvent('guide', { detail: open }));
    return () => document.documentElement.removeAttribute('data-guide-open');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        roll.current?.focus();
      }
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <nav ref={nav} className={`${styles.guide} ${open ? styles.open : ''}`} aria-label="Primary" data-node-id={nodeId}>
      <div className={styles.sheet} id="field-guide" {...inert(!open)}>
        <div className={styles.stops}>
          {tabs.map((tab, i) => {
            const isActive = i === at;
            return (
              <button
                key={tab.path}
                type="button"
                className={isActive ? `${styles.stop} ${styles.active}${pop ? ' a-pill' : ''}` : styles.stop}
                onClick={() => {
                  setOpen(false);
                  onNavigate(tab.path);
                }}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                style={{ '--i': i } as CSSProperties}
              >
                <span className={styles.icon} aria-hidden="true">
                  <GuideIcon label={tab.label} />
                </span>
                <span className={styles.label}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* the left roller: it travels out to the left as the paper unrolls (a tap on it toggles too) */}
      <span className={`${styles.roller} ${styles.rollerL}`} onClick={() => setOpen(!open)} aria-hidden="true">
        <span className={styles.core} />
        <span className={styles.paper} />
        <span className={styles.curl} />
      </span>
      {/* the right roller stays in the corner, under the thumb: the guide's one button */}
      <button
        ref={roll}
        type="button"
        className={`${styles.roller} ${styles.rollerR}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="field-guide"
        aria-label={open ? 'Roll up the tabs' : `Tabs: on ${current.label}. Unroll to switch`}
      >
        <span className={styles.core} aria-hidden="true" />
        <span className={styles.paper} aria-hidden="true" />
        <span className={styles.curl} aria-hidden="true" />
        {/* rolled up, a ribbon ties the two rollers and its wax seal shows the tab you are on */}
        <span className={styles.ribbon} aria-hidden="true" />
        <span className={styles.seal} aria-hidden="true">
          <GuideIcon label={current.label} />
        </span>
      </button>
    </nav>
  );
}
