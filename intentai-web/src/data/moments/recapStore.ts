import { createPersistentStore } from '../persistentStore';

/** The retired Moments Recap's saved answers (the Recap was removed, owner 9 Nov 2026). Kept only so answers saved
 *  before then stay valid on this device and Delete all still clears them; nothing writes it any more. */
export type RecapResult = 'knew' | 'again';

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

/** Cleared by deleteAllData(). */
export const recapStore = createPersistentStore<RecapRecord>({
  key: 'moments-recap',
  fallback: EMPTY_RECAP,
  isValid: isRecapRecord,
});
