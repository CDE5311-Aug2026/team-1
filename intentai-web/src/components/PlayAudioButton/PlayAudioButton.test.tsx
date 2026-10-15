import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import PlayAudioButton from './PlayAudioButton';

beforeEach(() => {
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =  vi.fn(function Utterance(text: string) {
    return { text };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('clicking speaks the given text via speechSynthesis', async () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak, cancel },
    configurable: true,
    writable: true,
  });

  render(<PlayAudioButton text="Chope" />);
  await userEvent.click(screen.getByRole('button', { name: /play/i }));

  expect(speak).toHaveBeenCalledTimes(1);
});

test('renders without throwing when speechSynthesis is unsupported', async () => {
  Object.defineProperty(window, 'speechSynthesis', {
    value: undefined,
    configurable: true,
    writable: true,
  });

  render(<PlayAudioButton text="Paiseh" />);
  await userEvent.click(screen.getByRole('button', { name: /play/i }));

  expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
});
