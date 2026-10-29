import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { DEFAULT_ONBOARDING } from '../../../data/domain';
import { COVER_OPEN_MS, step } from './Welcome';

afterEach(() => {
  vi.useRealTimers();
});

function renderWelcome() {
  const next = vi.fn();
  const { Body } = step;
  const view = render(<Body data={DEFAULT_ONBOARDING} update={() => {}} toast={() => {}} next={next} />);
  return { ...view, next };
}

test('shows the canvas welcome: logo, passport cover, title, teasers, privacy line', () => {
  renderWelcome();
  expect(screen.getByRole('img', { name: 'IntentAI' })).toBeInTheDocument();
  expect(screen.getByText('PASSPORT')).toBeInTheDocument();
  expect(screen.getByText('INTENTAI · SINGAPORE')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to the Singapore Treasure Hunt');
  expect(screen.getByText('Find the food, monuments and festivals around you, and collect a stamp for every place.')).toBeInTheDocument();
  const teasers = within(screen.getByRole('list', { name: 'What you can collect' })).getAllByRole('listitem');
  expect(teasers.map((t) => t.textContent)).toEqual(['Food', 'Monuments', 'Festivals']);
  expect(screen.getByText('Six quick questions · everything stays on this phone')).toBeInTheDocument();
  expect(screen.getByTestId('passport-cover')).toHaveAttribute('data-state', 'closed');
});

test('Start the hunt calls next once, 850 ms after the cover starts opening', () => {
  vi.useFakeTimers();
  const { next } = renderWelcome();
  fireEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  act(() => vi.advanceTimersByTime(COVER_OPEN_MS - 1));
  expect(next).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(next).toHaveBeenCalledTimes(1);
});

test('leaving before the cover opens cancels the pending step', () => {
  vi.useFakeTimers();
  const { next, unmount } = renderWelcome();
  fireEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  unmount();
  act(() => vi.advanceTimersByTime(COVER_OPEN_MS));
  expect(next).not.toHaveBeenCalled();
});

test('welcome is always answered and has no blocked toast', () => {
  expect(step.shell).toBe('none');
  expect(step.answered(DEFAULT_ONBOARDING)).toBe(true);
});
