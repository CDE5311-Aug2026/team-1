import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import App from '../../App';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { DEFAULT_PROFILE_V3, profileV3Store } from '../../data/profile/profile';
import { culturePrefsStore, explorePersonalStore, onboardingStore } from '../../data/stores';
import { dismissToast } from '../../hooks/useToast';

function Pathname() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <App />
      <Pathname />
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId('location').textContent;
const h1 = () => screen.getByRole('heading', { level: 1 });
const continueButton = () => screen.getByRole('button', { name: /^Continue/ });

beforeEach(() => {
  // Tests start as a returning user (src/test/setup.ts); onboarding is the first-run flow.
  localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
});

afterEach(() => {
  act(() => dismissToast());
});

test('a first-run user lands on the Treasure Hunt welcome (O1); Start the hunt opens question 1', async () => {
  renderAt('/');
  expect(location()).toBe('/onboarding');
  expect(screen.getByRole('heading', { level: 1, name: /^Welcome to the\s*Singapore Treasure Hunt$/ })).toBeInTheDocument();
  expect(screen.getByText('Two quick questions · everything stays on this phone')).toBeInTheDocument();
  expect(screen.getByText('We record how long you spend on each page, anonymously, to improve the app.')).toBeInTheDocument();
  for (const label of ['Landmark', 'Culture', 'Food', 'Nature']) expect(screen.getByText(label)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Start the hunt/ }));
  expect(location()).toBe('/onboarding?step=1');
  expect(h1()).toHaveTextContent('Which places do you want to find first?');
  expect(screen.getByRole('progressbar', { name: 'Questions' })).toHaveAttribute('aria-valuetext', 'Question 1 of 2');
});

test('onboarding asks only about places: no country, stay, role or language', () => {
  renderAt('/onboarding?step=1');
  const passport = screen.getByRole('region', { name: 'Your passport' });
  expect(within(passport).getAllByRole('term').map((t) => t.textContent)).toEqual(['Place tags', 'Home base']);
});

test('place tags: tap in order, tap again to un-rank, Reset order clears', async () => {
  renderAt('/onboarding?step=1');
  expect(continueButton()).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Nature' }));
  await userEvent.click(screen.getByRole('button', { name: 'Food' }));
  expect(screen.getByRole('button', { name: 'Nature, ranked 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Food, ranked 2' })).toBeInTheDocument();
  expect(screen.getByText('Home leads with Nature')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Nature, ranked 1' }));
  expect(screen.getByRole('button', { name: 'Food, ranked 1' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Reset order/ }));
  expect(profileV3Store.get().topics).toEqual([]);
});

test('home base: an area pin sets Nearby’s area, and the preview lists the closest places', async () => {
  renderAt('/onboarding?step=2');
  expect(h1()).toHaveTextContent('Where do you spend most of your time?');
  expect(screen.getByRole('button', { name: /Stamp my passport/ })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }));
  expect(profileV3Store.get().base).toBe('sg-chinatown');
  expect(explorePersonalStore.get().selectedAreaId).toBe('sg-chinatown');
  expect(screen.getByText('Nearby from Chinatown')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Stamp my passport/ })).toBeEnabled();
});

test('Back goes to the previous question, and from question 1 to the welcome', async () => {
  renderAt('/onboarding?step=2');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding?step=1');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding');
});

test('old onboarding routes open the new questions', () => {
  renderAt('/onboarding/time');
  expect(location()).toBe('/onboarding?step=1');
});

test('the whole flow stamps the passport, writes every store and shows first finds for the base and tags', async () => {
  const user = userEvent.setup();
  renderAt('/');
  await user.click(screen.getByRole('button', { name: /Start the hunt/ }));
  await user.click(screen.getByRole('button', { name: 'Food' }));
  await user.click(screen.getByRole('button', { name: 'Landmark' }));
  await user.click(continueButton());
  await user.click(screen.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }));
  await user.click(screen.getByRole('button', { name: /Stamp my passport/ }));

  expect(location()).toBe('/onboarding/result');
  expect(onboardingStore.get().done).toBe(true);
  // Unranked tags follow in their order.
  expect(profileV3Store.get().topics).toEqual(['food', 'landmark', 'culture', 'nature']);
  expect(culturePrefsStore.get()).toEqual({ categories: ['foods', 'monuments', 'history'] });
  expect(explorePersonalStore.get().selectedAreaId).toBe('sg-chinatown');

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your passport is ready');
  expect(screen.getByRole('img', { name: /^Stamped WELCOME/ })).toBeInTheDocument();
  const finds = within(screen.getByRole('list', { name: 'Your first finds' })).getAllByRole('link');
  expect(finds).toHaveLength(3);
  expect(finds[0]).toHaveTextContent(/Your #1 · Food/);
  expect(finds[1]).toHaveTextContent(/Closest to your base/);
  expect(finds[2]).toHaveTextContent(/Your #2 · Landmark/);

  await user.click(screen.getByRole('button', { name: /Start exploring/ }));
  expect(location()).toBe('/');
});

test('the result page without a home base says how to get finds', () => {
  profileV3Store.set({ ...DEFAULT_PROFILE_V3 });
  renderAt('/onboarding/result');
  expect(screen.getByText('Set a home base in Passport to see what’s closest.')).toBeInTheDocument();
});

test('a first-run user can skip onboarding with ✕: it counts as done and Home opens', async () => {
  renderAt('/onboarding?step=2');
  await userEvent.click(screen.getByRole('button', { name: 'Skip onboarding for now' }));
  expect(onboardingStore.get().done).toBe(true);
  expect(location()).toBe('/');
});

test('a returning user leaves onboarding with ✕ and is back in My Space, answers kept', async () => {
  onboardingStore.set((prev) => ({ ...prev, done: true }));
  profileV3Store.set({ ...DEFAULT_PROFILE_V3, from: 'IN' });
  renderAt('/onboarding?step=2');
  await userEvent.click(screen.getByRole('button', { name: 'Leave onboarding' }));
  expect(location()).toBe('/my-space');
  expect(profileV3Store.get().from).toBe('IN');
});
