// Nearby 3D view: the EARTH ONLINE Singapore model around one point, in an iframe.
// The 3D page is the phone-friendly build (public/earth-online/sg/lite.html): it loads only the area around the point,
// and keeps only the time bar (time of day, weather, sound) and the landmark cards. The iframe is created when this
// component mounts (the user asked for 3D) and removed when it unmounts, which frees its memory.
import { useEffect, useRef, useState } from 'react';
import { earthOnline3dOrigin, view3dUrl, type View3DTarget } from '../links';
import type { Category } from '../types';
import { ICON_PATHS } from './icons';
import styles from './View3D.module.css';

/** Bundled 3D page + its Singapore data, rounded up (first load; the browser caches it after that). */
export const VIEW3D_DOWNLOAD_MB = 19;
const SLOW_MS = 45_000;

export interface View3DProps {
  target: View3DTarget;
  /** The iframe's accessible name, e.g. "3D view around Merlion Park". */
  title: string;
  height?: number;
  /** A landmark card opened (key from the EARTH ONLINE dataset) or closed (null) inside the 3D view. */
  onCard?: (key: string | null, title: string | null) => void;
  /** The page shows the tapped place itself: the 3D page's own card sheet stays hidden. */
  hideCards?: boolean;
  /** Fill the parent box with no frame, hint or full-screen button (Explore's full-screen map). */
  bleed?: boolean;
  /** Your position (only when you asked for it): a blue dot in the 3D view. Sent by message, never in the address. */
  you?: { lat: number; lng: number; accuracyM?: number } | null;
  /** Changes when the view should go to the target again, even the same one ("My location" after panning away). */
  flyId?: number;
  /** The places to pin in 3D: the same list the 2D map shows. A tap on one calls onPick. */
  pins?: View3DPin[];
  selectedKey?: string | null;
  onPick?: (key: string) => void;
}

export interface View3DPin {
  key: string;
  location: { lat: number; lng: number };
  category: Category;
  visited?: boolean;
}

/** The 2D map's pin look (ring colour and icon) for the 3D pins. */
const PIN_STYLES: Record<Category, { color: string; d: string }> = {
  landmark: { color: '#6b5bd6', d: ICON_PATHS.landmark },
  food: { color: '#e4671f', d: ICON_PATHS.food },
  nature: { color: '#2f8a4b', d: ICON_PATHS.nature },
  culture: { color: '#c2408d', d: ICON_PATHS.culture },
};

type LiteMessage =
  | { source: 'earth-online-lite'; type: 'ready' }
  | { source: 'earth-online-lite'; type: 'card'; key: string | null; title?: string | null }
  | { source: 'earth-online-lite'; type: 'pick'; key: string };

function isLiteMessage(d: unknown): d is LiteMessage {
  if (!d || typeof d !== 'object') return false;
  const m = d as Record<string, unknown>;
  return (
    m.source === 'earth-online-lite' &&
    (m.type === 'ready' || (m.type === 'card' && (m.key === null || typeof m.key === 'string')) || (m.type === 'pick' && typeof m.key === 'string'))
  );
}

const keyOf = (t: View3DTarget) => `${t.card ?? ''}@${t.at.lat.toFixed(5)},${t.at.lng.toFixed(5)}:${t.pin ?? ''}`;

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export default function View3D({ target, title, height = 360, onCard, bleed = false, hideCards = false, you = null, flyId = 0, pins, selectedKey = null, onPick }: View3DProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const closeFull = useRef<HTMLButtonElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  // The address is fixed when the view opens; later targets go to the page as messages (no reload nearby).
  // The 3D page speaks the app's language (English unless the page is marked Chinese).
  const [src] = useState(() =>
    view3dUrl(target, { still: reducedMotion(), hideCards, lang: /^zh/i.test(document.documentElement.lang) ? 'zh' : 'en' }),
  );
  // The landmark whose card the 3D page has open: a target with that card needs no message (no second flight).
  const openCard = useRef<string | null>(null);
  const shown = useRef(keyOf(target));
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const onCardRef = useRef(onCard);
  onCardRef.current = onCard;
  const youRef = useRef(you);
  youRef.current = you;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const pinsRef = useRef({ pins, selectedKey });
  const pinsKeyRef = useRef('');
  pinsRef.current = { pins, selectedKey };
  // what this page was last sent (a reloaded page has none)
  const pinsSent = useRef<string | null>(null);
  const postPins = (key: string) => {
    const { pins: list, selectedKey: sel } = pinsRef.current;
    if (!list || pinsSent.current === key) return;
    pinsSent.current = key;
    frame.current?.contentWindow?.postMessage(
      {
        source: 'intentai',
        type: 'pins',
        pins: list.slice(0, 400).map((p) => ({ key: p.key, at: [p.location.lat, p.location.lng], cat: p.category, visited: !!p.visited })),
        styles: PIN_STYLES,
        selected: sel,
      },
      earthOnline3dOrigin(),
    );
  };
  // a dot was sent to this page (so "no position" has something to remove)
  const youSent = useRef<string | null>(null);
  const postYou = () => {
    const y = youRef.current;
    const k = y ? `${y.lat},${y.lng},${y.accuracyM ?? ''}` : null;
    if (k === youSent.current) return; // nothing new (and no dot to remove)
    youSent.current = k;
    frame.current?.contentWindow?.postMessage(
      { source: 'intentai', type: 'you', at: y ? [y.lat, y.lng] : null, acc: y?.accuracyM },
      earthOnline3dOrigin(),
    );
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow || !isLiteMessage(e.data)) return;
      // the 3D page reloads around a far point and comes back with a new 'ready': your dot goes again each time
      if (e.data.type === 'ready') {
        setReady(true);
        youSent.current = null; // a (re)loaded page has no dot yet
        postYou();
        pinsSent.current = null;
        postPins(pinsKeyRef.current);
      } else if (e.data.type === 'pick') {
        onPickRef.current?.(e.data.key);
      }
      if (e.data.type === 'card') {
        openCard.current = e.data.key;
        onCardRef.current?.(e.data.key, typeof e.data.title === 'string' ? e.data.title : null);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  // The pins follow the page's list and selection.
  const pinsKey = pins ? `${selectedKey ?? ''}|${pins.map((p) => `${p.key}${p.visited ? '+' : ''}`).join(',')}` : '';
  pinsKeyRef.current = pinsKey;
  useEffect(() => {
    if (ready) postPins(pinsKey);
    // pins are read through pinsKey
  }, [ready, pinsKey]);

  // Your dot moves (or goes) with the position.
  const youKey = you ? `${you.lat.toFixed(5)},${you.lng.toFixed(5)}:${Math.round(you.accuracyM ?? 0)}` : '';
  useEffect(() => {
    if (ready) postYou();
    // you is read through youKey
  }, [ready, youKey]);

  // A new place while the view is open: the 3D page moves its camera there (or reloads around a far point).
  const targetKey = keyOf(target);
  const flown = useRef(flyId);
  const lastShow = useRef(-Infinity);
  useEffect(() => {
    // "again" right after a move to a new target is the same request: one flight, not two
    const again = flyId !== flown.current && performance.now() - lastShow.current > 800;
    flown.current = flyId;
    if (!ready || (targetKey === shown.current && !again)) return;
    shown.current = targetKey;
    lastShow.current = performance.now();
    if (target.card && target.card === openCard.current) return;
    frame.current?.contentWindow?.postMessage(
      { source: 'intentai', type: 'show', at: [target.at.lat, target.at.lng], card: target.card, pin: target.pin ?? !target.card },
      earthOnline3dOrigin(),
    );
    // target is read through targetKey
  }, [ready, targetKey, flyId]);

  // Full screen: fixed over the app (iframes cannot use the Fullscreen API on iPhone). Esc or the button leaves it.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeFull.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      expandButton.current?.focus();
    };
  }, [expanded]);

  const loading = !ready && (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span>
        {slow ? 'Still loading. The 3D view needs WebGL and a steady connection.' : `Loading 3D… The first time downloads up to ${VIEW3D_DOWNLOAD_MB} MB.`}
      </span>
    </div>
  );

  if (bleed) {
    return (
      <div className={styles.bleed}>
        <iframe ref={frame} className={styles.frame} src={src} title={title} allow="autoplay" />
        {loading}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={expanded ? `${styles.stage} ${styles.full}` : styles.stage} style={expanded ? undefined : { height }}>
        <iframe ref={frame} className={styles.frame} src={src} title={title} allow="autoplay" />
        {loading}
        {expanded && (
          <button ref={closeFull} type="button" className={styles.exitFull} onClick={() => setExpanded(false)}>
            ✕ Exit full screen
          </button>
        )}
      </div>
      <div className={styles.bar}>
        <p className={styles.hint}>Drag to look around.</p>
        <button ref={expandButton} type="button" className={styles.expand} onClick={() => setExpanded(true)} aria-label="Show the 3D view full screen">
          ⤢ Full screen
        </button>
      </div>
    </div>
  );
}
