import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { DEFAULT_PROFILE_V3, mySpacePrefsStore, profileV3Store, type ProfileV3 } from '../../data/profile/profile';
import {
  explorePersonalStore,
  onboardingStore,
  openedCardsStore,
  profileStore,
  questionsStore,
  reduceMotionStore,
  settingsStore,
  tipsStore,
} from '../../data/stores';
import { dismissToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import { HOLD_MS } from './PrivacyPage';
import { currentPath, renderAt } from './testUtils';

const ANSWERED: ProfileV3 = {
  ...DEFAULT_PROFILE_V3,
  from: 'CN',
  stay: 'lt3m',
  role: 'intern',
  language: 'en',
  base: 'sg-chinatown',
  topics: ['food', 'festivals', 'monuments', 'history'],
};

afterEach(() => {
  act(() => dismissToast());
  vi.useRealTimers();
});

test('S1: one h1, the holder card counts stamps, cards and tips from the real stores', () => {
  openedCardsStore.set(['thian-hock-keng', 'laksa', 'chicken-rice']);
  tipsStore.set([]);
  explorePersonalStore.set((d) => ({
    ...d,
    places: [{ placeKey: 'curated:sg-thian-hock-keng-temple', saved: false, visited: true, visitedOn: '2026-10-20', updatedAt: '2026-10-20T10:00:00Z' }],
  }));
  renderAt(paths.mySpace);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  const holder = screen.getByRole('region', { name: 'Passport holder' });
  const stat = (label: string) => within(holder).getByText(label).closest('div')!;
  expect(stat('Stamps')).toHaveTextContent('1');
  expect(stat('Cards')).toHaveTextContent('3');
  expect(stat('Tips')).toHaveTextContent('0');
  // Rank comes from Moments' rule: 3 opened cards = Explorer.
  expect(within(holder).getByRole('link', { name: /Explorer/ })).toBeInTheDocument();
});

test('S1: six tiles of what the app knows; From starts hidden and the eye shows it', async () => {
  profileV3Store.set(ANSWERED);
  renderAt(paths.mySpace);
  for (const label of ['From', 'In Singapore', 'Here as', 'Language', 'Home base', 'Topics']) {
    expect(screen.getByRole('button', { name: `Edit ${label}` })).toBeInTheDocument();
  }
  expect(screen.getByRole('button', { name: 'Edit From' })).toHaveTextContent('Hidden');
  expect(screen.getByRole('button', { name: 'Edit In Singapore' })).toHaveTextContent('< 3 months');
  expect(screen.getByRole('button', { name: 'Edit Home base' })).toHaveTextContent('Chinatown');
  expect(screen.getByRole('button', { name: 'Edit Topics' })).toHaveTextContent('Food › Festivals › Monuments › History');
  expect(screen.getByText(/1 detail private/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Keep From private' }));
  expect(screen.getByRole('button', { name: 'Edit From' })).toHaveTextContent('China');
  expect(profileV3Store.get().hidden).toEqual([]);
});

test('S4: the timeline editor saves a new stay, and Cancel keeps the old one', async () => {
  profileV3Store.set(ANSWERED);
  renderAt(paths.mySpace);
  await userEvent.click(screen.getByRole('button', { name: 'Edit In Singapore' }));
  const sheet = screen.getByRole('dialog', { name: 'Time in Singapore' });
  const slider = within(sheet).getByRole('slider', { name: 'Time in Singapore' });
  expect(slider).toHaveAttribute('aria-valuetext', 'Less than 3 months');
  fireEvent.change(slider, { target: { value: '2' } });
  expect(within(sheet).getByText('Feeling at home')).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }));
  expect(profileV3Store.get().stay).toBe('lt3m');

  await userEvent.click(screen.getByRole('button', { name: 'Edit In Singapore' }));
  fireEvent.change(screen.getByRole('slider', { name: 'Time in Singapore' }), { target: { value: '3' } });
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(profileV3Store.get().stay).toBe('3yplus');
  expect(profileStore.get().time).toBe('More than 3 years');
  expect(screen.getByRole('button', { name: 'Edit In Singapore' })).toHaveTextContent('3+ years');
});

test('editors: role tiles save, and Clear empties a field with Undo', async () => {
  profileV3Store.set(ANSWERED);
  renderAt(paths.mySpace);
  await userEvent.click(screen.getByRole('button', { name: 'Edit Here as' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Researcher/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(profileStore.get().role).toBe('Researcher');

  await userEvent.click(screen.getByRole('button', { name: 'Edit Here as' }));
  await userEvent.click(screen.getByRole('button', { name: 'Clear Here as' }));
  expect(screen.getByRole('button', { name: 'Edit Here as' })).toHaveTextContent('Not set');
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(profileV3Store.get().role).toBe('researcher');
});

test('switches: Flag occasions and Answer as a local are the shared settings', async () => {
  renderAt(paths.mySpace);
  const local = screen.getByRole('switch', { name: 'Answer as a local' });
  expect(local).toHaveAttribute('aria-checked', 'false');
  await userEvent.click(local);
  expect(settingsStore.get().local).toBe(true);
  await userEvent.click(screen.getByRole('switch', { name: 'Flag occasions' }));
  expect(settingsStore.get().occasions).toBe(true);
});

test('links: Settings, Privacy & data, Redo onboarding, Help', async () => {
  renderAt(paths.mySpace);
  await userEvent.click(screen.getByRole('button', { name: /Help & feedback/ }));
  expect(screen.getByRole('dialog', { name: 'Help & feedback' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'OK' }));
  await userEvent.click(screen.getByRole('link', { name: /Privacy & data/ }));
  expect(currentPath()).toBe(paths.mySpacePrivacy);
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  await userEvent.click(screen.getByRole('button', { name: /Redo onboarding/ }));
  expect(currentPath()).toBe(paths.welcome);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Where are you from?');
});

test('S2: Reduce motion is the app-wide setting; notification choices are kept locally', async () => {
  renderAt(paths.mySpaceSettings);
  expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: 'Reduced' }));
  expect(reduceMotionStore.get()).toBe(true);
  expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
  await userEvent.click(screen.getByRole('radio', { name: 'Full' }));
  expect(reduceMotionStore.get()).toBe(false);

  await userEvent.click(screen.getByRole('switch', { name: 'Recap reminders' }));
  expect(mySpacePrefsStore.get().notify.recaps).toBe(true);
  await userEvent.click(screen.getByRole('radio', { name: 'Morning' }));
  expect(mySpacePrefsStore.get().notifyTime).toBe('morning');
  expect(screen.queryByText(/doesn’t send notifications yet/)).toBeNull();
  await userEvent.click(screen.getByRole('switch', { name: 'Captions on videos' }));
  expect(mySpacePrefsStore.get().captions).toBe(false);
});

test('S2: language opens the script tiles and Terms & licences lists photo credits', async () => {
  renderAt(paths.mySpaceSettings);
  await userEvent.click(screen.getByRole('button', { name: /Language/ }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Language' })).getByRole('button', { name: '한국어, Korean' }));
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(profileV3Store.get().language).toBe('ko');
  expect(screen.getByText('Cards in English for now')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Terms & licences/ }));
  const credits = screen.getByRole('dialog', { name: 'Terms & licences' });
  expect(within(credits).getByText('Photo: Zairon · CC BY-SA 4.0')).toBeInTheDocument();
});

test('S3: stored areas show sizes and counts; Clear has Undo', async () => {
  openedCardsStore.set(['laksa', 'chicken-rice']);
  questionsStore.set([]);
  renderAt(paths.mySpacePrivacy);
  expect(screen.getByRole('heading', { name: 'Your data stays on this phone' })).toBeInTheDocument();
  expect(screen.getByText('0 stamps · 2 cards')).toBeInTheDocument();
  expect(screen.getByText('0 questions · 0 local tips')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Clear Passport & cards' }));
  expect(openedCardsStore.get()).toEqual([]);
  expect(screen.getByText('0 stamps · 0 cards')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(openedCardsStore.get()).toEqual(['laksa', 'chicken-rice']);
  expect(screen.queryByRole('button', { name: 'Clear Profile & settings' })).not.toBeInTheDocument();
});

test('S3: Hold to delete only deletes after a full hold, then starts onboarding again', () => {
  vi.useFakeTimers();
  profileV3Store.set(ANSWERED);
  openedCardsStore.set(['laksa']);
  renderAt(paths.mySpacePrivacy);
  const hold = screen.getByRole('button', { name: /Hold to delete all my data/ });
  fireEvent.pointerDown(hold);
  act(() => vi.advanceTimersByTime(HOLD_MS / 2));
  fireEvent.pointerUp(hold);
  act(() => vi.advanceTimersByTime(HOLD_MS));
  expect(openedCardsStore.get()).toEqual(['laksa']);

  fireEvent.pointerDown(hold);
  act(() => vi.advanceTimersByTime(HOLD_MS + 10));
  expect(openedCardsStore.get()).toEqual([]);
  expect(profileV3Store.get()).toEqual(DEFAULT_PROFILE_V3);
  expect(onboardingStore.get().done).toBe(false);
  expect(currentPath()).toBe(paths.welcome);
});

test('Memory: My Space switch and count; Settings lists, adds, forgets, clears with undo and resets', async () => {
  const { memoryStore, EMPTY_MEMORY } = await import('../../data/memory');
  memoryStore.set(EMPTY_MEMORY);
  profileV3Store.set(ANSWERED);
  renderAt(paths.mySpace);
  expect(screen.getByText(/things Ask remembers/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Manage' }));
  expect(currentPath()).toBe(paths.mySpaceSettings);

  const list = screen.getByRole('list', { name: 'What Ask remembers' });
  expect(within(list).getByText('From China')).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Add something Ask should remember'), 'I’m vegetarian');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(within(list).getByText('I’m vegetarian')).toBeInTheDocument();
  expect(within(list).getByText('Added by you')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Forget “From China”' }));
  expect(memoryStore.get().forgotten).toContain('profile:from');

  await userEvent.click(screen.getByRole('button', { name: /Clear memory/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByText(/Nothing yet/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(within(screen.getByRole('list', { name: 'What Ask remembers' })).getByText('I’m vegetarian')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Reset to profile/ }));
  expect(memoryStore.get().items).toEqual([]);
  expect(screen.getByText('From China')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('switch', { name: 'Memory' }));
  expect(memoryStore.get().enabled).toBe(false);
  expect(screen.queryByRole('list', { name: 'What Ask remembers' })).not.toBeInTheDocument();
});
