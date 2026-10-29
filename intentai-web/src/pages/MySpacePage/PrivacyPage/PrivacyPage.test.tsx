import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../../data/domain';
import { STORAGE_PREFIX } from '../../../data/persistentStore';
import { deleteAllData, lookupsStore, onboardingStore, preferencesStore, settingsStore } from '../../../data/stores';
import { paths } from '../../../routes';
import { COMPLETED_ONBOARDING } from '../../../test/onboardingFixture';
import * as appTracker from '../../../usage/appTracker';
import { LOCAL_USAGE_EVENT, LOCAL_USAGE_KEY } from '../../../usage/localLog';
import { currentPath, renderAt } from '../testUtils';
import { EXPORT_MS } from './PrivacyPage';

const lookup = { id: 'l1', word: 'shiok', meaning: 'great', source: 'AI-generated' as const };

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const open = () => {
  onboardingStore.set(COMPLETED_ONBOARDING);
  renderAt(paths.mySpacePrivacy);
};

test('Location goes through the location flow; the others cycle preferences', async () => {
  const user = userEvent.setup();
  open();
  await user.click(screen.getByRole('button', { name: /^Location: Never/ }));
  expect(screen.getByRole('dialog', { name: 'Use your location?' })).toBeInTheDocument();
  expect(settingsStore.get().location).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Not now' }));
  act(() => settingsStore.set({ ...DEFAULT_SETTINGS, location: true }));
  await user.click(screen.getByRole('button', { name: /^Location: While using/ }));
  expect(settingsStore.get().location).toBe(false);
  await user.click(screen.getByRole('button', { name: /^Calendar: Titles only/ }));
  expect(preferencesStore.get().permissions.calendar).toBe(1);
  expect(screen.getByText('Calendar: Off')).toBeInTheDocument();
});

test('Clear empties a row and Undo brings it back, as rendered', async () => {
  lookupsStore.set([lookup]);
  const user = userEvent.setup();
  open();
  await user.click(screen.getByRole('button', { name: 'Clear Ask chats' }));
  expect(lookupsStore.get()).toEqual([]);
  expect(screen.queryByRole('button', { name: 'Clear Ask chats' })).toBeNull();
  expect(screen.getByText('Cleared')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(lookupsStore.get()).toEqual([lookup]);
  expect(screen.getByRole('button', { name: 'Clear Ask chats' })).toBeInTheDocument();
});

test('the timing row shows the size of the log on this phone, and the switch turns timing off', async () => {
  const user = userEvent.setup();
  open();
  act(() => {
    localStorage.setItem(LOCAL_USAGE_KEY, '[' + '0,'.repeat(600) + '0]');
    window.dispatchEvent(new Event(LOCAL_USAGE_EVENT));
  });
  expect(screen.getByText(/never what you type · 1\.\d KB on this phone/)).toBeInTheDocument();
  await user.click(screen.getByRole('switch', { name: 'Anonymous page timing' }));
  expect(preferencesStore.get().usageTiming).toBe(false);
});

test('Export downloads intentai-data.json with every app key', () => {
  vi.useFakeTimers();
  localStorage.setItem(STORAGE_PREFIX + 'lookups', JSON.stringify([lookup]));
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
    blobs.push(b as Blob);
    return 'blob:x';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  open();
  const button = screen.getByRole('button', { name: /Export my data/ });
  fireEvent.click(button);
  expect(screen.getByText('Preparing your file…')).toBeInTheDocument();
  fireEvent.click(button);
  act(() => vi.advanceTimersByTime(EXPORT_MS));
  expect(click).toHaveBeenCalledTimes(1);
  expect(blobs).toHaveLength(1);
  expect(screen.getByText('intentai-data.json is ready')).toBeInTheDocument();
  expect(screen.getByText('Export ready')).toBeInTheDocument();
  vi.useRealTimers();
  return new Promise<void>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const out = JSON.parse(String(reader.result));
      expect(out.format).toBe('intentai-data');
      expect(out.data.lookups).toEqual([lookup]);
      resolve();
    };
    reader.readAsText(blobs[0]);
  });
});

test('deleting everything resets the timing tracker and shows a modal that leads to onboarding', async () => {
  const discard = vi.spyOn(appTracker.tracker, 'discard');
  const user = userEvent.setup();
  open();
  const button = screen.getByRole('button', { name: 'Hold to delete all my data' });
  fireEvent.keyDown(button, { key: 'Enter' });
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(discard).toHaveBeenCalledTimes(1);
  expect(onboardingStore.get().done).toBe(false);
  const dialog = screen.getByRole('dialog', { name: 'Everything is deleted' });
  const cta = within(dialog).getByRole('button', { name: 'Make a new passport' });
  expect(cta).toHaveFocus();
  dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  expect(screen.getByRole('dialog', { name: 'Everything is deleted' })).toBeInTheDocument();
  await user.click(cta);
  expect(currentPath()).toBe(paths.onboarding);
});

test('Undo after deleting everything writes nothing back', async () => {
  lookupsStore.set([lookup]);
  const user = userEvent.setup();
  open();
  await user.click(screen.getByRole('button', { name: 'Clear Ask chats' }));
  const undo = screen.getByRole('button', { name: 'Undo' });
  act(() => deleteAllData());
  expect(undo.isConnected).toBe(false);
  expect(lookupsStore.get()).toEqual([]);
});
