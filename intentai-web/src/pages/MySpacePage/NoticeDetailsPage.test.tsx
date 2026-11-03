import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { DEFAULT_NOTICES, DEFAULT_SETTINGS } from '../../data/domain';
import { noticesStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import { currentPath, renderAt } from './testUtils';

// These screens exist only while the occasion notice is live (Flag occasions on).
beforeEach(() => {
  settingsStore.set({ ...DEFAULT_SETTINGS, occasions: true });
});

test('shows the AI output with its confidence, reason and stored details', () => {
  noticesStore.set({ ...DEFAULT_NOTICES, occasion: 'Lunch', with: 'Friends' });
  renderAt(paths.noticeDetails);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Thursday dinner' })).toBeInTheDocument();
  expect(screen.getByText('AI · Medium confidence')).toBeInTheDocument();
  expect(screen.getByText('“Team dinner @ Jumbo, Thu 7pm”')).toBeInTheDocument();
  expect(screen.getByText('Lunch')).toBeInTheDocument();
  expect(screen.getByText('Friends')).toBeInTheDocument();
  expect(screen.getByText('Editing won’t change the confidence.')).toBeInTheDocument();
});

test('the back row returns to Notices', async () => {
  renderAt(paths.noticeDetails);
  await userEvent.click(screen.getByRole('button', { name: 'Notices' }));
  expect(currentPath()).toBe(paths.notices);
});

test('each detail opens the edit screen', async () => {
  renderAt(paths.noticeDetails);
  await userEvent.click(screen.getByRole('button', { name: /edit occasion/i }));
  expect(currentPath()).toBe(paths.noticeEdit);
  expect(screen.getByRole('textbox', { name: 'Occasion' })).toHaveFocus();
});

test('editing "With" focuses that field', async () => {
  renderAt(paths.noticeDetails);
  await userEvent.click(screen.getByRole('button', { name: /edit with/i }));
  expect(screen.getByRole('textbox', { name: 'With' })).toHaveFocus();
});

test('Confirm and Not right resolve the notice', async () => {
  const first = renderAt(paths.noticeDetails);
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(noticesStore.get().status).toBe('confirmed');
  expect(currentPath()).toBe(paths.noticeConfirmed);
  first.unmount();

  noticesStore.set((n) => ({ ...n, status: 'pending' }));
  renderAt(paths.noticeDetails);
  await userEvent.click(screen.getByRole('button', { name: 'Not right' }));
  expect(noticesStore.get().status).toBe('rejected');
  expect(currentPath()).toBe(paths.noticeRejected);
});

test('a resolved notice has no details screen (browser Back after Confirm)', () => {
  noticesStore.set({ ...DEFAULT_NOTICES, status: 'confirmed' });
  renderAt(paths.noticeDetails);
  expect(currentPath()).toBe(paths.notices);
});
