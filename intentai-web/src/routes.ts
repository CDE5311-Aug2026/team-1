import type { QuestionLink } from './data/domain';
// Every app path, defined once. Pages navigate with these constants, never with string literals.
export const paths = {
  today: '/',
  holiday: '/holidays/deepavali',
  ask: '/ask',
  community: '/community',
  question: (id: string) => `/community/${encodeURIComponent(id)}`,
  /** Figma C5 "Locals near your places": questions and locals who share their area, on the Nearby map. */
  communityMap: '/community/map',
  moments: '/moments',
  /** Nearby Explore (map / list). */
  nearby: '/nearby',
  /** Legacy heads-up phrase screen (Figma 11:1414), reached from the nine-setting selector. */
  phrases: '/nearby/phrases',
  /** Nine language settings ("Phrases for a setting", Figma 11:1571). */
  places: '/nearby/places',
  nearbyLocation: '/nearby/location',
  collections: '/nearby/collections',
  collection: (id: string) => `/nearby/collections/${encodeURIComponent(id)}`,
  saved: '/nearby/saved',
  nearbyPlace: (key: string) => `/nearby/place/${encodeURIComponent(key)}`,
  mySpace: '/my-space',
  /** Figma S2 / S3. */
  mySpaceSettings: '/my-space/settings',
  mySpacePrivacy: '/my-space/privacy',
  /** Figma 2 / 7: a place's Album Rail of cards (place key = Nearby catalogue key or area id). */
  place: (key: string) => `/place/${encodeURIComponent(key)}`,
  /** Figma 3–6 / 8–11: one culture card (Today article id). */
  card: (id: string) => `/card/${encodeURIComponent(id)}`,
  notices: '/my-space/notices',
  noticeDetails: '/my-space/notices/details',
  noticeEdit: '/my-space/notices/details/edit',
  noticeConfirmed: '/my-space/notices/confirmed',
  noticeRejected: '/my-space/notices/rejected',
  welcome: '/onboarding',
  onboardingTime: '/onboarding/time',
  onboardingTopics: '/onboarding/topics',
  onboardingQuiz: '/onboarding/quiz',
  onboardingResult: '/onboarding/result',
  todaySetup: '/today-setup',
} as const;

/** Usage dashboard for the team. Kept out of `paths` so the app never links to it and page loops skip it. */
export const ADMIN_PATH = '/admin';

/** Route patterns with params, for <Route path>. Keep in sync with the builders in `paths`. */
export const patterns = {
  question: '/community/:questionId',
  nearbyPlace: '/nearby/place/:placeKey',
  collection: '/nearby/collections/:collectionId',
  place: '/place/:placeKey',
  card: '/card/:cardId',
} as const;

/** Static paths for smoke tests (routes with params are covered with seeded ids in e2e/routes.ts). */
export const ALL_STATIC_PATHS: string[] = Object.values(paths).filter((p) => typeof p === 'string') as string[];

/** Router state that pre-fills Ask: the question is asked on arrival (Nearby → "Ask IntentAI"). */
export interface AskHandoff {
  prompt: string;
  context?: string;
  /** Nearby area id: Ask asks about that area's culture cards when it has any. */
  area?: string;
}

/** Router state that opens Community's "Ask a local" dialog with a draft (Moments → "Not sure", Ask → "Ask a local"). */
export interface CommunityHandoff {
  askLocal: string;
  /** Where the phrase was heard (Ask's context), filled into the dialog. */
  context?: string;
  /** What the question is about and what a local's answer can be added to. */
  link?: QuestionLink;
}
