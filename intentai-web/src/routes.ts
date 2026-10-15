// Every app path, defined once. Pages navigate with these constants, never with string literals.
export const paths = {
  today: '/',
  ask: '/ask',
  community: '/community',
  question: (id: string) => `/community/${encodeURIComponent(id)}`,
  moments: '/moments',
  nearby: '/nearby',
  places: '/nearby/places',
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
} as const;

/** Route patterns with params, for <Route path>. Keep in sync with the builders in `paths`. */
export const patterns = {
  question: '/community/:questionId',
} as const;

/** Static paths for smoke tests (the question route is covered with a seeded id). */
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
