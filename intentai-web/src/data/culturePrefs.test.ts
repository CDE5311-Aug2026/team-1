import { beforeEach, expect, test } from 'vitest';
import { DEFAULT_PREFS, canonicalPrefs, isCulturePrefs } from './culturePrefs';
import { COMPLETED_ONBOARDING } from '../test/onboardingFixture';
import { culturePrefsStore, deleteAllData, onboardingStore } from './stores';

beforeEach(() => {
  localStorage.clear();
});

test('the default is the n=24 survey top three', () => {
  expect(DEFAULT_PREFS).toEqual({ categories: ['foods', 'monuments', 'holidays'] });
});

test('accepts three distinct known categories in any order', () => {
  expect(isCulturePrefs(DEFAULT_PREFS)).toBe(true);
  expect(isCulturePrefs({ categories: ['unesco', 'foods', 'monuments'] })).toBe(true);
});

test('still accepts a record saved with a format by the earlier build', () => {
  expect(isCulturePrefs({ categories: ['unesco', 'ich', 'history'], format: 'videos' })).toBe(true);
});

test.each([
  ['two categories', { categories: ['foods', 'unesco'] }],
  ['four categories', { categories: ['foods', 'unesco', 'ich', 'history'] }],
  ['duplicates', { categories: ['foods', 'foods', 'unesco'] }],
  ['unknown category', { categories: ['foods', 'unesco', 'sports'] }],
  ['categories not an array', { categories: 'foods' }],
  ['empty object', {}],
  ['null', null],
])('rejects %s', (_name, value) => {
  expect(isCulturePrefs(value)).toBe(false);
});

test('canonicalPrefs sorts categories by survey rank', () => {
  expect(canonicalPrefs(['history', 'foods', 'unesco'])).toEqual({ categories: ['foods', 'unesco', 'history'] });
});

test('canonicalPrefs refuses invalid picks', () => {
  expect(() => canonicalPrefs(['foods', 'foods', 'unesco'])).toThrow();
  expect(() => canonicalPrefs(['foods', 'unesco'])).toThrow();
});

test('a corrupt stored record falls back to the default', () => {
  localStorage.setItem('intentai:v1:culturePrefs', JSON.stringify({ categories: ['foods'] }));
  culturePrefsStore.set((prev) => prev); // re-read storage
  expect(culturePrefsStore.get()).toEqual(DEFAULT_PREFS);
});

test('an existing onboarding record without culture prefs stays valid', () => {
  localStorage.setItem('intentai:v1:onboarding', JSON.stringify(COMPLETED_ONBOARDING));
  onboardingStore.set((prev) => prev);
  expect(onboardingStore.get().done).toBe(true);
  expect(culturePrefsStore.get()).toEqual(DEFAULT_PREFS);
});

test('deleting all data resets culture prefs', () => {
  culturePrefsStore.set({ categories: ['unesco', 'ich', 'history'] });
  deleteAllData();
  expect(culturePrefsStore.get()).toEqual(DEFAULT_PREFS);
});
