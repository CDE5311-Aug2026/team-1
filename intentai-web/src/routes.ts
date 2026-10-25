// Every app path, defined once. Pages navigate with these constants, never with string literals.
export const paths = {
  today: '/',
  holiday: '/holidays/deepavali',
  ask: '/ask',
  community: '/community',
  question: (id: string) => `/community/${encodeURIComponent(id)}`,
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
} as const;

/** Static paths for smoke tests (routes with params are covered with seeded ids in e2e/routes.ts). */
export const ALL_STATIC_PATHS: string[] = Object.values(paths).filter((p) => typeof p === 'string') as string[];

/** Router state that pre-fills Ask: the question is asked on arrival (Nearby → "Ask IntentAI"). */
export interface AskHandoff {
  prompt: string;
  context?: string;
}

/** Router state that opens Community's "Ask a local" dialog with a draft (Moments → "Not sure"). */
export interface CommunityHandoff {
  askLocal: string;
}
