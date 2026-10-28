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
  // Nearby Explorer: names only, never the place or collection id in the path
  [paths.phrases, 'Nearby phrases'],
  [paths.nearbyLocation, 'Nearby location'],
  [patterns.nearbyPlace, 'Nearby place'],
  [paths.collections, 'Nearby collections'],
  [patterns.collection, 'Nearby collection'],
  [paths.saved, 'Nearby saved'],
  [paths.mySpace, 'My Space'],
  [paths.mySpaceSettings, 'My Space settings'],
  [paths.mySpacePrivacy, 'My Space privacy'],
  [paths.licences, 'Licences'],
  [paths.notices, 'Notices'],
  [paths.noticeDetails, 'Notice details'],
  [paths.noticeEdit, 'Notice edit'],
  [paths.noticeConfirmed, 'Notice result'],
  [paths.noticeRejected, 'Notice result'],
  [paths.onboarding, 'Onboarding'],
  [paths.todaySetup, 'Topic picker'],
];

/** The page's tracking name, or null for pages that are never tracked (the dashboard, unknown paths). */
export function pageNameFor(pathname: string): string | null {
  return PAGE_NAMES.find(([path]) => matchPath(path, pathname))?.[1] ?? null;
}

/** Every tracked page name once, in the route table's order (the dashboard lists pages nobody opened). */
export const TRACKED_PAGE_NAMES: string[] = [...new Set(PAGE_NAMES.map(([, name]) => name))];
