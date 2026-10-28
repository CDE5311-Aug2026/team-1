import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const FRAME_MS = 33;

/**
 * Mount count-up progress, eased 1-(1-k)^3, from 0 to 1: starts `delay` ms after mount, lasts `duration` ms.
 * Reduced motion returns 1 at once (final values).
 */
export function useCountUp(delay = 500, duration = 1400): number {
  const reduced = useReducedMotion();
  const [k, setK] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const start = Date.now() + delay;
    const id = window.setInterval(() => {
      const raw = Math.max(0, Math.min(1, (Date.now() - start) / duration));
      setK(1 - Math.pow(1 - raw, 3));
      if (raw >= 1) window.clearInterval(id);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [reduced, delay, duration]);

  return reduced ? 1 : k;
}
