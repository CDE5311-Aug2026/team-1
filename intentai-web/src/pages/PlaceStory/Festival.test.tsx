import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { placeState } from '../../data/placeStories';
import { placeStoriesStore } from '../../data/stores';
import { paths, patterns } from '../../routes';
import PlaceStoryPage from './PlaceStoryPage';

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderCard(id: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard(id, 'festival')]}>
      <Routes>
        <Route path={patterns.placeCard} element={<PlaceStoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function tileValues() {
  const tiles = screen.getByRole('region', { name: 'Key facts' });
  return { tiles, values: within(tiles).getAllByTestId('stat-value').map((v) => v.textContent) };
}

function checkVideo(title: string, captions: string[]) {
  fireEvent.click(screen.getByRole('button', { name: `Play video: ${title}` }));
  expect(screen.getByText(captions[0])).toBeInTheDocument();
  for (const c of captions.slice(1)) {
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(c)).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button', { name: 'Pause video' }));
  expect(screen.getByRole('button', { name: `Play video: ${title}` })).toBeInTheDocument();
}

const BERLIN = 'berlin-wall-fragments';

test('Fall of the Wall: marks festival opened, header and top bar', () => {
  renderCard(BERLIN);
  expect(placeState(placeStoriesStore.get(), BERLIN).opened).toContain('festival');
  expect(screen.getByRole('heading', { level: 1, name: 'Fall of the Wall: the night the border opened' })).toBeInTheDocument();
  expect(screen.getByText('FESTIVAL · MON 9 NOV')).toBeInTheDocument();
  expect(screen.getByText('3 of 4')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Berlin Wall Fragments' })).toBeInTheDocument();
});

test('Fall of the Wall: the video starts idle, then plays four captions', () => {
  renderCard(BERLIN);
  const video = screen.getByRole('region', { name: 'Video' });
  expect(within(video).getByText('2:05')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pause video' })).toBeNull();
  expect(within(video).getByRole('img', { name: /Lit white balloons/ })).toBeInTheDocument();
  checkVideo('How Berlin marks 9 November', [
    'On 9 November 1989, the travel rules changed by surprise.',
    'Crowds rushed to the crossings that night.',
    'At Bornholmer Straße, the guards raised the barrier.',
    'In 2014, 8,000 lit balloons traced the Wall’s route.',
  ]);
});

test('Fall of the Wall: tiles count up to 1989, ~20k, 37 with the third highlighted', () => {
  renderCard(BERLIN);
  act(() => vi.advanceTimersByTime(2200));
  const { tiles, values } = tileValues();
  expect(values).toEqual(['1989', '~20k', '37']);
  expect(within(tiles).getByText('the Wall opened')).toBeInTheDocument();
  expect(within(tiles).getByText('crossed in an hour')).toBeInTheDocument();
  expect(within(tiles).getByText('years on Mon')).toBeInTheDocument();
  expect(tiles.querySelectorAll('[data-highlight]')).toHaveLength(1);
  expect(tiles.querySelectorAll('[data-tile]')[2]).toHaveAttribute('data-highlight');
});

test('Fall of the Wall: article, Read more, credit and NEXT to history', () => {
  renderCard(BERLIN);
  expect(screen.getByText(/Günter Schabowski announced new travel rules/)).toBeInTheDocument();
  expect(screen.getByText('Read more')).toBeInTheDocument();
  expect(screen.getByText(/Bornholmer Straße, guards raised the barrier late that night/)).toBeInTheDocument();
  expect(screen.getByText(/Unity Day on 3 October/)).toBeInTheDocument();
  expect(screen.getByText('Source: berlin.de · Photo: Daderot · CC0 · Photo: Lear 21 · CC BY-SA 3.0')).toBeInTheDocument();
  const next = screen.getByRole('link', { name: /NEXT · HISTORY/ });
  expect(next).toHaveAttribute('href', paths.placeCard(BERLIN, 'history'));
  expect(next).toHaveTextContent('From 1961 to a Singapore garden');
});

test('Lunar New Year: marks festival opened, header, subtitle and top bar', () => {
  renderCard('chinatown');
  expect(placeState(placeStoriesStore.get(), 'chinatown').opened).toContain('festival');
  expect(screen.getByRole('heading', { level: 1, name: 'Lunar New Year' })).toBeInTheDocument();
  expect(screen.getByText('FESTIVAL · CHINATOWN')).toBeInTheDocument();
  expect(screen.getByText('Chinese · January or February')).toBeInTheDocument();
  expect(screen.getByText('3 of 4')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Chinatown' })).toBeInTheDocument();
});

test('Lunar New Year: the video starts idle, then plays four captions', () => {
  renderCard('chinatown');
  const video = screen.getByRole('region', { name: 'Video' });
  expect(within(video).getByText('2:10')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pause video' })).toBeNull();
  checkVideo('From reunion dinner to day 15', [
    'The Chinese lunar year begins with a new moon.',
    'Families gather for the reunion dinner on the eve.',
    'Visits and feasting carry on for 15 days.',
    'Chinatown’s streets fill with red lanterns.',
  ]);
});

test('Lunar New Year: tiles show 15, Jan–Feb, 6 Feb with the third highlighted', () => {
  renderCard('chinatown');
  act(() => vi.advanceTimersByTime(2200));
  const { tiles, values } = tileValues();
  expect(values).toEqual(['15', 'Jan–Feb', '6 Feb']);
  expect(within(tiles).getByText('days of visits')).toBeInTheDocument();
  expect(within(tiles).getByText('next, in 2027')).toBeInTheDocument();
  expect(tiles.querySelectorAll('[data-tile]')[2]).toHaveAttribute('data-highlight');
});

test('Lunar New Year: article and Read more', () => {
  renderCard('chinatown');
  expect(screen.getByText('The start of the Chinese lunar year, celebrated over 15 days of family visits and feasting.')).toBeInTheDocument();
  expect(screen.getByText(/between 21 January and 20 February/)).toBeInTheDocument();
  expect(screen.getByText(/lanterns and a festive street market/)).toBeInTheDocument();
});

test('Lunar New Year: the reminder button toggles text (the name), style and keeps focus both ways', () => {
  renderCard('chinatown');
  const card = screen.getByRole('region', { name: 'Next Lunar New Year' });
  expect(within(card).getByText('NEXT TIME')).toBeInTheDocument();
  expect(within(card).getByText('Sat 6 Feb 2027')).toBeInTheDocument();
  expect(within(card).getByText('Holidays Sat 6 and Sun 7 Feb; Mon 8 Feb is off in lieu.')).toBeInTheDocument();
  const off = within(card).getByRole('button', { name: 'Remind me' });
  expect(off).not.toHaveAttribute('aria-pressed');
  off.focus();
  const offClass = off.className;
  fireEvent.click(off);
  const on = within(card).getByRole('button', { name: 'Reminder set for 6 Feb' });
  expect(on).not.toHaveAttribute('aria-pressed');
  expect(on).toHaveFocus();
  expect(on.className).not.toBe(offClass);
  fireEvent.click(on);
  const again = within(card).getByRole('button', { name: 'Remind me' });
  expect(again).toHaveFocus();
  expect(again.className).toBe(offClass);
});

test('Lunar New Year: source line and NEXT to history', () => {
  renderCard('chinatown');
  expect(screen.getByText('Source: IntentAI editorial; Singapore 2027 public holidays (MOM) · Photo: Dileep Kaluaratchie · CC BY-SA 4.0 · Map: Lt Philip Jackson, 1822 · Public domain')).toBeInTheDocument();
  const next = screen.getByRole('link', { name: /NEXT · HISTORY/ });
  expect(next).toHaveAttribute('href', paths.placeCard('chinatown', 'history'));
  expect(next).toHaveTextContent('From the 1822 town plan to today');
});
