import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App';
import { STORAGE_PREFIX } from './data/persistentStore';
import { todayKey } from './data/progress';
import { onboardingStore, streakStore } from './data/stores';
import { profileV3Store, tourismOrder } from './data/profile/profile';
import { huntModeStore } from './data/v2Stores';

// Cross-page contracts: flows that hand data from one page to another. Fix the pages, not these tests.

function Pathname() {
  return <output data-testid="pathname">{useLocation().pathname}</output>;
}

function renderApp(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <App />
      <Pathname />
    </MemoryRouter>,
  );
}

test('[Onboarding + Home + Passport] the v2 onboarding opens Home; the answers are what Home, Hunt and Passport read', async () => {
  localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
  const user = userEvent.setup();
  renderApp('/');
  await user.click(screen.getByRole('button', { name: /Start the hunt/ }));
  await user.click(screen.getByRole('button', { name: 'Wellness' }));
  await user.click(screen.getByRole('button', { name: /^Continue/ }));
  await user.click(screen.getByRole('radio', { name: /Yes, hunt together/ }));
  await user.click(within(screen.getByRole('group', { name: 'Regions' })).getByRole('button', { name: /^Central/ }));
  await user.click(screen.getByRole('button', { name: /^Continue/ }));
  await user.click(screen.getByRole('button', { name: /Stamp my passport/ }));
  await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/$/), { timeout: 3000 });
  expect(onboardingStore.get().done).toBe(true);
  expect(tourismOrder(profileV3Store.get())[0]).toBe('wel');
  expect(huntModeStore.get()).toEqual({ mode: 'together', region: 'central' });
  // walks three screens, a sheet-free review and the stamp: slow on a loaded machine
}, 15_000);

test('[Today + streak] opening the app does not add a day; reading the holiday detail does', async () => {
  const now = new Date();
  const yesterday = todayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  streakStore.set({ date: yesterday, count: 2 });
  const home = renderApp('/');
  expect(streakStore.get()).toEqual({ date: yesterday, count: 2 });
  home.unmount();
  // v2: Home has no holiday card; the holiday page is still a route of its own
  renderApp('/holidays/deepavali');
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/holidays\/deepavali$/);
  expect(streakStore.get()).toEqual({ date: todayKey(), count: 3 });
});
