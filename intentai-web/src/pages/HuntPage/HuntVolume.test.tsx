// v2 board 10 (owner, 8 Nov 2026): every volume is read on the light survey chart, under "‹ Shelf · Hunt · Settings"
// and its volume's head, with the folio under the book; the book itself is unchanged. Location is denied throughout
// (plan B8: nothing here waits for it). In its own file: mounting the game fills its in-memory saves.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getLocationState, requestLocation, resetLocationForTests } from '../../features/nearby/location';
import HuntPage from './HuntPage';

const denied = {
  getCurrentPosition: (_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    fail?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
} as unknown as Geolocation;

const at = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/hunt" element={<HuntPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('findsg-hunt-how-seen', '1');
  vi.stubGlobal('navigator', { ...navigator, geolocation: denied });
  await requestLocation(denied);
  expect(getLocationState().status).toBe('denied');
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetLocationForTests();
  window.location.hash = '';
  document.documentElement.classList.remove('reduce-motion');
});

const folio = () => screen.getByTestId('volume-folio');

test('Only One Missing, out on the desk: the chart, the board-10 bar and head, and the folio under the book', async () => {
  sessionStorage.setItem('hunt-book', 'only-one-missing');
  // pages turn at once (the motion setting), so the folio can be read straight after a turn
  document.documentElement.classList.add('reduce-motion');
  at('/hunt');
  const reader = screen.getByRole('dialog', { name: 'Only One Missing' });
  expect(reader.querySelector('[data-chart-paper="reader"]')).not.toBeNull();
  expect(within(reader).getByRole('heading', { level: 1, name: 'Hunt' })).toBeInTheDocument();
  expect(within(reader).getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  expect(within(reader).getByText('Volume I')).toBeInTheDocument();
  // the shelf's own dark bar steps away while a book is out
  expect(screen.getAllByRole('heading', { level: 1, name: 'Hunt' })).toHaveLength(1);
  expect(folio()).toHaveTextContent('1 / 6 · Vol. I · The letter');
  expect(folio()).toHaveTextContent('Press the seal to open the letter');
  // the book is still the book: its own tabs, cover and pages
  expect(within(reader).getByRole('navigation', { name: 'Chapters' })).toBeInTheDocument();
  // a page turned: the folio follows, with that page's own instruction
  await userEvent.click(within(reader).getAllByRole('button', { name: 'Next page' })[0]);
  expect(folio()).toHaveTextContent('2 / 6 · Vol. I · The map');
  expect(folio()).toHaveTextContent('Tap the packet to unfold the map');
  // a page with no instruction of its own gets none
  await userEvent.click(within(within(reader).getByRole('navigation', { name: 'Chapters' })).getByRole('button', { name: 'Notes' }));
  expect(folio()).toHaveTextContent('4 / 6 · Vol. I · Field notes');
  expect(folio().querySelectorAll('p')).toHaveLength(1);
  // Shelf puts it back: the field archive again
  await userEvent.click(within(reader).getByRole('button', { name: 'Shelf' }));
  // (the book closes and goes back first)
  await waitFor(() => expect(sessionStorage.getItem('hunt-book')).toBeNull(), { timeout: 2500 });
});

test('The Missing Years, out on the desk: its own volume head and folio', () => {
  sessionStorage.setItem('hunt-book', 'civic-f1');
  at('/hunt');
  const reader = screen.getByRole('dialog', { name: 'The Missing Years' });
  expect(reader.querySelector('[data-chart-paper="reader"]')).not.toBeNull();
  expect(within(reader).getByText('Volume VI')).toBeInTheDocument();
  expect(folio()).toHaveTextContent('1 / 6 · Vol. VI · The letter');
});

test('a stop’s page (#story/civic-f1) lies on the same chart, under the same bar, with the Play folio', () => {
  window.location.hash = '#story/civic-f1';
  at('/hunt#story/civic-f1');
  expect(document.querySelector('[data-chart-paper="reader"]')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Shelf' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'Hunt' })).toBeInTheDocument();
  expect(screen.getByText('Volume VI')).toBeInTheDocument();
  expect(folio()).toHaveTextContent('6 / 6 · Vol. VI · Play');
  // no instruction is made up for the game's own page
  expect(folio().querySelectorAll('p')).toHaveLength(1);
});

test('the field archive has the chart behind its cards', () => {
  at('/hunt');
  expect(document.querySelector('[data-chart-paper="archive"]')).not.toBeNull();
});
