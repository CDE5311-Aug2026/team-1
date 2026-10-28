import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { placeState } from '../../data/placeStories';
import { todayKey } from '../../data/progress';
import { placeStoriesStore } from '../../data/stores';
import { paths, patterns } from '../../routes';
import { setReducedMotion } from '../../test/media';
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

function Probe() {
  const location = useLocation();
  return <p data-testid="at">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}

function renderCard(id: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard(id, 'history')]}>
      <Routes>
        <Route path={patterns.placeCard} element={<PlaceStoryPage />} />
        <Route path={patterns.homePlace} element={<Probe />} />
        <Route path={paths.today} element={<Probe />} />
        <Route path={paths.moments} element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function checkVideo(title: string, captions: string[]) {
  fireEvent.click(screen.getByRole('button', { name: `Play video: ${title}` }));
  expect(screen.getByText(captions[0])).toBeInTheDocument();
  for (const c of captions.slice(1)) {
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(c)).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button', { name: 'Pause video' }));
}

const BERLIN = 'berlin-wall-fragments';

test('Wall history: marks history opened, header, top bar and idle video', () => {
  renderCard(BERLIN);
  expect(placeState(placeStoriesStore.get(), BERLIN).opened).toContain('history');
  expect(screen.getByRole('heading', { level: 1, name: 'From 1961 to a Singapore garden' })).toBeInTheDocument();
  expect(screen.getByText('HISTORY · BERLIN WALL FRAGMENTS')).toBeInTheDocument();
  expect(screen.getByText('4 of 4')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Video' })).getByText('2:40')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pause video' })).toBeNull();
});

test('Wall history: the video plays four captions', () => {
  renderCard(BERLIN);
  checkVideo('How the Wall rose and fell', [
    'In August 1961, East Germany began building the Wall.',
    'For 28 years, it split Berlin in two.',
    'On 9 November 1989, the crossings opened.',
    'In 2016, two panels came to Tembusu College.',
  ]);
  expect(screen.getByRole('button', { name: 'Play video: How the Wall rose and fell' })).toBeInTheDocument();
});

test('Wall history: timeline rows, dots, photos, credit and source', () => {
  renderCard(BERLIN);
  const timeline = screen.getByRole('region', { name: 'Timeline' });
  const rows = within(timeline).getAllByRole('listitem');
  expect(rows).toHaveLength(4);
  expect(rows.map((r) => r.querySelector('[data-dot]')?.getAttribute('data-dot'))).toEqual(['ring', 'fill', 'ring', 'here']);
  expect(rows.map((r) => r.style.animationDelay)).toEqual(['0.5s', '0.75s', '1s', '1.25s']);
  expect(within(timeline).getByText('1961 · 13 AUG')).toBeInTheDocument();
  expect(within(timeline).getByText('East Germany begins building the Wall around West Berlin. It stands for 28 years.')).toBeInTheDocument();
  expect(within(timeline).getByRole('img', { name: 'Crowds on the Wall in front of the Brandenburg Gate, 1989' })).toBeInTheDocument();
  expect(within(timeline).getByText('Photo: Lear 21 · CC BY-SA 3.0')).toBeInTheDocument();
  expect(within(timeline).getByText('Germany is reunified. The Wall comes down, and pieces go to places around the world.')).toBeInTheDocument();
  expect(within(timeline).getByRole('img', { name: 'The two panels at Tembusu College' })).toBeInTheDocument();
  expect(within(timeline).getByText('Source: berlin.de; Tembusu College, NUS')).toBeInTheDocument();
  expect(timeline.querySelector('.a-line-long')).toBeNull();
});

test('Wall history: Collect stamps, persists the date, focuses the passport link, which opens Moments', () => {
  renderCard(BERLIN);
  const card = screen.getByRole('region', { name: 'Collection complete' });
  expect(within(card).getByText('That’s all 4 cards here')).toBeInTheDocument();
  expect(within(card).getByText('Check in at the panels to add this place to your passport.')).toBeInTheDocument();
  fireEvent.click(within(card).getByRole('button', { name: 'Collect stamp' }));
  const state = placeState(placeStoriesStore.get(), BERLIN);
  expect(state.stamped).toBe(true);
  expect(state.stampedOn).toBe(todayKey());
  expect(state.opened).toEqual(['history']);
  const link = within(card).getByRole('link', { name: 'Stamped · see passport' });
  expect(link).toHaveFocus();
  expect(within(card).getByText('Berlin Wall Fragments is in your passport in Moments.')).toBeInTheDocument();
  expect(within(card).queryByRole('button', { name: 'Collect stamp' })).toBeNull();
  fireEvent.click(link);
  expect(screen.getByTestId('at')).toHaveTextContent('/moments');
});

test('Wall history: a stamped place shows the stamp on revisit, without stealing focus', () => {
  placeStoriesStore.set({ [BERLIN]: { opened: ['history'], checkedIn: false, stamped: true, stampedOn: '2026-10-01' } });
  renderCard(BERLIN);
  const link = screen.getByRole('link', { name: 'Stamped · see passport' });
  expect(link).toBeInTheDocument();
  expect(link).not.toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Collect stamp' })).toBeNull();
});

test('Wall history: Back to place replaces with the place and railIndex 3', () => {
  renderCard(BERLIN);
  fireEvent.click(screen.getByRole('link', { name: 'Back to place' }));
  expect(screen.getByTestId('at')).toHaveTextContent('/place/berlin-wall-fragments {"railIndex":3}');
});

test('Chinatown history: header, subtitle, top bar and video', () => {
  renderCard('chinatown');
  expect(placeState(placeStoriesStore.get(), 'chinatown').opened).toContain('history');
  expect(screen.getByRole('heading', { level: 1, name: 'From the 1822 town plan to today' })).toBeInTheDocument();
  expect(screen.getByText('HISTORY · CHINATOWN')).toBeInTheDocument();
  expect(screen.getByText('牛车水 Niu Che Shui · “bullock-cart water”')).toBeInTheDocument();
  expect(screen.getByText('4 of 4')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Chinatown' })).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Video' })).getByText('2:30')).toBeInTheDocument();
  checkVideo('How Chinatown began', [
    'In 1822, a town plan set land aside for the Chinese.',
    'It lay west of the Singapore River.',
    'Bullock carts brought water, giving the name Niu Che Shui.',
    'In 1989, its shophouses were protected.',
  ]);
});

test('Chinatown history: six rows, map highlight and label, chips, photo and source', () => {
  renderCard('chinatown');
  const timeline = screen.getByRole('region', { name: 'Timeline' });
  const rows = within(timeline).getAllByRole('listitem');
  expect(rows).toHaveLength(6);
  expect(rows.map((r) => r.querySelector('[data-dot]')?.getAttribute('data-dot'))).toEqual(['fill', 'ring', 'ring', 'ring', 'fill', 'here']);
  expect(rows.map((r) => r.style.animationDelay)).toEqual(['0.5s', '0.7s', '0.85s', '1s', '1.15s', '1.3s']);
  expect(timeline.querySelector('.a-line-long')).not.toBeNull();
  expect(within(timeline).getByText('1822 · THE TOWN PLAN')).toBeInTheDocument();
  expect(within(timeline).getByRole('img', { name: /Chinese Campong on the left bank/ })).toBeInTheDocument();
  expect(within(timeline).getByText('Chinese Campong')).toBeInTheDocument();
  expect(timeline.querySelector('.mark')).not.toBeNull();
  expect(within(timeline).getByText('Map: Lt Philip Jackson, 1822 · Public domain')).toBeInTheDocument();
  expect(within(timeline).getByText('THE NAME')).toBeInTheDocument();
  expect(within(timeline).getByText(/after the carts that brought water to the area/)).toBeInTheDocument();
  for (const chip of ['Hokkien · Telok Ayer St', 'Cantonese · Temple St', 'Teochew · South Canal Rd']) {
    expect(within(timeline).getByText(chip)).toBeInTheDocument();
  }
  expect(within(timeline).getByText('2002 → TODAY')).toBeInTheDocument();
  expect(within(timeline).getByRole('img', { name: 'Pagoda Street today, busy with visitors between shophouses' })).toBeInTheDocument();
  expect(within(timeline).getByText('Photo: kallerna · CC BY-SA 4.0')).toBeInTheDocument();
  expect(within(timeline).getByText('Source: Singapore Infopedia (NLB), “Chinatown”')).toBeInTheDocument();
});

test('Chinatown history: numbers count up from 0 to 3,317 and 1,200', () => {
  renderCard('chinatown');
  const nums = () => Array.from(document.querySelectorAll('b')).map((b) => b.textContent);
  expect(nums()).toEqual(['0', '0']);
  act(() => vi.advanceTimersByTime(900 + 700));
  const mid = nums();
  expect(mid).not.toEqual(['0', '0']);
  expect(mid).not.toEqual(['3,317', '1,200']);
  act(() => vi.advanceTimersByTime(1000));
  expect(nums()).toEqual(['3,317', '1,200']);
});

test('Chinatown history: reduced motion shows the final numbers at once', () => {
  setReducedMotion(true);
  renderCard('chinatown');
  expect(Array.from(document.querySelectorAll('b')).map((b) => b.textContent)).toEqual(['3,317', '1,200']);
});

test('Chinatown history: Collect stamps, Home replaces with focusPlace chinatown', () => {
  renderCard('chinatown');
  const card = screen.getByRole('region', { name: 'Collection complete' });
  expect(within(card).getByText('That’s all 4 Chinatown cards')).toBeInTheDocument();
  expect(within(card).getByText('Check in nearby to add Chinatown to your passport.')).toBeInTheDocument();
  fireEvent.click(within(card).getByRole('button', { name: 'Collect stamp' }));
  expect(placeState(placeStoriesStore.get(), 'chinatown')).toMatchObject({ stamped: true, stampedOn: todayKey() });
  expect(within(card).getByRole('link', { name: 'Stamped · see passport' })).toHaveFocus();
  expect(within(card).getByText('Chinatown is in your passport in Moments.')).toBeInTheDocument();
  fireEvent.click(within(card).getByRole('link', { name: 'Home' }));
  expect(screen.getByTestId('at')).toHaveTextContent('/ {"focusPlace":"chinatown"}');
});
