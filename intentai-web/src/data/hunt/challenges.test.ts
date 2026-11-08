import { beforeEach, expect, test } from 'vitest';
import { findStory, ONSITE_ROUTES } from '../../findsg';
import { curatedPlace } from '../../features/nearby/catalogue';
import { distanceM } from '../../features/nearby/geo';
import { resetPersistentStores } from '../persistentStore';
import pins from './stopPins.json';
import {
  CHALLENGES,
  STOP_PLACES,
  challengeTimer,
  openChallenges,
  readStoryCheckins,
  regionChallenge,
  stopProgress,
  timerText,
} from './challenges';
import { HUNT_CHALLENGES } from './stories';

const byId = (id: string) => CHALLENGES.find((c) => c.id === id);

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
  const civic = byId('wk45-civic')!;
  expect(civic).toMatchObject({ title: 'Civic District', kind: 'Weekend', category: 'att', region: 'central' });
  expect(civic.stops).toHaveLength(8);
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

test('a challenge is open until its last day is over', () => {
  expect(openChallenges('2026-11-08').map((c) => c.id)).toEqual(['wk45-civic', 'wk46-kampong']);
  expect(openChallenges('2026-11-09').map((c) => c.id)).toEqual(['wk46-kampong']);
  expect(openChallenges('2026-11-16')).toEqual([]);
});

test('a region’s challenge: the one running there today, else the next there; none for a region without one', () => {
  expect(regionChallenge('central', '2026-11-07')?.id).toBe('wk45-civic');
  expect(regionChallenge('central', '2026-11-08')?.id).toBe('wk45-civic');
  expect(regionChallenge('central', '2026-11-09')?.id).toBe('wk46-kampong');
  expect(regionChallenge('central', '2026-11-16')).toBeUndefined();
  expect(regionChallenge('east', '2026-11-08')).toBeUndefined();
  // only from the list it is given (Home passes the open ones)
  expect(regionChallenge('central', '2026-11-08', [])).toBeUndefined();
});

test('the story’s check-ins read straight from its saves, as loadStoryStops reads them through the game', () => {
  localStorage.setItem(
    'findsg-onsite-v1:civic-f1:manual',
    JSON.stringify({
      stops: {
        'civic-f1-01': { checkin: { mode: 'manual', confirmedAt: '2026-11-07T01:00:00.000Z' } },
        'civic-f1-02': { checkin: { mode: 'preview', confirmedAt: '2026-11-07T01:10:00.000Z' } },
        'civic-f1-03': { checkin: { mode: 'manual', confirmedAt: 'not a date' } },
        'civic-f1-04': { checkin: null },
        'telok-ayer-01': { checkin: { mode: 'manual', confirmedAt: '2026-11-07T01:00:00.000Z' } },
      },
    }),
  );
  localStorage.setItem(
    'findsg-onsite-v1:civic-f1:preview',
    JSON.stringify({ stops: { 'civic-f1-01': { checkin: { mode: 'preview', confirmedAt: '2026-11-06T23:00:00.000Z' } }, 'civic-f1-05': { checkin: { mode: 'preview', confirmedAt: '2026-11-07T02:00:00.000Z' } } } }),
  );
  const got = readStoryCheckins('civic-f1');
  expect(Object.fromEntries(Object.entries(got).map(([k, v]) => [k, v.checkedAt]))).toEqual({
    'civic-f1-01': '2026-11-06T23:00:00.000Z',
    'civic-f1-05': '2026-11-07T02:00:00.000Z',
  });
  localStorage.setItem('findsg-onsite-v1:civic-f1:manual', '{nope');
  localStorage.removeItem('findsg-onsite-v1:civic-f1:preview');
  expect(readStoryCheckins('civic-f1')).toEqual({});
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
  const civic = byId('wk45-civic')!;
  const s = stopProgress(civic, null, {
    places: [{ placeKey: 'curated:sg-old-hill-street-police-station', saved: false, visited: true, visitedOn: '2026-11-07', updatedAt: '2026-11-07T00:00:00Z' }],
  } as never);
  expect(s.filter((x) => x.stamp).map((x) => x.stop.id)).toEqual(['civic-f1-02']);
  expect(s[1].stamp).toEqual({ day: '2026-11-07', exact: false });
});

test('nothing about challenges is kept on the phone any more (the challenge page and its Join were retired)', async () => {
  const mod = await import('./challenges');
  expect(Object.keys(mod).filter((k) => /join/i.test(k))).toEqual([]);
});
