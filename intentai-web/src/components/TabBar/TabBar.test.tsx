import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import TabBar from './TabBar';

test('renders all four tab labels and highlights the active one', () => {
  render(<TabBar active="/" onNavigate={vi.fn()} />);
  ['Home', 'Moments', 'Hunt', 'Passport'].forEach((label) => {
    expect(screen.getByText(label)).toBeInTheDocument();
  });
  expect(screen.getByRole('button', { name: /^home$/i })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: /^hunt$/i })).not.toHaveAttribute('aria-current');
});

test('clicking a tab fires onNavigate with its path', async () => {
  const onNavigate = vi.fn();
  render(<TabBar active="/" onNavigate={onNavigate} />);
  await userEvent.click(screen.getByRole('button', { name: /^hunt$/i }));
  expect(onNavigate).toHaveBeenCalledWith('/hunt');
});

test('pop animates the active tab only; off by default', () => {
  const { rerender } = render(<TabBar active="/" onNavigate={vi.fn()} />);
  expect(screen.getByRole('button', { name: /^home$/i })).not.toHaveClass('a-pill');
  rerender(<TabBar active="/" onNavigate={vi.fn()} pop />);
  expect(screen.getByRole('button', { name: /^home$/i })).toHaveClass('a-pill');
  expect(screen.getByRole('button', { name: /^hunt$/i })).not.toHaveClass('a-pill');
});

test('the guide rolls up in the corner and unrolls on a tap; Escape rolls it back', async () => {
  render(<TabBar active="/moments" onNavigate={vi.fn()} />);
  const roll = screen.getByRole('button', { name: /Tabs: on Moments/ });
  expect(roll).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(roll);
  expect(screen.getByRole('button', { name: 'Roll up the tabs' })).toHaveAttribute('aria-expanded', 'true');
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('button', { name: /Tabs: on Moments/ })).toHaveAttribute('aria-expanded', 'false');
});

test('user-test version A has no Hunt tab', async () => {
  const { testerStore } = await import('../../data/stores');
  testerStore.set({ name: 'P01', version: 'A' });
  render(<TabBar active="/" onNavigate={vi.fn()} />);
  expect(screen.queryByRole('button', { name: /^hunt$/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^passport$/i })).toBeInTheDocument();
  testerStore.set({ name: '' });
});
