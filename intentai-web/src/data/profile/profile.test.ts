import { expect, test } from 'vitest';
import { cardById } from '../../pages/AskPage/cards';
import { isCulturePrefs } from '../culturePrefs';
import { culturePrefsStore, deleteAllData, explorePersonalStore, openedCardsStore, profileStore } from '../stores';
import { BASE_AREAS, TOPIC_CARD, firstFinds, formatDistance, fromWindow, nearestArea, placesNear, toWindow } from './finds';
import {
  DEFAULT_PROFILE_V3,
  isProfileV3,
  mrzLine,
  mySpacePrefsStore,
  prefsFromRanking,
  profileV3Store,
  rankTap,
  sealDate,
  updateProfile,
} from './profile';
import { STORAGE_AREAS, clearArea, exportData, formatBytes } from './storage';

test('From starts hidden and the default profile is valid', () => {
  expect(DEFAULT_PROFILE_V3.hidden).toEqual(['from']);
  expect(isProfileV3(DEFAULT_PROFILE_V3)).toBe(true);
  expect(isProfileV3({ ...DEFAULT_PROFILE_V3, from: 'XX' })).toBe(false);
  expect(isProfileV3({ ...DEFAULT_PROFILE_V3, topics: ['food', 'food'] })).toBe(false);
});

test('the ranking gives Today three valid categories, #1 first, filled in topic order', () => {
  expect(prefsFromRanking(['festivals'])).toEqual({ categories: ['holidays', 'foods', 'monuments'] });
  expect(prefsFromRanking(['history', 'food', 'monuments', 'festivals'])).toEqual({ categories: ['history', 'foods', 'monuments'] });
  expect(isCulturePrefs(prefsFromRanking([]))).toBe(true);
});

test('tap-in-order ranking removes a tapped topic and closes the gap', () => {
  expect(rankTap([], 'food')).toEqual(['food']);
  expect(rankTap(['food', 'history'], 'monuments')).toEqual(['food', 'history', 'monuments']);
  expect(rankTap(['food', 'history', 'monuments'], 'food')).toEqual(['history', 'monuments']);
});

test('updateProfile writes through to the stores the app already reads', () => {
  updateProfile({ from: 'KR', stay: '3to12m', role: 'researcher', base: 'sg-orchard', topics: ['history'] });
  expect(profileStore.get()).toMatchObject({ from: 'South Korea', time: '3–12 months', role: 'Researcher' });
  expect(culturePrefsStore.get().categories[0]).toBe('history');
  expect(explorePersonalStore.get().selectedAreaId).toBe('sg-orchard');
});

test('the passport line and seal date follow the Figma format', () => {
  expect(mrzLine('W', { ...DEFAULT_PROFILE_V3, role: 'intern' })).toBe('P<SGPW<<<<STUDENT<INTERN<<<<<<<<<<<<<<<<<<<<');
  expect(mrzLine('W', { ...DEFAULT_PROFILE_V3, role: 'intern', hidden: ['role'] })).not.toContain('STUDENT');
  expect(sealDate('2026-10-27')).toBe('27 OCT 2026');
});

test('a tap on the map snaps to the nearest Nearby area', () => {
  for (const area of BASE_AREAS) {
    const p = toWindow(area.center);
    expect(nearestArea(fromWindow(p.x / 100, p.y / 100)).id).toBe(area.id);
  }
  expect(BASE_AREAS.some((a) => a.overview)).toBe(false);
});

test('closest places are sorted by distance and formatted plainly', () => {
  const near = placesNear('sg-chinatown', 3);
  expect(near).toHaveLength(3);
  expect(near[0].distance).toBeLessThanOrEqual(near[1].distance);
  expect(formatDistance(180)).toBe('200 m');
  expect(formatDistance(2450)).toBe('2.5 km');
});

test('every topic photo card exists in the repo', () => {
  for (const id of Object.values(TOPIC_CARD)) expect(cardById(id), id).toBeDefined();
});

test('first finds: the closest place, then a card for #1 and #2, each saying why', () => {
  const finds = firstFinds('sg-chinatown', ['monuments', 'food']);
  expect(finds.map((f) => f.why)).toEqual([expect.stringMatching(/from your base$/), 'You ranked Monuments #1', 'You ranked Food #2']);
  // The monument card nearest Chinatown is one tied to Chinatown.
  expect(['sri-mariamman', 'thian-hock-keng']).toContain(finds[1].key);
  expect(firstFinds(null, [])).toEqual([]);
});

test('Clear empties an area and Undo puts it back; export includes every stored key', () => {
  openedCardsStore.set(['laksa']);
  const passport = STORAGE_AREAS.find((a) => a.id === 'passport')!;
  const undo = clearArea(passport);
  expect(openedCardsStore.get()).toEqual([]);
  undo();
  expect(openedCardsStore.get()).toEqual(['laksa']);
  const data = exportData() as { data: Record<string, unknown> };
  expect(data.data['opened-cards']).toEqual(['laksa']);
  expect(formatBytes(2048)).toBe('2.0 KB');
});

test('Delete all also resets this file’s stores', () => {
  updateProfile({ from: 'CN' });
  mySpacePrefsStore.set((p) => ({ ...p, haptics: true }));
  deleteAllData();
  expect(profileV3Store.get()).toEqual(DEFAULT_PROFILE_V3);
  expect(mySpacePrefsStore.get().haptics).toBe(false);
});
