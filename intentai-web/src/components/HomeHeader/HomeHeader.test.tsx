import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import { explorePersonalStore } from '../../data/stores';
import type { PlaceKey } from '../../features/nearby/domain';
import { setVisited } from '../../features/nearby/personal';
import HomeHeader from './HomeHeader';

function renderHeader() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeHeader logoSrc="/logo.png" />} />
        <Route path="/my-space" element={<p>passport page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('logo, then the passport chip; no streak, no bell', () => {
  renderHeader();
  expect(screen.getByRole('img', { name: 'FindSG' })).toHaveAttribute('src', '/logo.png');
  expect(screen.getByRole('link', { name: '0 places explored. Open your passport' })).toHaveTextContent('0places');
  expect(screen.queryByRole('link', { name: /streak/ })).toBeNull();
  expect(screen.queryByRole('link', { name: /Notifications/ })).toBeNull();
});

test('the chip counts visited places, once each', () => {
  const visit = (key: string, visited = true) => explorePersonalStore.set(setVisited(explorePersonalStore.get(), key as PlaceKey, visited).data);
  visit('a');
  visit('b');
  visit('b', false);
  visit('a');
  renderHeader();
  expect(screen.getByRole('link', { name: '1 place explored. Open your passport' })).toHaveTextContent('1place');
});

test('the chip opens the passport in Mine', async () => {
  renderHeader();
  await userEvent.click(screen.getByRole('link', { name: /Open your passport/ }));
  expect(screen.getByText('passport page')).toBeInTheDocument();
});
