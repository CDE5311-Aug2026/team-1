import { useSyncExternalStore } from 'react';
import { usePersistentStore } from '../data/persistentStore';
import { reduceMotionStore } from '../data/stores';

const QUERY = '(prefers-reduced-motion: reduce)';

function query(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;
}

function subscribe(onChange: () => void) {
  const mql = query();
  if (!mql) return () => {};
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const getSnapshot = () => query()?.matches ?? false;

/** Non-hook check for code that animates outside render: the system setting or the app's Reduce motion. */
export function isReducedMotion(): boolean {
  return getSnapshot() || reduceMotionStore.get();
}

/**
 * True when the system or the app's own Reduce motion setting (My Space › Settings, reduceMotionStore) asks for reduced
 * motion; follows changes to either. JS-driven animations (carousels, map glides, count-ups) read this.
 */
export function useReducedMotion(): boolean {
  const system = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [app] = usePersistentStore(reduceMotionStore);
  return system || app;
}
