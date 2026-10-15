export const DAILY_TOTAL = 3;

/** Which of today's expressions were learned. Stored as ids so repeats never double-count. */
export interface DailyProgress {
  date: string;
  learnedIds: string[];
}

export function todayKey(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isDailyProgress(value: unknown): value is DailyProgress {
  if (typeof value !== 'object' || value === null) return false;
  const { date, learnedIds } = value as Record<string, unknown>;
  return (
    typeof date === 'string' &&
    Array.isArray(learnedIds) &&
    learnedIds.length <= DAILY_TOTAL &&
    learnedIds.every((id) => typeof id === 'string') &&
    new Set(learnedIds).size === learnedIds.length
  );
}

/** Consecutive learning days: days on which at least one of today's phrases was learned. */
export interface Streak {
  date: string;
  count: number;
}

export const NO_STREAK: Streak = { date: '', count: 0 };

export function isStreak(value: unknown): value is Streak {
  if (typeof value !== 'object' || value === null) return false;
  const { date, count } = value as Record<string, unknown>;
  return typeof date === 'string' && typeof count === 'number' && Number.isInteger(count) && count >= 0;
}

function dayBefore(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return todayKey(new Date(year, month - 1, day - 1));
}

/** A phrase was learned: the same day keeps the count, the day after the last one adds one, a gap restarts at 1. */
export function recordLearningDay(streak: Streak, today: string = todayKey()): Streak {
  if (streak.date === today) return streak;
  return { date: today, count: streak.date === dayBefore(today) ? streak.count + 1 : 1 };
}

/**
 * The number shown in the header. A streak stays alive until a whole day passes without learning;
 * otherwise (and on a first visit) it shows 1, the day the user is on now.
 */
export function currentStreak(streak: Streak, today: string = todayKey()): number {
  const alive = streak.date === today || streak.date === dayBefore(today);
  return alive ? Math.max(1, streak.count) : 1;
}

export function learnedToday(progress: DailyProgress, today: string = todayKey()): string[] {
  return progress.date === today ? progress.learnedIds : [];
}

export function markLearned(progress: DailyProgress, id: string, today: string = todayKey()): DailyProgress {
  const ids = learnedToday(progress, today);
  return { date: today, learnedIds: ids.includes(id) ? ids : [...ids, id] };
}
