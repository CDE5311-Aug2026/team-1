// Hunt's steps in the history (navigation audit, 10 Nov 2026): a volume is a step of its own, a stop's ‹ Shelf and tabs
// step back to where it came from, and a board's 〈 goes back to where it was opened from.
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import HuntPage from './HuntPage';
import { huntIntroStore, huntModeStore } from '../../data/v2Stores';

let back: () => void = () => undefined;
function Where() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  back = () => navigate(-1);
  return <p data-testid="where">{pathname + search + hash}</p>;
}

const at = (entries: string[]) =>
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/hunt" element={<HuntPage />} />
        <Route path="*" element={<p>elsewhere</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
const where = () => screen.getByTestId('where').textContent;
const volumes = () => screen.queryByRole('list', { name: 'Volumes' });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  huntModeStore.set({});
  huntIntroStore.set({ dismissed: true });
  window.location.hash = '';
});

test('a volume opens as a step: Back puts the book back on the shelf and the archive comes back (it used to leave Hunt)', async () => {
  const user = userEvent.setup();
  at(['/', '/hunt']);
  await user.click(within(volumes()!).getByRole('button', { name: /Only One Missing/ }));
  const book = await screen.findByRole('dialog', { name: /Only One Missing/ });
  expect(book).toBeInTheDocument();
  expect(volumes()).toBeNull();
  act(() => back());
  await waitFor(() => expect(volumes()).toBeInTheDocument());
  expect(where()).toBe('/hunt');
  expect(screen.queryByRole('dialog', { name: /Only One Missing/ })).toBeNull();
  // and Back again leaves Hunt for where you came from, in one step
  act(() => back());
  expect(await screen.findByText('elsewhere')).toBeInTheDocument();
});

test('the book’s ‹ Shelf is that same step back', async () => {
  const user = userEvent.setup();
  at(['/', '/hunt']);
  await user.click(within(volumes()!).getByRole('button', { name: /Only One Missing/ }));
  const book = await screen.findByRole('dialog', { name: /Only One Missing/ });
  await user.click(within(book).getByRole('button', { name: 'Shelf' }));
  await waitFor(() => expect(volumes()).toBeInTheDocument(), { timeout: 3000 });
  act(() => back());
  expect(await screen.findByText('elsewhere')).toBeInTheDocument();
});

test('a board’s 〈 goes back to where it was opened from (Home, Passport, the archive)', async () => {
  const user = userEvent.setup();
  at(['/my-space', '/hunt?board=speed']);
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(await screen.findByText('elsewhere')).toBeInTheDocument();
  expect(where()).toBe('/my-space');
});

test('a board opened straight from a link has nothing behind it: 〈 goes to Public, in place', async () => {
  const user = userEvent.setup();
  at(['/hunt?board=explore']);
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(where()).toBe('/hunt?tab=public');
});

test('a stop opened from Home: its ‹ Shelf goes to the archive in place, so Back goes Home in one step', async () => {
  const user = userEvent.setup();
  // FindSG reads the page's own hash
  window.location.hash = '#story/kampong-gelam';
  at(['/', '/hunt#story/kampong-gelam']);
  await user.click((await screen.findAllByRole('button', { name: 'Shelf' }))[0]);
  expect(where()).toBe('/hunt');
  expect(sessionStorage.getItem('hunt-book')).toBeNull();
  act(() => back());
  expect(await screen.findByText('elsewhere')).toBeInTheDocument();
  expect(where()).toBe('/');
});
