import { beforeEach, expect, test, vi } from 'vitest';
// @ts-expect-error the game's modules are untyped
import { ROUTES } from '../../findsg/app/data.js';
// @ts-expect-error the game's modules are untyped
import { OM_ID } from '../../findsg/app/om/om-content.js';
// @ts-expect-error the game's modules are untyped
import { shortKey } from '../../findsg/app/short/short-state.js';
import { DEFAULT_EXPLORE_PERSONAL } from '../../features/nearby/domain';
import { buildStamps, stampVisits } from './moments';
import { HUNT_AREAS, SHORT_STORY_SAVE, huntVisits } from './huntVisits';
import source from './huntVisits.ts?raw';

const onsite = (story: string, stop: string, mode = 'manual') =>
  localStorage.setItem(`findsg-onsite-v1:${story}:${mode}`, JSON.stringify({ stops: { [stop]: { checkin: { mode, confirmedAt: '2026-11-02T08:00:00.000Z' } } } }));
const stamped = () => buildStamps(DEFAULT_EXPLORE_PERSONAL, [], {}, huntVisits()).filter((s) => s.collected);

beforeEach(() => localStorage.clear());

test('an on-site check-in in each story stamps its area', () => {
  const expected: [string, string][] = [
    ['only-one-missing', 'Kampong Glam'],
    ['telok-ayer', 'Chinatown'],
    ['kampong-gelam', 'Kampong Glam'],
    ['civic-f1', 'Marina Bay'],
    ['balestier', 'Balestier'],
  ];
  for (const [story, name] of expected) {
    localStorage.clear();
    onsite(story, `${story}-01`);
    expect(stamped().map((s) => s.subject.short)).toEqual([name]);
    expect(stamped()[0].checkedInOn).toBe('2026-11-02');
  }
});

test('remote play never stamps', () => {
  onsite('civic-f1', 'civic-f1-01', 'preview');
  localStorage.setItem('findsg-short-v2:gold-under-glass:preview', JSON.stringify({ arrival1: true }));
  expect(huntVisits()).toEqual([]);
});

test('both short-story arrivals stamp Kampong Glam, undated', () => {
  localStorage.setItem(SHORT_STORY_SAVE, JSON.stringify({ arrival1: true, arrival2: true }));
  expect(huntVisits().map((v) => v.stop)).toEqual(['arrival1', 'arrival2']);
  const [stamp] = stamped();
  expect(stamp.subject.short).toBe('Kampong Glam');
  expect(stampVisits(stamp, DEFAULT_EXPLORE_PERSONAL).map((v) => v.name)).toEqual(['101 Jalan Sultan', 'Sultan Mosque']);
});

test('a broken save is ignored, and reading writes nothing', () => {
  localStorage.setItem('findsg-onsite-v1:telok-ayer:manual', '{nope');
  localStorage.setItem('findsg-onsite-v1:balestier:manual', JSON.stringify({ stops: { x: null, y: { checkin: null } } }));
  const before = localStorage.length;
  expect(huntVisits()).toEqual([]);
  expect(localStorage.length).toBe(before);
});

test('every story is covered, and the keys match what the game saves', () => {
  for (const id of [...Object.keys(ROUTES), OM_ID as string, 'short']) expect(HUNT_AREAS[id], id).toBeTruthy();
  expect(shortKey('manual')).toBe(SHORT_STORY_SAVE);
});

test('old callers are unchanged', () => {
  expect(buildStamps(DEFAULT_EXPLORE_PERSONAL, [], {}).filter((s) => s.collected)).toEqual([]);
});

test('a check-in is dated by the local calendar, not UTC', () => {
  vi.stubEnv('TZ', 'Asia/Singapore');
  // 07:30 on 3 Nov in Singapore is still 2 Nov in UTC
  localStorage.setItem('findsg-onsite-v1:telok-ayer:manual', JSON.stringify({ stops: { a: { checkin: { mode: 'manual', confirmedAt: '2026-11-02T23:30:00.000Z' } } } }));
  expect(huntVisits()).toEqual([{ story: 'telok-ayer', stop: 'a', on: '2026-11-03' }]);
  localStorage.setItem('findsg-onsite-v1:telok-ayer:manual', JSON.stringify({ stops: { a: { checkin: { mode: 'manual', confirmedAt: 'not a date' } } } }));
  expect(huntVisits()[0].on).toBeUndefined();
  vi.unstubAllEnvs();
});

test('it stays light: no game or shelf code', () => {
  expect(source).not.toMatch(/from ['"]/);
});
