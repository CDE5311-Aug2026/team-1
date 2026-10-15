// Pure helpers for the Moments list: three lookups per page (Figma 4:919) and the daily card pick.

export const PAGE_SIZE = 3;

export type PageItem = number | 'gap';

export function pageCount(itemCount: number): number {
  return Math.max(1, Math.ceil(itemCount / PAGE_SIZE));
}

/** Keeps a page number valid after the list shrinks (for example, after a delete). */
export function clampPage(page: number, itemCount: number): number {
  return Math.min(pageCount(itemCount), Math.max(1, page));
}

export function pageSlice<T>(items: T[], page: number): T[] {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

/** Page buttons between Prev and Next: all pages up to five, otherwise Figma's "1 2 3 … 8" shape. */
export function pageItems(current: number, total: number): PageItem[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 'gap', total];
  if (current >= total - 2) return [1, 'gap', total - 2, total - 1, total];
  return [1, 'gap', current, 'gap', total];
}

export function showingCaption(page: number, itemCount: number): string {
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, itemCount);
  const range = first === last ? `${first}` : `${first}–${last}`;
  return `Showing ${range} of ${itemCount} ${itemCount === 1 ? 'lookup' : 'lookups'}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "One saved phrase a day": rotates through the saved lookups by local calendar day. */
export function dailyLookup<T>(items: T[], date: Date): T | undefined {
  if (items.length === 0) return undefined;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
  return items[day % items.length];
}
