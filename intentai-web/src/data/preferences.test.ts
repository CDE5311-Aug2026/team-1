import { expect, test } from 'vitest';
import { STORAGE_PREFIX, resetPersistentStores } from './persistentStore';
import { DEFAULT_PREFERENCES, isPreferences } from './preferences';
import { deleteAllData, preferencesStore } from './stores';

test('isPreferences accepts the defaults and rejects out-of-range or missing values', () => {
  expect(isPreferences(DEFAULT_PREFERENCES)).toBe(true);
  expect(isPreferences({ ...DEFAULT_PREFERENCES, textSize: 5 })).toBe(false);
  expect(isPreferences({ ...DEFAULT_PREFERENCES, radiusKm: 0 })).toBe(false);
  expect(isPreferences({ ...DEFAULT_PREFERENCES, radiusKm: 2.5 })).toBe(false);
  const { near: _near, ...notify } = DEFAULT_PREFERENCES.notify;
  expect(isPreferences({ ...DEFAULT_PREFERENCES, notify })).toBe(false);
  expect(isPreferences(null)).toBe(false);
});

test('an invalid stored value falls back to the defaults', () => {
  localStorage.setItem(STORAGE_PREFIX + 'preferences', JSON.stringify({ ...DEFAULT_PREFERENCES, textSize: 9 }));
  resetPersistentStores();
  expect(preferencesStore.get()).toEqual(DEFAULT_PREFERENCES);
});

test('deleteAllData resets preferences', () => {
  preferencesStore.set({ ...DEFAULT_PREFERENCES, usageTiming: false, textSize: 4 });
  deleteAllData();
  expect(preferencesStore.get()).toEqual(DEFAULT_PREFERENCES);
});
