// Every app path, defined once. Pages navigate with these constants, never with string literals.
export const paths = {
  today: '/',
  holiday: '/holidays/deepavali',
  moments: '/moments',
  /** Hunt: the treasure-hunt game (spec to come; placeholder for now). */
  hunt: '/hunt',
  /** Nearby Explore (map / list). */
  nearby: '/nearby',
  nearbyLocation: '/nearby/location',
  collections: '/nearby/collections',
  collection: (id: string) => `/nearby/collections/${encodeURIComponent(id)}`,
  saved: '/nearby/saved',
  /** Tour routes from the Singapore Culture Atlas: the editor's routes and "make a route from a station". */
  routes: '/nearby/routes',
  route: (id: string) => `/nearby/routes/${encodeURIComponent(id)}`,
  /** A route generated from a station; the query (station, budget, mode, theme, date) makes it shareable. */
  routePlan: (search: string) => `/nearby/routes/plan${search ? `?${search}` : ''}`,
  nearbyPlace: (key: string) => `/nearby/place/${encodeURIComponent(key)}`,
  mySpace: '/my-space',
  /** Figma S2 / S3. */
  mySpaceSettings: '/my-space/settings',
  mySpacePrivacy: '/my-space/privacy',
  /** Terms & licences: photo credits, map attribution (from Settings). */
  licences: '/my-space/licences',
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
  nearbyPlace: '/nearby/place/:placeKey',
  collection: '/nearby/collections/:collectionId',
  routePlan: '/nearby/routes/plan',
  route: '/nearby/routes/:routeId',
} as const;

/** Static paths for smoke tests (routes with params are covered with seeded ids in e2e/routes.ts). */
export const ALL_STATIC_PATHS: string[] = Object.values(paths).filter((p) => typeof p === 'string') as string[];
