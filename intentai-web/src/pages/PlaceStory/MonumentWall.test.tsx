import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { placeState } from '../../data/placeStories';
import { placeStoriesStore } from '../../data/stores';
import { paths, patterns } from '../../routes';
import PlaceStoryPage from './PlaceStoryPage';

const ID = 'berlin-wall-fragments';

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderCard() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard(ID, 'monument')]}>
      <Routes>
        <Route path={patterns.placeCard} element={<PlaceStoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('opening the card marks the monument facet opened', () => {
  renderCard();
  expect(placeState(placeStoriesStore.get(), ID).opened).toContain('monument');
});

test('header, top bar and poster', () => {
  renderCard();
  expect(screen.getByRole('heading', { level: 1, name: 'Two slabs of the Berlin Wall, in a UTown garden' })).toBeInTheDocument();
  expect(screen.getByText('MONUMENT · BERLIN WALL FRAGMENTS')).toBeInTheDocument();
  expect(screen.getByText('2 of 4')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Berlin Wall Fragments' })).toBeInTheDocument();
  const video = screen.getByRole('region', { name: 'Video' });
  expect(within(video).getByText('1:48')).toBeInTheDocument();
  expect(within(video).getByRole('img', { name: /Berlin Wall panels/ })).toBeInTheDocument();
});

test('the video plays with the four looped captions, then pauses', () => {
  renderCard();
  fireEvent.click(screen.getByRole('button', { name: 'Play video: The panels up close' }));
  expect(screen.getByText('Behind Tembusu College stand two panels of the Berlin Wall.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('Each one is about 3.6 metres tall.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('They marked 50 years of German–Singapore ties.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('The graffiti was on the western face.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pause video' }));
  expect(screen.getByRole('button', { name: 'Play video: The panels up close' })).toBeInTheDocument();
});

test('three stat tiles count up to 3.6 m, ~4 t and 2016, none highlighted', () => {
  renderCard();
  act(() => vi.advanceTimersByTime(2200));
  const tiles = screen.getByRole('region', { name: 'Key facts' });
  const values = within(tiles).getAllByTestId('stat-value').map((v) => v.textContent);
  expect(values).toEqual(['3.6 m', '~4 t', '2016']);
  expect(within(tiles).getByText('tall')).toBeInTheDocument();
  expect(within(tiles).getByText('each')).toBeInTheDocument();
  expect(within(tiles).getByText('unveiled')).toBeInTheDocument();
  expect(tiles.querySelector('[data-highlight]')).toBeNull();
});

test('article with Read more, and the source line', () => {
  renderCard();
  expect(screen.getByText(/Behind Tembusu College stand two concrete panels/)).toBeInTheDocument();
  expect(screen.getByText('Read more')).toBeInTheDocument();
  expect(screen.getByText(/Elmar Prost and his company/)).toBeInTheDocument();
  expect(screen.getByText(/Look at the paint\. Graffiti covered the Wall’s western face/)).toBeInTheDocument();
  expect(screen.getByText('Source: Tembusu College, NUS · Photo: Daderot · CC0')).toBeInTheDocument();
});

test('the NEXT card goes to the festival card', () => {
  renderCard();
  const next = screen.getByRole('link', { name: /NEXT · FESTIVAL/ });
  expect(next).toHaveAttribute('href', paths.placeCard(ID, 'festival'));
  expect(next).toHaveTextContent('Fall of the Wall · 9 Nov');
});
