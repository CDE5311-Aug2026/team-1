import { expect, test } from 'vitest';
import { ADMIN_PATH, ALL_STATIC_PATHS, paths } from '../routes';
import { pageNameFor } from './names';

test('every app page has a readable name', () => {
  for (const path of ALL_STATIC_PATHS) expect(pageNameFor(path), path).not.toBeNull();
  expect(pageNameFor(paths.today)).toBe('Today');
  expect(pageNameFor(paths.question('sabo'))).toBe('Community question');
  expect(pageNameFor(paths.noticeConfirmed)).toBe('Notice result');
  expect(pageNameFor(paths.noticeRejected)).toBe('Notice result');
  expect(pageNameFor(paths.todaySetup)).toBe('Topic picker');
  expect(pageNameFor(paths.welcome)).toBe('Welcome');
  // Nearby: the place / collection id in the path is never part of the name
  expect(pageNameFor(paths.nearbyPlace('curated:sg-merlion-park'))).toBe('Nearby place');
  expect(pageNameFor(paths.collection('sg-100'))).toBe('Nearby collection');
  expect(pageNameFor(paths.nearby)).toBe('Nearby');
  // Place stories: the place and card ids are never part of the name
  expect(pageNameFor(paths.homePlace('chinatown'))).toBe('Place');
  for (const facet of ['food', 'monument', 'festival', 'history']) expect(pageNameFor(paths.placeCard('berlin-wall-fragments', facet))).toBe('Place card');
});

test('the dashboard and unknown paths are never tracked', () => {
  expect(ALL_STATIC_PATHS).not.toContain(ADMIN_PATH);
  expect(pageNameFor(ADMIN_PATH)).toBeNull();
  expect(pageNameFor('/nowhere')).toBeNull();
});
