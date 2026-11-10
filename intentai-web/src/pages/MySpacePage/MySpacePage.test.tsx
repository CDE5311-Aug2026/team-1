import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
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
  tipsStore,
} from '../../data/stores';
import { dismissToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import { allStamps } from '../../data/moments/moments';
import { TOURISM_CATEGORIES, TOURISM_INFO, tourismOf, type TourismCategory } from '../../data/tourism';
import { huntModeStore } from '../../data/v2Stores';
import { PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import { passportMrz } from './MySpacePage';
import { HOLD_MS } from './PrivacyPage';
import { currentPath, renderAt } from './testUtils';

const ANSWERED: ProfileV3 = {
  ...DEFAULT_PROFILE_V3,
  from: 'CN',
  stay: 'lt3m',
  role: 'intern',
  language: 'en',
  base: 'sg-chinatown',
  topics: ['food', 'culture', 'landmark', 'nature'],
};

afterEach(() => {
  act(() => dismissToast());
  vi.useRealTimers();
});

const ATT = 'curated:sg-artscience-museum' as const;
const WEL = 'curated:sg-henderson-waves' as const;
const visit = (placeKey: `curated:${string}`, day: string) => ({ placeKey, saved: false, visited: true, visitedOn: day, updatedAt: `${day}T10:00:00Z` });
const placesOf = (c: TourismCategory) => PUBLISHED_PLACES.filter((p) => tourismOf(p) === c && p.operatingStatus !== 'planned').length;

test('Passport card: one h1; stamps, volumes and tips come from the real stores; the rank is its stamp', () => {
  openedCardsStore.set(['thian-hock-keng', 'laksa', 'chicken-rice']);
  tipsStore.set([]);
  explorePersonalStore.set((d) => ({ ...d, places: [visit(ATT, '2026-11-07'), visit(WEL, '2026-11-04')] }));
  const expected = allStamps(explorePersonalStore.get(), openedCardsStore.get()).filter((s) => s.collected).length;
  expect(expected).toBeGreaterThan(0);
  renderAt(paths.mySpace);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Passport');
  const holder = screen.getByRole('region', { name: 'Passport holder' });
  const stat = (label: string) => within(holder).getByText(label).closest('div')!;
  expect(stat('Stamps')).toHaveTextContent(String(expected));
  expect(stat('Volumes')).toHaveTextContent('0');
  expect(stat('Tips')).toHaveTextContent('0');
  // Rank comes from Moments' rule: 3 opened cards = Explorer.
  expect(within(holder).getByRole('link', { name: /Explorer/ })).toHaveAttribute('href', paths.moments);
});

test('together mode: "Hunting together · Central" chip and the example leaderboard with your own row', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-07T10:00:00'));
  huntModeStore.set({ mode: 'together', region: 'central' });
  renderAt(paths.mySpace);
  const holder = screen.getByRole('region', { name: 'Passport holder' });
  expect(within(holder).getByText('Hunting together · Central')).toBeInTheDocument();
  expect(within(holder).queryByText(/public/i)).toBeNull();
  // Home's region leaderboard, named as one, with the animal icons (decorative) beside the names
  const board = screen.getByRole('region', { name: /^Leaderboard · Central · this weekend$/ });
  expect(within(board).getByText('Sample players until real times come in')).toBeInTheDocument();
  expect(within(board).queryByText('Example')).toBeNull();
  expect(within(board).getAllByRole('listitem')).toHaveLength(3);
  expect(within(board).getByText('Arjun K.')).toBeInTheDocument();
  expect(within(board).getByText(/no time yet/)).toBeInTheDocument();
  expect(board.querySelectorAll('svg[data-animal][aria-hidden="true"]')).toHaveLength(4);
  expect(within(board).getByRole('link', { name: 'Leaderboards' })).toHaveAttribute('href', '/hunt?board=speed');
});

test('together mode: the leaderboard comes before the Journal', () => {
  huntModeStore.set({ mode: 'together', region: 'east' });
  renderAt(paths.mySpace);
  const board = screen.getByRole('region', { name: /^Leaderboard · East · this weekend$/ });
  const journal = screen.getByRole('region', { name: 'Journal' });
  expect(board.compareDocumentPosition(journal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const holder = screen.getByRole('region', { name: 'Passport holder' });
  expect(holder.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('solo mode (and unset): no leaderboard and no together chip; the Journal follows the card', () => {
  huntModeStore.set({ mode: 'solo', region: 'central' });
  renderAt(paths.mySpace);
  expect(screen.getByText('Solo explorer')).toBeInTheDocument();
  expect(screen.queryByText(/Hunting together/)).toBeNull();
  expect(screen.queryByRole('region', { name: /Leaderboard/ })).toBeNull();
  expect(screen.getByRole('region', { name: 'Journal' })).toBeInTheDocument();
  cleanup();
  huntModeStore.set({});
  renderAt(paths.mySpace);
  expect(screen.queryByRole('region', { name: /Leaderboard/ })).toBeNull();
});

test('the MRZ lines use real fields only: name, the categories spelled out, counts, region and mode', () => {
  const profile: ProfileV3 = { ...DEFAULT_PROFILE_V3, tourismRanking: ['wel', 'att'] };
  const [a, cats, b] = passportMrz('Serin', profile, { stamps: 4, volumes: 1 }, { together: true, region: 'Central' });
  expect(a).toMatch(/^P<SGPSERIN<<<+$/);
  expect(cats).toBe('WELLNESS<ATTRACTIONS'.padEnd(44, '<'));
  expect(b).toBe('004SGP0001<<CENTRAL<<TOGETHER'.padEnd(44, '<'));
  // all four fit on their line
  const all: ProfileV3 = { ...DEFAULT_PROFILE_V3, tourismRanking: ['wel', 'cru', 'att', 'lei'] };
  expect(passportMrz('Serin', all, { stamps: 0, volumes: 0 }, { together: false })[1]).toBe('WELLNESS<CRUISE<ATTRACTIONS<LEISURE'.padEnd(44, '<'));
  const [, , solo] = passportMrz('Serin', DEFAULT_PROFILE_V3, { stamps: 0, volumes: 0 }, { together: false });
  expect(solo).toBe('000SGP0000<<SOLO'.padEnd(44, '<'));
  // no name given: no made-up holder in the line
  expect(passportMrz('', profile, { stamps: 0, volumes: 0 }, { together: false })[0]).toMatch(/^P<SGP<<<+$/);
});

test('collection: one card per category with real counts; the chips filter it; the chevron opens Search', async () => {
  explorePersonalStore.set((d) => ({ ...d, places: [visit(ATT, '2026-11-07'), visit(WEL, '2026-11-04')] }));
  renderAt(paths.mySpace);
  const total = TOURISM_CATEGORIES.reduce((n, c) => n + placesOf(c), 0);
  const collection = screen.getByRole('region', { name: 'My collection' });
  expect(within(collection).getByText(`2 of ${total} stamped`)).toBeInTheDocument();
  for (const c of TOURISM_CATEGORIES) expect(within(collection).getByRole('region', { name: TOURISM_INFO[c].label })).toBeInTheDocument();
  const att = within(collection).getByRole('region', { name: 'Attractions' });
  expect(within(att).getByRole('progressbar', { name: 'Attractions stamped' })).toHaveAttribute('aria-valuenow', '1');
  expect(within(att).getByRole('link', { name: /ArtScience Museum/ })).toHaveTextContent('Stamped 7 Nov');

  await userEvent.click(screen.getByRole('button', { name: 'Wellness' }));
  expect(screen.getByRole('button', { name: 'Wellness' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(collection).queryByRole('region', { name: 'Attractions' })).toBeNull();
  // the section total and the one card left now agree
  expect(within(collection).getAllByText(`1 of ${placesOf('wel')} stamped`)).toHaveLength(2);
  await userEvent.click(within(collection).getByRole('link', { name: /Wellness, 1 of .* See all in Search/ }));
  expect(currentPath()).toBe(paths.search);
});

test('journal carousel: recent days from the journal data, each opening that day in Moments', async () => {
  explorePersonalStore.set((d) => ({ ...d, places: [visit(ATT, '2026-11-07'), visit(WEL, '2026-11-04')] }));
  renderAt(paths.mySpace);
  const journal = screen.getByRole('region', { name: 'Journal' });
  expect(within(journal).getByRole('link', { name: /2 days/ })).toBeInTheDocument();
  const day = within(journal).getByRole('link', { name: /^Sat 7 Nov: 1 place · 0 stamps/ });
  expect(day).toHaveAttribute('href', `${paths.moments}#day-2026-11-07`);
  await userEvent.click(day);
  expect(currentPath()).toBe(paths.moments);
});

test('a fresh passport: zero counts, an empty journal, and nothing stamped', () => {
  renderAt(paths.mySpace);
  const holder = screen.getByRole('region', { name: 'Passport holder' });
  for (const label of ['Stamps', 'Volumes', 'Tips']) expect(within(holder).getByText(label).closest('div')!).toHaveTextContent('0');
  expect(screen.getByText(/No days yet/)).toBeInTheDocument();
  const total = TOURISM_CATEGORIES.reduce((n, c) => n + placesOf(c), 0);
  expect(screen.getByText(`0 of ${total} stamped`)).toBeInTheDocument();
  expect(screen.queryAllByText(/^Stamped /)).toHaveLength(0);
});

test('S1: six tiles of what the app knows; From starts hidden and the eye shows it', async () => {
  profileV3Store.set(ANSWERED);
  renderAt(paths.mySpace);
  for (const label of ['From', 'In Singapore', 'Here as', 'Language', 'Home base', 'Place tags']) {
    expect(screen.getByRole('button', { name: `Edit ${label}` })).toBeInTheDocument();
  }
  expect(screen.getByRole('button', { name: 'Edit From' })).toHaveTextContent('Hidden');
  expect(screen.getByRole('button', { name: 'Edit In Singapore' })).toHaveTextContent('< 3 months');
  expect(screen.getByRole('button', { name: 'Edit Home base' })).toHaveTextContent('Chinatown');
  expect(screen.getByRole('button', { name: 'Edit Place tags' })).toHaveTextContent('Food › Culture › Landmark › Nature');
  expect(screen.getByText(/on this phone · 1 private/)).toBeInTheDocument();

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

test('settings for removed features are gone from Passport and Settings', () => {
  renderAt(paths.mySpace);
  for (const name of ['Flag occasions', 'Memory', 'Answer as a local']) expect(screen.queryByRole('switch', { name })).toBeNull();
  cleanup();
  renderAt(paths.mySpaceSettings);
  expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull();
  expect(screen.queryByRole('switch', { name: 'Questions near you' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Today’s topics/ })).toBeNull();
  expect(screen.queryByText(/Ask remembers/)).toBeNull();
});

test('Saved places and All places open from Passport', async () => {
  renderAt(paths.mySpace);
  await userEvent.click(screen.getByRole('link', { name: 'Saved places' }));
  expect(currentPath()).toBe(paths.saved);
  cleanup();
  renderAt(paths.mySpace);
  await userEvent.click(screen.getByRole('link', { name: 'All places' }));
  // the v1 Nearby explorer is retired: All places opens Home's map
  expect(currentPath()).toBe(paths.today);
});

test('Privacy › Location opens Home’s Near you and asks for location once, as the Locate key does', async () => {
  const getCurrentPosition = vi.fn((ok: PositionCallback) =>
    ok({ coords: { latitude: 1.2815, longitude: 103.8448, accuracy: 20 }, timestamp: 1 } as unknown as GeolocationPosition),
  );
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
  try {
    renderAt(paths.mySpacePrivacy);
    const tile = screen.getByRole('button', { name: /Location Near you and check-ins/ });
    expect(tile).toHaveTextContent('Near you and check-ins');
    expect(tile).not.toHaveTextContent('Nearby');
    await userEvent.click(tile);
    expect(currentPath()).toBe(paths.today);
    expect(await screen.findByText(/^Near you · 2 km$|^Nearest to you$/, undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  } finally {
    Reflect.deleteProperty(navigator, 'geolocation');
  }
});

test('links: Privacy & data and Redo onboarding; Settings and Help live in the top bar', async () => {
  renderAt(paths.mySpace);
  expect(screen.queryByRole('button', { name: /Help & feedback/ })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Help Center' }));
  expect(screen.getByRole('dialog', { name: 'Help Center' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Close Help Center' }));
  await userEvent.click(screen.getByRole('link', { name: /Privacy & data/ }));
  expect(currentPath()).toBe(paths.mySpacePrivacy);
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  await userEvent.click(screen.getByRole('button', { name: /Redo onboarding/ }));
  expect(currentPath()).toBe(paths.welcome);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Whose passport is this?');
});

test('S2: Reduce motion is the app-wide setting (on its own page); captions are kept locally', async () => {
  renderAt(paths.mySpaceSettings);
  expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: /Motion/ }));
  expect(currentPath()).toBe(paths.mySpaceMotion);
  await userEvent.click(screen.getByRole('radio', { name: 'Reduced' }));
  expect(reduceMotionStore.get()).toBe(true);
  expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
  await userEvent.click(screen.getByRole('radio', { name: 'Full' }));
  expect(reduceMotionStore.get()).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(currentPath()).toBe(paths.mySpaceSettings);

  await userEvent.click(screen.getByRole('switch', { name: 'Captions on videos' }));
  expect(mySpacePrefsStore.get().captions).toBe(false);
});

test('S2: language opens the script tiles; Terms & licences and Photo credits open their pages', async () => {
  renderAt(paths.mySpaceSettings);
  await userEvent.click(screen.getByRole('button', { name: /Language/ }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Language' })).getByRole('button', { name: '한국어, Korean' }));
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(profileV3Store.get().language).toBe('ko');
  expect(screen.getByText('Cards in English for now')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('link', { name: /Terms & licences/ }));
  expect(currentPath()).toBe(paths.licences);
  expect(screen.getByRole('heading', { level: 1, name: 'Terms & licences' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(currentPath()).toBe(paths.mySpaceSettings);
  await userEvent.click(screen.getByRole('link', { name: /Photo credits/ }));
  expect(currentPath()).toBe(paths.credits);
  expect(screen.getAllByText('Photo: Zairon · CC BY-SA 4.0').length).toBeGreaterThan(0);
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

test('Settings › Redo onboarding opens question 1', async () => {
  renderAt(paths.mySpaceSettings);
  await userEvent.click(screen.getByRole('link', { name: /Redo onboarding/ }));
  expect(screen.getByRole('progressbar', { name: 'Questions' })).toHaveAttribute('aria-valuenow', '1');
});

test('Settings is a page you open and close: no tab scroll, and Back returns to where it was opened', async () => {
  renderAt(paths.today);
  await userEvent.click(await screen.findByRole('link', { name: 'Settings' }));
  expect(currentPath()).toBe(paths.mySpaceSettings);
  expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(currentPath()).toBe(paths.today);
});
