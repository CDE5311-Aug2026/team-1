import { useLayoutEffect, type RefObject } from 'react';

/** Smallest share of the CSS font size a value may shrink to. */
export const FIT_FLOOR = 0.6;

/**
 * Shrinks the element's font-size so its content fits on one line.
 * One pass from the CSS size: reset, measure, scale by clientWidth / scrollWidth,
 * clamp to [FIT_FLOOR, 1] of the base. Re-runs when `text` changes and when the
 * element's width changes (ResizeObserver, skipped where unavailable). Only the
 * font-size changes, never the box, so the observer cannot loop.
 */
export function useFitText(ref: RefObject<HTMLElement | null>, text: string, floor = FIT_FLOOR): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastWidth = -1;
    const fit = () => {
      el.style.fontSize = '';
      delete el.dataset.fitFloor;
      const { scrollWidth, clientWidth } = el;
      if (clientWidth <= 0 || scrollWidth <= clientWidth) return;
      const base = parseFloat(getComputedStyle(el).fontSize);
      if (!Number.isFinite(base) || base <= 0) return;
      const ratio = Math.max(floor, clientWidth / scrollWidth);
      // Still too wide at the floor: let CSS ellipsise as the last resort.
      if (ratio === floor && clientWidth / scrollWidth < floor) el.dataset.fitFloor = '';
      el.style.fontSize = `${Math.floor(base * ratio * 100) / 100}px`;
    };
    fit();
    // Glyph widths change when the web font arrives, with the box unchanged: refit from the CSS size.
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    let alive = true;
    fonts?.ready?.then(() => {
      if (alive) fit();
    });
    fonts?.addEventListener?.('loadingdone', fit);
    const stopFonts = () => {
      alive = false;
      fonts?.removeEventListener?.('loadingdone', fit);
    };
    if (typeof ResizeObserver === 'undefined') return stopFonts;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w === lastWidth) return;
      lastWidth = w;
      fit();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      stopFonts();
    };
  }, [ref, text, floor]);
}
