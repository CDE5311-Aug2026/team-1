import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import { todayKey } from '../../data/progress';
import { streakStore } from '../../data/stores';
import HomeHeader from './HomeHeader';

function renderHeader() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeHeader logoSrc="/logo.png" />} />
        <Route path="/moments" element={<p>moments page</p>} />
        <Route path="/community" element={<p>community page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('logo, then the streak chip and the bell', () => {
  renderHeader();
  expect(screen.getByRole('img', { name: 'IntentAI' })).toHaveAttribute('src', '/logo.png');
  const streak = screen.getByRole('link', { name: '1 day streak. See your rank and badges' });
  expect(streak).toHaveTextContent('day');
  expect(screen.getByRole('link', { name: 'Notifications: Mei answered your question' })).toBeInTheDocument();
});

test('the streak digits roll from the day before to today; the flame flickers', () => {
  streakStore.set({ date: todayKey(), count: 4 });
  renderHeader();
  const streak = screen.getByRole('link', { name: '4 day streak. See your rank and badges' });
  const strip = screen.getByTestId('streak-count').firstElementChild!;
  expect(strip).toHaveClass('roll');
  expect([...strip.children].map((c) => c.textContent)).toEqual(['3', '4']);
  expect(streak.querySelector('svg')).toHaveClass('flick');
});

test('a new user sees 0 rolling to 1, never a negative number', () => {
  renderHeader();
  const strip = screen.getByTestId('streak-count').firstElementChild!;
  expect([...strip.children].map((c) => c.textContent)).toEqual(['0', '1']);
});

test('the streak chip opens Moments', async () => {
  renderHeader();
  await userEvent.click(screen.getByRole('link', { name: /day streak/ }));
  expect(screen.getByText('moments page')).toBeInTheDocument();
});

test('the bell carries a pinging dot and opens Community', async () => {
  renderHeader();
  expect(screen.getByTestId('bell-dot').querySelector('.ping')).not.toBeNull();
  await userEvent.click(screen.getByRole('link', { name: /^Notifications/ }));
  expect(screen.getByText('community page')).toBeInTheDocument();
});
