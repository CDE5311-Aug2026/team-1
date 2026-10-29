import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { todayKey } from '../../data/progress';
import { streakStore } from '../../data/stores';
import AppHeader from './AppHeader';

function renderHeader(props: Parameters<typeof AppHeader>[0] = {}) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={['/ask']}>
      <Routes>
        <Route path="/" element={<p>Today page</p>} />
        <Route path="/ask" element={<AppHeader {...props} />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('renders greeting and fires onBell', async () => {
  const onBell = vi.fn();
  renderHeader({ onBell });

  expect(screen.getByText('Good Morning, W')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
  expect(onBell).toHaveBeenCalledTimes(1);
});

test('before any learning day the streak shows 1, not a made-up number', () => {
  renderHeader();
  expect(screen.getByLabelText('1 day streak')).toHaveTextContent('1');
});

test('shows the stored streak for today', () => {
  streakStore.set({ date: todayKey(), count: 4 });
  renderHeader();
  expect(screen.getByLabelText('4 day streak')).toBeInTheDocument();
});

test('the mascot goes back to Today', async () => {
  const onHome = vi.fn();
  renderHeader({ onHome });
  await userEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(screen.getByText('Today page')).toBeInTheDocument();
  expect(onHome).toHaveBeenCalledTimes(1);
});

test('greeting={false} drops the greeting but keeps streak, bell and a spacer', () => {
  const { container } = renderHeader({ greeting: false });
  expect(screen.queryByText(/Good Morning/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  expect(screen.getByLabelText('1 day streak')).toBeInTheDocument();
  expect(container.querySelector('[class*="spacer"]')).toBeInTheDocument();
});

test('by default the greeting shows and there is no spacer', () => {
  const { container } = renderHeader();
  expect(screen.getByText('Good Morning, W')).toBeInTheDocument();
  expect(container.querySelector('[class*="spacer"]')).not.toBeInTheDocument();
});

test('logoSrc replaces the mascot image; default keeps the mascot asset', () => {
  const { container, unmount } = renderHeader();
  expect(container.querySelector('img')?.getAttribute('src')).toContain('mascot-logo');
  unmount();
  const { container: c2 } = renderHeader({ logoSrc: '/custom-logo.png' });
  expect(c2.querySelector('img')?.getAttribute('src')).toBe('/custom-logo.png');
});
