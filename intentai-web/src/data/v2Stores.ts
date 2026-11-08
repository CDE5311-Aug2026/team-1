// Redesign v2 stores (plan C5, A10). Device-local only: nothing here is sent anywhere.
// - huntMode: "hunt together" or "explore on your own" (onboarding step 2), and the home hunt region.
//   Together mode only changes what the app shows (leaderboard, example hunter counts); no location is shared.
// - searchRecent: the last few search words on this phone (board 07), newest first.
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

/** Weekend challenges you joined on this phone (labelled demo, board 09): id → when. */
export type JoinedChallenges = Record<string, { joinedAt: string }>;

export function isJoinedChallenges(value: unknown): value is JoinedChallenges {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([k, v]) => k.length > 0 && k.length <= 100 && isRecord(v) && typeof v.joinedAt === 'string' && !Number.isNaN(Date.parse(v.joinedAt)),
    )
  );
}

export const challengeJoinedStore = createPersistentStore<JoinedChallenges>({
  key: 'challenge-joined',
  fallback: {},
  isValid: isJoinedChallenges,
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
