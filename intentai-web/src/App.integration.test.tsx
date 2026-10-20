import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App';
import { STORAGE_PREFIX } from './data/persistentStore';
import { DEFAULT_SETTINGS } from './data/domain';
import { todayKey } from './data/progress';
import { lookupsStore, placeStore, settingsStore, streakStore } from './data/stores';

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

test('Today’s Near you card opens Nearby Explore with location off or on (PRD §6)', async () => {
  const first = renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /near you/i }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby$/);
  expect(await screen.findByRole('button', { name: /Exploring Singapore/ }, { timeout: 5000 })).toBeInTheDocument();
  first.unmount();

  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /near you/i }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby$/);
});

test('Explore links to the nine phrase settings, and their button opens the heads-up phrases', async () => {
  renderApp('/nearby');
  await userEvent.click(await screen.findByRole('link', { name: /Phrases for a setting/ }, { timeout: 5000 }));
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

test('[Onboarding + Today + My Space] finishing onboarding with the top 3 opens Today; the time shows in My Space', async () => {
  localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
  const user = userEvent.setup();
  const first = renderApp('/');
  await user.click(screen.getByRole('button', { name: /get started/i }));
  await user.click(screen.getByRole('button', { name: /1 – 3 years/i }));
  await user.click(screen.getByRole('button', { name: /^continue/i }));
  await user.click(screen.getByRole('button', { name: /^Food/ }));
  await user.click(screen.getByRole('button', { name: /^continue/i }));
  for (let i = 0; i < 3; i += 1) {
    await user.click(screen.getByRole('button', { name: /skip/i }));
  }
  await user.click(screen.getByRole('button', { name: /start learning/i }));
  await user.click(screen.getByRole('button', { name: 'Default' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
  first.unmount();
  renderApp('/my-space');
  expect(screen.getByText(/1 – 3 years/)).toBeInTheDocument();
});

test('Nearby "Ask IntentAI" asks about the shown phrase on arrival, once', async () => {
  const plain = renderApp('/ask');
  const seeded = screen.getAllByRole('article').length;
  plain.unmount();

  renderApp('/nearby/phrases');
  await userEvent.click(screen.getByRole('button', { name: 'Ask IntentAI' }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/ask$/);
  expect(screen.getByRole('article', { name: /IntentAI answer: What does chope mean\?/ })).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(seeded + 1);
});

test('Nearby "Ask IntentAI" carries the place as an Ask context the answer understands', async () => {
  placeStore.set('Office');
  renderApp('/nearby/phrases');
  await userEvent.click(screen.getByRole('button', { name: 'Ask IntentAI' }));
  expect(screen.getAllByText(/Office · work/).length).toBeGreaterThan(0);
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
  expect(screen.getByLabelText('2 day streak')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Learn more' }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/holidays\/deepavali$/);
  expect(streakStore.get()).toEqual({ date: todayKey(), count: 3 });
});
