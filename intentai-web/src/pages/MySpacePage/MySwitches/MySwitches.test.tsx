import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { onboardingStore, settingsStore } from '../../../data/stores';
import { paths } from '../../../routes';
import { COMPLETED_ONBOARDING } from '../../../test/onboardingFixture';
import { currentPath, renderAt } from '../testUtils';

test('both switches start off; turning them on and off saves and explains', async () => {
  const user = userEvent.setup();
  renderAt(paths.mySpace);
  const occasions = screen.getByRole('switch', { name: 'Flag occasions' });
  const local = screen.getByRole('switch', { name: 'Answer as a local' });
  expect(occasions).toHaveAttribute('aria-checked', 'false');
  expect(local).toHaveAttribute('aria-checked', 'false');

  await user.click(occasions);
  expect(settingsStore.get().occasions).toBe(true);
  expect(screen.getByText('Occasions will show on Home')).toBeInTheDocument();
  await user.click(occasions);
  expect(screen.getByText('Occasions off')).toBeInTheDocument();

  await user.click(local);
  expect(settingsStore.get().local).toBe(true);
  expect(screen.getByText('You’ll see visitor questions near your places')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Visitor questions in Community/ }));
  expect(currentPath()).toBe(paths.community);
});

test('the privacy card counts private details and opens Privacy & data', async () => {
  const user = userEvent.setup();
  onboardingStore.set(COMPLETED_ONBOARDING);
  const { unmount } = renderAt(paths.mySpace);
  expect(screen.getByText(/1 detail private/)).toBeInTheDocument();
  unmount();
  onboardingStore.set({ ...COMPLETED_ONBOARDING, hidden: ['from', 'base'] });
  renderAt(paths.mySpace);
  expect(screen.getByText(/2 details private/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^Privacy and data: .* on this phone$/ }));
  expect(currentPath()).toBe(paths.mySpacePrivacy);
});
