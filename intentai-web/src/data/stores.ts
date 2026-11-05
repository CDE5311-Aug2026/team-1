import { announceSavesCleared, isDeviceDataKey } from './deviceKeys';
import { deleteAllPhotos } from './journal/photos';
import { PASSWORD_KEY } from '../pages/AdminPage/password';
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
  isTipList,
  isInsightList,
  isAskThreadList,
  makeId,
  type Lookup,
  type Notices,
  type Onboarding,
  type Place,
  type Profile,
  type Question,
  type Report,
  type Settings,
  type Tip,
  type Insight,
  type AskThread,
} from './domain';
import { dismissToast } from '../hooks/useToast';
import { DEFAULT_PREFS, isCulturePrefs, type CulturePrefs } from './culturePrefs';
import { DEFAULT_EXPLORE_PERSONAL, isExplorePersonalData, type ExplorePersonalData } from '../features/nearby/domain';
import { stopLocation } from '../features/nearby/location';
import { isPlaceStories, type Facet, type PlaceState, type PlaceStories, placeState } from './placeStories';
import { createPersistentStore, STORAGE_PREFIX } from './persistentStore';
import { EMPTY_SOCIAL, communitySocialStore } from './community/socialStore';
import { EMPTY_RECAP, recapStore } from './moments/recapStore';
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

/** Per Home place: cards opened (each counts once), check-in and story stamp. */
export const placeStoriesStore = createPersistentStore<PlaceStories>({
  key: 'placeStories',
  fallback: {},
  isValid: isPlaceStories,
});

function updatePlace(id: string, change: (state: PlaceState) => PlaceState) {
  const stories = placeStoriesStore.get();
  placeStoriesStore.set({ ...stories, [id]: change(placeState(stories, id)) });
}

export function markOpened(id: string, facet: Facet) {
  if (placeState(placeStoriesStore.get(), id).opened.includes(facet)) return;
  updatePlace(id, (s) => ({ ...s, opened: [...s.opened, facet] }));
}

export function setCheckedIn(id: string, on: boolean) {
  updatePlace(id, (s) => ({ ...s, checkedIn: on }));
}

/** Collects the story stamp; `isoDate` is the day it was collected (YYYY-MM-DD). */
export function setStamped(id: string, isoDate: string) {
  updatePlace(id, (s) => ({ ...s, stamped: true, stampedOn: isoDate }));
}
/** "Reduce motion" (Ask ⋯ settings, My Space settings): stops the app's animations even when the system allows them. */
export const reduceMotionStore = createPersistentStore<boolean>({
  key: 'reduce-motion',
  fallback: false,
  isValid: (value): value is boolean => typeof value === 'boolean',
});

/** Ask chat history (ZIP prototype History). Each record keeps what is needed to rebuild the answers. */
export const askThreadsStore = createPersistentStore<AskThread[]>({
  key: 'ask-threads',
  fallback: [],
  isValid: isAskThreadList,
});

/** Ask answers saved with "Save insight" (shown in Moments). */
export const insightsStore = createPersistentStore<Insight[]>({
  key: 'insights',
  fallback: [],
  isValid: isInsightList,
});

/** Local answers added to culture cards (Community → card → Ask). */
export const tipsStore = createPersistentStore<Tip[]>({
  key: 'tips',
  fallback: [],
  isValid: isTipList,
});

/** Culture-card (Today article) ids the user has opened: Read more on Today, or Open on an Ask source card. Ask's
 * "Recommended for you" says which one a pick comes from. */
export const openedCardsStore = createPersistentStore<string[]>({
  key: 'opened-cards',
  fallback: [],
  isValid: isSavedIds,
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

/** User-test version: A = map exploration only, B = map exploration plus the Hunt (story quests). */
export type TestVersion = 'A' | 'B';
/** User test: the name typed at the start screen (a test name, not an account). Empty = not started. */
export interface Tester {
  name: string;
  startedAt?: number;
  /** Picked on the start screen. Missing (gate off, older data) means B, the full app. */
  version?: TestVersion;
}
export const testerStore = createPersistentStore<Tester>({
  key: 'tester',
  fallback: { name: '' },
  isValid: (value): value is Tester =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Tester).name === 'string' &&
    ((value as Tester).startedAt === undefined || typeof (value as Tester).startedAt === 'number') &&
    ((value as Tester).version === undefined || (value as Tester).version === 'A' || (value as Tester).version === 'B'),
});

/** The version this phone runs. */
export const versionOf = (tester: Tester): TestVersion => tester.version ?? 'B';

/** The test name as it appears in usage data, with the version: "P01-A". */
export const usageUserOf = (tester: Tester): string | undefined => (tester.name ? `${tester.name.slice(0, 38)}-${versionOf(tester)}` : undefined);

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
export function deleteAllData(): Promise<boolean> {
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
  placeStoriesStore.set({});
  // Pre-release key from an unmerged branch; harmless to drop.
  try {
    localStorage.removeItem('intentai:v1:placeProgress');
    // What the old Memory screen kept; nothing reads it now.
    localStorage.removeItem('intentai:v1:memory');
    // Content waiting from the old app's data; the finished marker stays, so nothing migrates again.
    localStorage.removeItem(`${STORAGE_PREFIX}migration-pending`);
    localStorage.removeItem(`${STORAGE_PREFIX}migration-recovery`);
    // Hunt saves and notes, place ticks: everything kept outside these stores.
    Object.keys(localStorage).filter(isDeviceDataKey).forEach((k) => localStorage.removeItem(k));
    // This session's position and places in Hunt. The admin password is the desk's, not the visitor's.
    Object.keys(sessionStorage)
      .filter((k) => k !== PASSWORD_KEY)
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
  announceSavesCleared();
  openedCardsStore.set([]);
  tipsStore.set([]);
  insightsStore.set([]);
  askThreadsStore.set([]);
  reduceMotionStore.set(false);
  // v3 page stores (their own files; Profile / My Space resets itself through onDataDeleted below).
  communitySocialStore.set(EMPTY_SOCIAL);
  recapStore.set(EMPTY_RECAP);
  usageIdStore.set('');
  // The user test goes on (the test name is not personal data); its records on this device are deleted.
  clearLocalUsage();
  generationListeners.forEach((listener) => listener());
  return deleteAllPhotos();
}

/**
 * Starts the user test again on this phone: every saved choice, visit, stamp and Hunt book is cleared, so the next person
 * sees the start screen and onboarding as new. The usage log stays, so /admin can still read this phone. False, without
 * leaving the page, if journal photos could not be deleted.
 */
export async function restartTest(version: TestVersion = versionOf(testerStore.get())): Promise<boolean> {
  // The phone keeps its version (left phone A, right phone B), so the start screen opens with it picked.
  const cleared = clearPhone(false);
  // Another tab still open on the app may save once more as it hears the clear; clear again after it has stopped.
  await Promise.all([cleared, new Promise((resolve) => window.setTimeout(resolve, 500))]);
  // Only this last clear counts: it covers anything saved since the first. Without it the next person could see the photos.
  if (!(await clearPhone(false))) return false;
  window.location.assign(`/?v=${version}`);
  return true;
}

/**
 * Clears this phone's app data. Always kept: the usage log (for /admin), feedback notes still waiting to send, and the
 * study desk's own keys (which phone this is, a session in progress), which are not the participant's. Resolves true once
 * journal photos are gone too, false if they could not be deleted: wait for it, or the next person can inherit them.
 */
export function clearPhone(keepTester: boolean): Promise<boolean> {
  try {
    // Tell the phone's other tabs first, so they stop saving before their data goes (see the listener below).
    window.localStorage.setItem(PHONE_CLEARED, String(Date.now()));
    const keep = new Set([STORAGE_PREFIX + 'usage-log', 'findsg-help-feedback', ...(keepTester ? [STORAGE_PREFIX + 'tester'] : [])]);
    const gone = Object.keys(window.localStorage).filter((k) => !keep.has(k) && !k.startsWith('intentai:abtest-'));
    gone.forEach((k) => window.localStorage.removeItem(k));
    window.sessionStorage.clear();
  } catch {
    // Storage blocked: the reload that follows still starts at the start screen if nothing was saved.
  }
  return deleteAllPhotos();
}

const PHONE_CLEARED = 'intentai:phone-cleared';

// A tab left open on the app holds the last person's game in memory and would save it back after the phone is cleared.
// When another tab clears the phone, this one stops saving and starts again from the start screen.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== PHONE_CLEARED || !event.newValue) return;
    try {
      Storage.prototype.setItem = () => {};
    } catch {
      // cannot stop saving: the clearing tab clears once more before it reloads
    }
    window.location.replace('/');
  });
}
