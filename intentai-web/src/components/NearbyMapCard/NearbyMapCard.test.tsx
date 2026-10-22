import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import stats from '../../data/explore/stats.json';
import { explorePersonalStore } from '../../data/stores';
import { DEFAULT_EXPLORE_PERSONAL } from '../../features/nearby/domain';
import NearbyMapCard from './NearbyMapCard';

beforeEach(() => explorePersonalStore.set({ ...DEFAULT_EXPLORE_PERSONAL, places: [] }));

test('a map tile: names the Near you place and the number of places, and opens Nearby', async () => {
  const onOpen = vi.fn();
  render(<NearbyMapCard place="Toa Payoh Hawker Centre" onOpen={onOpen} />);
  const card = screen.getByRole('button', { name: /Near you · Toa Payoh Hawker Centre.*Nearby map/ });
  expect(card).toHaveTextContent(`${stats.publishedPlaces} places to explore`);
  expect(card).not.toHaveTextContent('checked in');
  // the picture is decoration inside the button; the map data is credited
  expect(card.querySelector('img')).toHaveAttribute('alt', '');
  expect(card).toHaveTextContent('© OpenStreetMap contributors');
  await userEvent.click(card);
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('counts the places checked in on this device', () => {
  explorePersonalStore.set({
    ...DEFAULT_EXPLORE_PERSONAL,
    places: [
      { placeKey: 'curated:sg-merlion-park', saved: false, visited: true, visitedOn: '2026-10-22', updatedAt: '2026-10-22T08:00:00.000Z' },
      { placeKey: 'curated:sg-lau-pa-sat', saved: true, visited: false, updatedAt: '2026-10-22T08:00:00.000Z' },
    ],
  });
  render(<NearbyMapCard place="Office" />);
  expect(screen.getByRole('button')).toHaveTextContent('· 1 checked in');
});
