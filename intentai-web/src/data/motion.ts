import { useEffect } from 'react';
import { usePersistentStore } from './persistentStore';
import { reduceMotionStore } from './stores';

/**
 * The app's "Reduce motion" setting. Mount once (App): it keeps <html class="reduce-motion"> in step, which the CSS
 * animations check, and returns the value for <MotionConfig reducedMotion>, which motion components check
 * (use `useReducedMotionConfig()` from motion/react inside components, not `useReducedMotion()`).
 */
export function useReduceMotionSetting(): boolean {
  const [reduce] = usePersistentStore(reduceMotionStore);
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduce);
  }, [reduce]);
  return reduce;
}
