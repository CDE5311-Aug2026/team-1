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
});

test('the dashboard and unknown paths are never tracked', () => {
  expect(ALL_STATIC_PATHS).not.toContain(ADMIN_PATH);
  expect(pageNameFor(ADMIN_PATH)).toBeNull();
  expect(pageNameFor('/nowhere')).toBeNull();
});
