import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { DEFAULT_NOTICES, DEFAULT_SETTINGS, EMPTY_PROFILE } from '../../data/domain';
import { lookupsStore, noticesStore, onboardingStore, profileStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import { currentPath, renderAt } from './testUtils';

const occasionsOn = () => settingsStore.set({ ...DEFAULT_SETTINGS, occasions: true });

test('with "Flag occasions" off, only the local fix shows and the count is 1', () => {
  renderAt(paths.notices);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByText('A local updated “chope”')).toBeInTheDocument();
  expect(screen.queryByText('Thursday dinner may need seating tips')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^notices/i })).toHaveTextContent('1');
  expect(screen.getByRole('button', { name: /^notices/i })).toHaveAttribute('aria-current', 'page');
});

test('with "Flag occasions" on, the AI notice shows its confidence and the count is 2', () => {
  occasionsOn();
  renderAt(paths.notices);
  expect(screen.getByText('Thursday dinner may need seating tips')).toBeInTheDocument();
  expect(screen.getByText('AI · Medium confidence')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^notices/i })).toHaveTextContent('2');
});

test('Confirm resolves the notice and opens the confirmed screen', async () => {
  occasionsOn();
  renderAt(paths.notices);
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(noticesStore.get().status).toBe('confirmed');
  expect(currentPath()).toBe(paths.noticeConfirmed);
});

test('Not right resolves the notice and opens the rejected screen', async () => {
  occasionsOn();
  renderAt(paths.notices);
  await userEvent.click(screen.getByRole('button', { name: 'Not right' }));
  expect(noticesStore.get().status).toBe('rejected');
  expect(currentPath()).toBe(paths.noticeRejected);
});

test('Details opens the notice details', async () => {
  occasionsOn();
  renderAt(paths.notices);
  await userEvent.click(screen.getByRole('button', { name: 'Details' }));
  expect(currentPath()).toBe(paths.noticeDetails);
});

test('a resolved notice shows its outcome without actions', () => {
  occasionsOn();
  noticesStore.set({ ...DEFAULT_NOTICES, status: 'confirmed' });
  renderAt(paths.notices);
  expect(screen.getByText('Seating phrases added for Thursday')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^notices/i })).toHaveTextContent('1');
});

test('dismissing the local fix hides it and Undo brings it back', async () => {
  renderAt(paths.notices);
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss local update' }));
  expect(screen.queryByText('A local updated “chope”')).not.toBeInTheDocument();
  expect(noticesStore.get().dismissed).toBe(true);
  expect(screen.getByRole('button', { name: /^notices/i })).toHaveTextContent('0');
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('A local updated “chope”')).toBeInTheDocument();
});

test('See change explains the update', async () => {
  renderAt(paths.notices);
  await userEvent.click(screen.getByRole('button', { name: 'See change' }));
  const dialog = screen.getByRole('dialog', { name: 'A local updated “chope”' });
  expect(within(dialog).getByText(/saving a spot in a queue/i)).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Got it' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('About you opens the profile', async () => {
  renderAt(paths.notices);
  await userEvent.click(screen.getByRole('button', { name: 'About you' }));
  expect(currentPath()).toBe(paths.mySpace);
});

test('Delete all my data asks first; cancelling keeps everything', async () => {
  renderAt(paths.notices);
  await userEvent.click(screen.getByRole('button', { name: 'Delete all my data' }));
  const dialog = screen.getByRole('dialog', { name: 'Delete your data?' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(profileStore.get().from).toBe('China');
  expect(currentPath()).toBe(paths.notices);
});

test('confirming Delete all my data clears the stores and returns to onboarding', async () => {
  occasionsOn();
  renderAt(paths.notices);
  await userEvent.click(screen.getByRole('button', { name: 'Delete all my data' }));
  const dialog = screen.getByRole('dialog', { name: 'Delete your data?' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Delete all my data' }));
  expect(profileStore.get()).toEqual(EMPTY_PROFILE);
  expect(settingsStore.get()).toEqual(DEFAULT_SETTINGS);
  expect(lookupsStore.get()).toEqual([]);
  expect(onboardingStore.get().done).toBe(false);
  expect(currentPath()).toBe(paths.onboarding);
});
