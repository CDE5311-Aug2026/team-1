import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { DEFAULT_PREFERENCES } from '../data/preferences';
import { preferencesStore } from '../data/stores';
import { setReducedMotion } from '../test/media';
import { isReducedMotion, useReducedMotion } from './useReducedMotion';

test('is false by default', () => {
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(false);
});

test('reads the current preference on mount', () => {
  setReducedMotion(true);
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(true);
});

test('updates when the preference changes, and stops listening on unmount', () => {
  const { result, unmount } = renderHook(() => useReducedMotion());
  act(() => setReducedMotion(true));
  expect(result.current).toBe(true);
  act(() => setReducedMotion(false));
  expect(result.current).toBe(false);
  unmount();
  expect(() => setReducedMotion(true)).not.toThrow();
});

test('the My Space motion setting counts as well as the system one, in the hook and the plain check', () => {
  const { result } = renderHook(() => useReducedMotion());
  expect(isReducedMotion()).toBe(false);
  act(() => preferencesStore.set({ ...DEFAULT_PREFERENCES, motion: 'reduced' }));
  expect(result.current).toBe(true);
  expect(isReducedMotion()).toBe(true);
});
