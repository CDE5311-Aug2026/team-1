import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { placeState } from '../../data/placeStories';
import { placeStoriesStore } from '../../data/stores';
import { paths, patterns } from '../../routes';
import { setReducedMotion } from '../../test/media';
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

function renderCard() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard(ID, 'monument')]}>
      <Routes>
        <Route path={patterns.placeCard} element={<PlaceStoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Advances in small steps so each state change re-arms the easing timer, as it does in a browser. */
const run = (ms: number) => {
  for (let t = 0; t < ms; t += 50) act(() => vi.advanceTimersByTime(50));
};
const settle = () => run(1500);
const slider = () => screen.getByRole('slider', { name: 'Compare the temple in 1890 and 2006' });
const valueNow = () => slider().getAttribute('aria-valuenow');

/** Gets past the intro demo so tests start from a settled 50. */
function touchFirst() {
  fireEvent.keyDown(slider(), { key: 'ArrowRight' });
  fireEvent.keyDown(slider(), { key: 'ArrowLeft' });
  settle();
  expect(valueNow()).toBe('50');
}

test('opening the card marks the monument facet opened', () => {
  renderCard();
  expect(placeState(placeStoriesStore.get(), ID).opened).toContain('monument');
});

test('header, top bar and poster', () => {
  renderCard();
  expect(screen.getByRole('heading', { level: 1, name: 'Thian Hock Keng, the sailors’ temple' })).toBeInTheDocument();
  expect(screen.getByText('MONUMENT · CHINATOWN')).toBeInTheDocument();
  expect(screen.getByText('天福宫 · Telok Ayer Street · Hokkien')).toBeInTheDocument();
  expect(screen.getByText('2 of 4')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Chinatown' })).toBeInTheDocument();
  const video = screen.getByRole('region', { name: 'Video' });
  expect(within(video).getByText('1:55')).toBeInTheDocument();
  expect(within(video).getByRole('img', { name: /front of Thian Hock Keng Temple/ })).toBeInTheDocument();
});

test('the video plays with its captions, independent of the slider', () => {
  renderCard();
  touchFirst();
  fireEvent.click(screen.getByRole('button', { name: 'Play video: A temple once on the sea' }));
  expect(screen.getByText('Thian Hock Keng is a Hokkien temple to Mazu.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('Mazu is the goddess of the sea.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('Sailors gave thanks here after the voyage from China.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('Land reclamation later moved the sea away.')).toBeInTheDocument();
  expect(valueNow()).toBe('50');
  fireEvent.click(screen.getByRole('button', { name: 'Pause video' }));
  expect(screen.getByRole('button', { name: 'Play video: A temple once on the sea' })).toBeInTheDocument();
});

test('key dates count up from 1800, the last tile highlighted', () => {
  renderCard();
  act(() => vi.advanceTimersByTime(2200));
  const tiles = screen.getByRole('region', { name: 'Key dates' });
  expect(within(tiles).getAllByTestId('stat-value').map((v) => v.textContent)).toEqual(['1839', '1842', '1973']);
  expect(within(tiles).getByText('building starts')).toBeInTheDocument();
  expect(within(tiles).getByText('temple completed')).toBeInTheDocument();
  expect(within(tiles).getByText('national monument')).toBeInTheDocument();
  expect(tiles.querySelectorAll('[data-highlight]')).toHaveLength(1);
});

test('then and now: heading, hint, both photos and the slider start at 50', () => {
  renderCard();
  const region = screen.getByRole('region', { name: 'Then and now' });
  expect(within(region).getByText('THEN AND NOW')).toBeInTheDocument();
  expect(within(region).getByText('Drag to compare')).toBeInTheDocument();
  expect(within(region).getByRole('img', { name: /around 1890, with a rickshaw/ })).toBeInTheDocument();
  expect(within(region).getByRole('img', { name: /in 2006, seen from Telok Ayer Street/ })).toBeInTheDocument();
  expect(slider()).toHaveAttribute('aria-valuemin', '0');
  expect(slider()).toHaveAttribute('aria-valuemax', '100');
  expect(valueNow()).toBe('50');
  expect(slider()).toHaveAttribute('aria-valuetext', '50% of the 1890 photo shown');
  expect(within(region).getByText('Same corner, 116 years apart.')).toBeInTheDocument();
});

test('the intro demo sweeps to 74, 26 and back to 50 when untouched', () => {
  renderCard();
  run(2200);
  expect(Number(valueNow())).toBeGreaterThan(60);
  run(600);
  expect(Number(valueNow())).toBeLessThan(40);
  run(2000);
  expect(valueNow()).toBe('50');
});

test('arrow keys step by 5, Shift by 20, Home and End jump, values are announced', () => {
  renderCard();
  touchFirst();
  fireEvent.keyDown(slider(), { key: 'ArrowRight' });
  settle();
  expect(valueNow()).toBe('55');
  expect(slider()).toHaveAttribute('aria-valuetext', '55% of the 1890 photo shown');
  fireEvent.keyDown(slider(), { key: 'ArrowLeft', shiftKey: true });
  settle();
  expect(valueNow()).toBe('35');
  fireEvent.keyDown(slider(), { key: 'End' });
  settle();
  expect(valueNow()).toBe('100');
  fireEvent.keyDown(slider(), { key: 'ArrowRight' });
  settle();
  expect(valueNow()).toBe('100');
  fireEvent.keyDown(slider(), { key: 'Home' });
  settle();
  expect(valueNow()).toBe('0');
});

test('dragging the photo sets the divider to the pointer and the caption follows', () => {
  renderCard();
  touchFirst();
  const box = screen.getByTestId('then-now-box');
  box.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 264, right: 200, bottom: 264, x: 0, y: 0, toJSON: () => {} });
  box.setPointerCapture = vi.fn();
  fireEvent.pointerDown(box, { clientX: 160, pointerId: 1 });
  expect(valueNow()).toBe('80');
  expect(screen.getByText('c.1890.', { selector: 'b' })).toBeInTheDocument();
  fireEvent.pointerMove(box, { clientX: 40, pointerId: 1 });
  expect(valueNow()).toBe('20');
  expect(screen.getByText('2006.', { selector: 'b' })).toBeInTheDocument();
  fireEvent.pointerUp(box, { pointerId: 1 });
  fireEvent.pointerMove(box, { clientX: 100, pointerId: 1 });
  expect(valueNow()).toBe('20');
});

test('the Show presets move the slider and the active one follows it', () => {
  renderCard();
  touchFirst();
  const group = screen.getByRole('radiogroup', { name: 'Show' });
  expect(within(group).getByRole('radio', { name: 'Compare' })).toBeChecked();
  fireEvent.click(within(group).getByRole('radio', { name: 'c.1890' }));
  settle();
  expect(valueNow()).toBe('100');
  expect(within(group).getByRole('radio', { name: 'c.1890' })).toBeChecked();
  expect(screen.getByText(/A rickshaw waits outside the temple/)).toBeInTheDocument();
  fireEvent.click(within(group).getByRole('radio', { name: '2006' }));
  settle();
  expect(valueNow()).toBe('0');
  expect(within(group).getByRole('radio', { name: '2006' })).toBeChecked();
  expect(screen.getByText(/office blocks now rising behind the roofs/)).toBeInTheDocument();
  fireEvent.click(within(group).getByRole('radio', { name: 'Compare' }));
  settle();
  expect(valueNow()).toBe('50');
});

test('corner labels fade out at the ends', () => {
  renderCard();
  touchFirst();
  fireEvent.keyDown(slider(), { key: 'Home' });
  settle();
  expect(screen.getByTestId('label-then')).toHaveStyle({ opacity: '0' });
  expect(screen.getByTestId('label-now')).toHaveStyle({ opacity: '1' });
  fireEvent.keyDown(slider(), { key: 'End' });
  settle();
  expect(screen.getByTestId('label-then')).toHaveStyle({ opacity: '1' });
  expect(screen.getByTestId('label-now')).toHaveStyle({ opacity: '0' });
});

test('article, Look for rows, credits and the NEXT card to Lunar New Year', () => {
  renderCard();
  expect(screen.getByText(/Thian Hock Keng is a Hokkien temple to Mazu, the sea goddess, built from 1839 to 1842/)).toBeInTheDocument();
  expect(screen.getByText('Read more')).toBeInTheDocument();
  expect(screen.getByText(/Sailors arriving from China came here to give thanks/)).toBeInTheDocument();
  expect(screen.getByText(/gazetted as a national monument in 1973/)).toBeInTheDocument();
  const look = screen.getByRole('region', { name: 'Look for' });
  expect(within(look).getByText('LOOK FOR')).toBeInTheDocument();
  expect(within(look).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
    'Dragons on the curved roof ridges',
    'Timber joinery with no nails',
  ]);
  expect(
    screen.getByText(
      'Source: National Heritage Board, Roots.gov.sg · Photos: Zairon, CC BY-SA 4.0; Lambert & Co. c.1890, KITLV, public domain; Terence Ong 2006, CC BY 2.5 · Photo: Dileep Kaluaratchie · CC BY-SA 4.0',
    ),
  ).toBeInTheDocument();
  const next = screen.getByRole('link', { name: /NEXT · FESTIVAL/ });
  expect(next).toHaveAttribute('href', paths.placeCard(ID, 'festival'));
  expect(next).toHaveTextContent('Lunar New Year');
});

test('the slider and the video clock do not affect each other', () => {
  renderCard();
  touchFirst();
  fireEvent.click(screen.getByRole('button', { name: 'Play video: A temple once on the sea' }));
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('Mazu is the goddess of the sea.')).toBeInTheDocument();
  fireEvent.keyDown(slider(), { key: 'End' });
  settle();
  expect(valueNow()).toBe('100');
  expect(screen.getByText(/A rickshaw waits outside the temple/)).toBeInTheDocument();
  expect(screen.getByText('Mazu is the goddess of the sea.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pause video' })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('Sailors gave thanks here after the voyage from China.')).toBeInTheDocument();
  expect(valueNow()).toBe('100');
  fireEvent.click(screen.getByRole('button', { name: 'Pause video' }));
  fireEvent.keyDown(slider(), { key: 'Home' });
  settle();
  expect(valueNow()).toBe('0');
  expect(screen.getByRole('button', { name: 'Play video: A temple once on the sea' })).toBeInTheDocument();
});

test('reduced motion: no intro sweep, and keys snap at once', () => {
  setReducedMotion(true);
  renderCard();
  run(3600);
  expect(valueNow()).toBe('50');
  fireEvent.keyDown(slider(), { key: 'ArrowRight' });
  act(() => vi.advanceTimersByTime(20));
  expect(valueNow()).toBe('55');
});

test('the slider is a focusable non-button element', () => {
  renderCard();
  expect(slider().tagName).not.toBe('BUTTON');
  expect(slider()).toHaveAttribute('tabindex', '0');
});

test('the caption is silent during the intro sweep and polite once it ends', () => {
  renderCard();
  const live = () => screen.getByTestId('then-now-caption').getAttribute('aria-live');
  expect(live()).toBe('off');
  run(2000);
  expect(live()).toBe('off');
  run(1500);
  expect(live()).toBe('polite');
});

test('the caption turns polite at the first interaction', () => {
  renderCard();
  fireEvent.keyDown(slider(), { key: 'ArrowRight' });
  expect(screen.getByTestId('then-now-caption')).toHaveAttribute('aria-live', 'polite');
});

test('a drag still ends on release when pointer capture throws', () => {
  renderCard();
  touchFirst();
  const box = screen.getByTestId('then-now-box');
  box.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 264, right: 200, bottom: 264, x: 0, y: 0, toJSON: () => {} });
  box.setPointerCapture = () => {
    throw new Error('no capture');
  };
  fireEvent.pointerDown(box, { clientX: 160, pointerId: 1 });
  expect(valueNow()).toBe('80');
  fireEvent.pointerUp(window, { pointerId: 1 });
  fireEvent.pointerMove(box, { clientX: 40, pointerId: 1 });
  expect(valueNow()).toBe('80');
});

test('losing pointer capture ends the drag', () => {
  renderCard();
  touchFirst();
  const box = screen.getByTestId('then-now-box');
  box.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 264, right: 200, bottom: 264, x: 0, y: 0, toJSON: () => {} });
  box.setPointerCapture = vi.fn();
  fireEvent.pointerDown(box, { clientX: 160, pointerId: 1 });
  fireEvent.lostPointerCapture(box, { pointerId: 1 });
  fireEvent.pointerMove(box, { clientX: 40, pointerId: 1 });
  expect(valueNow()).toBe('80');
});
