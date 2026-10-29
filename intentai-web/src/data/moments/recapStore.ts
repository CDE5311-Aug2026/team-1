import { createPersistentStore } from '../persistentStore';
import type { RecapResult } from './moments';

/** Moments Recap: the last answer per fact (swipe right = knew it, left = again) and the last score. */
export interface RecapRecord {
  results: Record<string, RecapResult>;
  last?: { knew: number; total: number; at: number };
}

export const EMPTY_RECAP: RecapRecord = { results: {} };

export function isRecapRecord(value: unknown): value is RecapRecord {
  if (typeof value !== 'object' || value === null) return false;
  const { results, last } = value as RecapRecord;
  if (typeof results !== 'object' || results === null || Array.isArray(results)) return false;
  if (!Object.values(results).every((r) => r === 'knew' || r === 'again')) return false;
  if (last === undefined) return true;
  return typeof last === 'object' && last !== null && ['knew', 'total', 'at'].every((k) => typeof (last as unknown as Record<string, unknown>)[k] === 'number');
}

/** Integrator: add `recapStore.set(EMPTY_RECAP);` to deleteAllData(). */
export const recapStore = createPersistentStore<RecapRecord>({
  key: 'moments-recap',
  fallback: EMPTY_RECAP,
  isValid: isRecapRecord,
});
