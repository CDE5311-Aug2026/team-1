// Whether the Help Center is open, and on which tab. Any screen opens it (the badge in every top bar, Settings'
// Help & feedback); one HelpCenter at the app's root draws it.
import { useSyncExternalStore } from 'react';

export type HelpTab = 'ask' | 'feedback';
export interface HelpState {
  open: boolean;
  tab: HelpTab;
  /** Where the panel unfolds from (the badge's box), so it grows out of the header the person tapped. */
  from?: { top: number; left: number; width: number; height: number };
}

let state: HelpState = { open: false, tab: 'ask' };
const listeners = new Set<() => void>();
const set = (next: HelpState) => {
  state = next;
  listeners.forEach((l) => l());
};

export function openHelp(tab: HelpTab = 'ask', from?: Element | null) {
  const r = from?.closest('header')?.getBoundingClientRect() ?? from?.getBoundingClientRect();
  set({ open: true, tab, from: r ? { top: r.top, left: r.left, width: r.width, height: r.height } : undefined });
}

export function setHelpTab(tab: HelpTab) {
  set({ ...state, tab });
}

export function closeHelp() {
  set({ ...state, open: false });
}

export function useHelp(): HelpState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
