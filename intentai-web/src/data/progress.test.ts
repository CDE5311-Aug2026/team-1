import { expect, test } from 'vitest';
import {
  NO_STREAK,
  currentStreak,
  isDailyProgress,
  learnedToday,
  markLearned,
  recordLearningDay,
  todayKey,
} from './progress';

test('todayKey formats local date as YYYY-MM-DD', () => {
  expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
});

test('isDailyProgress accepts valid and rejects invalid shapes', () => {
  expect(isDailyProgress({ date: '2026-10-12', learnedIds: ['chope'] })).toBe(true);
  expect(isDailyProgress({ date: '2026-10-12', learnedIds: ['a', 'a'] })).toBe(false);
  expect(isDailyProgress({ date: '2026-10-12', learnedIds: ['a', 'b', 'c', 'd'] })).toBe(false);
  expect(isDailyProgress({ date: '2026-10-12', learned: 2 })).toBe(false);
  expect(isDailyProgress(null)).toBe(false);
});

test('stale date counts as nothing learned today', () => {
  expect(learnedToday({ date: '2026-10-11', learnedIds: ['chope'] }, '2026-10-12')).toEqual([]);
});

test('markLearned adds once, ignores repeats, and starts fresh on a new day', () => {
  const day = '2026-10-12';
  const once = markLearned({ date: day, learnedIds: [] }, 'chope', day);
  expect(markLearned(once, 'chope', day).learnedIds).toEqual(['chope']);
  expect(markLearned({ date: '2026-10-11', learnedIds: ['chope', 'paiseh'] }, 'paiseh', day)).toEqual({
    date: day,
    learnedIds: ['paiseh'],
  });
});

test('learning days: same day keeps, the next day adds one, a gap restarts at 1', () => {
  expect(recordLearningDay(NO_STREAK, '2026-10-13')).toEqual({ date: '2026-10-13', count: 1 });
  const day = { date: '2026-10-13', count: 4 };
  expect(recordLearningDay(day, '2026-10-13')).toBe(day);
  expect(recordLearningDay(day, '2026-10-14')).toEqual({ date: '2026-10-14', count: 5 });
  expect(recordLearningDay({ date: '2026-10-31', count: 2 }, '2026-11-01')).toEqual({ date: '2026-11-01', count: 3 });
  expect(recordLearningDay(day, '2026-10-16')).toEqual({ date: '2026-10-16', count: 1 });
});

test('shown streak: 1 by default, kept through the next day, back to 1 after a day without learning', () => {
  expect(currentStreak(NO_STREAK, '2026-10-13')).toBe(1);
  const day = { date: '2026-10-13', count: 4 };
  expect(currentStreak(day, '2026-10-13')).toBe(4);
  expect(currentStreak(day, '2026-10-14')).toBe(4);
  expect(currentStreak(day, '2026-10-15')).toBe(1);
});
