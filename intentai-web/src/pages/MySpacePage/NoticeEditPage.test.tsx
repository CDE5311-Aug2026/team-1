import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { noticesStore, settingsStore } from '../../data/stores';
import { DEFAULT_SETTINGS } from '../../data/domain';
import { paths } from '../../routes';
import { currentPath, renderAt } from './testUtils';

// These screens exist only while the occasion notice is live (Flag occasions on).
beforeEach(() => {
  settingsStore.set({ ...DEFAULT_SETTINGS, occasions: true });
});

test('shows real, prefilled inputs and no tab bar', () => {
  renderAt(paths.noticeEdit);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Edit details' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Occasion' })).toHaveValue('Team dinner');
  expect(screen.getByRole('textbox', { name: 'With' })).toHaveValue('Colleagues and manager');
  expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
});

test('Save stores the trimmed details and returns to Details', async () => {
  renderAt(paths.noticeEdit);
  const occasion = screen.getByRole('textbox', { name: 'Occasion' });
  await userEvent.clear(occasion);
  await userEvent.type(occasion, ' Lunch ');
  const withField = screen.getByRole('textbox', { name: 'With' });
  await userEvent.clear(withField);
  await userEvent.type(withField, 'Friends{Enter}');
  expect(noticesStore.get()).toMatchObject({ occasion: 'Lunch', with: 'Friends' });
  expect(currentPath()).toBe(paths.noticeDetails);
  expect(screen.getByText('Lunch')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Details saved');
});

test('a blank detail is not saved', async () => {
  renderAt(paths.noticeEdit);
  await userEvent.clear(screen.getByRole('textbox', { name: 'Occasion' }));
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(noticesStore.get().occasion).toBe('Team dinner');
  expect(currentPath()).toBe(paths.noticeEdit);
  const occasion = screen.getByRole('textbox', { name: 'Occasion' });
  expect(occasion).toHaveFocus();
  expect((occasion as HTMLInputElement).validationMessage).toBe('Please write something first.');
});

test('Cancel and Back discard changes', async () => {
  const first = renderAt(paths.noticeEdit);
  await userEvent.type(screen.getByRole('textbox', { name: 'With' }), ' and HR');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(noticesStore.get().with).toBe('Colleagues and manager');
  expect(currentPath()).toBe(paths.noticeDetails);
  first.unmount();

  renderAt(paths.noticeEdit);
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(currentPath()).toBe(paths.noticeDetails);
});
