import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { setReducedMotion } from '../test/media';
import { useReducedMotion } from './useReducedMotion';

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
