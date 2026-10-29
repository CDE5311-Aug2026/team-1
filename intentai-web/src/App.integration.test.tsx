import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App';
import { STORAGE_PREFIX } from './data/persistentStore';
import { DEFAULT_SETTINGS } from './data/domain';
import { todayKey } from './data/progress';
import { lookupsStore, placeStore, settingsStore, streakStore, reduceMotionStore } from './data/stores';

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

test('Home’s “places to explore” chip opens Nearby Explore with location off or on (PRD §6)', async () => {
  const first = renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /places to explore$/ }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby$/);
  expect(await screen.findByRole('button', { name: /All of Singapore/ }, { timeout: 5000 })).toBeInTheDocument();
  first.unmount();

  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /places to explore$/ }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby$/);
});

test('Explore opens the local phrases; Change leads to the nine phrase settings and back', async () => {
  renderApp('/nearby');
  await userEvent.click(await screen.findByRole('link', { name: /Local phrases/ }, { timeout: 5000 }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby\/phrases$/);
  await userEvent.click(screen.getByRole('button', { name: 'Change' }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby\/places$/);
  await userEvent.click(screen.getByRole('button', { name: /^Show \d+ phrases for/ }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby\/phrases$/);
});

test("a hawker centre's phrase tip saves once to Moments as editorial and opens Ask with its context", async () => {
  lookupsStore.set([]);
  renderApp('/nearby/place/curated:sg-maxwell-food-centre');
  await userEvent.click(await screen.findByRole('button', { name: 'Save to Moments' }, { timeout: 5000 }));
  expect(lookupsStore.get()).toEqual([expect.objectContaining({ word: 'Chope', source: 'IntentAI editorial' })]);
  await userEvent.click(screen.getByRole('button', { name: 'Save to Moments' }));
  expect(lookupsStore.get()).toHaveLength(1);
  expect(screen.getByText('Chope is already in Moments')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ask about this phrase' }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/ask$/);
  expect(screen.getByRole('article', { name: /IntentAI answer: What does chope mean\?/ })).toBeInTheDocument();
});

test('[Ask + Moments] a phrase asked about in Ask appears in Moments', async () => {
  const user = userEvent.setup();
  const first = renderApp('/ask');
  await user.type(screen.getByRole('textbox', { name: /ask intentai/i }), 'What does paiseh mean?{Enter}');
  first.unmount();
  renderApp('/moments');
  expect(screen.getAllByText(/paiseh/i).length).toBeGreaterThan(0);
});

test('[Onboarding + Home + My Space] the Treasure Hunt onboarding opens Home; the answers show in My Space', async () => {
  localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
  const user = userEvent.setup();
  const first = renderApp('/');
  await user.click(screen.getByRole('button', { name: /Start the hunt/ }));
  await user.click(screen.getByRole('button', { name: /India/ }));
  await user.click(screen.getByRole('button', { name: /^Continue/ }));
  await user.click(screen.getByRole('button', { name: /1–3 years/ }));
  await user.click(screen.getByRole('button', { name: /^Continue/ }));
  await user.click(screen.getByRole('button', { name: /Working/ }));
  await user.click(screen.getByRole('button', { name: /^Continue/ }));
  await user.click(screen.getByRole('button', { name: /^English/ }));
  await user.click(screen.getByRole('button', { name: /^Continue/ }));
  await user.click(screen.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }));
  await user.click(screen.getByRole('button', { name: /^Continue/ }));
  await user.click(screen.getByRole('button', { name: 'Food' }));
  await user.click(screen.getByRole('button', { name: /Stamp my passport/ }));
  await user.click(screen.getByRole('button', { name: /Start exploring/ }));
  expect(screen.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening)/ })).toBeInTheDocument();
  first.unmount();
  renderApp('/my-space');
  expect(screen.getAllByText(/1–3 years/).length).toBeGreaterThan(0);
});

test('Nearby "Ask IntentAI" asks about the shown phrase on arrival, once', async () => {
  renderApp('/nearby/phrases');
  await userEvent.click(screen.getByRole('button', { name: 'Ask IntentAI' }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/ask$/);
  expect(screen.getByRole('article', { name: /IntentAI answer: What does chope mean\?/ })).toBeInTheDocument();
  expect(screen.getAllByRole('article', { name: /^IntentAI answer/ })).toHaveLength(1);
});

test('Nearby "Ask IntentAI" carries the place as an Ask context the answer understands', async () => {
  placeStore.set('Office');
  reduceMotionStore.set(true); // the reading shows at once (no thinking steps)
  renderApp('/nearby/phrases');
  await userEvent.click(screen.getByRole('button', { name: 'Ask IntentAI' }));
  // The place's Ask context becomes the situation (where · who · topic), and the reading names who said it.
  // The place's context is a known situation: no situation card, and the reading names who said it.
  expect(screen.getAllByText('Office · Your colleague').length).toBeGreaterThan(0);
  expect(screen.getByRole('article', { name: /IntentAI answer/ })).toHaveTextContent('Your colleague');
});

test('Moments "Not sure" opens Ask a local with the phrase drafted', async () => {
  renderApp('/moments');
  await userEvent.click(screen.getAllByRole('button', { name: /not sure/i })[0]);
  const dialog = screen.getByRole('dialog', { name: 'Ask a local' });
  expect(within(dialog).getByRole('textbox', { name: 'Your message' })).toHaveValue('What does “sabo” mean here?');
});

test('[Today + streak] opening the app does not add a day; reading the holiday detail does', async () => {
  const now = new Date();
  const yesterday = todayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  streakStore.set({ date: yesterday, count: 2 });
  renderApp('/');
  expect(screen.getByRole('link', { name: /^2 day streak/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Deepavali long weekend starts today' }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/holidays\/deepavali$/);
  expect(streakStore.get()).toEqual({ date: todayKey(), count: 3 });
});
