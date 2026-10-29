import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { explorePersonalStore, openedCardsStore } from '../../data/stores';
import PlacePage from './PlacePage';

function renderAt(path = '/place/sg-chinatown') {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>home page</p>} />
        <Route path="/place/:placeKey" element={<PlacePage />} />
        <Route path="/card/:cardId" element={<p>card page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('Chinatown: its three real cards as sleeves, with N of M cards opened', () => {
  openedCardsStore.set(['sri-mariamman']);
  renderAt();
  expect(screen.getByRole('heading', { level: 1, name: 'Chinatown' })).toBeInTheDocument();
  expect(screen.getByText('Chinatown & Tanjong Pagar')).toBeInTheDocument();
  expect(screen.getByText('1 of 3 cards opened')).toBeInTheDocument();
  const rail = screen.getByRole('listbox');
  expect(within(rail).getAllByRole('option').map((o) => o.getAttribute('aria-label'))).toEqual([
    'Food: Hainanese chicken rice',
    'Monument: Sri Mariamman Temple, opened',
    'Monument: Thian Hock Keng Temple',
  ]);
});

test('starts on the first unopened card; arrows move the rail and the card below follows', async () => {
  openedCardsStore.set(['chicken-rice']);
  renderAt();
  expect(screen.getByRole('heading', { level: 2, name: 'Sri Mariamman Temple' })).toBeInTheDocument();
  expect(screen.getByText('Monument · 2 of 3')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Next card' }));
  expect(screen.getByRole('heading', { level: 2, name: 'Thian Hock Keng Temple' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next card' })).toBeDisabled();
});

test('Open card opens the front card', async () => {
  renderAt();
  await userEvent.click(screen.getByRole('link', { name: /Open card/ }));
  expect(screen.getByText('card page')).toBeInTheDocument();
});

test('Check in marks the front card’s place visited in Nearby, and can be undone by pressing again', async () => {
  renderAt();
  // front card: chicken rice → Tian Tian (the stall that serves it)
  await userEvent.click(screen.getByRole('button', { name: /^Check in at Tian Tian/ }));
  expect(explorePersonalStore.get().places.find((p) => p.placeKey === 'curated:sg-tian-tian-hainanese-chicken-rice')?.visited).toBe(true);
  const pressed = screen.getByRole('button', { name: /^Checked in at Tian Tian/ });
  expect(pressed).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(pressed);
  expect(explorePersonalStore.get().places.some((p) => p.visited)).toBe(false);
});

test('a Nearby place key opens its area; an unknown key says so', () => {
  renderAt('/place/curated%3Asg-thian-hock-keng-temple');
  expect(screen.getByRole('heading', { level: 1, name: 'Chinatown' })).toBeInTheDocument();
});

test('unknown place', () => {
  renderAt('/place/nowhere');
  expect(screen.getByRole('heading', { name: 'Place not found' })).toBeInTheDocument();
});
