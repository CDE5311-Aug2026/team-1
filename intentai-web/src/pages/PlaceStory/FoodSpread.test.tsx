import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setReducedMotion } from '../../test/media';
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
      </Routes>
    </MemoryRouter>,
  );
}

const settle = () => act(() => vi.advanceTimersByTime(1500));
const counter = () => screen.getByTestId('carousel-counter').textContent;
const photoOf = (title: string) => within(screen.getByRole('region', { name: /^Photos of The Spread\. Use/ })).getAllByRole('figure', { hidden: true }).find((f) => f.textContent?.includes(title))!;

test('shows the header, top bar and the 7-photo carousel as 01 / 07', () => {
  renderCard();
  expect(screen.getByRole('heading', { level: 1, name: 'Lunch near the Wall: The Spread' })).toBeInTheDocument();
  expect(screen.getByText('FOOD · POPULAR ON CAMPUS')).toBeInTheDocument();
  expect(screen.getByText('Café bistro · NUS Business School')).toBeInTheDocument();
  expect(screen.getByText('1 of 4')).toBeInTheDocument();
  const carousel = screen.getByRole('region', { name: 'Photos of The Spread. Use the left and right arrow keys to browse.' });
  expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
  expect(carousel.querySelectorAll('figure')).toHaveLength(7);
  expect(counter()).toBe('01 / 07');
  expect(screen.getByText('Window seats with plenty of daylight, for a slower lunch.')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Sunlit tables beside the window inside The Spread' })).toBeInTheDocument();
});

test('Next and Previous step the photos, across groups, and the caption and counter follow', () => {
  renderCard();
  const prev = screen.getByRole('button', { name: 'Previous photo' });
  expect(prev).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  settle();
  expect(counter()).toBe('02 / 07');
  expect(screen.getByText('A long shared table under pendant lamps, good for a group lunch after the panels.')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'The space' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  settle();
  expect(counter()).toBe('03 / 07');
  expect(screen.getByRole('radio', { name: 'Coffee' })).toBeChecked();
  fireEvent.click(prev);
  settle();
  expect(counter()).toBe('02 / 07');
  expect(screen.getByRole('radio', { name: 'The space' })).toBeChecked();
});

test('the last photo disables Next; extra clicks stay in range', () => {
  renderCard();
  const next = screen.getByRole('button', { name: 'Next photo' });
  for (let i = 0; i < 9; i += 1) fireEvent.click(next);
  settle();
  expect(counter()).toBe('07 / 07');
  expect(next).toHaveAttribute('aria-disabled', 'true');
});

test('"Jump to photos of" goes to the group first slide and is not a filter', () => {
  renderCard();
  const group = screen.getByRole('radiogroup', { name: 'Jump to photos of' });
  fireEvent.click(within(group).getByRole('radio', { name: 'Food' }));
  settle();
  expect(counter()).toBe('05 / 07');
  expect(screen.getByText('Pasta is a menu staple, served in wide bowls.')).toBeInTheDocument();
  expect(document.querySelectorAll('figure')).toHaveLength(7);
  // The active option follows the current slide.
  fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
  settle();
  expect(counter()).toBe('04 / 07');
  expect(within(group).getByRole('radio', { name: 'Coffee' })).toBeChecked();
  fireEvent.click(within(group).getByRole('radio', { name: 'The space' }));
  settle();
  expect(counter()).toBe('01 / 07');
});

test('tapping a neighbouring photo brings it to the front', () => {
  renderCard();
  fireEvent.click(screen.getByRole('button', { name: 'Show The common table' }));
  settle();
  expect(counter()).toBe('02 / 07');
  expect(screen.queryByRole('button', { name: 'Show The common table' })).not.toBeInTheDocument();
});

test('arrow keys browse the carousel', () => {
  renderCard();
  const carousel = screen.getByRole('region', { name: /^Photos of The Spread\. Use/ });
  fireEvent.keyDown(carousel, { key: 'ArrowRight' });
  fireEvent.keyDown(carousel, { key: 'ArrowRight' });
  settle();
  expect(counter()).toBe('03 / 07');
  fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
  settle();
  expect(counter()).toBe('02 / 07');
});

test('dragging the carousel moves to the nearest photo', () => {
  renderCard();
  const carousel = screen.getByRole('region', { name: /^Photos of The Spread\. Use/ });
  fireEvent.pointerDown(carousel, { clientX: 300 });
  fireEvent.pointerMove(carousel, { clientX: 100 });
  fireEvent.pointerUp(carousel);
  settle();
  expect(counter()).toBe('02 / 07');
});

test('photos shift against the drag (parallax) and the progress line follows', () => {
  renderCard();
  const shift = (title: string) => photoOf(title).querySelector('img')!.style.transform;
  expect(shift('The common table')).toBe('translateX(-20.0px)');
  expect(shift('Window seats')).toBe('translateX(0.0px)');
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  settle();
  expect(shift('Window seats')).toBe('translateX(20.0px)');
  expect(shift('The common table')).toBe('translateX(0.0px)');
  expect(screen.getByTestId('carousel-thumb').style.left).toBe('14.29%');
});

test('reduced motion: no parallax and the photo changes at once', () => {
  setReducedMotion(true);
  renderCard();
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  expect(counter()).toBe('02 / 07');
  expect(photoOf('The espresso bar').querySelector('img')!.style.transform).toBe('translateX(0.0px)');
});

test('article, route card and the km count-up', () => {
  renderCard();
  expect(screen.getByText(/Since no dish is tied to the Wall itself/)).toBeInTheDocument();
  expect(screen.getByText(/Mochtar Riady Building at NUS Business School, about 1.5 km/)).toBeInTheDocument();
  expect(screen.getByText('Read more')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Where it is' })).toBeInTheDocument();
  expect(screen.getByText('FROM THE WALL')).toBeInTheDocument();
  expect(screen.getByText('Tembusu College')).toBeInTheDocument();
  expect(screen.getByTestId('route-km')).toHaveTextContent('~0.0 km');
  act(() => vi.advanceTimersByTime(900 + 1200 + 100));
  expect(screen.getByTestId('route-km')).toHaveTextContent('~1.5 km');
});

test('visit card: open now, address, hours (today in bold) and the phone number as text plus a tel link', () => {
  renderCard();
  const visit = screen.getByRole('region', { name: 'Visit' });
  expect(within(visit).getByText('Open today until 2:30 pm')).toBeInTheDocument();
  expect(within(visit).getByText('15 Kent Ridge Dr, #01-03')).toBeInTheDocument();
  expect(within(visit).getByText(/Mochtar Riady Building, Singapore 119245/)).toBeInTheDocument();
  expect(within(visit).getByText('Mon–Fri').nextSibling).toHaveTextContent('8:00 am – 6:30 pm');
  expect(within(visit).getByText('Sat · today').nextSibling).toHaveTextContent('8:00 am – 2:30 pm');
  expect(within(visit).getByText('Sun & public holidays').nextSibling).toHaveTextContent('Closed');
  expect(within(visit).getByText('+65 6908 5955')).toBeInTheDocument();
  expect(within(visit).getByRole('link', { name: 'Call The Spread, +65 6908 5955' })).toHaveAttribute('href', 'tel:+6569085955');
});

test('"Directions from the Wall" goes to Home focused on Berlin Wall Fragments', () => {
  renderCard();
  fireEvent.click(screen.getByRole('link', { name: 'Directions from the Wall' }));
  expect(screen.getByTestId('at')).toHaveTextContent('/ {"focusPlace":"berlin-wall-fragments","showMap":true}');
});

test('credit line and the NEXT card to the monument card', () => {
  renderCard();
  expect(screen.getByText('Source: thespread.sg (hours, address); NUS Business School · Photos: The Spread')).toBeInTheDocument();
  const next = screen.getByRole('link', { name: /NEXT · MONUMENT/ });
  expect(next).toHaveAttribute('href', paths.placeCard(ID, 'monument'));
  expect(next).toHaveTextContent('The Wall panels');
});
