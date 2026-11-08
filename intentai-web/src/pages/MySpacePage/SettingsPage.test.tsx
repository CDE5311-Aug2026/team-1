// Redesign v2 Settings (boards 16–19): the profile row, Categories and Hunt region in sheets with Save/Cancel (plan A8),
// the Public hunts switch on huntModeStore, and the Motion page.
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { profileV3Store } from '../../data/profile/profile';
import { reduceMotionStore, testerStore } from '../../data/stores';
import { huntModeStore } from '../../data/v2Stores';
import { dismissToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import { initialsOf } from './SettingsPage';
import { currentPath, renderAt } from './testUtils';

afterEach(() => {
  act(() => dismissToast());
  testerStore.set({ name: '' });
});

test('the profile row shows the tester code and initials, and says how you hunt without a public claim', () => {
  testerStore.set({ name: 'P01', version: 'B' });
  huntModeStore.set({ mode: 'solo' });
  renderAt(paths.mySpaceSettings);
  const profile = within(screen.getByRole('region', { name: 'Profile' }));
  expect(profile.getByText('P01 · exploring on your own')).toBeInTheDocument();
  expect(profile.getByText('P0')).toBeInTheDocument();
  expect(screen.queryByText(/shown to hunters/)).toBeNull();
  act(() => huntModeStore.set({ mode: 'together' }));
  expect(profile.getByText('P01 · hunting together')).toBeInTheDocument();
  expect(profile.getByRole('link', { name: 'Edit profile on Passport' })).toHaveAttribute('href', paths.mySpace);
});

test('initials: two words give two first letters, one word its first two', () => {
  expect(initialsOf('Serin Ee')).toBe('SE');
  expect(initialsOf('p01')).toBe('P0');
});

test('Categories: the row lists the ranking; the sheet saves a new order and Cancel discards', async () => {
  profileV3Store.set((p) => ({ ...p, tourismRanking: ['wel', 'att'] }));
  renderAt(paths.mySpaceSettings);
  const row = screen.getByRole('button', { name: 'Categories, 2 of 4: Wellness, Attractions' });

  // Cancel: nothing is written.
  await userEvent.click(row);
  let sheet = within(screen.getByRole('dialog', { name: 'Categories' }));
  await userEvent.click(sheet.getByRole('button', { name: 'Reset' }));
  await userEvent.click(sheet.getByRole('button', { name: 'Cruise' }));
  await userEvent.click(sheet.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog', { name: 'Categories' })).toBeNull();
  expect(profileV3Store.get().tourismRanking).toEqual(['wel', 'att']);

  // Save: the new order is written and the row follows it.
  await userEvent.click(screen.getByRole('button', { name: /^Categories/ }));
  sheet = within(screen.getByRole('dialog', { name: 'Categories' }));
  await userEvent.click(sheet.getByRole('button', { name: 'Reset' }));
  await userEvent.click(sheet.getByRole('button', { name: 'Cruise' }));
  await userEvent.click(sheet.getByRole('button', { name: 'Leisure' }));
  await userEvent.click(sheet.getByRole('button', { name: 'Save' }));
  expect(profileV3Store.get().tourismRanking).toEqual(['cru', 'lei']);
  expect(screen.getByRole('button', { name: 'Categories, 2 of 4: Cruise, Leisure' })).toBeInTheDocument();
});

test('Public hunts is the together/solo choice in huntModeStore', async () => {
  huntModeStore.set({ mode: 'solo', region: 'east' });
  renderAt(paths.mySpaceSettings);
  const toggle = screen.getByRole('switch', { name: 'Public hunts' });
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(toggle).toHaveAccessibleDescription(/Nothing about you is shared/);
  await userEvent.click(toggle);
  expect(huntModeStore.get()).toEqual({ mode: 'together', region: 'east' });
  await userEvent.click(toggle);
  expect(huntModeStore.get().mode).toBe('solo');
});

test('Hunt region: the row shows the region name; the sheet saves on Save only', async () => {
  huntModeStore.set({ mode: 'solo', region: 'east' });
  renderAt(paths.mySpaceSettings);
  const row = screen.getByRole('button', { name: /Hunt region/ });
  expect(row).toHaveTextContent('East');
  await userEvent.click(row);
  let sheet = within(screen.getByRole('dialog', { name: 'Hunt region' }));
  await userEvent.click(sheet.getByRole('button', { name: /Yes, hunt together/ }));
  await userEvent.click(sheet.getByRole('button', { name: 'Cancel' }));
  expect(huntModeStore.get()).toEqual({ mode: 'solo', region: 'east' });

  await userEvent.click(screen.getByRole('button', { name: /Hunt region/ }));
  sheet = within(screen.getByRole('dialog', { name: 'Hunt region' }));
  await userEvent.click(sheet.getByRole('button', { name: /Yes, hunt together/ }));
  await userEvent.click(sheet.getByRole('button', { name: 'Save' }));
  expect(huntModeStore.get()).toEqual({ mode: 'together', region: 'east' });
  expect(screen.getByRole('switch', { name: 'Public hunts' })).toHaveAttribute('aria-checked', 'true');
});

test('every existing Settings row is still there, restyled', () => {
  renderAt(paths.mySpaceSettings);
  for (const name of [/Language/, /Home base/, /Send feedback/]) expect(screen.getByRole('button', { name })).toBeInTheDocument();
  for (const name of [/Motion/, /Text size/, /Redo onboarding/, /Privacy & data/, /Terms & licences/, /Photo credits/]) {
    expect(screen.getByRole('link', { name })).toBeInTheDocument();
  }
  expect(screen.getByRole('slider', { name: 'Nearby radius' })).toBeInTheDocument();
  for (const name of ['Captions on videos', 'Haptics', 'Public hunts']) expect(screen.getByRole('switch', { name })).toBeInTheDocument();
  for (const kicker of ['Explore', 'Language & place', 'Look & feel', 'More']) expect(screen.getByRole('heading', { level: 2, name: kicker })).toBeInTheDocument();
});

test('Motion page: Full / Reduced write the app-wide store; the preview stops moving when Reduced', async () => {
  reduceMotionStore.set(false);
  renderAt(paths.mySpaceMotion);
  expect(screen.getByRole('heading', { level: 1, name: 'Motion' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Full' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByTestId('motion-preview')).toHaveAttribute('data-still', 'false');
  await userEvent.click(screen.getByRole('radio', { name: 'Reduced' }));
  expect(reduceMotionStore.get()).toBe(true);
  expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
  expect(screen.getByTestId('motion-preview')).toHaveAttribute('data-still', 'true');
  expect(screen.getByText('Reduced motion')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: 'Full' }));
  expect(reduceMotionStore.get()).toBe(false);
  // Opened straight from a link, Back goes to Settings.
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(currentPath()).toBe(paths.mySpaceSettings);
});

test('Send feedback opens the Help Centre on its Feedback tab', async () => {
  renderAt(paths.mySpaceSettings);
  await userEvent.click(screen.getByRole('button', { name: /Send feedback/ }));
  const help = within(screen.getByRole('dialog', { name: 'Help Center' }));
  expect(help.getByRole('tab', { name: 'Feedback' })).toHaveAttribute('aria-selected', 'true');
});
