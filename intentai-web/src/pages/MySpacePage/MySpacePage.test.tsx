import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { onboardingStore } from '../../data/stores';
import { COMPLETED_ONBOARDING } from '../../test/onboardingFixture';
import { paths } from '../../routes';
import { FEEDBACK_TOAST } from './MySpacePage';
import { currentPath, renderAt } from './testUtils';

test('one h1, no old About/Notices segments or Today button', () => {
  renderAt(paths.mySpace);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.queryByRole('tab', { name: /about you/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /change today/i })).toBeNull();
});

test('the gear and the Settings row open Settings', async () => {
  const user = userEvent.setup();
  renderAt(paths.mySpace);
  await user.click(screen.getAllByRole('button', { name: 'Settings' })[0]);
  expect(currentPath()).toBe(paths.mySpaceSettings);
  await user.click(screen.getByRole('button', { name: 'Back to My Space' }));
  expect(currentPath()).toBe(paths.mySpace);
  await user.click(screen.getAllByRole('button', { name: 'Settings' })[1]);
  expect(currentPath()).toBe(paths.mySpaceSettings);
});

test('Redo onboarding clears the answers, keeps privacy choices and opens the welcome screen', async () => {
  const user = userEvent.setup();
  onboardingStore.set({ ...COMPLETED_ONBOARDING, hidden: ['from', 'role'] });
  renderAt(paths.mySpace);
  await user.click(screen.getByText('Redo onboarding'));
  expect(currentPath()).toBe(paths.onboarding);
  const o = onboardingStore.get();
  expect(o.done).toBe(false);
  expect(o.from).toBeNull();
  expect(o.topics).toEqual([]);
  expect(o.hidden).toEqual(['from', 'role']);
});

test('Help & feedback explains where feedback goes', async () => {
  const user = userEvent.setup();
  renderAt(paths.mySpace);
  await user.click(screen.getByText('Help & feedback'));
  expect(screen.getByText(FEEDBACK_TOAST)).toBeInTheDocument();
});
