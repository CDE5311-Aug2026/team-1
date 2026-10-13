import { useEffect, useState } from 'react';
import { todayKey } from '../data/progress';

/**
 * Today's local date key, kept current across midnight. A timer fires at the next midnight, and
 * focus / visibility checks catch tabs whose timers were suspended while asleep or in the background.
 */
export default function useToday(): string {
  const [today, setToday] = useState(todayKey);

  useEffect(() => {
    const refresh = () => setToday(todayKey());
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = window.setTimeout(refresh, nextMidnight.getTime() - now.getTime() + 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [today]);

  return today;
}
