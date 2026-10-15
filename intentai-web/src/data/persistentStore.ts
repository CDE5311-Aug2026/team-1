import { useSyncExternalStore } from 'react';

export const STORAGE_PREFIX = 'intentai:v1:';

export interface PersistentStore<T> {
  readonly key: string;
  get(): T;
  set(next: T | ((previous: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

interface StoreOptions<T> {
  key: string;
  fallback: T;
  isValid: (value: unknown) => value is T;
}

interface Invalidatable {
  invalidate(): void;
}

// One store per key, defined once in src/data/stores.ts. Re-registering a key (Vite HMR) replaces it.
const registry = new Map<string, Invalidatable>();

export function createPersistentStore<T>({ key, fallback, isValid }: StoreOptions<T>): PersistentStore<T> {
  const storageKey = STORAGE_PREFIX + key;
  const listeners = new Set<() => void>();
  let cached: { value: T } | null = null;
  let storageWritable = true;

  const load = (): T => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) return parsed;
      }
    } catch {
      // Corrupt JSON or storage unavailable: use the fallback, leave storage untouched.
    }
    return fallback;
  };

  const notify = () => listeners.forEach((listener) => listener());

  const store: PersistentStore<T> & Invalidatable = {
    key,
    get() {
      if (!cached) cached = { value: load() };
      return cached.value;
    },
    set(next) {
      // Re-read storage first so a write from another tab is not overwritten with a stale value.
      const previous = storageWritable ? load() : store.get();
      const value = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
      cached = { value };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
        storageWritable = true;
      } catch {
        // Storage unavailable (private mode, quota): keep working in memory.
        storageWritable = false;
      }
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    invalidate() {
      cached = null;
      notify();
    },
  };

  registry.set(key, store);
  return store;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.storageArea !== window.localStorage) return;
    registry.forEach((store, key) => {
      // key === null means another tab called localStorage.clear().
      if (event.key === null || event.key === STORAGE_PREFIX + key) store.invalidate();
    });
  });
}

/** Test-only: drop cached values so each test starts from localStorage. */
export function resetPersistentStores() {
  registry.forEach((store) => store.invalidate());
}

export function usePersistentStore<T>(store: PersistentStore<T>) {
  const value = useSyncExternalStore(store.subscribe, store.get);
  return [value, store.set] as const;
}
