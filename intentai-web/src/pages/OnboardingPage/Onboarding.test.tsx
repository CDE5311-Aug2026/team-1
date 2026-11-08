import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import App from '../../App';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { DEFAULT_PROFILE_V3, localDate, profileV3Store } from '../../data/profile/profile';
import { collectedStore, culturePrefsStore, onboardingStore, placeStore, testerStore } from '../../data/stores';
import { TOURISM_CATEGORIES } from '../../data/tourism';
import { huntModeStore } from '../../data/v2Stores';
import { dismissToast } from '../../hooks/useToast';
import { feedPreview, leadLines, photoPlaces } from './flow';

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
const primary = (name: RegExp) => screen.getByRole('button', { name });
const regionChip = (name: string) => within(screen.getByRole('group', { name: 'Regions' })).getByRole('button', { name: new RegExp(`^${name},`) });

beforeEach(() => {
  // Tests start as a returning user (src/test/setup.ts); onboarding is the first-run flow.
  localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
  localStorage.removeItem(`${STORAGE_PREFIX}hunt-mode`);
  profileV3Store.set({ ...DEFAULT_PROFILE_V3 });
});

afterEach(() => {
  act(() => dismissToast());
});

test('feed preview: two real places with photos, in ranking order; two of #1 when only one is picked', () => {
  for (const c of TOURISM_CATEGORIES) expect(photoPlaces(c).length).toBeGreaterThan(0);
  expect(feedPreview([])).toEqual([]);
  const two = feedPreview(['wel', 'att']);
  expect(two.map((p) => p.category)).toEqual(['wel', 'att']);
  expect(two.every((p) => p.photo && p.name)).toBe(true);
  const one = feedPreview(['lei']);
  expect(one).toHaveLength(2);
  expect(one.every((p) => p.category === 'lei')).toBe(true);
  expect(leadLines(['att', 'wel', 'cru'])).toEqual(['Home leads with Attractions.', 'Then Wellness, Cruise.']);
});

test('a first-run user lands on Welcome B (board 01); Start the hunt opens question 1', async () => {
  renderAt('/');
  expect(location()).toBe('/onboarding');
  expect(screen.getByRole('heading', { level: 1, name: /^Welcome to the\s*Singapore Treasure Hunt$/ })).toBeInTheDocument();
  expect(screen.getByText('Three quick questions · everything stays on this phone')).toBeInTheDocument();
  expect(screen.getByText('We record how long you spend on each page, anonymously, to improve the app.')).toBeInTheDocument();
  const cats = within(screen.getByRole('list', { name: 'The four place categories' })).getAllByRole('listitem');
  expect(cats.map((li) => li.textContent)).toEqual(['Attractions', 'Wellness', 'Leisure', 'Cruise']);
  await userEvent.click(screen.getByRole('button', { name: /Start the hunt/ }));
  expect(location()).toBe('/onboarding?step=1');
  expect(h1()).toHaveTextContent('What would you like to explore?');
  expect(screen.getByRole('progressbar', { name: 'Questions' })).toHaveAttribute('aria-valuetext', 'Step 1 of 3');
});

test('question 1: Continue waits for a pick; the preview follows the ranking; nothing is saved yet', async () => {
  const user = userEvent.setup();
  renderAt('/onboarding?step=1');
  expect(primary(/Pick at least one category/)).toBeDisabled();
  expect(screen.getByText('Pick a category to see your feed')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Wellness' }));
  await user.click(screen.getByRole('button', { name: 'Attractions' }));
  expect(screen.getByRole('button', { name: 'Wellness, ranked 1' })).toBeInTheDocument();
  const preview = screen.getByRole('region', { name: 'Preview of your home feed' });
  expect(within(preview).getByText('Home leads with Wellness.')).toBeInTheDocument();
  expect(within(preview).getByText('Then Attractions.')).toBeInTheDocument();
  expect(within(preview).getByText('2 of 4')).toBeInTheDocument();
  const cards = within(preview).getAllByRole('listitem');
  expect(cards).toHaveLength(2);
  expect(cards[0]).toHaveTextContent(/^Wellness/);
  expect(cards[1]).toHaveTextContent(/^Attractions/);
  expect(primary(/^Continue/)).toBeEnabled();
  expect(profileV3Store.get().tourismRanking).toBeUndefined();
});

test('question 2: Continue needs a mode and a region; Back keeps the question-1 answers', async () => {
  const user = userEvent.setup();
  renderAt('/onboarding?step=1');
  await user.click(screen.getByRole('button', { name: 'Leisure' }));
  await user.click(primary(/^Continue/));
  expect(location()).toBe('/onboarding?step=2');
  expect(h1()).toHaveTextContent('Hunt with others nearby?');
  // a challenge opens its volume now (there is no Join)
  expect(screen.getByText(/^Open this weekend’s challenges and see example leaderboards\./)).toBeInTheDocument();
  expect(screen.queryByText(/Join/)).toBeNull();
  expect(primary(/Pick a mode and a region/)).toBeDisabled();
  await user.click(screen.getByRole('radio', { name: /Not now/ }));
  expect(primary(/Pick a mode and a region/)).toBeDisabled();
  await user.click(regionChip('East'));
  expect(primary(/^Continue/)).toBeEnabled();
  expect(huntModeStore.get()).toEqual({});
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding?step=1');
  expect(screen.getByRole('button', { name: 'Leisure, ranked 1' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding');
});

test('question 2: hunt together / on your own is a radio group of two cards, one Tab stop, arrows move the choice', async () => {
  const user = userEvent.setup();
  renderAt('/onboarding?step=1');
  await user.click(screen.getByRole('button', { name: 'Cruise' }));
  await user.click(primary(/^Continue/));
  const group = screen.getByRole('radiogroup', { name: 'Hunt with others nearby?' });
  const [together, solo] = within(group).getAllByRole('radio');
  expect(together).toHaveAccessibleName(/^Yes, hunt together/);
  expect(solo).toHaveAccessibleName(/^Not now/);
  // nothing chosen yet: both unchecked, the first card is the group's Tab stop
  expect(together).toHaveAttribute('aria-checked', 'false');
  expect(solo).toHaveAttribute('aria-checked', 'false');
  expect(together).toHaveAttribute('tabindex', '0');
  expect(solo).toHaveAttribute('tabindex', '-1');
  await user.click(solo);
  expect(solo).toHaveAttribute('aria-checked', 'true');
  expect(together).toHaveAttribute('aria-checked', 'false');
  expect(solo).toHaveAttribute('tabindex', '0');
  // the chosen card shows a check in its radio, not only a colour
  expect(solo.querySelector('svg path[d^="m5 12.5"]')).not.toBeNull();
  expect(together.querySelector('svg path[d^="m5 12.5"]')).toBeNull();
  await user.keyboard('{ArrowLeft}');
  expect(together).toHaveAttribute('aria-checked', 'true');
  expect(together).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(solo).toHaveAttribute('aria-checked', 'true');
  expect(solo).toHaveFocus();
});

test('old onboarding routes open question 1', () => {
  for (const old of ['/onboarding/time', '/onboarding/topics', '/onboarding/quiz']) {
    const { unmount } = renderAt(old);
    expect(location()).toBe('/onboarding?step=1');
    unmount();
  }
});

test('the whole flow: rank → mode and region → review edit → stamp saves the v2 answers only, then Home', async () => {
  const user = userEvent.setup();
  const testerBefore = testerStore.get();
  testerStore.set({ name: 'P01', version: 'B' });
  profileV3Store.set({ ...DEFAULT_PROFILE_V3, topics: ['food', 'nature'], base: 'sg-chinatown' });
  const prefsBefore = culturePrefsStore.get();
  const placesBefore = placeStore.get();
  const collectedBefore = collectedStore.get();

  renderAt('/');
  await user.click(screen.getByRole('button', { name: /Start the hunt/ }));
  await user.click(screen.getByRole('button', { name: 'Attractions' }));
  await user.click(screen.getByRole('button', { name: 'Cruise' }));
  await user.click(primary(/^Continue/));
  await user.click(screen.getByRole('radio', { name: /Yes, hunt together/ }));
  await user.click(regionChip('Central'));
  await user.click(primary(/^Continue/));

  expect(location()).toBe('/onboarding/result');
  expect(h1()).toHaveTextContent('You’re all set, P01');
  expect(screen.getByRole('progressbar', { name: 'Questions' })).toHaveAttribute('aria-valuetext', 'Step 3 of 3');
  const explore = screen.getByRole('button', { name: 'Explore: Attractions, Cruise. Change' });
  expect(screen.getByRole('button', { name: 'Hunt: Central, hunting together. Change' })).toBeInTheDocument();
  expect(screen.getByText('Central leaderboard')).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/AI picks|refreshed daily|within 50 m/);

  // Cancel discards a change made in the sheet
  await user.click(explore);
  let sheet = screen.getByRole('dialog', { name: 'What would you like to explore?' });
  await user.click(within(sheet).getByRole('button', { name: 'Wellness' }));
  await user.click(within(sheet).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Explore: Attractions, Cruise. Change' })).toBeInTheDocument();

  // Save keeps it; you stay on the review
  await user.click(screen.getByRole('button', { name: /^Explore:/ }));
  sheet = screen.getByRole('dialog', { name: 'What would you like to explore?' });
  await user.click(within(sheet).getByRole('button', { name: 'Cruise, ranked 2' }));
  await user.click(within(sheet).getByRole('button', { name: 'Wellness' }));
  await user.click(within(sheet).getByRole('button', { name: 'Save' }));
  expect(location()).toBe('/onboarding/result');
  expect(screen.getByRole('button', { name: 'Explore: Attractions, Wellness. Change' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /^Hunt:/ }));
  sheet = screen.getByRole('dialog', { name: 'Hunt with others nearby?' });
  await user.click(within(sheet).getByRole('radio', { name: /Not now/ }));
  await user.click(within(within(sheet).getByRole('group', { name: 'Regions' })).getByRole('button', { name: /^West,/ }));
  await user.click(within(sheet).getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('button', { name: 'Hunt: West, on your own. Change' })).toBeInTheDocument();
  // nothing saved before the stamp
  expect(onboardingStore.get().done).toBe(false);
  expect(profileV3Store.get().tourismRanking).toBeUndefined();

  await user.click(primary(/Stamp my passport/));
  expect(screen.getByRole('img', { name: /^Stamped, / })).toBeInTheDocument();
  expect(onboardingStore.get().done).toBe(true);
  const profile = profileV3Store.get();
  expect(profile.tourismRanking).toEqual(['att', 'wel']);
  expect(profile.stampedOn).toBe(localDate());
  expect(huntModeStore.get()).toEqual({ mode: 'solo', region: 'west' });
  // legacy answers, Today's preferences and place visits are untouched (plan A1, B3)
  expect(profile.topics).toEqual(['food', 'nature']);
  expect(profile.base).toBe('sg-chinatown');
  expect(culturePrefsStore.get()).toEqual(prefsBefore);
  expect(placeStore.get()).toEqual(placesBefore);
  expect(collectedStore.get()).toEqual(collectedBefore);

  await waitFor(() => expect(location()).toBe('/'), { timeout: 3000 });
  testerStore.set(testerBefore);
});

test('Back from the review returns to question 2 with the answers kept', async () => {
  const user = userEvent.setup();
  renderAt('/onboarding?step=1');
  await user.click(screen.getByRole('button', { name: 'Cruise' }));
  await user.click(primary(/^Continue/));
  await user.click(screen.getByRole('radio', { name: /Not now/ }));
  await user.click(regionChip('North'));
  await user.click(primary(/^Continue/));
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding?step=2');
  expect(screen.getByRole('radio', { name: /Not now/ })).toHaveAttribute('aria-checked', 'true');
  expect(regionChip('North')).toHaveAttribute('aria-pressed', 'true');
});

test('the review without answers cannot be stamped until a line is filled in', () => {
  renderAt('/onboarding/result');
  expect(primary(/Stamp my passport/)).toBeDisabled();
  expect(screen.getByText('Pick at least one')).toBeInTheDocument();
});

test('a first-run user can skip with ✕: onboarding counts as done, Home opens, nothing is saved', async () => {
  renderAt('/onboarding?step=1');
  await userEvent.click(screen.getByRole('button', { name: 'Attractions' }));
  await userEvent.click(screen.getByRole('button', { name: 'Skip onboarding' }));
  expect(onboardingStore.get().done).toBe(true);
  expect(location()).toBe('/');
  expect(profileV3Store.get().tourismRanking).toBeUndefined();
  expect(profileV3Store.get().stampedOn).toBeUndefined();
});

test('a returning user redoing onboarding starts from the saved answers and leaves with ✕ to the Passport tab', async () => {
  onboardingStore.set((prev) => ({ ...prev, done: true }));
  profileV3Store.set({ ...DEFAULT_PROFILE_V3, tourismRanking: ['cru', 'lei'] });
  huntModeStore.set({ mode: 'together', region: 'east' });
  renderAt('/onboarding?step=1');
  expect(screen.getByRole('button', { name: 'Cruise, ranked 1' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Leave onboarding' }));
  expect(location()).toBe('/my-space');
  expect(profileV3Store.get().tourismRanking).toEqual(['cru', 'lei']);
});
