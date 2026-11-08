import { expect, test } from 'vitest';
import { ADMIN_PATH, ALL_STATIC_PATHS, paths } from '../routes';
import { pageNameFor } from './names';

// The retired v1 explorer paths only redirect to Home, so they are not pages and are never named.
const RETIRED = new Set<string>([paths.nearby, paths.nearbyLocation]);

test('every app page has a readable name', () => {
  for (const path of ALL_STATIC_PATHS) if (!RETIRED.has(path)) expect(pageNameFor(path), path).not.toBeNull();
  expect(pageNameFor(paths.today)).toBe('Today');
  expect(pageNameFor(paths.hunt)).toBe('Hunt');
  expect(pageNameFor(paths.noticeConfirmed)).toBe('Notice result');
  expect(pageNameFor(paths.noticeRejected)).toBe('Notice result');
  expect(pageNameFor(paths.todaySetup)).toBe('Topic picker');
  expect(pageNameFor(paths.welcome)).toBe('Welcome');
  // Nearby: the place / collection id in the path is never part of the name
  expect(pageNameFor(paths.nearbyPlace('curated:sg-merlion-park'))).toBe('Nearby place');
  expect(pageNameFor(paths.collection('sg-100'))).toBe('Nearby collection');
  expect(pageNameFor(paths.saved)).toBe('Nearby saved');
});

test('the retired explorer paths are not tracked pages', () => {
  expect(pageNameFor(paths.nearby)).toBeNull();
  expect(pageNameFor(paths.nearbyLocation)).toBeNull();
});

test('the dashboard and unknown paths are never tracked', () => {
  expect(ALL_STATIC_PATHS).not.toContain(ADMIN_PATH);
  expect(pageNameFor(ADMIN_PATH)).toBeNull();
  expect(pageNameFor('/nowhere')).toBeNull();
});
