// A bottom sheet over Explore's full-screen map (phones), or a floating side panel on wide screens.
// Three heights on phones: peek (a summary over the tab bar), half and full (the list). Drag the handle, or tap it
// (or press Enter) to switch between peek and full.
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import styles from './BottomSheet.module.css';

export type Detent = 'peek' | 'half' | 'full';

/** Peek height from the bottom of the screen: the tab bar zone (~92 px) plus the summary rows. */
export const PEEK_PX = 214;
/** Space kept above a full sheet for the search bar and the category chips. */
export const FULL_TOP_PX = 164;
const TAP_PX = 6;

function viewportHeight() {
  return typeof window === 'undefined' ? 844 : window.innerHeight || 844;
}

export function useWideLayout(): boolean {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return wide;
}

export function detentHeight(d: Detent, vh = viewportHeight()): number {
  if (d === 'peek') return PEEK_PX;
  if (d === 'half') return Math.round(Math.max(PEEK_PX + 80, vh * 0.52));
  return Math.max(PEEK_PX + 120, vh - FULL_TOP_PX);
}

interface BottomSheetProps {
  detent: Detent;
  onDetent: (d: Detent) => void;
  /** Accessible name of the sheet region. */
  label: string;
  /** Always visible (title, counts, links). */
  header: ReactNode;
  children: ReactNode;
  wide: boolean;
}

export default function BottomSheet({ detent, onDetent, label, header, children, wide }: BottomSheetProps) {
  const [vh, setVh] = useState(viewportHeight);
  const [dragH, setDragH] = useState<number | null>(null);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const justDragged = useRef(false);

  useEffect(() => {
    const on = () => setVh(viewportHeight());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Back at peek, the list scrolls to its top so the summary is what shows.
  useEffect(() => {
    if (detent === 'peek' && body.current) body.current.scrollTop = 0;
  }, [detent]);

  const heights: Record<Detent, number> = { peek: detentHeight('peek', vh), half: detentHeight('half', vh), full: detentHeight('full', vh) };

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (wide) return;
    drag.current = { y: e.clientY, h: heights[detent], moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) > TAP_PX) d.moved = true;
    if (d.moved) setDragH(Math.min(heights.full, Math.max(heights.peek - 40, d.h + dy)));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved || dragH === null) {
      setDragH(null);
      return; // a tap: the click handler toggles
    }
    justDragged.current = true;
    const nearest = (Object.keys(heights) as Detent[]).reduce((a, b) => (Math.abs(heights[b] - dragH) < Math.abs(heights[a] - dragH) ? b : a));
    setDragH(null);
    onDetent(nearest);
  };
  const onClick = () => {
    if (wide) return;
    // A drag that ended already chose a height.
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    onDetent(detent === 'peek' ? 'full' : 'peek');
  };

  const height = wide ? undefined : dragH ?? heights[detent];
  return (
    <section
      className={wide ? `${styles.sheet} ${styles.side}` : styles.sheet}
      style={height !== undefined ? { height } : undefined}
      aria-label={label}
      data-allow-bleed
      data-detent={wide ? 'side' : detent}
      data-dragging={dragH !== null || undefined}
    >
      {!wide && (
        <button
          type="button"
          className={styles.handle}
          aria-label={detent === 'full' ? 'Show the map' : 'Show the list'}
          aria-expanded={detent !== 'peek'}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={onClick}
        >
          <span className={styles.grip} aria-hidden="true" />
        </button>
      )}
      <div className={styles.header}>{header}</div>
      <div ref={body} className={styles.body} data-scroll={wide || detent !== 'peek' || undefined}>
        {children}
      </div>
    </section>
  );
}
