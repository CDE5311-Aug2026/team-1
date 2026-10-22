import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { GESTURE_EVENT } from '../../../usage/gesture';
import CardDeck, { jitter, type DeckCard } from './CardDeck';

const cards: DeckCard[] = ['a', 'b', 'c'].map((id) => ({ id, tone: id === 'a' ? 'language' : 'culture', kicker: `Card ${id}`, body: <button type="button">Press {id}</button> }));
const topText = () => document.querySelector('[data-top]')!.textContent;

test('only the top card can be read or pressed; the arrows go through the pile and around', async () => {
  render(<CardDeck cards={cards} label="Cards" />);
  const pile = screen.getByRole('group', { name: 'Cards' });
  expect(within(pile).getAllByRole('button')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Press a' })).toBeInTheDocument();
  expect(screen.getByText('1 / 3')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Previous card' }));
  expect(topText()).toContain('Card c');
  expect(screen.getByText('3 / 3')).toBeInTheDocument();
});

test('a drag past the line sends the top card away (counted as a swipe); a short drag puts it back', () => {
  vi.useFakeTimers();
  const swipes: string[] = [];
  const on = (e: Event) => swipes.push(String((e as CustomEvent).detail));
  document.addEventListener(GESTURE_EVENT, on);
  render(<CardDeck cards={cards} label="Cards" />);
  const top = () => document.querySelector<HTMLElement>('[data-top]')!;
  const drag = (to: number) => {
    const el = top();
    fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(el, { clientX: 100 + to / 2, clientY: 102, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(el, { clientX: 100 + to, clientY: 103, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(el, { clientX: 100 + to, clientY: 103, pointerId: 1, pointerType: 'touch' });
  };
  // a slow hand: 300 ms between events (a short drag is then no flick)
  let t = 0;
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => (t += 300));
  drag(30);
  act(() => vi.advanceTimersByTime(400));
  expect(topText()).toContain('Card a');
  drag(-160);
  act(() => vi.advanceTimersByTime(400));
  expect(topText()).toContain('Card b');
  expect(swipes).toEqual(['Swipe card']);
  document.removeEventListener(GESTURE_EVENT, on);
  clock.mockRestore();
  vi.useRealTimers();
});

test('a vertical move is a scroll, not a drag; one card has no arrows', () => {
  const { unmount } = render(<CardDeck cards={cards} label="Cards" />);
  const el = document.querySelector<HTMLElement>('[data-top]')!;
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: 104, clientY: 160, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: 300, clientY: 170, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: 300, clientY: 170, pointerId: 1 });
  expect(topText()).toContain('Card a');
  unmount();
  render(<CardDeck cards={cards.slice(0, 1)} label="One" />);
  expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
});

test('each card has its own steady small angle (a loose pile, not a neat stack)', () => {
  const angles = ['fact-f1', 'fact-f2', 'say-chope', 'say-tapau'].map((id) => jitter(id));
  expect(new Set(angles.map((a) => a.rot)).size).toBeGreaterThan(1);
  for (const a of angles) expect(Math.abs(a.rot)).toBeLessThanOrEqual(3.5);
  expect(jitter('fact-f1')).toEqual(jitter('fact-f1'));
});
