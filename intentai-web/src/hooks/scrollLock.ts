// One page lock for every full-screen layer (story book, stop page, race, 3D full screen, help, overlays).
// Each layer used to save the page's overflow and put it back on close. When nested layers closed together (React
// runs the outer cleanup first), the inner one wrote "hidden" back and the next page could not scroll on a phone.
// Now the page is locked while any layer holds the lock and freed when the last one lets go, in any order.
import { useEffect } from 'react';

let holders = 0;

function apply() {
  if (typeof document === 'undefined') return;
  const value = holders > 0 ? 'hidden' : '';
  document.documentElement.style.overflow = value;
  document.body.style.overflow = value;
}

/** Locks page scroll; call the returned function to let go (safe to call twice). */
export function lockScroll(): () => void {
  holders += 1;
  apply();
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    holders = Math.max(0, holders - 1);
    apply();
  };
}

/** Clears a lock nothing holds any more: run on every page change. */
export function releaseStrayScrollLock() {
  if (holders === 0) apply();
}

/** Locks page scroll while mounted (and `on`). */
export function useScrollLock(on = true) {
  useEffect(() => (on ? lockScroll() : undefined), [on]);
}
