import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import TabBar from './TabBar';

test('renders the three v2 tabs and highlights the active one', () => {
  render(<TabBar active="/" onNavigate={vi.fn()} />);
  ['Home', 'Hunt', 'Passport'].forEach((label) => {
    expect(screen.getByText(label)).toBeInTheDocument();
  });
  expect(screen.queryByText('Moments')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^home$/i })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: /^hunt$/i })).not.toHaveAttribute('aria-current');
});

test('clicking a tab fires onNavigate with its path', async () => {
  const onNavigate = vi.fn();
  render(<TabBar active="/" onNavigate={onNavigate} />);
  await userEvent.click(screen.getByRole('button', { name: /^hunt$/i }));
  expect(onNavigate).toHaveBeenCalledWith('/hunt');
});

test('the round Search button opens search and lights when on it', async () => {
  const onNavigate = vi.fn();
  const { rerender } = render(<TabBar active="/" onNavigate={onNavigate} />);
  await userEvent.click(screen.getByRole('button', { name: /^search$/i }));
  expect(onNavigate).toHaveBeenCalledWith('/search');
  rerender(<TabBar active="/search" onNavigate={onNavigate} />);
  expect(screen.getByRole('button', { name: /^search$/i })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: /^home$/i })).not.toHaveAttribute('aria-current');
});

test('pop animates the active tab only; off by default', () => {
  const { rerender } = render(<TabBar active="/" onNavigate={vi.fn()} />);
  expect(screen.getByRole('button', { name: /^home$/i })).not.toHaveClass('a-pill');
  rerender(<TabBar active="/" onNavigate={vi.fn()} pop />);
  expect(screen.getByRole('button', { name: /^home$/i })).toHaveClass('a-pill');
  expect(screen.getByRole('button', { name: /^hunt$/i })).not.toHaveClass('a-pill');
});

test('three tabs plus Search are always there, one tap away', () => {
  render(<TabBar active="/my-space" onNavigate={vi.fn()} />);
  expect(screen.getAllByRole('button')).toHaveLength(4);
  expect(screen.getByRole('button', { name: /^passport$/i })).toHaveAttribute('aria-current', 'page');
});
