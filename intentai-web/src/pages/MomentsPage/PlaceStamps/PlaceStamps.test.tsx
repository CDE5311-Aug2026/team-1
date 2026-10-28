import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { PUBLISHED_PLACES } from '../../../features/nearby/catalogue';
import { markVisited } from '../../../features/nearby/actions';
import { shortDate } from '../../../features/nearby/personal';
import { explorePersonalStore, placeStoriesStore } from '../../../data/stores';
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

test('story stamps get their own row above Nearby, newest first, linking to the place; the count adds both', () => {
  placeStoriesStore.set({
    'berlin-wall-fragments': { opened: [], checkedIn: false, stamped: true, stampedOn: '2026-10-20' },
    chinatown: { opened: [], checkedIn: false, stamped: true, stampedOn: '2026-10-28' },
  });
  explorePersonalStore.set((d) => ({
    ...d,
    places: [{ placeKey: 'curated:sg-merlion-park', saved: false, visited: true, visitedOn: '2026-01-05', updatedAt: '2026-01-05T00:00:00.000Z' }],
  }));
  renderStamps();
  const stories = within(screen.getByRole('list', { name: 'Place stories' })).getAllByRole('link');
  expect(stories.map((a) => a.textContent)).toEqual([expect.stringMatching(/^Chinatown/), expect.stringMatching(/^Berlin Wall Fragments/)]);
  expect(stories[0]).toHaveAttribute('href', '/place/chinatown');
  expect(screen.getByText('3', { selector: '[data-stat="places"]' })).toBeInTheDocument();
  const lists = screen.getAllByRole('list');
  expect(lists.indexOf(screen.getByRole('list', { name: 'Place stories' }))).toBeLessThan(lists.indexOf(screen.getByRole('list', { name: 'Places checked in' })));
});

test('with nine Nearby stamps the story stamps are still all shown', () => {
  placeStoriesStore.set({
    'berlin-wall-fragments': { opened: [], checkedIn: false, stamped: true, stampedOn: '2026-10-20' },
    chinatown: { opened: [], checkedIn: false, stamped: true, stampedOn: '2026-10-28' },
  });
  const keys = PUBLISHED_PLACES.slice(0, 9).map((p) => p.id.replace(/^curated:/, ''));
  explorePersonalStore.set((d) => ({
    ...d,
    places: keys.map((k, i) => ({ placeKey: `curated:${k}`, saved: false, visited: true, visitedOn: `2026-01-0${i + 1}`, updatedAt: '2026-01-05T00:00:00.000Z' })),
  }));
  renderStamps();
  expect(within(screen.getByRole('list', { name: 'Place stories' })).getAllByRole('link')).toHaveLength(2);
  // The Nearby strip is still cut at 8, and none of the story stamps leaked into it.
  const nearby = within(screen.getByRole('list', { name: 'Places checked in' })).getAllByRole('link');
  expect(nearby).toHaveLength(8);
  expect(nearby.every((a) => a.getAttribute('href')?.startsWith('/nearby/place/'))).toBe(true);
  expect(nearby.map((a) => a.textContent).join(' ')).not.toMatch(/Berlin Wall Fragments/);
});

test('an unstamped story place shows no row', () => {
  placeStoriesStore.set({ chinatown: { opened: ['food'], checkedIn: false, stamped: false } });
  renderStamps();
  expect(screen.queryByRole('list', { name: 'Place stories' })).toBeNull();
});
