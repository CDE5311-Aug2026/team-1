import { matchPath } from 'react-router-dom';
import { paths, patterns } from '../routes';

// Readable names sent with page timings. Built from the route table so URLs, query strings and
// question ids never leave the phone.
const PAGE_NAMES: [path: string, name: string][] = [
  [paths.today, 'Today'],
  [paths.holiday, 'Holiday'],
  [paths.ask, 'Ask'],
  [paths.community, 'Community'],
  [patterns.question, 'Community question'],
  [paths.moments, 'Moments'],
  [paths.nearby, 'Nearby'],
  [paths.places, 'Places'],
  [paths.mySpace, 'My Space'],
  [paths.notices, 'Notices'],
  [paths.noticeDetails, 'Notice details'],
  [paths.noticeEdit, 'Notice edit'],
  [paths.noticeConfirmed, 'Notice result'],
  [paths.noticeRejected, 'Notice result'],
  [paths.welcome, 'Welcome'],
  [paths.onboardingTime, 'Onboarding time'],
  [paths.onboardingTopics, 'Onboarding topics'],
  [paths.onboardingQuiz, 'Onboarding quiz'],
  [paths.onboardingResult, 'Onboarding result'],
  [paths.todaySetup, 'Topic picker'],
];

/** The page's tracking name, or null for pages that are never tracked (the dashboard, unknown paths). */
export function pageNameFor(pathname: string): string | null {
  return PAGE_NAMES.find(([path]) => matchPath(path, pathname))?.[1] ?? null;
}
