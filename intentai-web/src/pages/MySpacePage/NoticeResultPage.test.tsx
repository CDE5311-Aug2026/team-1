import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DEFAULT_NOTICES, DEFAULT_SETTINGS } from '../../data/domain';
import { noticesStore, questionsStore, settingsStore } from '../../data/stores';
import { UNDO_TOAST_MS } from '../../hooks/useToast';
import { paths } from '../../routes';
import { currentPath, renderAt } from './testUtils';

// These screens exist only while the occasion notice is live (Flag occasions on).
beforeEach(() => {
  settingsStore.set({ ...DEFAULT_SETTINGS, occasions: true });
});

afterEach(() => {
  vi.useRealTimers();
});

test('confirmed: shows the outcome card and an Undo toast', () => {
  noticesStore.set({ ...DEFAULT_NOTICES, status: 'confirmed' });
  renderAt(paths.noticeConfirmed);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByText('Seating phrases added for Thursday')).toBeInTheDocument();
  expect(screen.getByText('Now')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^notices/i })).toHaveTextContent('1');
  expect(screen.getByText('Confirmed', { selector: '[data-result-toast] *' })).toBeInTheDocument();
});

test('Undo on the confirmed screen restores the pending notice', async () => {
  noticesStore.set({ ...DEFAULT_NOTICES, status: 'confirmed' });
  renderAt(paths.noticeConfirmed);
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(noticesStore.get().status).toBe('pending');
  expect(currentPath()).toBe(paths.notices);
});

test('rejected: shows the outcome, Undo restores, and "Ask a local instead" opens the question form', async () => {
  noticesStore.set({ ...DEFAULT_NOTICES, status: 'rejected' });
  questionsStore.set([]);
  const first = renderAt(paths.noticeRejected);
  expect(screen.getByText('We won’t flag events like this')).toBeInTheDocument();
  expect(screen.getByText('Marked not right')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ask a local instead' }));
  const dialog = screen.getByRole('dialog', { name: 'Ask a local' });
  await userEvent.type(within(dialog).getByRole('textbox', { name: 'Your question' }), 'Is it formal?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Send' }));
  expect(questionsStore.get()[0].text).toBe('Is it formal?');
  first.unmount();

  renderAt(paths.noticeRejected);
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(noticesStore.get().status).toBe('pending');
  expect(currentPath()).toBe(paths.notices);
});

test('the Undo toast hides itself after the undo window', () => {
  vi.useFakeTimers();
  noticesStore.set({ ...DEFAULT_NOTICES, status: 'confirmed' });
  renderAt(paths.noticeConfirmed);
  expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(UNDO_TOAST_MS);
  });
  expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
});

test('a result screen whose outcome is not stored redirects to Notices (reload after Undo)', () => {
  noticesStore.set({ ...DEFAULT_NOTICES, status: 'pending' });
  renderAt(paths.noticeConfirmed);
  expect(currentPath()).toBe(paths.notices);
});

test('with Flag occasions off, result screens redirect to Notices', () => {
  settingsStore.set({ ...DEFAULT_SETTINGS, occasions: false });
  noticesStore.set({ ...DEFAULT_NOTICES, status: 'rejected' });
  renderAt(paths.noticeRejected);
  expect(currentPath()).toBe(paths.notices);
});
