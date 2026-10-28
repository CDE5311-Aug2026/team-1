import { useSyncExternalStore } from 'react';
import { usePersistentStore } from '../data/persistentStore';
import { preferencesStore } from '../data/stores';

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

/** True when the system or the My Space motion setting asks for reduced motion; follows changes to either. */
export function useReducedMotion(): boolean {
  const system = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [prefs] = usePersistentStore(preferencesStore);
  return system || prefs.motion === 'reduced';
}
