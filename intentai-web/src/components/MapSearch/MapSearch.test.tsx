import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { setReducedMotion } from '../../test/media';
import { HINT_MS, MapSearch, SEARCH_HINTS, scrambleFrame } from './MapSearch';

afterEach(() => {
  vi.useRealTimers();
});

function setup(label = 'NUS University Town') {
  const onPick = vi.fn();
  const onUseLocation = vi.fn();
  const view = render(
    <div>
      <MapSearch label={label} onPick={onPick} onUseLocation={onUseLocation} />
      <p>outside</p>
    </div>,
  );
  const pill = () => screen.getByRole('button', { name: /^Near you · .+\. Change search point$/ });
  const searchButton = () => screen.getByRole('button', { name: 'Search' });
  const input = () => screen.queryByRole('textbox', { name: 'Search a place or area' });
  const rows = () =>
    screen
      .getAllByRole('listitem')
      .map((li) => within(li).getByRole('button').querySelector('span > span')?.textContent);
  return { onPick, onUseLocation, pill, searchButton, input, rows, ...view };
}

test('the pill shows "Near you" and the search point; pill and search icon both toggle one dropdown', async () => {
  const user = userEvent.setup();
  const { pill, searchButton, input } = setup();
  expect(pill()).toHaveTextContent('Near you');
  expect(screen.getByTestId('search-point')).toHaveTextContent('NUS University Town');
  expect(pill()).toHaveAttribute('aria-expanded', 'false');
  expect(input()).toBeNull();

  await user.click(pill());
  expect(input()).toBeInTheDocument();
  expect(pill()).toHaveAttribute('aria-expanded', 'true');
  expect(searchButton()).toHaveAttribute('aria-expanded', 'true');

  await user.click(searchButton());
  expect(input()).toBeNull();
  await user.click(searchButton());
  expect(input()).toBeInTheDocument();
  await user.click(pill());
  expect(input()).toBeNull();
});

test('empty query: PLACES WITH CARDS lists Berlin and Chinatown, then the three Cards-soon places', async () => {
  const user = userEvent.setup();
  const { pill, rows } = setup();
  await user.click(pill());
  const withCards = screen.getByRole('list', { name: 'PLACES WITH CARDS' });
  expect(within(withCards).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
    expect.stringContaining('Berlin Wall Fragments'),
    expect.stringContaining('Chinatown'),
  ]);
  expect(rows()).toEqual([
    'Berlin Wall Fragments',
    'Chinatown',
    'National University of Singapore',
    'Haw Par Villa',
    'Holland Village',
  ]);
  expect(screen.getByRole('button', { name: /Berlin Wall Fragments.*NUS University Town · 200 m/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Use my location/ })).toHaveTextContent('NUS University Town');
});

test('typing filters on name, area and aliases; no match shows the query', async () => {
  const user = userEvent.setup();
  const { pill, input, rows } = setup();
  await user.click(pill());
  await user.type(input()!, 'Pagoda');
  expect(rows()).toEqual(['Chinatown']);
  expect(screen.getByText('PLACES WITH CARDS')).toBeInTheDocument();

  await user.clear(input()!);
  await user.type(input()!, 'tembusu college');
  expect(rows()).toEqual(['Berlin Wall Fragments']);

  await user.clear(input()!);
  await user.type(input()!, 'VILLAGE');
  expect(rows()).toEqual(['Holland Village']);
  expect(screen.queryByText('PLACES WITH CARDS')).toBeNull();

  await user.clear(input()!);
  await user.type(input()!, 'xyz');
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  expect(screen.getByText('No places match “xyz”. Try an area name.')).toBeInTheDocument();
});

test('picking a row closes the dropdown, reports the place and returns focus to the pill', async () => {
  const user = userEvent.setup();
  const { pill, input, onPick } = setup();
  await user.click(pill());
  await user.click(screen.getByRole('button', { name: /^Haw Par Villa/ }));
  expect(onPick).toHaveBeenCalledExactlyOnceWith('curated:sg-haw-par-villa');
  expect(input()).toBeNull();
  expect(pill()).toHaveFocus();
});

test('"Use my location" closes the dropdown and reports it', async () => {
  const user = userEvent.setup();
  const { searchButton, input, onUseLocation, onPick } = setup();
  await user.click(searchButton());
  await user.click(screen.getByRole('button', { name: /Use my location/ }));
  expect(onUseLocation).toHaveBeenCalledTimes(1);
  expect(onPick).not.toHaveBeenCalled();
  expect(input()).toBeNull();
});

test('Escape and a press outside close the dropdown and return focus to the pill', async () => {
  const user = userEvent.setup();
  const { pill, input } = setup();
  await user.click(pill());
  input()!.focus();
  await user.keyboard('{Escape}');
  expect(input()).toBeNull();
  expect(pill()).toHaveFocus();

  await user.click(pill());
  input()!.focus();
  fireEvent.pointerDown(screen.getByText('outside'));
  expect(input()).toBeNull();
  expect(pill()).toHaveFocus();

  // A press inside the dropdown keeps it open.
  await user.click(pill());
  fireEvent.pointerDown(input()!);
  expect(input()).toBeInTheDocument();
});

test('placeholder hints rotate every 2.4 s while the field is empty, and stop once typing starts', () => {
  vi.useFakeTimers();
  const { pill, input } = setup();
  fireEvent.click(pill());
  expect(screen.getByTestId('search-hint')).toHaveTextContent(SEARCH_HINTS[0]);
  act(() => vi.advanceTimersByTime(HINT_MS));
  expect(screen.getByTestId('search-hint')).toHaveTextContent('Try “Chinatown”');
  act(() => vi.advanceTimersByTime(HINT_MS));
  expect(screen.getByTestId('search-hint')).toHaveTextContent('Try “Tembusu College”');
  act(() => vi.advanceTimersByTime(HINT_MS));
  expect(screen.getByTestId('search-hint')).toHaveTextContent(SEARCH_HINTS[0]);
  fireEvent.change(input()!, { target: { value: 'c' } });
  expect(screen.queryByTestId('search-hint')).toBeNull();
});

test('reduced motion: the hint stays on the first one', () => {
  setReducedMotion(true);
  vi.useFakeTimers();
  const { pill } = setup();
  fireEvent.click(pill());
  act(() => vi.advanceTimersByTime(HINT_MS * 3));
  expect(screen.getByTestId('search-hint')).toHaveTextContent(SEARCH_HINTS[0]);
});

test('scrambleFrame reveals one character every two frames and keeps spaces', () => {
  const zero = () => 0; // always 'A'
  expect(scrambleFrame('Ab cd', 0, zero)).toBe('AA AA');
  expect(scrambleFrame('Ab cd', 2, zero)).toBe('AA AA');
  expect(scrambleFrame('Xb cd', 2, zero)).toBe('XA AA');
  expect(scrambleFrame('Xb cd', 4, zero)).toBe('Xb AA');
  expect(scrambleFrame('Xb cd', 10, zero)).toBe('Xb cd');
});

test('a new search point decodes in; under reduced motion it shows at once', () => {
  vi.useFakeTimers();
  const { rerender } = setup();
  const point = () => screen.getByTestId('search-point');
  const props = { onPick: vi.fn(), onUseLocation: vi.fn() };
  rerender(
    <div>
      <MapSearch label="Chinatown & Tanjong Pagar" {...props} />
    </div>,
  );
  expect(point()).toHaveTextContent('NUS University Town');
  act(() => vi.advanceTimersByTime(35 * 4));
  expect(point().textContent).toMatch(/^Ch/);
  expect(point().textContent).not.toBe('Chinatown & Tanjong Pagar');
  act(() => vi.advanceTimersByTime(35 * 60));
  expect(point()).toHaveTextContent('Chinatown & Tanjong Pagar');

  setReducedMotion(true);
  rerender(
    <div>
      <MapSearch label="NUS University Town" {...props} />
    </div>,
  );
  expect(point()).toHaveTextContent('NUS University Town');
});
