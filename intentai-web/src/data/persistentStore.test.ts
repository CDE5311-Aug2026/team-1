import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { STORAGE_PREFIX, createPersistentStore, usePersistentStore } from './persistentStore';

const isNumber = (v: unknown): v is number => typeof v === 'number';
let n = 0;
const fresh = () => createPersistentStore({ key: `test-${(n += 1)}`, fallback: 7, isValid: isNumber });
const raw = (key: string) => localStorage.getItem(STORAGE_PREFIX + key);

afterEach(() => {
  vi.restoreAllMocks();
});

test('returns the fallback when nothing is stored', () => {
  expect(fresh().get()).toBe(7);
});

test('restores a valid stored value', () => {
  const store = fresh();
  localStorage.setItem(STORAGE_PREFIX + store.key, '42');
  expect(store.get()).toBe(42);
});

test('ignores corrupt JSON and wrong shapes', () => {
  const a = fresh();
  localStorage.setItem(STORAGE_PREFIX + a.key, '{not json');
  expect(a.get()).toBe(7);
  const b = fresh();
  localStorage.setItem(STORAGE_PREFIX + b.key, '"forty-two"');
  expect(b.get()).toBe(7);
});

test('reading never writes, so unreadable legacy data survives for migration', () => {
  const store = fresh();
  localStorage.setItem(STORAGE_PREFIX + store.key, '{legacy');
  renderHook(() => usePersistentStore(store));
  expect(raw(store.key)).toBe('{legacy');
});

test('set writes to storage and supports updater functions', () => {
  const store = fresh();
  store.set(8);
  store.set((v) => v + 1);
  expect(raw(store.key)).toBe('9');
});

test('keeps accumulating in memory when setItem throws', () => {
  const store = fresh();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError');
  });
  store.set((v) => v + 1);
  store.set((v) => v + 1);
  expect(store.get()).toBe(9);
});

test('two hook consumers of the same store stay in sync', () => {
  const store = fresh();
  const a = renderHook(() => usePersistentStore(store));
  const b = renderHook(() => usePersistentStore(store));
  act(() => a.result.current[1]((v) => v + 1));
  expect(b.result.current[0]).toBe(8);
});

test('set builds on a value another tab wrote, not on a stale cache', () => {
  const store = fresh();
  expect(store.get()).toBe(7);
  localStorage.setItem(STORAGE_PREFIX + store.key, '20'); // other tab, event not yet delivered
  store.set((v) => v + 1);
  expect(store.get()).toBe(21);
});

test('storage events refresh the value, including clear() from another tab', () => {
  const store = fresh();
  const { result } = renderHook(() => usePersistentStore(store));
  act(() => result.current[1](12));
  localStorage.setItem(STORAGE_PREFIX + store.key, '30');
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_PREFIX + store.key, storageArea: localStorage }));
  });
  expect(result.current[0]).toBe(30);
  localStorage.clear();
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }));
  });
  expect(result.current[0]).toBe(7);
});
