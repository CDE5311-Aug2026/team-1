import {
  DEFAULT_NOTICES,
  DEFAULT_ONBOARDING,
  DEFAULT_PLACE,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  EMPTY_PROFILE,
  SEED_LOOKUPS,
  SEED_QUESTIONS,
  isLookupList,
  isNotices,
  isOnboarding,
  isPlace,
  isProfile,
  isQuestionList,
  isReportList,
  isSavedIds,
  isSettings,
  makeId,
  type Lookup,
  type Notices,
  type Onboarding,
  type Place,
  type Profile,
  type Question,
  type Report,
  type Settings,
} from './domain';
import { dismissToast } from '../hooks/useToast';
import { DEFAULT_PREFS, isCulturePrefs, type CulturePrefs } from './culturePrefs';
import { DEFAULT_EXPLORE_PERSONAL, isExplorePersonalData, type ExplorePersonalData } from '../features/nearby/domain';
import { stopLocation } from '../features/nearby/location';
import { isPlaceProgress, type PlaceProgress } from './placeProgress';
import { createPersistentStore } from './persistentStore';
import { clearLocalUsage } from '../usage/localLog';
import { NO_STREAK, isDailyProgress, isStreak, todayKey, type DailyProgress, type Streak } from './progress';

// Every persisted key is declared here, once, with its schema. Pages import stores; they never create them.
export const progressStore = createPersistentStore<DailyProgress>({
  key: 'progress',
  fallback: { date: todayKey(), learnedIds: [] },
  isValid: isDailyProgress,
});

/** Day streak shown in the Today header; App records each day's visit. */
export const streakStore = createPersistentStore<Streak>({
  key: 'streak',
  fallback: NO_STREAK,
  isValid: isStreak,
});

/** Onboarding writes it; App reads `done` to decide the first screen. */
export const onboardingStore = createPersistentStore<Onboarding>({
  key: 'onboarding',
  fallback: DEFAULT_ONBOARDING,
  isValid: isOnboarding,
});

/** Onboarding result writes it; My Space reads and edits it. */
export const profileStore = createPersistentStore<Profile>({
  key: 'profile',
  fallback: DEFAULT_PROFILE,
  isValid: isProfile,
});

/** My Space owns the switches; Today, Nearby, Community and Moments read them. */
export const settingsStore = createPersistentStore<Settings>({
  key: 'settings',
  fallback: DEFAULT_SETTINGS,
  isValid: isSettings,
});

/** Ask and lessons add lookups; Moments lists, marks and deletes them. */
export const lookupsStore = createPersistentStore<Lookup[]>({
  key: 'lookups',
  fallback: SEED_LOOKUPS,
  isValid: isLookupList,
});

/** Community questions asked anonymously (stored on this device only). */
export const questionsStore = createPersistentStore<Question[]>({
  key: 'questions',
  fallback: SEED_QUESTIONS,
  isValid: isQuestionList,
});

/** Place picked on the Nearby place list. */
export const placeStore = createPersistentStore<Place>({
  key: 'place',
  fallback: DEFAULT_PLACE,
  isValid: isPlace,
});

/** The AI occasion notice in My Space and its editable details. */
export const noticesStore = createPersistentStore<Notices>({
  key: 'notices',
  fallback: DEFAULT_NOTICES,
  isValid: isNotices,
});

/** Ask answer reports ("Report this answer"). */
export const reportsStore = createPersistentStore<Report[]>({
  key: 'reports',
  fallback: [],
  isValid: isReportList,
});

/** Expressions saved from the phrase dialog. */
export const savedStore = createPersistentStore<string[]>({
  key: 'saved',
  fallback: [],
  isValid: isSavedIds,
});

/** The "Make Today yours" questionnaire writes it; Today reads it. Kept apart from onboarding so old records stay valid. */
export const culturePrefsStore = createPersistentStore<CulturePrefs>({
  key: 'culturePrefs',
  fallback: DEFAULT_PREFS,
  isValid: isCulturePrefs,
});

/** Phrase-bank ids collected by opening their Today's-three card (the Moments passport). */
export const collectedStore = createPersistentStore<string[]>({
  key: 'collected',
  fallback: [],
  isValid: isSavedIds,
});

/** Facets opened per Home place (a facet counts once). */
export const placeProgressStore = createPersistentStore<PlaceProgress>({
  key: 'placeProgress',
  fallback: {},
  isValid: isPlaceProgress,
});

/** Anonymous random id sent with usage timings (time only, never content). Empty until first needed. */
export const usageIdStore = createPersistentStore<string>({
  key: 'usage-id',
  fallback: '',
  isValid: (value): value is string => typeof value === 'string',
});

export function ensureUsageId(): string {
  if (usageIdStore.get() === '') usageIdStore.set(makeId());
  return usageIdStore.get();
}

/** User test: the name typed at the start screen (a test name, not an account). Empty = not started. */
export interface Tester {
  name: string;
  startedAt?: number;
}
export const testerStore = createPersistentStore<Tester>({
  key: 'tester',
  fallback: { name: '' },
  isValid: (value): value is Tester =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Tester).name === 'string' &&
    ((value as Tester).startedAt === undefined || typeof (value as Tester).startedAt === 'number'),
});

/** Nearby Explorer: saved / visited places and exploration preferences. Never holds a location. */
export const explorePersonalStore = createPersistentStore<ExplorePersonalData>({
  key: 'explore-personal',
  fallback: DEFAULT_EXPLORE_PERSONAL,
  isValid: isExplorePersonalData,
});

let generation = 0;
const generationListeners = new Set<() => void>();
/** Bumped by deleteAllData: pending requests and Undo callbacks from before must not write back. */
export function dataGeneration() {
  return generation;
}
export function onDataDeleted(listener: () => void) {
  generationListeners.add(listener);
  return () => {
    generationListeners.delete(listener);
  };
}

/**
 * My Space "Delete all my data": writes empty values rather than removing keys, so seeded demo
 * content does not reappear, and the next launch starts at onboarding.
 */
export function deleteAllData() {
  // A pending Undo (e.g. a deleted lookup) must not write data back after everything is deleted.
  dismissToast();
  generation++;
  // Location is in memory only: clear it and invalidate any pending position or search callback.
  stopLocation();
  explorePersonalStore.set({ ...DEFAULT_EXPLORE_PERSONAL, places: [] });
  onboardingStore.set({ ...DEFAULT_ONBOARDING, done: false });
  profileStore.set(EMPTY_PROFILE);
  settingsStore.set(DEFAULT_SETTINGS);
  lookupsStore.set([]);
  questionsStore.set([]);
  placeStore.set(DEFAULT_PLACE);
  noticesStore.set(DEFAULT_NOTICES);
  reportsStore.set([]);
  savedStore.set([]);
  progressStore.set({ date: todayKey(), learnedIds: [] });
  streakStore.set(NO_STREAK);
  culturePrefsStore.set(DEFAULT_PREFS);
  collectedStore.set([]);
  placeProgressStore.set({});
  usageIdStore.set('');
  // The user test goes on (the test name is not personal data); its records on this device are deleted.
  clearLocalUsage();
  generationListeners.forEach((listener) => listener());
}
