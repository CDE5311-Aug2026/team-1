import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { placeState } from '../../data/placeStories';
import { placeStoriesStore } from '../../data/stores';
import { paths, patterns } from '../../routes';
import PlaceStoryPage from './PlaceStoryPage';

let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.sessionStorage.clear();
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Probe() {
  const location = useLocation();
  return <p data-testid="at">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path={patterns.placeCard} element={<PlaceStoryPage />} />
        <Route path={patterns.homePlace} element={<Probe />} />
        <Route path={paths.today} element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('a known card marks its facet opened (once), records the last card viewed and scrolls to top', () => {
  renderAt(paths.placeCard('chinatown', 'festival'));
  expect(placeState(placeStoriesStore.get(), 'chinatown').opened).toEqual(['festival']);
  expect(window.sessionStorage.getItem(`${STORAGE_PREFIX}storyRail:chinatown`)).toBe('2');
  expect(scrollTo).toHaveBeenCalledWith(0, 0);
  expect(screen.getByRole('heading', { level: 1, name: 'Lunar New Year' })).toHaveFocus();
  expect(screen.getByText('3 of 4')).toBeInTheDocument();
});

test('the top bar goes back to the place with this card as railIndex', () => {
  renderAt(paths.placeCard('berlin-wall-fragments', 'history'));
  fireEvent.click(screen.getByRole('link', { name: 'Back to Berlin Wall Fragments' }));
  expect(screen.getByTestId('at')).toHaveTextContent('/place/berlin-wall-fragments {"railIndex":3}');
});

test('an unknown facet or place shows not found and records nothing', () => {
  renderAt(paths.placeCard('chinatown', 'nightlife'));
  expect(screen.getByRole('heading', { level: 1, name: 'Place not found' })).toBeInTheDocument();
  expect(placeStoriesStore.get()).toEqual({});
  expect(window.sessionStorage.length).toBe(0);
});

test('an unknown place shows not found', () => {
  renderAt(paths.placeCard('nope', 'food'));
  expect(screen.getByRole('heading', { level: 1, name: 'Place not found' })).toBeInTheDocument();
});
