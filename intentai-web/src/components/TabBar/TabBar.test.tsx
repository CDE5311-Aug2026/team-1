import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import TabBar from './TabBar';

test('renders all five tab labels and highlights the active one', () => {
  render(<TabBar active="/" onNavigate={vi.fn()} />);
  ['Today', 'Ask', 'Community', 'Moments', 'My Space'].forEach((label) => {
    expect(screen.getByText(label)).toBeInTheDocument();
  });
  expect(screen.getByRole('button', { name: /today/i })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: /^ask$/i })).not.toHaveAttribute('aria-current');
});

test('clicking a tab fires onNavigate with its path', async () => {
  const onNavigate = vi.fn();
  render(<TabBar active="/" onNavigate={onNavigate} />);
  await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));
  expect(onNavigate).toHaveBeenCalledWith('/ask');
});
