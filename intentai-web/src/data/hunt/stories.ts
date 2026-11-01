// Hunt (owner, 1 Nov 2026): story hunts on real streets. The stories themselves are the owner's FindSG prototype
// (src/findsg, imported as-is): the short Beneath the Golden Dome and four routes, each stop a check-in, an observation and a 3D
// building puzzle. This file holds what Hunt adds around them: the public challenges and the boards.

/** The FindSG routes, by id (src/findsg/app/data.js ROUTES). */
export const HUNT_ROUTE_IDS = ['telok-ayer', 'kampong-gelam', 'balestier', 'civic-f1'] as const;
export type HuntRouteId = (typeof HUNT_ROUTE_IDS)[number];

/** A public challenge: a story route raced against the clock in a set window. */
export interface HuntChallenge {
  id: string;
  routeId: HuntRouteId;
  title: string;
  /** ISO dates, inclusive. */
  from: string;
  to: string;
  players: number;
  bestMinutes: number;
}

export const HUNT_CHALLENGES: readonly HuntChallenge[] = [
  { id: 'wk45-civic', routeId: 'civic-f1', title: 'Weekend challenge · Civic District', from: '2026-11-07', to: '2026-11-08', players: 214, bestMinutes: 96 },
  {
    id: 'wk46-kampong',
    routeId: 'kampong-gelam',
    title: 'Weekend challenge · Kampong Gelam',
    from: '2026-11-14',
    to: '2026-11-15',
    players: 0,
    bestMinutes: 0,
  },
];

/** Board rows: SAMPLE players until the leaderboard service exists. */
export interface BoardRow {
  name: string;
  value: number;
}

export const SAMPLE_EXPLORERS: readonly BoardRow[] = [
  { name: 'Mei Ling', value: 186 },
  { name: 'Arjun K.', value: 171 },
  { name: 'Siti N.', value: 163 },
  { name: 'Daniel T.', value: 149 },
  { name: 'Hui Wen', value: 138 },
  { name: 'Farid', value: 126 },
  { name: 'Priya R.', value: 117 },
  { name: 'Jun Hao', value: 104 },
];

export const SAMPLE_SPEED: readonly BoardRow[] = [
  { name: 'Arjun K.', value: 96 },
  { name: 'Hui Wen', value: 102 },
  { name: 'Farid', value: 109 },
  { name: 'Mei Ling', value: 115 },
  { name: 'Daniel T.', value: 121 },
  { name: 'Siti N.', value: 128 },
];

export const rankAmong = (rows: readonly { value: number }[], mine: number, lowerIsBetter = false) =>
  1 + rows.filter((r) => (lowerIsBetter ? r.value < mine : r.value > mine)).length;

/** Where SAMPLE players are right now, for the community board at the top of Stories. */
export const SAMPLE_OUT_NOW: Readonly<Record<string, { place: string; minutesAgo: number }>> = {
  'Mei Ling': { place: 'Telok Ayer', minutesAgo: 4 },
  'Arjun K.': { place: 'Civic District', minutesAgo: 11 },
  'Siti N.': { place: 'Kampong Gelam', minutesAgo: 26 },
  'Daniel T.': { place: 'Balestier', minutesAgo: 52 },
};

/** Maps finished before these stories (SAMPLE history for the display case until accounts carry real records). */
export interface PastMap {
  id: string;
  title: string;
  place: string;
  stops: number;
  finished: string;
}
export const SAMPLE_PAST_MAPS: readonly PastMap[] = [
  { id: 'chinatown-night', title: 'Chinatown by Night', place: 'Chinatown', stops: 6, finished: '2026-09-14' },
  { id: 'joo-chiat', title: 'Joo Chiat Shophouses', place: 'Joo Chiat', stops: 5, finished: '2026-10-03' },
  { id: 'tiong-bahru', title: 'Tiong Bahru Estate', place: 'Tiong Bahru', stops: 7, finished: '2026-10-19' },
];
