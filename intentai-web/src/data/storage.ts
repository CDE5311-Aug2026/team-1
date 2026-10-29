import { useSyncExternalStore } from 'react';
import { DEFAULT_PLACE } from './domain';
import { DEFAULT_EXPLORE_PERSONAL } from '../features/nearby/domain';
import { STORAGE_PREFIX, type PersistentStore } from './persistentStore';
import {
  collectedStore,
  culturePrefsStore,
  dataGeneration,
  explorePersonalStore,
  lookupsStore,
  noticesStore,
  onboardingStore,
  placeStore,
  placeStoriesStore,
  preferencesStore,
  profileStore,
  progressStore,
  questionsStore,
  reportsStore,
  savedStore,
  settingsStore,
  streakStore,
} from './stores';
import { LOCAL_USAGE_EVENT, LOCAL_USAGE_KEY } from '../usage/localLog';

export type StorageGroup = 'passport' | 'ask' | 'community' | 'profile';
export type ClearableGroup = Exclude<StorageGroup, 'profile'>;

/** Which stored keys (without the prefix) each Privacy row covers. */
export const STORAGE_GROUPS: Record<StorageGroup, readonly string[]> = {
  passport: ['collected', 'placeStories', 'saved', 'explore-personal', 'place'],
  ask: ['lookups'],
  community: ['questions', 'reports'],
  profile: ['onboarding', 'profile', 'settings', 'preferences', 'culturePrefs', 'progress', 'streak', 'notices'],
};

const TIMING_KEY = LOCAL_USAGE_KEY.slice(STORAGE_PREFIX.length);
/** Device-only bookkeeping that is not "your data" to export. */
const NOT_EXPORTED = new Set(['usage-id', 'tester', TIMING_KEY]);

// Each clearable store with the empty value deleteAllData writes for it.
type Entry = readonly [PersistentStore<unknown>, unknown];
const entry = <T,>(store: PersistentStore<T>, empty: T): Entry => [store as PersistentStore<unknown>, empty];
const CLEARABLE: Record<ClearableGroup, readonly Entry[]> = {
  passport: [
    entry(collectedStore, []),
    entry(placeStoriesStore, {}),
    entry(savedStore, []),
    entry(explorePersonalStore, { ...DEFAULT_EXPLORE_PERSONAL, places: [] }),
    entry(placeStore, DEFAULT_PLACE),
  ],
  ask: [entry(lookupsStore, [])],
  community: [entry(questionsStore, []), entry(reportsStore, [])],
};

const PROFILE_STORES: readonly PersistentStore<unknown>[] = [
  onboardingStore,
  profileStore,
  settingsStore,
  preferencesStore,
  culturePrefsStore,
  progressStore,
  streakStore,
  noticesStore,
] as PersistentStore<unknown>[];

function prefixedKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
  } catch {
    // storage unavailable
  }
  return keys;
}

function bytesOf(key: string): number {
  try {
    const value = localStorage.getItem(key);
    return value === null ? 0 : new Blob([key + value]).size;
  } catch {
    return 0;
  }
}

export function storageBytes(): Record<StorageGroup, number> & { timing: number; total: number } {
  const out = { passport: 0, ask: 0, community: 0, profile: 0, timing: 0, total: 0 };
  const groupOf = new Map<string, StorageGroup>();
  (Object.keys(STORAGE_GROUPS) as StorageGroup[]).forEach((g) => STORAGE_GROUPS[g].forEach((k) => groupOf.set(k, g)));
  for (const key of prefixedKeys()) {
    const size = bytesOf(key);
    const short = key.slice(STORAGE_PREFIX.length);
    const group = groupOf.get(short);
    if (group) out[group] += size;
    else if (short === TIMING_KEY) out.timing += size;
    out.total += size;
  }
  return out;
}

/** `0 B`, `812 B`, `3.4 KB`, `1.6 MB` (1024 base, one decimal). */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Everything the app keeps on this phone, as one JSON file (device ids and the timing log left out). */
export function exportJson(now: Date = new Date()): string {
  const data: Record<string, unknown> = {};
  for (const key of prefixedKeys()) {
    const short = key.slice(STORAGE_PREFIX.length);
    if (NOT_EXPORTED.has(short)) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[short] = JSON.parse(raw);
    } catch {
      data[short] = raw;
    }
  }
  return JSON.stringify({ format: 'intentai-data', exportedAt: now.toISOString(), data }, null, 2);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function isGroupEmpty(g: ClearableGroup): boolean {
  return CLEARABLE[g].every(([store, empty]) => same(store.get(), empty));
}

/** Empties a Privacy row through the typed stores; the returned undo restores it unless all data was deleted since. */
export function clearGroup(g: ClearableGroup): () => void {
  const snapshot = CLEARABLE[g].map(([store]) => [store, store.get()] as const);
  const generation = dataGeneration();
  CLEARABLE[g].forEach(([store, empty]) => store.set(empty));
  return () => {
    if (dataGeneration() !== generation) return;
    snapshot.forEach(([store, value]) => store.set(value));
  };
}

// Storage report for the Privacy page and the My Space card: re-read whenever a covered store or the timing log changes.
const reportListeners = new Set<() => void>();
let version = 0;
const bump = () => {
  version++;
  reportListeners.forEach((l) => l());
};
let unsubscribeAll: (() => void) | null = null;

function subscribe(listener: () => void) {
  reportListeners.add(listener);
  if (!unsubscribeAll) {
    // Nothing was listening, so writes since the last snapshot were not counted: start fresh.
    version++;
    const stores = [...Object.values(CLEARABLE).flatMap((list) => list.map(([s]) => s)), ...PROFILE_STORES];
    const offs = stores.map((s) => s.subscribe(bump));
    window.addEventListener(LOCAL_USAGE_EVENT, bump);
    unsubscribeAll = () => {
      offs.forEach((off) => off());
      window.removeEventListener(LOCAL_USAGE_EVENT, bump);
    };
  }
  return () => {
    reportListeners.delete(listener);
    if (reportListeners.size === 0 && unsubscribeAll) {
      unsubscribeAll();
      unsubscribeAll = null;
    }
  };
}

export interface StorageReport {
  bytes: ReturnType<typeof storageBytes>;
  empty: Record<ClearableGroup, boolean>;
}
let cachedReport: { version: number; report: StorageReport } | null = null;
function snapshot(): StorageReport {
  if (!cachedReport || cachedReport.version !== version) {
    cachedReport = {
      version,
      report: {
        bytes: storageBytes(),
        empty: { passport: isGroupEmpty('passport'), ask: isGroupEmpty('ask'), community: isGroupEmpty('community') },
      },
    };
  }
  return cachedReport.report;
}

export function useStorageReport(): StorageReport {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Test-only: forget the cached report (tests write storage directly). */
export function resetStorageReport() {
  cachedReport = null;
  version++;
}
