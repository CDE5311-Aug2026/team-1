import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import homeLogo from '../../assets/home/logo.png';
import type { HomeMapProps } from '../../components/HomeMap/HomeMap';
import { testerStore } from '../../data/stores';
import TodayPage from './TodayPage';

// Stub for the lazily loaded Leaflet map: pins as buttons.
vi.mock('../../components/HomeMap/HomeMap', () => ({
  default: function HomeMapStub({ pins, onPinActivate }: HomeMapProps) {
    return (
      <div data-testid="map">
        {pins.map((p) => (
          <button key={p.id} type="button" aria-label={p.name} onClick={() => onPinActivate(p.id)} />
        ))}
      </div>
    );
  },
}));

function PlacePath() {
  return <p>place page {useLocation().pathname}</p>;
}

function CardPath() {
  return <p>card page {useLocation().pathname}</p>;
}

function renderWithRoutes() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/holidays/deepavali" element={<p>holiday page</p>} />
        <Route path="/place/:placeId" element={<PlacePath />} />
        <Route path="/place/:placeId/:facet" element={<CardPath />} />
        <Route path="/nearby" element={<p>nearby page</p>} />
        <Route path="/my-space/notices" element={<p>notices page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('the header shows the Home logo, not the default mascot', () => {
  const { container } = renderWithRoutes();
  const logo = container.querySelector('header img');
  expect(logo).toHaveAttribute('src', homeLogo);
});

test('greets the tester by name in the page h1', () => {
  testerStore.set({ name: 'W' });
  renderWithRoutes();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning, W');
});

test('the hero title button opens the holiday page', async () => {
  renderWithRoutes();
  expect(screen.getByRole('heading', { level: 2, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Deepavali long weekend starts today' }));
  expect(screen.getByText('holiday page')).toBeInTheDocument();
});

test('the anniversary row opens the Fall of the Wall festival card', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /The Berlin Wall fell 37 years ago/ }));
  expect(screen.getByText('card page /place/berlin-wall-fragments/festival')).toBeInTheDocument();
});

test('the culture tabs are gone', () => {
  renderWithRoutes();
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
});

test('shows the Nearby section; Open on Berlin opens its place page', async () => {
  renderWithRoutes();
  expect(screen.getByRole('heading', { level: 2, name: 'Nearby' })).toBeInTheDocument();
  const berlin = screen.getByRole('group', { name: 'Berlin Wall Fragments' });
  await userEvent.click(within(berlin).getByRole('button', { name: /^Open/ }));
  expect(screen.getByText('place page /place/berlin-wall-fragments')).toBeInTheDocument();
});

test('the Near you pill opens Nearby Explore', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /^Near you/ }));
  expect(screen.getByText('nearby page')).toBeInTheDocument();
});

test('the bell opens notices', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
  expect(screen.getByText('notices page')).toBeInTheDocument();
});
