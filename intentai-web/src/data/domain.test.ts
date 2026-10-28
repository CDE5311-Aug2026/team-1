import { describe, expect, test, vi } from 'vitest';
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
import { COMPLETED_ONBOARDING } from '../test/onboardingFixture';
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
  onboardingStore.set(COMPLETED_ONBOARDING);
  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  deleteAllData();
  expect(lookupsStore.get()).toEqual([]);
  expect(questionsStore.get()).toEqual([]);
  expect(profileStore.get()).toEqual({ from: '', time: '', role: '' });
  expect(settingsStore.get().location).toBe(false);
  expect(onboardingStore.get().done).toBe(false);
  expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}lookups`) ?? 'null')).toEqual([]);
});

describe('isOnboarding', () => {
  const draft = { ...DEFAULT_ONBOARDING, from: 'India' as const, time: '1to3y' as const, hidden: [] };
  const bad = (patch: Record<string, unknown>) => isOnboarding({ ...COMPLETED_ONBOARDING, ...patch });

  test('accepts the default, a partial draft and a finished passport', () => {
    expect(isOnboarding(DEFAULT_ONBOARDING)).toBe(true);
    expect(isOnboarding(draft)).toBe(true);
    expect(isOnboarding(COMPLETED_ONBOARDING)).toBe(true);
  });

  test('rejects each invalid field', () => {
    expect(bad({ done: 'yes' })).toBe(false);
    expect(bad({ from: 'Narnia' })).toBe(false);
    expect(bad({ time: '3 months' })).toBe(false);
    expect(bad({ role: 'Student' })).toBe(false);
    expect(bad({ language: '中文' })).toBe(false);
    expect(bad({ topics: ['food', 'food', 'history', 'festival'] })).toBe(false);
    expect(bad({ topics: ['food', 'monument', 'festival', 'nightlife'] })).toBe(false);
    expect(bad({ hidden: ['from', 'from'] })).toBe(false);
    expect(bad({ hidden: ['mood'] })).toBe(false);
    expect(bad({ completedAt: 'last Tuesday' })).toBe(false);
    expect(bad({ completedAt: 5 })).toBe(false);
    for (const v of ['10/28/2026', '123', '2026-02-30', '2026-13-01', '2026-10-28T25:00:00Z', '2026-10-28T10:00:00']) {
      expect(bad({ completedAt: v }), v).toBe(false);
    }
    for (const v of ['2026-10-28', '2026-10-28T10:00:00Z', '2026-10-28T10:00:00.123Z', '2024-02-29']) {
      expect(bad({ completedAt: v }), v).toBe(true);
    }
  });

  test('rejects a home base outside Singapore, non-finite, or with a bad label', () => {
    const base = COMPLETED_ONBOARDING.base!;
    expect(bad({ base: { ...base, lat: 1.14 } })).toBe(false);
    expect(bad({ base: { ...base, lat: 1.49 } })).toBe(false);
    expect(bad({ base: { ...base, lng: 103.5 } })).toBe(false);
    expect(bad({ base: { ...base, lng: 104.2 } })).toBe(false);
    expect(bad({ base: { ...base, lat: Number.NaN } })).toBe(false);
    expect(bad({ base: { ...base, lat: '1.3' } })).toBe(false);
    expect(bad({ base: { ...base, label: '' } })).toBe(false);
    expect(bad({ base: { ...base, label: 'x'.repeat(61) } })).toBe(false);
    expect(bad({ base: { ...base, label: 'x'.repeat(60) } })).toBe(true);
    expect(bad({ base: { lat: 1.3, lng: 103.8 } })).toBe(false);
  });

  test('done requires every answer, four ranked topics and a stamp date', () => {
    for (const patch of [
      { from: null },
      { time: null },
      { role: null },
      { language: null },
      { base: null },
      { topics: ['food', 'monument', 'festival'] },
      { topics: [] },
      { completedAt: null },
    ]) {
      expect(bad(patch), JSON.stringify(patch)).toBe(false);
    }
    // the same gaps are fine in a draft
    expect(isOnboarding({ ...COMPLETED_ONBOARDING, done: false, topics: ['food'], completedAt: null, from: null })).toBe(true);
  });

  test('the old pre-redo shape is rejected, so those users onboard again', () => {
    expect(isOnboarding({ done: true, duration: '3 months – 1 year', topics: ['Work', 'Food'] })).toBe(false);
    expect(isOnboarding({ done: false, duration: null, topics: [] })).toBe(false);
  });

  test('a stored old record falls back to the default', () => {
    localStorage.setItem(`${STORAGE_PREFIX}onboarding`, JSON.stringify({ done: true, duration: null, topics: [] }));
    onboardingStore.set((prev) => prev);
    expect(onboardingStore.get()).toEqual(DEFAULT_ONBOARDING);
  });
});
