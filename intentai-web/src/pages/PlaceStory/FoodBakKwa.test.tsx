import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { paths, patterns } from '../../routes';
import PlaceStoryPage from './PlaceStoryPage';

const ID = 'chinatown';

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

function renderCard() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard(ID, 'food')]}>
      <Routes>
        <Route path={patterns.placeCard} element={<PlaceStoryPage />} />
        <Route path={paths.today} element={<Probe />} />
        <Route path={paths.community} element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('header, top bar and the sample video', () => {
  renderCard();
  expect(screen.getByRole('heading', { level: 1, name: 'Bak kwa, Chinatown’s festive queue' })).toBeInTheDocument();
  expect(screen.getByText('FOOD · CHINATOWN')).toBeInTheDocument();
  expect(screen.getByText('肉干 · “dried meat” in Hokkien')).toBeInTheDocument();
  expect(screen.getByText('1 of 4')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Chinatown' })).toBeInTheDocument();
  const video = screen.getByRole('region', { name: 'Video' });
  expect(within(video).getByText('1:40')).toBeInTheDocument();
  expect(within(video).getByRole('img', { name: 'Glossy, charcoal-grilled squares of bak kwa in paper-lined boxes' })).toBeInTheDocument();
});

test('the video plays with looped captions, then pauses', () => {
  renderCard();
  fireEvent.click(screen.getByRole('button', { name: 'Play video: Grilled over charcoal' }));
  expect(screen.getByText('Bak kwa means “dried meat” in Hokkien.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('Pork is marinated with sugar and spices, then dried.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByText('Before Lunar New Year, the queues last for hours.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pause video' }));
  expect(screen.getByRole('button', { name: 'Play video: Grilled over charcoal' })).toBeInTheDocument();
});

test('key-fact tiles count up to 1905, 1938 and 6h+', () => {
  renderCard();
  const values = () => screen.getAllByTestId('stat-value').map((el) => el.textContent);
  expect(values()).toEqual(['1850', '1850', '0h+']);
  act(() => vi.advanceTimersByTime(2000));
  expect(values()).toEqual(['1905', '1938', '6h+']);
  expect(screen.getByText('oldest shop opens')).toBeInTheDocument();
  expect(screen.getByText('Lim Chee Guan starts')).toBeInTheDocument();
  expect(screen.getByText('queues before CNY')).toBeInTheDocument();
});

test('the make-steps list: marinate, dry, grill', () => {
  renderCard();
  const steps = screen.getByRole('region', { name: 'How it is made' });
  expect(within(steps).getByText('HOW IT’S MADE')).toBeInTheDocument();
  const items = within(steps).getAllByRole('listitem').map((li) => li.textContent);
  expect(items).toEqual(['Marinatesugar, spices', 'Dryin thin sheets', 'Grillover charcoal']);
});

test('article with Read more', () => {
  renderCard();
  expect(screen.getByText(/Bak kwa is a Hokkien delicacy from Fujian/)).toBeInTheDocument();
  expect(screen.getByText('Read more')).toBeInTheDocument();
  expect(screen.getByText(/queues at Chinatown’s shops can run for six hours or more/)).toBeInTheDocument();
});

test('Try it nearby card with the shop, chips and the Mei tip', () => {
  renderCard();
  const card = screen.getByRole('region', { name: 'Try it nearby' });
  expect(within(card).getByText('Lim Chee Guan 林志源')).toBeInTheDocument();
  expect(within(card).getByText('203 New Bridge Rd · daily 9 am–9 pm')).toBeInTheDocument();
  expect(within(card).getByText('Since 1938')).toBeInTheDocument();
  expect(within(card).getByText('Longest queues in Jan–Feb')).toBeInTheDocument();
  expect(within(card).getByText('Verified tip')).toBeInTheDocument();
  expect(within(card).getByText(/Come on a weekday soon after the 9 am opening/)).toBeInTheDocument();
  expect(within(card).getByText('Your question · 2 days ago')).toBeInTheDocument();
});

test('the Mei tip opens Community', () => {
  renderCard();
  fireEvent.click(screen.getByRole('link', { name: 'Local tip from Mei: read the full answer in Community' }));
  expect(screen.getByTestId('at')).toHaveTextContent('/community');
});

test('"See it on the Nearby map" goes to Home focused on Chinatown', () => {
  renderCard();
  fireEvent.click(screen.getByRole('link', { name: 'See it on the Nearby map' }));
  expect(screen.getByTestId('at')).toHaveTextContent('/ {"focusPlace":"chinatown","showMap":true}');
});

test('credit line and the NEXT card to the monument card', () => {
  renderCard();
  expect(screen.getByText('Source: Singapore Infopedia (NLB); chinatown.sg · Photo: Alpha · CC BY-SA 2.0')).toBeInTheDocument();
  const next = screen.getByRole('link', { name: /NEXT · MONUMENT/ });
  expect(next).toHaveAttribute('href', paths.placeCard(ID, 'monument'));
  expect(next).toHaveTextContent('Thian Hock Keng Temple');
});
