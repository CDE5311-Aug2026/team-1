// A bottom sheet over Explore's full-screen map (phones), or a floating side panel on wide screens.
// Three heights on phones: peek (a summary over the tab bar), half and full (the list). Drag the handle or the header
// (or the whole sheet at peek), or tap the handle (or press Enter) to switch between peek and full.
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import styles from './BottomSheet.module.css';

export type Detent = 'peek' | 'half' | 'full';

/** Peek height from the bottom of the screen: the handle, the title and the phrases row. */
export const PEEK_PX = 150;
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
  /** The sheet's height while it is dragged (px from the bottom), then null when it lets go. */
  onHeight?: (h: number | null) => void;
}

export default function BottomSheet({ detent, onDetent, label, header, children, wide, onHeight }: BottomSheetProps) {
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

  // Drag from the handle, the header, or (at peek) anywhere on the sheet, like a maps app. A press only becomes a
  // drag after TAP_PX, so the buttons in the header still take taps; the click that ends a drag is swallowed.
  const onDown = (e: PointerEvent<HTMLElement>) => {
    if (wide || e.button > 0) return;
    drag.current = { y: e.clientY, h: heights[detent], moved: false };
  };
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (!d.moved && Math.abs(dy) > TAP_PX) {
      d.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic pointers in tests cannot be captured */
      }
    }
    if (d.moved) {
      const h = Math.min(heights.full, Math.max(heights.peek - 40, d.h + dy));
      setDragH(h);
      onHeight?.(h);
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved || dragH === null) {
      setDragH(null);
      return; // a tap: the click handler toggles
    }
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    const nearest = (Object.keys(heights) as Detent[]).reduce((a, b) => (Math.abs(heights[b] - dragH) < Math.abs(heights[a] - dragH) ? b : a));
    setDragH(null);
    onHeight?.(null);
    onDetent(nearest);
  };
  const dragHandlers = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp };
  // the click that ends a drag (on a header button, a row) must not act
  const swallowDragClick = (e: MouseEvent) => {
    if (!justDragged.current) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const onClick = () => {
    if (wide || justDragged.current) return; // a drag that ended already chose a height
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
      onClickCapture={swallowDragClick}
    >
      {!wide && (
        <button
          type="button"
          className={styles.handle}
          aria-label={detent === 'full' ? 'Show the map' : 'Show the list'}
          aria-expanded={detent !== 'peek'}
          {...dragHandlers}
          onClick={onClick}
        >
          <span className={styles.grip} aria-hidden="true" />
        </button>
      )}
      <div className={styles.header} {...(wide ? {} : dragHandlers)}>
        {header}
      </div>
      <div ref={body} className={styles.body} data-scroll={wide || detent !== 'peek' || undefined} {...(wide || detent !== 'peek' ? {} : dragHandlers)}>
        {children}
      </div>
    </section>
  );
}
