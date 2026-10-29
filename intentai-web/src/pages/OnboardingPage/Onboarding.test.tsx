import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import App from '../../App';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { DEFAULT_PROFILE_V3, profileV3Store } from '../../data/profile/profile';
import { culturePrefsStore, explorePersonalStore, onboardingStore, profileStore } from '../../data/stores';
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
  expect(screen.getByText('Six quick questions · everything stays on this phone')).toBeInTheDocument();
  expect(screen.getByText('We record how long you spend on each page, anonymously, to improve the app.')).toBeInTheDocument();
  for (const label of ['Food', 'Monuments', 'Festivals']) expect(screen.getByText(label)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Start the hunt/ }));
  expect(location()).toBe('/onboarding?step=1');
  expect(h1()).toHaveTextContent('Where are you from?');
  expect(screen.getByRole('progressbar', { name: 'Questions' })).toHaveAttribute('aria-valuetext', 'Question 1 of 6');
});

test('From: nothing is pre-selected, Continue waits for a choice, and the pick starts hidden on the passport', async () => {
  renderAt('/onboarding?step=1');
  expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  expect(continueButton()).toBeDisabled();
  expect(screen.getByText('Pick a country to see how cards compare with home.')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /China/ }));
  expect(profileV3Store.get().from).toBe('CN');
  expect(profileStore.get().from).toBe('China');
  const passport = screen.getByRole('region', { name: 'Your passport' });
  // Private by default: the eye is closed and the value masked.
  const eye = within(passport).getByRole('button', { name: 'Keep From private' });
  expect(eye).toHaveAttribute('aria-pressed', 'true');
  expect(within(passport).queryByText('China')).not.toBeInTheDocument();
  expect(within(passport).getByText('Private')).toBeInTheDocument();
  expect(screen.getByText('Compared with China')).toBeInTheDocument();

  await userEvent.click(eye);
  expect(within(passport).getByText('China')).toBeInTheDocument();
  expect(profileV3Store.get().hidden).not.toContain('from');

  // Countries beyond the six tiles sit in a scroll row.
  await userEvent.click(within(screen.getByRole('group', { name: 'More countries' })).getByRole('button', { name: /Myanmar/ }));
  expect(profileV3Store.get().from).toBe('MM');

  await userEvent.click(continueButton());
  expect(location()).toBe('/onboarding?step=2');
});

test('time in Singapore: four tiles, one at a time, and the preview shows less background the longer the stay', async () => {
  renderAt('/onboarding?step=2');
  expect(h1()).toHaveTextContent('How long have you been in Singapore?');
  const short = screen.getByRole('button', { name: /Less than 3 months/ });
  const long = screen.getByRole('button', { name: /More than 3 years/ });
  await userEvent.click(short);
  expect(screen.getByText('Full background: the story and three facts.')).toBeInTheDocument();
  await userEvent.click(long);
  expect(long).toHaveAttribute('aria-pressed', 'true');
  expect(short).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('Just the essentials: one line.')).toBeInTheDocument();
  expect(profileStore.get().time).toBe('More than 3 years');
  // The passport fills in "IN SINGAPORE".
  expect(within(screen.getByRole('region', { name: 'Your passport' })).getByText('3+ years')).toBeInTheDocument();
});

test('role: six tiles and the machine-readable line spells the role', async () => {
  renderAt('/onboarding?step=3');
  expect(screen.getAllByRole('button', { pressed: false }).filter((b) => b.closest('[aria-label="Roles"]'))).toHaveLength(6);
  await userEvent.click(screen.getByRole('button', { name: /Student intern/ }));
  expect(profileV3Store.get().role).toBe('intern');
  expect(profileStore.get().role).toBe('Student intern');
  expect(document.body.textContent).toContain('P<SGPT<<<<STUDENT<INTERN');
});

test('language: tiles in their own script, and only English cards exist', async () => {
  renderAt('/onboarding?step=4');
  const chinese = screen.getByRole('button', { name: '中文, Chinese, simplified' });
  expect(within(chinese).getByText('中文')).toHaveAttribute('lang', 'zh-Hans');
  await userEvent.click(chinese);
  expect(screen.getByText(/Cards in English for now/)).toBeInTheDocument();
  // A real place name in that script from the Nearby catalogue.
  expect(screen.getByText('天福宫')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'English, Cards in English' }));
  expect(screen.getByText('Cards in English.')).toBeInTheDocument();
});

test('home base: an area pin sets Nearby’s area, and the preview lists the closest places', async () => {
  renderAt('/onboarding?step=5');
  expect(continueButton()).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }));
  expect(profileV3Store.get().base).toBe('sg-chinatown');
  expect(explorePersonalStore.get().selectedAreaId).toBe('sg-chinatown');
  expect(screen.getByText('Nearby from Chinatown')).toBeInTheDocument();
  expect(screen.getByText('Home base: Chinatown & Tanjong Pagar')).toBeInTheDocument();
  expect(continueButton()).toBeEnabled();
});

test('topics: tap in order, tap again to un-rank, Reset order clears', async () => {
  renderAt('/onboarding?step=6');
  expect(screen.getByRole('button', { name: /Stamp my passport/ })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Festivals' }));
  await userEvent.click(screen.getByRole('button', { name: 'Food' }));
  expect(screen.getByRole('button', { name: 'Festivals, ranked 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Food, ranked 2' })).toBeInTheDocument();
  expect(screen.getByText('Home leads with Festivals')).toBeInTheDocument();
  expect(culturePrefsStore.get().categories[0]).toBe('holidays');

  await userEvent.click(screen.getByRole('button', { name: 'Festivals, ranked 1' }));
  expect(screen.getByRole('button', { name: 'Food, ranked 1' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Reset order/ }));
  expect(profileV3Store.get().topics).toEqual([]);
});

test('Back goes to the previous question, and from question 1 to the welcome', async () => {
  renderAt('/onboarding?step=3');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding?step=2');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding');
});

test('old onboarding routes open the new questions', () => {
  renderAt('/onboarding/time');
  expect(location()).toBe('/onboarding?step=2');
});

test('the whole flow stamps the passport, writes every store and shows first finds near the base', async () => {
  const user = userEvent.setup();
  renderAt('/');
  await user.click(screen.getByRole('button', { name: /Start the hunt/ }));
  await user.click(screen.getByRole('button', { name: /India/ }));
  await user.click(continueButton());
  await user.click(screen.getByRole('button', { name: /1–3 years/ }));
  await user.click(continueButton());
  await user.click(screen.getByRole('button', { name: /Working/ }));
  await user.click(continueButton());
  await user.click(screen.getByRole('button', { name: /^English/ }));
  await user.click(continueButton());
  await user.click(screen.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }));
  await user.click(continueButton());
  await user.click(screen.getByRole('button', { name: 'Food' }));
  await user.click(screen.getByRole('button', { name: 'Monuments' }));
  await user.click(screen.getByRole('button', { name: /Stamp my passport/ }));

  expect(location()).toBe('/onboarding/result');
  expect(onboardingStore.get().done).toBe(true);
  expect(onboardingStore.get().duration).toBe('1 – 3 years');
  // Unranked topics follow in their order.
  expect(profileV3Store.get().topics).toEqual(['food', 'monuments', 'festivals', 'history']);
  expect(culturePrefsStore.get()).toEqual({ categories: ['foods', 'monuments', 'holidays'] });
  expect(profileStore.get()).toMatchObject({ from: 'India', time: '1–3 years', role: 'Working' });
  expect(explorePersonalStore.get().selectedAreaId).toBe('sg-chinatown');

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your passport is ready');
  expect(screen.getByRole('img', { name: /^Stamped WELCOME/ })).toBeInTheDocument();
  const finds = within(screen.getByRole('list', { name: 'Your first finds' })).getAllByRole('link');
  expect(finds).toHaveLength(3);
  expect(finds[0]).toHaveTextContent(/from your base/);
  expect(finds[1]).toHaveTextContent('You ranked Food #1');
  expect(finds[2]).toHaveTextContent('You ranked Monuments #2');

  await user.click(screen.getByRole('button', { name: /Start exploring/ }));
  expect(location()).toBe('/');
});

test('the result page without a home base says how to get finds', () => {
  profileV3Store.set({ ...DEFAULT_PROFILE_V3 });
  renderAt('/onboarding/result');
  expect(screen.getByText('Set a home base in My Space to see what’s closest.')).toBeInTheDocument();
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
  renderAt('/onboarding?step=3');
  await userEvent.click(screen.getByRole('button', { name: 'Leave onboarding' }));
  expect(location()).toBe('/my-space');
  expect(profileV3Store.get().from).toBe('IN');
});
