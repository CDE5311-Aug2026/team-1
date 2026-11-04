// Privacy & data (Figma S3): what this device stores, per area, with real sizes measured from localStorage, a Clear per
// area (with Undo), and an export of everything as one JSON file.
import { DEFAULT_EXPLORE_PERSONAL } from '../../features/nearby/domain';
import { EDITORIAL_LABEL, LEGACY_EDITORIAL } from '../domain';
import { STORAGE_PREFIX, type PersistentStore } from '../persistentStore';
import {
  askThreadsStore,
  collectedStore,
  explorePersonalStore,
  insightsStore,
  lookupsStore,
  openedCardsStore,
  questionsStore,
  reportsStore,
  savedStore,
  tipsStore,
} from '../stores';

export type StorageAreaId = 'passport' | 'ask' | 'community' | 'profile';

interface Clearable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: PersistentStore<any>;
  empty: unknown;
}

export interface StorageArea {
  id: StorageAreaId;
  label: string;
  /** Persisted keys (without the prefix) counted in this area. */
  keys: string[];
  /** Stores emptied by Clear. Profile & settings has none: it is changed in My Space or by Delete all. */
  clear: Clearable[];
}

export const STORAGE_AREAS: StorageArea[] = [
  {
    id: 'passport',
    label: 'Passport & cards',
    keys: ['explore-personal', 'opened-cards', 'collected', 'saved', 'progress', 'streak'],
    clear: [
      { store: explorePersonalStore, empty: null },
      { store: openedCardsStore, empty: [] },
      { store: collectedStore, empty: [] },
      { store: savedStore, empty: [] },
    ],
  },
  {
    id: 'ask',
    label: 'Ask chats',
    keys: ['ask-threads', 'insights', 'lookups', 'reports'],
    clear: [
      { store: askThreadsStore, empty: [] },
      { store: insightsStore, empty: [] },
      { store: lookupsStore, empty: [] },
      { store: reportsStore, empty: [] },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    keys: ['questions', 'tips'],
    clear: [
      { store: questionsStore, empty: [] },
      { store: tipsStore, empty: [] },
    ],
  },
  {
    id: 'profile',
    label: 'Profile & settings',
    keys: ['profile-v3', 'profile', 'onboarding', 'settings', 'culturePrefs', 'notices', 'place', 'reduce-motion', 'my-space-prefs'],
    clear: [],
  },
];

/** Bytes a stored value takes (UTF-8 of key and value). */
export function storedBytes(key: string): number {
  try {
    const value = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (value === null) return 0;
    return new TextEncoder().encode(STORAGE_PREFIX + key + value).length;
  } catch {
    return 0;
  }
}

export function areaBytes(area: StorageArea): number {
  return area.keys.reduce((sum, key) => sum + storedBytes(key), 0);
}

/** Every key this app stores, including ones no area lists. */
export function totalBytes(): number {
  let sum = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      sum += new TextEncoder().encode(key + (window.localStorage.getItem(key) ?? '')).length;
    }
  } catch {
    return 0;
  }
  return sum;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Empties an area's stores and returns an undo that puts the values back. */
export function clearArea(area: StorageArea): () => void {
  const before = area.clear.map(({ store }) => store.get());
  for (const { store, empty } of area.clear) {
    // Nearby's personal data keeps its shape: no places, same preferences.
    store.set(empty === null ? { ...DEFAULT_EXPLORE_PERSONAL, ...store.get(), places: [] } : empty);
  }
  return () => area.clear.forEach(({ store }, i) => store.set(before[i]));
}

/** Everything this app stores on the device, parsed, as one object. */
export function exportData(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      // the stored lookup source keeps its old value (/ui1 shares this storage); a downloaded file shows the app's name
      const raw = (window.localStorage.getItem(key) ?? 'null').split(LEGACY_EDITORIAL).join(EDITORIAL_LABEL);
      try {
        out[key.slice(STORAGE_PREFIX.length)] = JSON.parse(raw);
      } catch {
        out[key.slice(STORAGE_PREFIX.length)] = raw;
      }
    }
  } catch {
    // Storage unavailable: nothing to export.
  }
  return { app: 'FindSG', exportedAt: new Date().toISOString(), data: out };
}
