import { beforeEach, expect, test } from 'vitest';
import { findStory, ONSITE_ROUTES } from '../../findsg';
import { curatedPlace } from '../../features/nearby/catalogue';
import { distanceM } from '../../features/nearby/geo';
import { resetPersistentStores } from '../persistentStore';
import pins from './stopPins.json';
import {
  CHALLENGES,
  STOP_PLACES,
  challengeById,
  challengeJoinedStore,
  challengeTimer,
  isJoinedChallenges,
  joinChallenge,
  leaveChallenge,
  longDates,
  openChallenges,
  shortDates,
  stopProgress,
  timerText,
} from './challenges';
import { HUNT_CHALLENGES } from './stories';

beforeEach(() => {
  localStorage.clear();
  resetPersistentStores();
});

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

test('every challenge wraps a Hunt challenge and its story route: same id, dates and the route’s stops in order', () => {
  expect(CHALLENGES.map((c) => c.id)).toEqual(HUNT_CHALLENGES.map((c) => c.id));
  for (const c of CHALLENGES) {
    const h = HUNT_CHALLENGES.find((x) => x.id === c.id)!;
    expect([c.from, c.to, c.routeId]).toEqual([h.from, h.to, h.routeId]);
    expect(c.stops.map((s) => s.id)).toEqual(ONSITE_ROUTES[c.routeId].stops.map((s) => s.id));
    expect(c.stops.map((s) => s.n)).toEqual(c.stops.map((_, i) => i + 1));
  }
  const civic = challengeById('wk45-civic')!;
  expect(civic).toMatchObject({ title: 'Civic District', kind: 'Weekend', category: 'att', region: 'central' });
  expect(civic.stops).toHaveLength(8);
  expect(challengeById('nope')).toBeUndefined();
});

test('a stop stands at a catalogue place only when its story name names the place, or the pins are the same building (15 m)', () => {
  const PINS = (pins as { stops: Record<string, { lat: number; lng: number }> }).stops;
  for (const [stopId, placeId] of Object.entries(STOP_PLACES)) {
    const place = curatedPlace(placeId);
    expect(place, placeId).toBeDefined();
    const routeId = stopId.replace(/-\d+$/, '');
    const k = ONSITE_ROUTES[routeId].stops.findIndex((s) => s.id === stopId);
    const name = norm(findStory(routeId).stops[k].name);
    const m = distanceM(PINS[stopId], place!.coordinates);
    const aliases = [place!.name, ...(place!.name.match(/\(([^)]+)\)/g) ?? []).map((x) => x.slice(1, -1)), place!.name.replace(/\s*\([^)]*\)/, '')];
    const named = aliases.some((a) => name.includes(norm(a)));
    expect(named || m <= 15, `${stopId} → ${placeId} (${Math.round(m)} m, "${name}")`).toBe(true);
    expect(m, stopId).toBeLessThan(150);
  }
});

test('dates read as on the boards', () => {
  expect(shortDates('2026-11-07', '2026-11-08')).toBe('7–8 Nov');
  expect(longDates('2026-11-07', '2026-11-08')).toBe('Sat 7 – Sun 8 Nov');
  expect(shortDates('2026-11-30', '2026-12-01')).toBe('30 Nov – 1 Dec');
  expect(shortDates('2026-11-08', '2026-11-08')).toBe('8 Nov');
  expect(openChallenges('2026-11-08').map((c) => c.id)).toEqual(['wk45-civic', 'wk46-kampong']);
  expect(openChallenges('2026-11-09').map((c) => c.id)).toEqual(['wk46-kampong']);
});

test('the clock runs from the first stamp to the last', () => {
  expect(challengeTimer([], 6)).toEqual({ kind: 'none' });
  expect(challengeTimer([{ at: '2026-11-07T09:00:00Z', exact: true }], 6).kind).toBe('running');
  const t = challengeTimer(
    [
      { at: '2026-11-07T10:36:00Z', exact: true },
      { at: '2026-11-07T09:00:00Z', exact: true },
    ],
    2,
  );
  expect(t).toEqual({ kind: 'minutes', minutes: 96, finished: true });
  expect(timerText(t)).toBe('1 h 36 min');
  // a place check-in keeps only its day: the clock counts days then
  const d = challengeTimer(
    [
      { at: '2026-11-07T09:00:00', exact: true },
      { day: '2026-11-08', exact: false },
    ],
    6,
  );
  expect(d).toEqual({ kind: 'days', days: 1, finished: false });
  expect(timerText({ kind: 'days', days: 0, finished: true })).toBe('Same day');
});

test('a check-in at a stop’s catalogue place stamps the stop, with its day', () => {
  const civic = challengeById('wk45-civic')!;
  const s = stopProgress(civic, null, {
    places: [{ placeKey: 'curated:sg-old-hill-street-police-station', saved: false, visited: true, visitedOn: '2026-11-07', updatedAt: '2026-11-07T00:00:00Z' }],
  } as never);
  expect(s.filter((x) => x.stamp).map((x) => x.stop.id)).toEqual(['civic-f1-02']);
  expect(s[1].stamp).toEqual({ day: '2026-11-07', exact: false });
});

test('joining is kept on this phone only, once per challenge, and can be undone', () => {
  joinChallenge('wk45-civic', new Date('2026-11-07T09:00:00Z'));
  joinChallenge('wk45-civic', new Date('2026-11-08T09:00:00Z'));
  expect(challengeJoinedStore.get()).toEqual({ 'wk45-civic': { joinedAt: '2026-11-07T09:00:00.000Z' } });
  expect(JSON.parse(localStorage.getItem('intentai:v1:challenge-joined')!)).toEqual({ 'wk45-civic': { joinedAt: '2026-11-07T09:00:00.000Z' } });
  leaveChallenge('wk45-civic');
  expect(challengeJoinedStore.get()).toEqual({});
  expect(isJoinedChallenges({ x: { joinedAt: 'not a date' } })).toBe(false);
  expect(isJoinedChallenges([])).toBe(false);
});
