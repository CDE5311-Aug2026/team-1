import { act, render, renderHook } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { DEFAULT_PREFERENCES } from '../data/preferences';
import { preferencesStore } from '../data/stores';
import { useAppPreferences } from './useAppPreferences';
import { useReducedMotion } from './useReducedMotion';

function Probe() {
  useAppPreferences();
  return null;
}

afterEach(() => {
  document.documentElement.style.fontSize = '';
  delete document.documentElement.dataset.motion;
});

test('text size scales the root font; Default leaves it alone', () => {
  render(<Probe />);
  act(() => preferencesStore.set({ ...DEFAULT_PREFERENCES, textSize: 4 }));
  expect(document.documentElement.style.fontSize).toBe('130%');
  act(() => preferencesStore.set({ ...DEFAULT_PREFERENCES, textSize: 1 }));
  expect(document.documentElement.style.fontSize).toBe('');
});

test('Reduced motion marks the document and useReducedMotion follows it', () => {
  render(<Probe />);
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(false);
  act(() => preferencesStore.set({ ...DEFAULT_PREFERENCES, motion: 'reduced' }));
  expect(document.documentElement.dataset.motion).toBe('reduced');
  expect(result.current).toBe(true);
  act(() => preferencesStore.set(DEFAULT_PREFERENCES));
  expect(document.documentElement.dataset.motion).toBeUndefined();
});
