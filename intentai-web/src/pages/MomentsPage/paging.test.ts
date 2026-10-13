import { describe, expect, test } from 'vitest';
import { SEED_LOOKUPS } from '../../data/domain';
import { clampPage, dailyLookup, pageCount, pageItems, pageSlice, showingCaption } from './paging';

describe('pageCount', () => {
  test('three lookups per page, at least one page', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(3)).toBe(1);
    expect(pageCount(4)).toBe(2);
    expect(pageCount(24)).toBe(8);
  });
});

describe('clampPage', () => {
  test('keeps the page inside 1..pageCount', () => {
    expect(clampPage(0, 9)).toBe(1);
    expect(clampPage(4, 9)).toBe(3);
    expect(clampPage(2, 9)).toBe(2);
    expect(clampPage(5, 0)).toBe(1);
  });
});

describe('pageSlice', () => {
  test('returns the items of a page', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(pageSlice(items, 1)).toEqual([1, 2, 3]);
    expect(pageSlice(items, 3)).toEqual([7]);
  });
});

describe('pageItems', () => {
  test('lists every page when there are five or fewer', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test('matches Figma on the first page of eight: 1 2 3 … 8', () => {
    expect(pageItems(1, 8)).toEqual([1, 2, 3, 'gap', 8]);
    expect(pageItems(3, 8)).toEqual([1, 2, 3, 'gap', 8]);
  });

  test('shows the current page in the middle with gaps on both sides', () => {
    expect(pageItems(5, 8)).toEqual([1, 'gap', 5, 'gap', 8]);
  });

  test('shows the last three pages near the end', () => {
    expect(pageItems(7, 8)).toEqual([1, 'gap', 6, 7, 8]);
  });
});

describe('showingCaption', () => {
  test('describes the visible range', () => {
    expect(showingCaption(1, 24)).toBe('Showing 1–3 of 24 lookups');
    expect(showingCaption(3, 7)).toBe('Showing 7 of 7 lookups');
    expect(showingCaption(1, 1)).toBe('Showing 1 of 1 lookup');
  });
});

describe('dailyLookup', () => {
  test('is undefined for an empty list', () => {
    expect(dailyLookup([], new Date(2026, 9, 12))).toBeUndefined();
  });

  test('picks one saved phrase per calendar day and moves on the next day', () => {
    const today = dailyLookup(SEED_LOOKUPS, new Date(2026, 9, 12, 8));
    expect(dailyLookup(SEED_LOOKUPS, new Date(2026, 9, 12, 23))).toBe(today);
    expect(dailyLookup(SEED_LOOKUPS, new Date(2026, 9, 13, 8))).not.toBe(today);
  });
});
