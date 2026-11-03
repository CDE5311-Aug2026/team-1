// Mouse drag for a native scroll-snap strip (touch already swipes natively). Merge 2026-10-29: the Home cards must
// drag on a laptop too. While dragging, snapping is off and the strip follows the pointer; on release snapping comes
// back (the browser settles on the nearest card, so the carousel's own scroll handling picks the selection), and the
// click that ends a drag is swallowed so it never opens a card.
import { useEffect, type RefObject } from 'react';

export function useMouseDrag(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let start: { x: number; left: number } | null = null;
    let moved = false;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      start = { x: e.clientX, left: el.scrollLeft };
      moved = false;
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        el.setPointerCapture?.(e.pointerId);
        el.style.scrollSnapType = 'none';
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
      }
      if (moved) el.scrollLeft = start.left - dx;
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      start = null;
      if (!moved) return;
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.scrollSnapType = '';
      el.style.cursor = '';
      el.style.userSelect = '';
      const swallow = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      el.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [ref]);
}
