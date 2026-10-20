import { CATEGORIES, type CategoryId } from './culture';

// Today's three culture categories, set by the topic picker after onboarding (or from My Space).
// Every tab shows its short video and short articles: the survey has the two formats tied for first.

export interface CulturePrefs {
  categories: [CategoryId, CategoryId, CategoryId];
}

/** Survey top three by mean interest (n=24): the default when the user doesn't choose. */
export const DEFAULT_PREFS: CulturePrefs = { categories: ['foods', 'monuments', 'holidays'] };

const RANK: readonly CategoryId[] = CATEGORIES.map((c) => c.id);

/** Exactly three distinct known categories. Other fields (e.g. a format saved by an earlier build) are ignored. */
export function isCulturePrefs(value: unknown): value is CulturePrefs {
  if (typeof value !== 'object' || value === null) return false;
  const { categories } = value as { categories?: unknown };
  return (
    Array.isArray(categories) &&
    categories.length === 3 &&
    new Set(categories).size === 3 &&
    categories.every((id) => RANK.includes(id as CategoryId))
  );
}

/** Validated prefs with categories in survey rank order. Throws on invalid picks. */
export function canonicalPrefs(categories: readonly CategoryId[]): CulturePrefs {
  const sorted = [...categories].sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b));
  const prefs = { categories: sorted };
  if (!isCulturePrefs(prefs)) throw new Error(`Invalid culture prefs: ${JSON.stringify(prefs)}`);
  return prefs;
}
