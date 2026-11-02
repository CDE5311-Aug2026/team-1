import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import HuntPage from './HuntPage';
import { huntPoints } from './HuntHome';

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
  window.location.hash = '';
});

test('Hunt opens on the stories in IntentAI’s frame: header, the two tabs and the field notebook on the desk', async () => {
  at('/hunt');
  expect(screen.getByRole('heading', { level: 1, name: 'Hunt' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Stories' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Public' })).toHaveAttribute('aria-selected', 'false');
  // first visit: How to play opens by itself, once
  expect(screen.getByRole('dialog', { name: 'How to play' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Open a volume' }));
  expect(screen.queryByRole('dialog', { name: 'How to play' })).toBeNull();
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
  ).toEqual(['Story', 'Map', 'Clues', 'Notes', 'Record']);
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
});

test('Public shows this weekend’s challenge on the Civic District route, the boards and what is coming', async () => {
  at('/hunt');
  await userEvent.click(screen.getByRole('tab', { name: 'Public' }));
  expect(screen.getByRole('button', { name: /Weekend challenge · Civic District/ })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Fastest' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Explorers' })).toBeInTheDocument();
  expect(screen.getByText('Kampong Gelam')).toBeInTheDocument();
  // writing your own story is not built yet: a notice, not a dead form
  expect(screen.getByRole('heading', { name: 'A story from your streets' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Coming soon' })).not.toBeInTheDocument();
});

test('the boards: explorers by region, and fastest this weekend with a way to join', async () => {
  at('/hunt?board=explore');
  expect(screen.getByRole('heading', { name: 'Leaderboards' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: 'Central' }));
  expect(screen.getByRole('radio', { name: 'Central' })).toHaveAttribute('aria-checked', 'true');
  await userEvent.click(screen.getByRole('tab', { name: 'Fastest' }));
  expect(screen.getByText(/214 joined/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Join' })).toBeInTheDocument();
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
