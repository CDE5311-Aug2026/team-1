import { beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.restoreAllMocks();
});

test('pending until closed, and remembered', async () => {
  const { howToPlayPending, markHowToPlaySeen } = await import('./howToPlayState');
  expect(howToPlayPending()).toBe(true);
  markHowToPlaySeen();
  expect(howToPlayPending()).toBe(false);
  vi.resetModules();
  expect((await import('./howToPlayState')).howToPlayPending()).toBe(false);
});

test('a phone that can\'t save it still stops waiting for this visit', async () => {
  const full = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full');
  });
  const { howToPlayPending, markHowToPlaySeen } = await import('./howToPlayState');
  markHowToPlaySeen();
  full.mockRestore();
  expect(howToPlayPending()).toBe(false);
});

test('closing tells whoever is waiting', async () => {
  const { markHowToPlaySeen, onHowToPlayClosed } = await import('./howToPlayState');
  const run = vi.fn();
  const off = onHowToPlayClosed(run);
  markHowToPlaySeen();
  expect(run).toHaveBeenCalledOnce();
  off();
});
