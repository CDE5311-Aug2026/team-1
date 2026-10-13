import { expect, test, vi } from 'vitest';
import { showToast, undoToast } from '../hooks/useToast';
import {
  DEFAULT_NOTICES,
  DEFAULT_ONBOARDING,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  SEED_LOOKUPS,
  SEED_QUESTIONS,
  addLookup,
  isLookupList,
  isNotices,
  isOnboarding,
  isPlace,
  isProfile,
  isQuestionList,
  isSettings,
  levelFor,
} from './domain';
import { STORAGE_PREFIX } from './persistentStore';
import { deleteAllData, lookupsStore, onboardingStore, profileStore, questionsStore, settingsStore } from './stores';

test('defaults and seeds pass their own validators', () => {
  expect(isOnboarding(DEFAULT_ONBOARDING)).toBe(true);
  expect(isProfile(DEFAULT_PROFILE)).toBe(true);
  expect(isSettings(DEFAULT_SETTINGS)).toBe(true);
  expect(isLookupList(SEED_LOOKUPS)).toBe(true);
  expect(isQuestionList(SEED_QUESTIONS)).toBe(true);
  expect(isNotices(DEFAULT_NOTICES)).toBe(true);
  expect(isPlace('Hawker centre')).toBe(true);
});

test('validators reject wrong shapes and unknown enum values', () => {
  expect(isSettings({ ...DEFAULT_SETTINGS, location: 'yes' })).toBe(false);
  expect(isSettings({ daily: false })).toBe(false);
  expect(isOnboarding({ ...DEFAULT_ONBOARDING, topics: ['Work', 'Nightlife'] })).toBe(false);
  expect(isProfile({ from: 'China', time: 3, role: '' })).toBe(false);
  expect(isLookupList([{ id: 'x', word: 'x', meaning: 'y', source: 'Guessed' }])).toBe(false);
  expect(isQuestionList([{ ...SEED_QUESTIONS[0], status: 'Closed' }])).toBe(false);
  expect(isPlace('Moon')).toBe(false);
});

test('every switch, including location, starts off (Figma notes)', () => {
  expect(Object.values(DEFAULT_SETTINGS).every((on) => on === false)).toBe(true);
});

test('levelFor follows the Figma scoring note', () => {
  expect([0, 1, 2, 3].map(levelFor)).toEqual(['Beginner', 'Beginner', 'Intermediate', 'Experienced']);
});

test('addLookup prepends new phrases and ignores case-insensitive duplicates', () => {
  const next = addLookup(SEED_LOOKUPS, { word: 'Paiseh', meaning: 'Sorry' }, () => 'id-1');
  expect(next[0]).toEqual({ id: 'id-1', word: 'Paiseh', meaning: 'Sorry', source: 'AI-generated' });
  expect(addLookup(next, { word: 'CHOPE', meaning: 'other' })).toBe(next);
});

test('deleteAllData closes a pending Undo so it cannot restore deleted data', () => {
  const undo = vi.fn();
  showToast('Lookup deleted', { undo });
  deleteAllData();
  undoToast();
  expect(undo).not.toHaveBeenCalled();
});

test('deleteAllData empties user content instead of restoring the seeds', () => {
  onboardingStore.set({ ...DEFAULT_ONBOARDING, done: true });
  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  deleteAllData();
  expect(lookupsStore.get()).toEqual([]);
  expect(questionsStore.get()).toEqual([]);
  expect(profileStore.get()).toEqual({ from: '', time: '', role: '' });
  expect(settingsStore.get().location).toBe(false);
  expect(onboardingStore.get().done).toBe(false);
  expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}lookups`) ?? 'null')).toEqual([]);
});
