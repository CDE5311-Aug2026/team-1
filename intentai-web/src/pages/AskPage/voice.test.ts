import { afterEach, expect, test, vi } from 'vitest';
import { startVoiceInput } from './voice';

type Win = Record<string, unknown>;

afterEach(() => {
  delete (window as unknown as Win).SpeechRecognition;
  delete (window as unknown as Win).webkitSpeechRecognition;
});

class FakeRecognition {
  static last: FakeRecognition | undefined;
  lang = '';
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn();
  constructor() {
    FakeRecognition.last = this;
  }
}

test('returns false when speech recognition is unsupported', () => {
  expect(startVoiceInput(vi.fn(), vi.fn())).toBe(false);
});

test('starts recognition in Singapore English and passes the transcript on', () => {
  (window as unknown as Win).webkitSpeechRecognition = FakeRecognition;
  const onText = vi.fn();
  const onError = vi.fn();

  expect(startVoiceInput(onText, onError)).toBe(true);
  const recognition = FakeRecognition.last!;
  expect(recognition.lang).toBe('en-SG');
  expect(recognition.start).toHaveBeenCalled();

  recognition.onresult?.({ results: [[{ transcript: 'what does paiseh mean' }]] });
  expect(onText).toHaveBeenCalledWith('what does paiseh mean');
  recognition.onerror?.();
  expect(onError).toHaveBeenCalled();
});
