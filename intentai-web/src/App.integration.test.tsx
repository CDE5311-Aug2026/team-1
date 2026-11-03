import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App';
import { STORAGE_PREFIX } from './data/persistentStore';
import { todayKey } from './data/progress';
import { streakStore } from './data/stores';

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





test('[Onboarding + Home + My Space] the Treasure Hunt onboarding opens Home; the answers show in My Space', async () => {
  localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
  const user = userEvent.setup();
  const first = renderApp('/');
  await user.click(screen.getByRole('button', { name: /Start the hunt/ }));
  await user.click(screen.getByRole('button', { name: 'Nature' }));
  await user.click(screen.getByRole('button', { name: /^Continue/ }));
  await user.click(screen.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }));
  await user.click(screen.getByRole('button', { name: /Stamp my passport/ }));
  await user.click(screen.getByRole('button', { name: /Start exploring/ }));
  expect(screen.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeInTheDocument();
  first.unmount();
  renderApp('/my-space');
  expect(screen.getByRole('button', { name: 'Edit Place tags' })).toHaveTextContent(/^Nature/);
  expect(screen.getAllByText(/Chinatown/).length).toBeGreaterThan(0);
});




test('[Today + streak] opening the app does not add a day; reading the holiday detail does', async () => {
  const now = new Date();
  const yesterday = todayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  streakStore.set({ date: yesterday, count: 2 });
  renderApp('/');
  expect(streakStore.get()).toEqual({ date: yesterday, count: 2 });
  await userEvent.click(screen.getByRole('button', { name: /Deepavali long weekend starts today/ }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/holidays\/deepavali$/);
  expect(streakStore.get()).toEqual({ date: todayKey(), count: 3 });
});
