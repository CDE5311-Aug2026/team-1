import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setReducedMotion } from '../../test/media';
import { StatTiles, type StatTile } from './StatTiles';

const WALL: [StatTile, StatTile, StatTile] = [
  { to: 3.6, decimals: 1, unit: 'm', label: 'tall' },
  { to: 4, prefix: '~', unit: 't', label: 'each' },
  { from: 1961, to: 2016, label: 'unveiled' },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const values = () => screen.getAllByTestId('stat-value').map((el) => el.textContent);

test('counts up from the start values to the final values (500 ms delay, 1.4 s)', () => {
  render(<StatTiles tiles={WALL} />);
  expect(values()).toEqual(['0.0 m', '~0 t', '1961']);
  act(() => vi.advanceTimersByTime(500 + 700));
  const mid = values();
  expect(mid).not.toEqual(['0.0 m', '~0 t', '1961']);
  expect(mid).not.toEqual(['3.6 m', '~4 t', '2016']);
  act(() => vi.advanceTimersByTime(800));
  expect(values()).toEqual(['3.6 m', '~4 t', '2016']);
  expect(screen.getByText('unveiled')).toBeInTheDocument();
});

test('shows the final values at once under reduced motion', () => {
  setReducedMotion(true);
  render(<StatTiles tiles={WALL} />);
  expect(values()).toEqual(['3.6 m', '~4 t', '2016']);
});

test('custom formats, section label and the highlighted third tile', () => {
  render(
    <StatTiles
      label="Key dates"
      highlightThird
      duration={1200}
      tiles={[
        { from: 1961, to: 1989, label: 'the Wall opened' },
        { to: 20000, prefix: '~', format: (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)), label: 'crossed in an hour' },
        { to: 37, label: 'years on Mon' },
      ]}
    />,
  );
  act(() => vi.advanceTimersByTime(2000));
  expect(values()).toEqual(['1989', '~20k', '37']);
  const section = screen.getByRole('region', { name: 'Key dates' });
  const tiles = section.querySelectorAll('[data-tile]');
  expect(tiles[2]).toHaveAttribute('data-highlight', 'true');
  expect(tiles[0]).not.toHaveAttribute('data-highlight');
});
