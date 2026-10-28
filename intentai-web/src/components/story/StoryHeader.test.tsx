import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { StoryHeader } from './StoryHeader';

test('renders the kicker, a blur-word heading and the optional subtitle', () => {
  render(
    <StoryHeader
      kicker="MONUMENT · BERLIN WALL FRAGMENTS"
      icon="monument"
      title={['Two slabs of the', 'Berlin Wall, in a', 'UTown garden']}
      subtitle="Café bistro · NUS Business School"
    />,
  );
  expect(screen.getByText('MONUMENT · BERLIN WALL FRAGMENTS')).toBeInTheDocument();
  const h1 = screen.getByRole('heading', { level: 1, name: 'Two slabs of the Berlin Wall, in a UTown garden' });
  const words = h1.querySelectorAll('.a-blur');
  expect(words).toHaveLength(3);
  expect(Array.from(words).map((w) => (w as HTMLElement).style.animationDelay)).toEqual(['0.05s', '0.15s', '0.25s']);
  expect(screen.getByText('Café bistro · NUS Business School')).toBeInTheDocument();
});

test('focuses the h1 on mount (route entry), without making it a tab stop', () => {
  render(<StoryHeader kicker="HISTORY · CHINATOWN" icon="history" title={['From the 1822', 'town plan', 'to today']} />);
  const h1 = screen.getByRole('heading', { level: 1 });
  expect(h1).toHaveAttribute('tabindex', '-1');
  expect(h1).toHaveFocus();
});

test('no subtitle paragraph when none is given', () => {
  const { container } = render(<StoryHeader kicker="FESTIVAL · CHINATOWN" icon="festival" title={['Lunar', 'New Year']} />);
  expect(container.querySelectorAll('header p')).toHaveLength(1);
});

test('focusing the h1 does not scroll (the page owns scroll position)', () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus');
  render(<StoryHeader kicker="FOOD · CHINATOWN" icon="food" title={['Bak kwa,']} />);
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  focus.mockRestore();
});
