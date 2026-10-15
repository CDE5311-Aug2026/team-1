import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { DEFAULT_PROFILE } from '../../data/domain';
import { profileStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import { currentPath, renderAt } from './testUtils';

const SWITCHES = ['Daily card', 'Flag occasions', 'Answer as a local', 'Rehearse with AI', 'No-judgement mode'];

test('shows the Figma copy with one h1', () => {
  renderAt(paths.mySpace);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { level: 1, name: 'My Space' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'What the app knows' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Switches' })).toBeInTheDocument();
  expect(screen.getByText('All off by default')).toBeInTheDocument();
  expect(screen.getByText('Used for translations')).toBeInTheDocument();
  expect(screen.getByText('One saved phrase a day')).toBeInTheDocument();
});

test('profile fields show stored values, "In Singapore" verbatim, and "Not set" when empty', () => {
  profileStore.set({ ...DEFAULT_PROFILE, time: '1 – 3 years', role: '' });
  renderAt(paths.mySpace);
  expect(screen.getByText('China')).toBeInTheDocument();
  expect(screen.getByText('1 – 3 years')).toBeInTheDocument();
  expect(screen.getByText('Not set')).toBeInTheDocument();
});

test('all five switches start off and persist when toggled', async () => {
  renderAt(paths.mySpace);
  for (const name of SWITCHES) {
    expect(screen.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'false');
  }
  await userEvent.click(screen.getByRole('switch', { name: 'Daily card' }));
  expect(screen.getByRole('switch', { name: 'Daily card' })).toHaveAttribute('aria-checked', 'true');
  expect(settingsStore.get().daily).toBe(true);
  await userEvent.click(screen.getByRole('switch', { name: 'No-judgement mode' }));
  expect(settingsStore.get().judgement).toBe(true);
});

test('turning on "Flag occasions" adds the AI notice to Notices', async () => {
  renderAt(paths.mySpace);
  const notices = screen.getByRole('button', { name: /^notices/i });
  expect(notices).toHaveTextContent('1');
  await userEvent.click(screen.getByRole('switch', { name: 'Flag occasions' }));
  expect(settingsStore.get().occasions).toBe(true);
  expect(notices).toHaveTextContent('2');
  expect(screen.getByRole('status')).toHaveTextContent(/added to notices/i);
});

test('editing a profile field saves it', async () => {
  renderAt(paths.mySpace);
  await userEvent.click(screen.getByRole('button', { name: 'Edit From' }));
  const dialog = screen.getByRole('dialog', { name: 'Edit From' });
  const input = within(dialog).getByRole('textbox', { name: 'From' });
  expect(input).toHaveValue('China');
  await userEvent.clear(input);
  await userEvent.type(input, '  Malaysia ');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Malaysia')).toBeInTheDocument();
  expect(profileStore.get().from).toBe('Malaysia');
});

test('a blank edit is not saved and cancel leaves the field unchanged', async () => {
  renderAt(paths.mySpace);
  await userEvent.click(screen.getByRole('button', { name: 'Edit Here as' }));
  const dialog = screen.getByRole('dialog', { name: 'Edit Here as' });
  await userEvent.clear(within(dialog).getByRole('textbox', { name: 'Here as' }));
  await userEvent.type(within(dialog).getByRole('textbox', { name: 'Here as' }), '   ');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(profileStore.get().role).toBe('Student intern');
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Student intern')).toBeInTheDocument();
});

test('deleting a profile field shows "Not set" and Undo restores it', async () => {
  renderAt(paths.mySpace);
  await userEvent.click(screen.getByRole('button', { name: 'Delete From' }));
  expect(screen.getByText('Not set')).toBeInTheDocument();
  expect(profileStore.get().from).toBe('');
  expect(screen.getByRole('status')).toHaveTextContent('Detail deleted');
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('China')).toBeInTheDocument();
  expect(profileStore.get().from).toBe('China');
});

test('the Notices segment opens Notices', async () => {
  renderAt(paths.mySpace);
  expect(screen.getByRole('button', { name: 'About you' })).toHaveAttribute('aria-current', 'page');
  await userEvent.click(screen.getByRole('button', { name: /^notices/i }));
  expect(currentPath()).toBe(paths.notices);
});
