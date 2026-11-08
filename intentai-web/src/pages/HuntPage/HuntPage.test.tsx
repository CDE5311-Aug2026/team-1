import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import HuntPage from './HuntPage';
import { huntPoints } from './HuntHome';
import { huntModeStore } from '../../data/v2Stores';

const at = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/hunt" element={<HuntPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '';
});

const rows = () => within(screen.getByRole('list', { name: 'Volumes' })).getAllByRole('button');

test('Hunt opens on the field archive: the rules card once, the chips, a pick and one row per volume', async () => {
  at('/hunt');
  expect(screen.getByRole('heading', { level: 1, name: 'Hunt' })).toBeInTheDocument();
  // first visit: How to play opens by itself, once, with remote play and the fiction disclosure
  const how = screen.getByRole('dialog', { name: 'How to play' });
  expect(within(how).getByText(/play remotely from anywhere/)).toBeInTheDocument();
  expect(within(how).getByText(/characters are fiction/)).toBeInTheDocument();
  // v2 (owner, 8 Nov 2026): field rules on the chart paper, three moves under a brass rose (decorative, hidden from AT)
  expect(within(how).getByRole('heading', { name: 'Every stop, three moves.' })).toBeInTheDocument();
  expect(within(how).getAllByRole('listitem').map((li) => li.querySelector('strong')?.textContent)).toEqual(['Go there', 'Look, then solve', 'Keep the clue']);
  expect(how.querySelector('svg[aria-hidden="true"] text')).toHaveTextContent('N');
  // two ways out: the round × up top and "Got it", the card's last control
  const buttons = within(how).getAllByRole('button');
  expect(buttons.map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Close', 'Got it']);
  await userEvent.click(within(how).getByRole('button', { name: 'Got it' }));
  expect(screen.queryByRole('dialog', { name: 'How to play' })).toBeNull();
  // Got it does what × does: the card is seen and does not open by itself again
  expect(localStorage.getItem('findsg-hunt-how-seen')).toBe('1');
  // the disclosure stays on the page, and the card can be opened again
  expect(screen.getByText(/play remotely from anywhere\. Real places and history; the story and its characters are fiction/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'How to play' }));
  expect(screen.getByRole('dialog', { name: 'How to play' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: 'How to play' })).toBeNull();

  // six volumes in shelf order, nothing played yet: 0 of the 38 stops
  expect(screen.getByText('6 volumes · 0/38 stamps')).toBeInTheDocument();
  const list = rows();
  expect(list).toHaveLength(6);
  expect(list[0]).toHaveTextContent(/Vol\. I · Kampong Gelam.*Only One Missing.*The bottle base.*Not started/);
  expect(list[5]).toHaveTextContent(/Vol\. VI · Civic District.*The Missing Years/);
  // nothing in progress: a pick to set out on, from your categories (board 09: "Set out" until it is begun)
  const pick = screen.getByRole('article', { name: 'Picked for you' });
  expect(within(pick).getByText(/Picked for you · Attractions/)).toBeInTheDocument();
  expect(within(pick).getByRole('button', { name: /Set out/ })).toBeInTheDocument();
  expect(within(pick).queryByRole('button', { name: /Continue|Start/ })).toBeNull();
  // no location known: no distances
  expect(screen.queryByText(/\d km|\d m\b/)).toBeNull();
});

test('the chips filter the archive by each volume’s category, from its stops’ places', async () => {
  localStorage.setItem('findsg-hunt-how-seen', '1');
  at('/hunt');
  await userEvent.click(screen.getByRole('button', { name: 'Attractions' }));
  expect(screen.getByRole('button', { name: 'Attractions' })).toHaveAttribute('aria-pressed', 'true');
  // the two volumes whose stops map to no catalogue place stay under All only
  const titles = ['Beneath the Golden Dome', 'Letters to the Shore', 'The Last Edition', 'The Missing Years'];
  expect(rows()).toHaveLength(4);
  rows().forEach((r, i) => expect(r).toHaveTextContent(new RegExp(`Attractions\\|Vol\\..*${titles[i]}`)));
  expect(screen.getByText('4 volumes · 0/25 stamps')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Wellness' }));
  expect(screen.getByText('No volumes in Wellness yet.')).toBeInTheDocument();
  expect(screen.queryByRole('article')).toBeNull();
});

test('real progress: a route in progress is the Continue card, and its row counts what was found', async () => {
  localStorage.setItem('findsg-hunt-how-seen', '1');
  localStorage.setItem('findsg-onsite-v1:telok-ayer:manual', saved('manual'));
  at('/hunt');
  const card = screen.getByRole('article', { name: 'Continue' });
  expect(within(card).getByRole('heading', { name: 'Letters to the Shore' })).toBeInTheDocument();
  expect(within(card).getByText('Stop 2 of 8')).toBeInTheDocument();
  expect(within(card).getByRole('img', { name: '1 of 8 found' })).toBeInTheDocument();
  expect(within(card).getByRole('button', { name: /Continue/ })).toBeInTheDocument();
  expect(within(card).queryByRole('button', { name: /Set out/ })).toBeNull();
  expect(screen.getByText('6 volumes · 1/38 stamps')).toBeInTheDocument();
  expect(rows()[2]).toHaveTextContent('1 of 8 found');
});

test('a volume opens its own book, with the story, map, clue cards, notes and record tabs; the shelf is kept too', async () => {
  localStorage.setItem('findsg-hunt-how-seen', '1');
  at('/hunt');
  await userEvent.click(rows()[2]);
  expect(sessionStorage.getItem('hunt-book')).toBe('telok-ayer');
  const cover = screen.queryByRole('button', { name: 'Open Letters to the Shore' });
  if (cover) await userEvent.click(cover);
  expect(
    within(await screen.findByRole('navigation', { name: 'Chapters' }))
      .getAllByRole('button')
      .map((b) => b.textContent),
  ).toEqual(['Story', 'Map', 'Clues', 'Notes', 'Record', 'Play']);
  sessionStorage.clear();
});

test('the story shelf is one tap from the archive', async () => {
  localStorage.setItem('findsg-hunt-how-seen', '1');
  at('/hunt');
  await userEvent.click(screen.getByRole('button', { name: 'The story shelf' }));
  expect(screen.getByRole('tab', { name: 'Stories' })).toHaveAttribute('aria-selected', 'true');
  // the story shelf: six books, the demo story first; pick the third, take it down, open it, and its tabs are the story, the map, the clue cards, notes and the record
  const books = within(screen.getByRole('listbox', { name: 'Story books' })).getAllByRole('option');
  expect(books).toHaveLength(6);
  expect(books[0]).toHaveAccessibleName(/^I\. Only One Missing/);
  expect(books[0]).toHaveAttribute('aria-selected', 'true');
  expect(books[1]).toHaveAccessibleName(/^II\. Beneath the Golden Dome/);
  await userEvent.click(books[2]);
  expect(books[2]).toHaveAttribute('aria-selected', 'true');
  await userEvent.click(books[2]);
  const cover = await screen.findByRole('button', { name: 'Open Letters to the Shore' }, { timeout: 3000 });
  await userEvent.click(cover);
  const tabs = screen.getByRole('navigation', { name: 'Chapters' });
  expect(
    within(tabs)
      .getAllByRole('button')
      .map((b) => b.textContent),
  ).toEqual(['Story', 'Map', 'Clues', 'Notes', 'Record', 'Play']);
  await userEvent.click(screen.getByRole('button', { name: /Shelf$/ }));
  // every story's book has the same tabs: the prologue's too
  const shelf = await screen.findByRole('listbox', { name: 'Story books' }, { timeout: 3000 });
  const first = within(shelf).getAllByRole('option')[1];
  await userEvent.click(first);
  await userEvent.click(first);
  await userEvent.click(await screen.findByRole('button', { name: 'Open Beneath the Golden Dome' }, { timeout: 3000 }));
  expect(
    within(screen.getByRole('navigation', { name: 'Chapters' }))
      .getAllByRole('button')
      .map((b) => b.textContent),
  ).toEqual(['Story', 'Map', 'Clues', 'Notes', 'Record']);
}, 20_000); // a long walk through the shelf, with two book animations to wait out

test('Public shows this weekend’s challenge on the Civic District route, the boards and what is coming', async () => {
  localStorage.setItem('findsg-hunt-how-seen', '1');
  at('/hunt');
  // from the archive (both hunt modes), the challenges and their boards
  await userEvent.click(screen.getByRole('button', { name: /Weekend challenges/ }));
  expect(screen.getByRole('tab', { name: 'Public' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('button', { name: /Weekend challenge · Civic District/ })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Fastest' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Explorers' })).toBeInTheDocument();
  expect(screen.getByText('Kampong Gelam')).toBeInTheDocument();
  // writing your own story is not built yet: a notice, not a dead form
  expect(screen.getByRole('heading', { name: 'A story from your streets' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Coming soon' })).not.toBeInTheDocument();
  // v2: a clean list on the app's paper, the sample players labelled; the 3D hall is one switch away
  expect(screen.getByText('Example players')).toBeInTheDocument();
  expect(screen.getAllByText('Example').length).toBeGreaterThanOrEqual(1);
  // the fastest board says its players are samples under them, not as a pill in its head (owner, 9 Nov 2026)
  expect(screen.getAllByText('Sample players until real times come in').length).toBeGreaterThanOrEqual(1);
  const hall = screen.getByRole('button', { name: '3D hall' });
  expect(hall).toHaveAttribute('aria-pressed', 'false');
  // the page draws no paper of its own: AppShell's one layer under <body> is the ground
  expect(screen.getByRole('main').querySelector('[data-chart-paper]')).toBeNull();
  expect(document.querySelector('[data-app-paper] [data-chart-paper="archive"]')).not.toBeNull();
});

test('hunting together: the archive also links straight to the leaderboards (example players); solo does not', async () => {
  localStorage.setItem('findsg-hunt-how-seen', '1');
  huntModeStore.set({ mode: 'solo' });
  const solo = at('/hunt');
  expect(screen.queryByRole('button', { name: /Leaderboards/ })).toBeNull();
  solo.unmount();
  huntModeStore.set({ mode: 'together' });
  at('/hunt');
  await userEvent.click(screen.getByRole('button', { name: /Leaderboards.*Example players/ }));
  expect(screen.getByRole('heading', { name: 'Leaderboards' })).toBeInTheDocument();
  huntModeStore.set({});
});

test('the boards: explorers by region, and fastest this weekend with a way to join', async () => {
  at('/hunt?board=explore');
  expect(screen.getByRole('heading', { name: 'Leaderboards' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: 'Central' }));
  expect(screen.getByRole('radio', { name: 'Central' })).toHaveAttribute('aria-checked', 'true');
  await userEvent.click(screen.getByRole('tab', { name: 'Fastest' }));
  expect(screen.getByText(/214 joined/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Join' })).toBeInTheDocument();
  // v2: the challenge carries its category (glyph + label), and the players are labelled as examples
  expect(screen.getByRole('heading', { name: 'Civic District' })).toBeInTheDocument();
  expect(screen.getByText('Attractions')).toBeInTheDocument();
  expect(screen.getByText('Example players')).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Top three, example players' }).children).toHaveLength(3);
});

// a stop as FindSG saves it after a tap check-in, the observation and the 3D puzzle (taken from a real play-through)
const solvedStop = {
  checkin: { mode: 'manual', method: 'manual-self-report', confirmedAt: '2026-11-01T07:54:10.097Z', countsAsVisit: true },
  observation: { confirmed: true, method: 'manual-self-report', confirmedAt: '2026-11-01T07:54:16.631Z', photos: [] },
  puzzle: { schema: 1, type: 'rotate-find', found: ['address-letter'], sequence: [], placed: [], selected: null, value: 0, opened: false, attempts: 1 },
  // layer I, the envelope; layer II, the strongbox set to the year on the History sheet (1824)
  actions: [{ type: 'find', id: 'address-letter', yaw: -2.1 }, ...[1, 8, 2, 4].map((value, wheel) => ({ type: 'spin', wheel, value }))],
};
const saved = (mode: 'manual' | 'preview') =>
  JSON.stringify({
    version: 1,
    routeId: 'telok-ayer',
    mode,
    started: true,
    stopIndex: 1,
    stops: { 'telok-ayer-01': solvedStop },
    completed: ['telok-ayer-01'],
    inventory: [],
    endingSeen: false,
    feedback: '',
  });

test('points: 100 for each stop solved on site; remote play does not count', () => {
  expect(huntPoints()).toBe(0);
  localStorage.setItem('findsg-onsite-v1:telok-ayer:preview', saved('preview'));
  expect(huntPoints()).toBe(0);
  localStorage.setItem('findsg-onsite-v1:telok-ayer:manual', saved('manual'));
  expect(huntPoints()).toBe(100);
});
