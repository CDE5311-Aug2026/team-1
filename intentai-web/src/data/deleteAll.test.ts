import { afterEach, expect, test, vi } from 'vitest';
import { ONSITE_ROUTES } from '../findsg';
// @ts-expect-error the game's modules are untyped
import { beginOnsite, checkInOnsite } from '../findsg/app/game/onsite-state.js';
// @ts-expect-error the game's modules are untyped
import { preferredOnsiteMode, readOnsite, saveOnsite } from '../findsg/app/game/onsite-storage.js';
// @ts-expect-error the game's modules are untyped
import { readGame, saveGame, gameStorageKey } from '../findsg/app/game/game-storage.js';
// @ts-expect-error the game's modules are untyped
import { readField, storeField } from '../findsg/app/field/field-storage.js';
import { MARKER_KEY, PENDING_KEY, RECOVERY_KEY } from './migration/legacyMigration';
import { huntVisits } from './moments/huntVisits';
import { clearPhone, deleteAllData } from './stores';

const ROUTE = 'telok-ayer';
const stops = () => (ONSITE_ROUTES as Record<string, { stops: { id: string }[] }>)[ROUTE].stops;
const checkedIn = (mode: string) => {
  const first = stops()[0].id;
  return { first, state: checkInOnsite(beginOnsite(readOnsite(ROUTE, stops(), mode)), first, stops(), { mode, confirmedAt: '2026-11-02T08:00:00.000Z' }) };
};

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

test('Delete all removes Hunt saves and personal keys, and keeps what belongs to the study', async () => {
  const gone = ['findsg-onsite-v1:telok-ayer:manual', 'findsg-short-v2:gold-under-glass:manual', 'findsg-notes:short', 'hunt-times-v1', 'hunt-letter-short', 'notebook.spotted.x'];
  const kept = ['findsg-help-feedback', 'intentai:abtest-phone', MARKER_KEY];
  for (const key of [...gone, ...kept]) localStorage.setItem(key, '{}');
  await deleteAllData();
  for (const key of gone) expect(localStorage.getItem(key), key).toBeNull();
  for (const key of kept) expect(localStorage.getItem(key), key).not.toBeNull();
  expect(huntVisits()).toEqual([]);
});

test('Delete all removes migrated content waiting in the pending and recovery keys', async () => {
  localStorage.setItem(PENDING_KEY, '{"old":"content"}');
  localStorage.setItem(RECOVERY_KEY, '[{"old":"content"}]');
  await deleteAllData();
  expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
});

test('Delete all removes the saved position and session keys, and keeps the admin session', async () => {
  sessionStorage.setItem('intentai:home-here', '{"lat":1.3,"lng":103.8}');
  sessionStorage.setItem('hunt-book', 'short');
  sessionStorage.setItem('intentai:admin-password', 'kept');
  await deleteAllData();
  expect(sessionStorage.getItem('intentai:home-here')).toBeNull();
  expect(sessionStorage.getItem('hunt-book')).toBeNull();
  expect(sessionStorage.getItem('intentai:admin-password')).toBe('kept');
});

test('saved progress does not come back from the game caches after Delete all', async () => {
  const { first, state } = checkedIn('manual');
  saveOnsite(state);
  await deleteAllData();
  expect(readOnsite(ROUTE, stops(), 'manual').stops[first].checkin).toBeNull();
});

test('a save that only reached the cache (storage full) is forgotten too, with its mode', async () => {
  const { first, state } = checkedIn('preview');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full');
  });
  saveOnsite(state);
  saveGame({ routeId: ROUTE, stage: 'x', completed: [stops()[0].id] });
  storeField({ routeId: ROUTE, mode: 'manual', marker: 1 });
  expect(preferredOnsiteMode(ROUTE)).toBe('preview');
  vi.restoreAllMocks();
  await deleteAllData();
  expect(readOnsite(ROUTE, stops(), 'preview').stops[first].checkin).toBeNull();
  expect(preferredOnsiteMode(ROUTE)).toBe('manual');
  expect(readGame(ROUTE, stops()).completed).toEqual([]);
  expect(readField(ROUTE, 'manual', stops()).marker).toBeUndefined();
  expect(localStorage.getItem(gameStorageKey(ROUTE))).toBeNull();
});

test('clearPhone resolves, so a caller can wait for it before leaving the page', async () => {
  localStorage.setItem('findsg-notes:short', 'x');
  await expect(clearPhone(true)).resolves.toBe(true);
  expect(localStorage.getItem('findsg-notes:short')).toBeNull();
});
