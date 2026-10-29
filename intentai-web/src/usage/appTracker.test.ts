import { afterEach, expect, test, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from '../data/preferences';
import { preferencesStore } from '../data/stores';
import { send } from './appTracker';
import type { UsageEvent } from './event';
import { readLocalUsage } from './localLog';

const event: UsageEvent = { uid: 'u', sid: 's', kind: 'page', name: 'Home', ms: 1000, at: 1 };

afterEach(() => vi.unstubAllGlobals());

function stubTransport() {
  const beacon = vi.fn(() => true);
  const fetchFn = vi.fn(() => Promise.resolve(new Response()));
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
  vi.stubGlobal('fetch', fetchFn);
  return { beacon, fetchFn };
}

test('with page timing off nothing is sent, and the device copy is kept', () => {
  const { beacon, fetchFn } = stubTransport();
  preferencesStore.set({ ...DEFAULT_PREFERENCES, usageTiming: false });
  send([event]);
  expect(beacon).not.toHaveBeenCalled();
  expect(fetchFn).not.toHaveBeenCalled();
  expect(readLocalUsage()).toHaveLength(1);
});

test('with page timing on the batch goes out by beacon', () => {
  const { beacon } = stubTransport();
  send([event]);
  expect(beacon).toHaveBeenCalledTimes(1);
});
