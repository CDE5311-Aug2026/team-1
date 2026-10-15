import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import useSpeech from './useSpeech';

const originalSpeechSynthesis = window.speechSynthesis;

beforeEach(() => {
  // jsdom has no SpeechSynthesisUtterance; stub a minimal constructor.
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
    vi.fn(function Utterance(text: string) {
      return { text };
    }); // a function, not an arrow: the hook calls it with `new`
});

afterEach(() => {
  Object.defineProperty(window, 'speechSynthesis', {
    value: originalSpeechSynthesis,
    configurable: true,
    writable: true,
  });
  vi.restoreAllMocks();
});

test('speak cancels any in-progress utterance before speaking the new one', () => {
  const cancel = vi.fn();
  const speak = vi.fn();
  Object.defineProperty(window, 'speechSynthesis', {
    value: { cancel, speak },
    configurable: true,
    writable: true,
  });

  const { result } = renderHook(() => useSpeech());
  act(() => {
    result.current.speak('Chope');
  });

  expect(cancel).toHaveBeenCalledTimes(1);
  expect(speak).toHaveBeenCalledTimes(1);
  const callOrder = cancel.mock.invocationCallOrder[0];
  const speakOrder = speak.mock.invocationCallOrder[0];
  expect(callOrder).toBeLessThan(speakOrder);
});

test('reports unsupported and no-ops without throwing when speechSynthesis is absent', () => {
  Object.defineProperty(window, 'speechSynthesis', {
    value: undefined,
    configurable: true,
    writable: true,
  });

  const { result } = renderHook(() => useSpeech());
  expect(result.current.supported).toBe(false);
  expect(() => {
    act(() => {
      result.current.speak('Paiseh');
    });
  }).not.toThrow();
});
