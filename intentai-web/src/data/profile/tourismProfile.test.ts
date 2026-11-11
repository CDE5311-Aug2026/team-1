// Plan C2 / A1 / B2 / B3: the v2 Tourism 2040 ranking beside the legacy place tags.
import { expect, test } from 'vitest';
import { STORAGE_PREFIX } from '../persistentStore';
import { culturePrefsStore, explorePersonalStore, onboardingStore } from '../stores';
import { huntModeStore } from '../v2Stores';
import {
  DEFAULT_PROFILE_V3,
  finishOnboarding,
  finishTourismOnboarding,
  isProfileV3,
  profileV3Store,
  repairProfileV3,
  tourismOrder,
  tourismRankingOf,
} from './profile';

const KEY = `${STORAGE_PREFIX}profile-v3`;
const store = (v: unknown) => {
  localStorage.setItem(KEY, JSON.stringify(v));
  (profileV3Store as unknown as { invalidate(): void }).invalidate();
};

test('a profile saved before v2 stays valid and its ranking is worked out from the tags, writing nothing', () => {
  const before = { ...DEFAULT_PROFILE_V3, topics: ['nature', 'culture', 'food'], base: 'sg-marina-bay', stampedOn: '2026-10-27' };
  store(before);
  const p = profileV3Store.get();
  expect(p).toEqual(before);
  expect(tourismRankingOf(p)).toEqual(['wel', 'att']);
  expect(tourismOrder(p)).toEqual(['wel', 'att', 'lei', 'cru']);
  expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(before);
});

test('an explicit empty ranking is kept (not re-derived)', () => {
  store({ ...DEFAULT_PROFILE_V3, topics: ['landmark'], tourismRanking: [] });
  expect(tourismRankingOf(profileV3Store.get())).toEqual([]);
  expect(tourismOrder(profileV3Store.get())).toEqual(['att', 'wel', 'lei', 'cru']);
});

test('damaged rankings (duplicates, unknown ids, wrong type) are dropped; every other field survives, also after reload', () => {
  for (const bad of [['att', 'att'], ['att', 'museum'], 'att', [1], null]) {
    const saved = { ...DEFAULT_PROFILE_V3, topics: ['food'], base: 'sg-bugis', stampedOn: '2026-11-01', tourismRanking: bad };
    expect(isProfileV3(saved)).toBe(false);
    store(saved);
    const p = profileV3Store.get();
    expect(p.tourismRanking).toBeUndefined();
    expect(p.base).toBe('sg-bugis');
    expect(p.stampedOn).toBe('2026-11-01');
    expect(tourismRankingOf(p)).toEqual(['att']);
    (profileV3Store as unknown as { invalidate(): void }).invalidate();
    expect(profileV3Store.get().stampedOn).toBe('2026-11-01');
  }
});

test('repair order: legacy topic names are fixed before the whole profile is validated once', () => {
  const old = { ...DEFAULT_PROFILE_V3, topics: ['festivals', 'monuments'], tourismRanking: ['zzz'], stampedOn: '2026-09-01' };
  const fixed = repairProfileV3(old);
  expect(fixed?.topics).toEqual(['culture', 'landmark']);
  expect(fixed?.tourismRanking).toBeUndefined();
  expect(fixed?.stampedOn).toBe('2026-09-01');
});

test('v2 onboarding saves the ranking and hunt choice, seals the passport, and leaves legacy tags, prefs and visits alone', () => {
  store({ ...DEFAULT_PROFILE_V3, topics: [] });
  const prefsBefore = culturePrefsStore.get();
  const visitsBefore = explorePersonalStore.get().places.length;
  finishTourismOnboarding({ ranking: ['lei', 'cru', 'lei'], mode: 'together', region: 'east' });
  const p = profileV3Store.get();
  expect(p.tourismRanking).toEqual(['lei', 'cru']);
  expect(p.topics).toEqual([]);
  expect(p.stampedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(culturePrefsStore.get()).toEqual(prefsBefore);
  expect(explorePersonalStore.get().places.length).toBe(visitsBefore);
  expect(huntModeStore.get()).toEqual({ mode: 'together', region: 'east' });
  expect(onboardingStore.get().done).toBe(true);
});

test('redoing v2 onboarding replaces the ranking; the legacy finishOnboarding is unchanged (it still ranks every tag)', () => {
  finishTourismOnboarding({ ranking: ['att'] });
  finishTourismOnboarding({ ranking: ['wel', 'att'], mode: 'solo' });
  expect(profileV3Store.get().tourismRanking).toEqual(['wel', 'att']);
  expect(huntModeStore.get().mode).toBe('solo');
  store({ ...DEFAULT_PROFILE_V3, topics: ['food'] });
  finishOnboarding();
  expect(profileV3Store.get().topics).toEqual(['food', 'landmark', 'culture', 'nature']);
  expect(profileV3Store.get().tourismRanking).toBeUndefined();
});
