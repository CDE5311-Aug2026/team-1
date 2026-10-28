import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { placeState } from '../../data/placeStories';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { placeStoriesStore } from '../../data/stores';
import { paths, patterns } from '../../routes';
import PlacePage from './PlacePage';

let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <p data-testid="at">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>
      <button type="button" onClick={() => navigate(-1)}>
        browser back
      </button>
    </>
  );
}

type Entry = string | { pathname: string; state?: unknown };

function renderAt(entries: Entry[]) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path={patterns.homePlace} element={<PlacePage />} />
        <Route path={patterns.placeCard} element={<Probe />} />
        <Route path={paths.today} element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

const berlin = paths.homePlace('berlin-wall-fragments');
const panelTitle = () => screen.getByRole('heading', { level: 2 }).textContent;

test('Berlin Wall Fragments: hero, focused h1, location, progress at 0, hero credit, scrolled to top', () => {
  renderAt([berlin]);
  expect(
    screen.getByRole('img', { name: 'Two Berlin Wall panels, painted with graffiti, standing in a garden behind Tembusu College' }),
  ).toHaveClass('a-hero');
  const h1 = screen.getByRole('heading', { level: 1, name: 'Berlin Wall Fragments' });
  expect(h1).toHaveFocus();
  expect(screen.getByText('Tembusu College, NUS University Town')).toBeInTheDocument();
  expect(screen.getByText('0 of 4 cards opened')).toBeInTheDocument();
  expect(document.querySelectorAll('[data-bar="done"]')).toHaveLength(0);
  expect(document.querySelectorAll('[data-bar="todo"]')).toHaveLength(4);
  expect(screen.getByText('Source: Tembusu College, NUS')).toBeInTheDocument();
  expect(scrollTo).toHaveBeenCalledWith(0, 0);
  expect(panelTitle()).toBe('Lunch nearby: The Spread');
  expect(screen.getByText('FOOD · POPULAR ON CAMPUS · 1 OF 4')).toBeInTheDocument();
});

test('Chinatown: its own copy and hero', () => {
  renderAt([paths.homePlace('chinatown')]);
  expect(screen.getByRole('heading', { level: 1, name: 'Chinatown' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Pagoda Street in Chinatown, lined with shophouses and shops' })).toBeInTheDocument();
  expect(screen.getByText('Chinatown & Tanjong Pagar · Niu Che Shui')).toBeInTheDocument();
  expect(screen.getByText('Photo: kallerna · CC BY-SA 4.0')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check in' })).toHaveAttribute('aria-pressed', 'false');
  expect(panelTitle()).toBe('Bak kwa');
  expect(screen.getByText('FOOD · 1 OF 4')).toBeInTheDocument();
});

test('Back to Home goes to Home with focusPlace state', () => {
  renderAt([berlin]);
  fireEvent.click(screen.getByRole('link', { name: 'Back to Home' }));
  expect(screen.getByTestId('at')).toHaveTextContent('/ {"focusPlace":"berlin-wall-fragments"}');
});

test('check-in toggles, persists and bursts aria-hidden sparks only when checking in', () => {
  renderAt([berlin]);
  const button = screen.getByRole('button', { name: 'Check in' });
  button.focus();
  fireEvent.click(button);
  expect(button).toHaveAccessibleName('Check in');
  expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(button).toHaveFocus();
  expect(placeState(placeStoriesStore.get(), 'berlin-wall-fragments').checkedIn).toBe(true);
  const sparks = button.querySelectorAll('.spark');
  expect(sparks).toHaveLength(8);
  expect(sparks[0].closest('[aria-hidden="true"]')).not.toBeNull();
  act(() => vi.advanceTimersByTime(650));
  expect(button.querySelectorAll('.spark')).toHaveLength(0);
  fireEvent.click(button);
  expect(button).toHaveAccessibleName('Check in');
  expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(button.querySelectorAll('.spark')).toHaveLength(0);
  expect(placeState(placeStoriesStore.get(), 'berlin-wall-fragments').checkedIn).toBe(false);
});

test('a stored check-in shows as checked', () => {
  placeStoriesStore.set({ chinatown: { opened: [], checkedIn: true, stamped: false } });
  renderAt([paths.homePlace('chinatown')]);
  expect(screen.getByRole('button', { name: 'Check in' })).toHaveAttribute('aria-pressed', 'true');
});

test('progress row, done badges, "opened" sleeves and kicker follow real opened cards', () => {
  placeStoriesStore.set({ chinatown: { opened: ['food', 'festival'], checkedIn: false, stamped: false } });
  renderAt([paths.homePlace('chinatown')]);
  expect(screen.getByText('2 of 4 cards opened')).toBeInTheDocument();
  const bars = [...document.querySelectorAll('[data-bar]')].map((b) => b.getAttribute('data-bar'));
  expect(bars).toEqual(['done', 'todo', 'done', 'todo']);
  expect(document.querySelectorAll('[data-done]')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Food card: bak kwa, opened. Tap to slide the record out.' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Festival card: Lunar New Year, opened' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Monument card: Thian Hock Keng Temple' })).toBeInTheDocument();
  expect(screen.getByText('FOOD · 1 OF 4 · OPENED')).toBeInTheDocument();
});

test('router railIndex opens the rail on that card', () => {
  renderAt([{ pathname: berlin, state: { railIndex: 2 } }]);
  expect(panelTitle()).toBe('Fall of the Wall · 9 Nov');
});

test('without state the rail opens on the last card viewed this session', () => {
  window.sessionStorage.setItem(`${STORAGE_PREFIX}storyRail:berlin-wall-fragments`, '3');
  renderAt([berlin]);
  expect(panelTitle()).toBe('From 1961 to a Singapore garden');
});

test('Open card replaces the place entry with railIndex, then opens the card; Back restores the rail', () => {
  renderAt([paths.today, { pathname: berlin, state: { railIndex: 1 } }]);
  fireEvent.click(screen.getByRole('link', { name: 'Open card' }));
  expect(screen.getByTestId('at')).toHaveTextContent('/place/berlin-wall-fragments/monument null');
  fireEvent.click(screen.getByRole('button', { name: 'browser back' }));
  expect(panelTitle()).toBe('The Wall panels');
  // The replaced entry is still the place page (not a duplicate), and Home is one more step back.
  fireEvent.click(screen.getByRole('link', { name: 'Open card' }));
  fireEvent.click(screen.getByRole('button', { name: 'browser back' }));
  expect(panelTitle()).toBe('The Wall panels');
});

test('after Open, Back shows the card a NEXT chain ended on (last viewed wins)', () => {
  renderAt([paths.today, berlin]);
  fireEvent.click(screen.getByRole('link', { name: 'Open card' }));
  // The card chain ends on History; card pages record it.
  window.sessionStorage.setItem(`${STORAGE_PREFIX}storyRail:berlin-wall-fragments`, '3');
  fireEvent.click(screen.getByRole('button', { name: 'browser back' }));
  expect(panelTitle()).toBe('From 1961 to a Singapore garden');
});

test('the place page clears railFrom on mount, so later Back visits use the stored railIndex', () => {
  renderAt([paths.today, { pathname: berlin, state: { railIndex: 1, railFrom: 'open' } }, paths.placeCard('berlin-wall-fragments', 'monument')]);
  fireEvent.click(screen.getByRole('button', { name: 'browser back' }));
  // Consumed on mount: last viewed (none) falls back to railIndex, and the flag is gone from the entry.
  expect(panelTitle()).toBe('The Wall panels');
  expect(screen.queryByText(/railFrom/)).toBeNull();
  window.sessionStorage.setItem(`${STORAGE_PREFIX}storyRail:berlin-wall-fragments`, '3');
  fireEvent.click(screen.getByRole('link', { name: 'Back to Home' }));
  fireEvent.click(screen.getByRole('button', { name: 'browser back' }));
  expect(panelTitle()).toBe('The Wall panels');
});

test('an unknown place shows not found with a way back', () => {
  renderAt(['/place/nope']);
  expect(screen.getByRole('heading', { level: 1, name: 'Place not found' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
  expect(screen.getByTestId('at')).toHaveTextContent('/');
});
