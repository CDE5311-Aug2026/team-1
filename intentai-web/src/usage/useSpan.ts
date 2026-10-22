import { useEffect } from 'react';
import { tracker as appTracker } from './appTracker';
import type { UsageKind } from './event';
import type { Tracker } from './tracker';

/** Times `name` while `active` is true; stops on false, on a name change and on unmount. */
export function useSpan(kind: UsageKind, name: string, active: boolean, t: Tracker = appTracker): void {
  useEffect(() => (active ? t.start(kind, name) : undefined), [kind, name, active, t]);
}
