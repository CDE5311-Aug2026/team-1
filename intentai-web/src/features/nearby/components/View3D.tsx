// Nearby 3D view: the EARTH ONLINE Singapore model around one point, in an iframe.
// The 3D page is the phone-friendly build (public/earth-online/sg/lite.html): it loads only the area around the point,
// and keeps only the time bar (time of day, weather, sound) and the landmark cards. The iframe is created when this
// component mounts (the user asked for 3D) and removed when it unmounts, which frees its memory.
import { useEffect, useRef, useState } from 'react';
import { earthOnline3dOrigin, view3dUrl, type View3DTarget } from '../links';
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
  onCard?: (key: string | null) => void;
  /** Fill the parent box with no frame, hint or full-screen button (Explore's full-screen map). */
  bleed?: boolean;
}

type LiteMessage = { source: 'earth-online-lite'; type: 'ready' } | { source: 'earth-online-lite'; type: 'card'; key: string | null };

function isLiteMessage(d: unknown): d is LiteMessage {
  if (!d || typeof d !== 'object') return false;
  const m = d as Record<string, unknown>;
  return m.source === 'earth-online-lite' && (m.type === 'ready' || (m.type === 'card' && (m.key === null || typeof m.key === 'string')));
}

const keyOf = (t: View3DTarget) => `${t.card ?? ''}@${t.at.lat.toFixed(5)},${t.at.lng.toFixed(5)}:${t.pin ?? ''}`;

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export default function View3D({ target, title, height = 360, onCard, bleed = false }: View3DProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const closeFull = useRef<HTMLButtonElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  // The address is fixed when the view opens; later targets go to the page as messages (no reload nearby).
  const [src] = useState(() => view3dUrl(target, { still: reducedMotion() }));
  const shown = useRef(keyOf(target));
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const onCardRef = useRef(onCard);
  onCardRef.current = onCard;

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow || !isLiteMessage(e.data)) return;
      if (e.data.type === 'ready') setReady(true);
      else onCardRef.current?.(e.data.key);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  // A new place while the view is open: the 3D page moves its camera there (or reloads around a far point).
  const targetKey = keyOf(target);
  useEffect(() => {
    if (!ready || targetKey === shown.current) return;
    shown.current = targetKey;
    frame.current?.contentWindow?.postMessage(
      { source: 'intentai', type: 'show', at: [target.at.lat, target.at.lng], card: target.card, pin: target.pin ?? !target.card },
      earthOnline3dOrigin(),
    );
    // target is read through targetKey
  }, [ready, targetKey]);

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
        <p className={styles.hint}>Drag to look around, pinch to zoom, tap a landmark for its card. Time, weather and sound are in the 3D bar.</p>
        <button ref={expandButton} type="button" className={styles.expand} onClick={() => setExpanded(true)} aria-label="Show the 3D view full screen">
          ⤢ Full screen
        </button>
      </div>
    </div>
  );
}
