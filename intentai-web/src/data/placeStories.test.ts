import { beforeEach, expect, test } from 'vitest';
import { resetPersistentStores } from './persistentStore';
import { isPlaceStories, openedCount, placeState } from './placeStories';
import { deleteAllData, markOpened, placeStoriesStore, setCheckedIn, setStamped } from './stores';

beforeEach(() => {
  localStorage.clear();
  resetPersistentStores();
});

test('isPlaceStories accepts the strict shape only', () => {
  expect(isPlaceStories({})).toBe(true);
  expect(isPlaceStories({ chinatown: { opened: ['food'], checkedIn: false, stamped: false } })).toBe(true);
  expect(isPlaceStories({ chinatown: { opened: ['food'], checkedIn: false, stamped: true, stampedOn: '2026-10-28' } })).toBe(true);
  expect(isPlaceStories({ chinatown: ['food'] })).toBe(false);
  expect(isPlaceStories({ chinatown: { opened: ['x'], checkedIn: false, stamped: false } })).toBe(false);
  expect(isPlaceStories({ chinatown: { opened: [], checkedIn: 'no', stamped: false } })).toBe(false);
  expect(isPlaceStories({ chinatown: { opened: [], checkedIn: false, stamped: false, stampedOn: 5 } })).toBe(false);
  expect(isPlaceStories([])).toBe(false);
  expect(isPlaceStories(null)).toBe(false);
});

test('placeState defaults to nothing done; openedCount is 0', () => {
  expect(placeState({}, 'chinatown')).toEqual({ opened: [], checkedIn: false, stamped: false });
  expect(openedCount({}, 'chinatown')).toBe(0);
});

test('markOpened is idempotent and keeps facet order of first opening', () => {
  markOpened('chinatown', 'food');
  markOpened('chinatown', 'food');
  markOpened('chinatown', 'history');
  const stories = placeStoriesStore.get();
  expect(stories.chinatown.opened).toEqual(['food', 'history']);
  expect(openedCount(stories, 'chinatown')).toBe(2);
});

test('setCheckedIn and setStamped update one place and keep the rest', () => {
  markOpened('chinatown', 'food');
  setCheckedIn('chinatown', true);
  setStamped('chinatown', '2026-10-28');
  expect(placeState(placeStoriesStore.get(), 'chinatown')).toEqual({
    opened: ['food'],
    checkedIn: true,
    stamped: true,
    stampedOn: '2026-10-28',
  });
  setCheckedIn('chinatown', false);
  expect(placeState(placeStoriesStore.get(), 'chinatown').checkedIn).toBe(false);
  expect(placeState(placeStoriesStore.get(), 'berlin-wall-fragments').stamped).toBe(false);
});

test('the old placeProgress key is ignored', () => {
  localStorage.setItem('intentai:v1:placeProgress', '{"chinatown":["food"]}');
  resetPersistentStores();
  expect(placeStoriesStore.get()).toEqual({});
});

test('a corrupt stored value reads as {}', () => {
  localStorage.setItem('intentai:v1:placeStories', '{"chinatown":{"opened":"food"}}');
  resetPersistentStores();
  expect(placeStoriesStore.get()).toEqual({});
});

test('deleteAllData resets the store and removes the old placeProgress key', () => {
  localStorage.setItem('intentai:v1:placeProgress', '{"chinatown":["food"]}');
  markOpened('chinatown', 'food');
  deleteAllData();
  expect(placeStoriesStore.get()).toEqual({});
  expect(localStorage.getItem('intentai:v1:placeProgress')).toBeNull();
});
