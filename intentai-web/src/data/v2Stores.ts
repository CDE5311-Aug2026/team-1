// Redesign v2 stores (plan C5, A10). Device-local only: nothing here is sent anywhere.
// - huntMode: "hunt together" or "explore on your own" (onboarding step 2), and the home hunt region.
//   Together mode only changes what the app shows (leaderboard, example hunter counts); no location is shared.
// - searchRecent: the last few search words on this phone (board 07), newest first.
// - huntIntro: whether the "What is Hunt?" card on Hunt's first screen was closed (its "?" brings it back).
// - huntTour: whether the coach-mark tour of a hunt's step screen was finished or skipped (its "?" replays it).
// - huntNow: the hunt and stop the "Now" box over the tab bar was closed on (it returns when the stop changes).
import { createPersistentStore } from './persistentStore';
import { isRecord } from './validate';
import type { RegionId } from './ura/ura';

export const HUNT_REGIONS: readonly RegionId[] = ['central', 'east', 'north', 'north-east', 'west'] as RegionId[];

export type HuntMode = 'together' | 'solo';

export interface HuntModeState {
  /** Unset until onboarding (or Settings) asks; screens treat unset as solo. */
  mode?: HuntMode;
  region?: RegionId;
}

export const EMPTY_HUNT_MODE: HuntModeState = {};

export function isHuntModeState(value: unknown): value is HuntModeState {
  if (!isRecord(value)) return false;
  if (value.mode !== undefined && value.mode !== 'together' && value.mode !== 'solo') return false;
  if (value.region !== undefined && !(HUNT_REGIONS as readonly unknown[]).includes(value.region)) return false;
  return true;
}

export const huntModeStore = createPersistentStore<HuntModeState>({
  key: 'hunt-mode',
  fallback: EMPTY_HUNT_MODE,
  isValid: isHuntModeState,
});

export function isTogether(state: HuntModeState = huntModeStore.get()): boolean {
  return state.mode === 'together';
}

/** The name on the passport (onboarding's "Whose passport is this?"). Separate from the user-test name, which labels a
 *  session and must not be a real name; this one never leaves the phone. '' until given. */
export interface PassportName {
  name: string;
}

export const passportNameStore = createPersistentStore<PassportName>({
  key: 'passport-name',
  fallback: { name: '' },
  isValid: (value): value is PassportName => isRecord(value) && typeof value.name === 'string',
});

export const SEARCH_RECENT_MAX = 8;

export function isRecentList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= SEARCH_RECENT_MAX &&
    value.every((v) => typeof v === 'string' && v.length > 0 && v.length <= 100)
  );
}

export const searchRecentStore = createPersistentStore<string[]>({
  key: 'search-recent',
  fallback: [],
  isValid: isRecentList,
});

/** Remembers a search (trimmed, case-insensitive de-duplicated, newest first, at most 8). */
export function rememberSearch(query: string) {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return;
  const rest = searchRecentStore.get().filter((r) => r.toLowerCase() !== q.toLowerCase());
  searchRecentStore.set([q, ...rest].slice(0, SEARCH_RECENT_MAX));
}

export interface HuntIntroState {
  dismissed: boolean;
}

export const huntIntroStore = createPersistentStore<HuntIntroState>({
  key: 'hunt-intro',
  fallback: { dismissed: false },
  isValid: (value): value is HuntIntroState => isRecord(value) && typeof value.dismissed === 'boolean',
});

/** The in-game tour (coach marks) on a hunt's step screen: done once it is finished or skipped; its "?" replays it. */
export interface HuntTourState {
  done: boolean;
}

export const huntTourStore = createPersistentStore<HuntTourState>({
  key: 'hunt-tour',
  fallback: { done: false },
  isValid: (value): value is HuntTourState => isRecord(value) && typeof value.done === 'boolean',
});

/**
 * The "Now" box over the tab bar (UT03-5): which hunt's stop it was closed on. It comes back once that hunt moves to
 * another stop (or another hunt is under way); "Delete all" clears it.
 */
export interface HuntNowState {
  dismissed?: { hunt: string; stop: number };
}

export const EMPTY_HUNT_NOW: HuntNowState = {};

export function isHuntNowState(value: unknown): value is HuntNowState {
  if (!isRecord(value)) return false;
  if (value.dismissed === undefined) return true;
  const d = value.dismissed;
  return isRecord(d) && typeof d.hunt === 'string' && typeof d.stop === 'number' && Number.isInteger(d.stop) && d.stop >= 0;
}

export const huntNowStore = createPersistentStore<HuntNowState>({
  key: 'hunt-now',
  fallback: EMPTY_HUNT_NOW,
  isValid: isHuntNowState,
});
