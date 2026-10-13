import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TOAST_MS, UNDO_TOAST_MS, dismissToast, showToast, undoToast, useToastState } from './useToast';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => dismissToast());
  vi.useRealTimers();
});

test('showToast sets the message, then clears it after TOAST_MS', () => {
  const { result } = renderHook(() => useToastState());
  act(() => showToast('Saved'));
  expect(result.current?.message).toBe('Saved');
  act(() => {
    vi.advanceTimersByTime(TOAST_MS);
  });
  expect(result.current).toBeNull();
});

test('a second toast resets the timer instead of letting the first one clear it early', () => {
  const { result } = renderHook(() => useToastState());
  act(() => showToast('First'));
  act(() => {
    vi.advanceTimersByTime(TOAST_MS - 500);
  });
  act(() => showToast('Second'));
  act(() => {
    vi.advanceTimersByTime(500);
  });
  expect(result.current?.message).toBe('Second');
  act(() => {
    vi.advanceTimersByTime(TOAST_MS);
  });
  expect(result.current).toBeNull();
});

test('undo toasts stay up longer, and undoToast runs the action once and closes', () => {
  const undo = vi.fn();
  const { result } = renderHook(() => useToastState());
  act(() => showToast('Deleted', { undo }));
  act(() => {
    vi.advanceTimersByTime(TOAST_MS);
  });
  expect(result.current?.message).toBe('Deleted');
  act(() => undoToast());
  expect(undo).toHaveBeenCalledTimes(1);
  expect(result.current).toBeNull();
  act(() => {
    vi.advanceTimersByTime(UNDO_TOAST_MS);
  });
  expect(undo).toHaveBeenCalledTimes(1);
});

test('the toast is shared by every subscriber (survives page changes)', () => {
  const a = renderHook(() => useToastState());
  act(() => showToast('Question withdrawn'));
  a.unmount();
  const b = renderHook(() => useToastState());
  expect(b.result.current?.message).toBe('Question withdrawn');
});

test('dismissToast(id) closes only that toast', () => {
  const { result } = renderHook(() => useToastState());
  let first = 0;
  act(() => {
    first = showToast('First');
  });
  act(() => showToast('Second'));
  act(() => dismissToast(first));
  expect(result.current?.message).toBe('Second');
});
