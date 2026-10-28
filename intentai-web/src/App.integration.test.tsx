import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import App from './App';
import { DEFAULT_SETTINGS, isOnboarding } from './data/domain';
import { STORAGE_PREFIX, resetPersistentStores } from './data/persistentStore';
import { todayKey } from './data/progress';
import { lookupsStore, onboardingStore, placeStore, settingsStore, streakStore } from './data/stores';

// jsdom cannot run Leaflet; the home base step's Locate button (static frame chrome) drops the pin instead.
vi.mock('./components/OnboardingMap/OnboardingMapView', () => ({ default: () => null }));

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

test('Home’s Near you pill opens Nearby Explore with location off or on (PRD §6)', async () => {
  const first = renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /^near you/i }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby$/);
  expect(await screen.findByRole('button', { name: /All of Singapore/ }, { timeout: 5000 })).toBeInTheDocument();
  first.unmount();

  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /^near you/i }));
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
  await userEvent.click(screen.getByRole('button', { name: 'Deepavali long weekend starts today' }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/holidays\/deepavali$/);
  expect(streakStore.get()).toEqual({ date: todayKey(), count: 3 });
});

/* ---------- onboarding: O1 → O8 ---------- */

const h1 = () => screen.getByRole('heading', { level: 1 });
const pickFirst = async (group: string) => {
  await userEvent.click(within(screen.getByRole('radiogroup', { name: group })).getAllByRole('radio')[0]);
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
};
const topic = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label},`) });
const rank = async (...labels: string[]) => {
  for (const label of labels) await userEvent.click(topic(label));
};

/** First launch through every step to the stamp. */
async function onboardFresh() {
  window.localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
  resetPersistentStores();
  const view = renderApp('/');
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/onboarding$/);
  await userEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Where are you from?' }, { timeout: 3000 })).toBeInTheDocument();
  await pickFirst('Where you are from');
  await pickFirst('Time in Singapore');
  await pickFirst('What brings you here');
  await pickFirst('Language');
  expect(h1()).toHaveTextContent('Where do you spend most of your time?');
  await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(h1()).toHaveTextContent('Rank the topics you enjoy most');
  await rank('Festivals', 'Food', 'History', 'Monuments');
  await userEvent.click(screen.getByRole('button', { name: /stamp my passport/i }));
  expect(h1()).toHaveTextContent('Your passport is ready');
  return view;
}

test('[Onboarding] a fresh user goes O1 → O8, the stamp lands in the passport, Start exploring opens Home', async () => {
  await onboardFresh();
  const saved = onboardingStore.get();
  expect(saved).toMatchObject({ done: true, topics: ['festival', 'food', 'history', 'monument'], base: { label: 'Berlin Wall Fragments' } });
  expect(isOnboarding(saved)).toBe(true);
  expect(within(screen.getByRole('region', { name: 'Your passport' })).getByText('WELCOME')).toBeInTheDocument();
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/onboarding$/);
  await userEvent.click(screen.getByRole('link', { name: /start exploring/i }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/$/);
  expect(screen.queryByRole('heading', { level: 1, name: 'Your passport is ready' })).not.toBeInTheDocument();
}, 20000);

test('[Onboarding] O8 Back → unrank a topic clears done; rerank + finish stamps again; a reload lands on Home', async () => {
  const first = await onboardFresh();
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(h1()).toHaveTextContent('Rank the topics you enjoy most');
  await userEvent.click(topic('Food'));
  expect(onboardingStore.get()).toMatchObject({ done: false, completedAt: null, topics: ['festival', 'history', 'monument'] });
  await rank('Food');
  await userEvent.click(screen.getByRole('button', { name: /stamp my passport/i }));
  expect(h1()).toHaveTextContent('Your passport is ready');
  expect(onboardingStore.get()).toMatchObject({ done: true, topics: ['festival', 'history', 'monument', 'food'] });
  expect(onboardingStore.get().completedAt).not.toBeNull();

  // Reload: stores re-read localStorage, the app mounts again.
  first.unmount();
  resetPersistentStores();
  renderApp('/onboarding');
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/$/);
  expect(onboardingStore.get().done).toBe(true);
}, 20000);
