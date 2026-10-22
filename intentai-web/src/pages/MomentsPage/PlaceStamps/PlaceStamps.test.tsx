import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { markVisited } from '../../../features/nearby/actions';
import { shortDate } from '../../../features/nearby/personal';
import { explorePersonalStore } from '../../../data/stores';
import PlaceStamps from './PlaceStamps';

const renderStamps = () =>
  render(
    <MemoryRouter useTransitions={false}>
      <PlaceStamps />
    </MemoryRouter>,
  );

test('no check-ins: says how to collect a stamp and links to Nearby', () => {
  renderStamps();
  expect(screen.getByRole('heading', { name: 'My places' })).toBeInTheDocument();
  expect(screen.getByText(/Check in at places in Nearby/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open Nearby' })).toHaveAttribute('href', '/nearby');
  expect(screen.getByText('0 of 100 checked in')).toBeInTheDocument();
});

test('a check-in in Nearby becomes a stamp at once, newest first, and undoing it removes the stamp', () => {
  explorePersonalStore.set((d) => ({
    ...d,
    places: [{ placeKey: 'curated:sg-merlion-park', saved: false, visited: true, visitedOn: '2026-01-05', updatedAt: '2026-01-05T00:00:00.000Z' }],
  }));
  renderStamps();
  act(() => {
    markVisited('curated:sg-lau-pa-sat', 'Lau Pa Sat', true);
  });
  const stamps = within(screen.getByRole('list', { name: 'Places checked in' })).getAllByRole('link');
  expect(stamps.map((a) => a.textContent)).toEqual([expect.stringMatching(/^Lau Pa Sat/), expect.stringMatching(/^Merlion Park/)]);
  expect(stamps[1]).toHaveAttribute('href', '/nearby/place/curated%3Asg-merlion-park');
  expect(screen.getByText('2', { selector: '[data-stat="places"]' })).toBeInTheDocument();
  expect(screen.getByText('2 of 100 checked in')).toBeInTheDocument();
  act(() => {
    markVisited('curated:sg-lau-pa-sat', 'Lau Pa Sat', false);
  });
  expect(within(screen.getByRole('list', { name: 'Places checked in' })).getAllByRole('link')).toHaveLength(1);
});

test('short dates: day and month this year, with the year otherwise', () => {
  expect(shortDate('2026-10-21', '2026-12-01')).toBe('21 Oct');
  expect(shortDate('2025-03-02', '2026-12-01')).toBe('2 Mar 2025');
});
