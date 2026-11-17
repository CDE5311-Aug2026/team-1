// Where each page is scrolled (10 Nov 2026 navigation audit): a new page opens at its top (a place page opened from
// halfway down Home used to open halfway down too), and Back (or a page's ✕ / 〈, which step back) lands where you
// were, also on a page that loads on demand or draws its cards after a moment (the browser's own restore gave up
// before they were in, so Home came back near the top). Moves within one page (Home's chips and map, Hunt's boards)
// are left to the page.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const KEY = 'scroll-keeper';
/** How long a step back keeps trying to reach its place while the page fills in. */
const RESTORE_MS = 1500;

function load(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

/** Note where the step is scrolled now, and keep the notes for the visit. */
function keep(seen: Record<string, number>, key: string) {
  seen[key] = Math.round(window.scrollY);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    /* private mode: kept for this page only */
  }
}

export default function ScrollKeeper() {
  const location = useLocation();
  const type = useNavigationType();
  const at = useRef(location.key);
  const seen = useRef(load());
  const lastPath = useRef(location.pathname);

  // remember the current step's place as the page scrolls (once a frame at most), kept for the visit
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    let frame = 0;
    const save = () => {
      frame = 0;
      keep(seen.current, at.current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(save);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    if (at.current === location.key) return;
    at.current = location.key;
    const samePage = lastPath.current === location.pathname;
    lastPath.current = location.pathname;
    if (type !== 'POP') {
      // a move within the page (Home's chips and map replace the URL, which makes a new step): it is still scrolled
      // where it was, so that is noted for the new step even if it is not scrolled again before you leave
      if (samePage) keep(seen.current, location.key);
      else window.scrollTo(0, 0);
      return;
    }
    const y = seen.current[location.key];
    if (!y) {
      if (!samePage) window.scrollTo(0, 0);
      return;
    }
    // back: try each frame until the page is tall enough to reach the place, or give up after a moment
    const until = performance.now() + RESTORE_MS;
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
    };
    const tryNow = () => {
      window.scrollTo(0, y);
      if (Math.abs(window.scrollY - y) > 2 && performance.now() < until) frame = requestAnimationFrame(tryNow);
      else stop();
    };
    // a finger or the wheel takes over at once
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    tryNow();
    return stop;
  }, [location.key, location.pathname, type]);

  return null;
}
