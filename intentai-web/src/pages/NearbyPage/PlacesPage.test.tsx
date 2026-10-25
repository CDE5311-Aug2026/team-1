import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { DEFAULT_SETTINGS, PLACES } from '../../data/domain';
import { placeStore, settingsStore } from '../../data/stores';
import AppShell from '../../components/AppShell/AppShell';
import PlacesPage from './PlacesPage';

function renderPlaces() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={['/nearby/places']}>
      <Routes>
        <Route path="/nearby/places" element={<PlacesPage />} />
        <Route path="/nearby" element={<AppShell><p>nearby page</p></AppShell>} />
        <Route path="/nearby/phrases" element={<AppShell><p>phrases page</p></AppShell>} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockGeolocation(geolocation: Partial<Geolocation> | undefined) {
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true });
}

afterEach(() => {
  mockGeolocation(undefined);
});

test('lists the nine places with their phrase counts; the stored place is selected', () => {
  renderPlaces();

  expect(screen.getByRole('heading', { level: 1, name: 'Where are you?' })).toBeInTheDocument();
  expect(screen.getByText('Pick a place, and we’ll show what people say there.')).toBeInTheDocument();
  for (const place of PLACES) {
    expect(screen.getByRole('button', { name: new RegExp(`^${place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })).toBeInTheDocument();
  }
  expect(screen.getByRole('button', { name: /^Hawker centre/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^Office/ })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'Show 6 phrases for Hawker centre' })).toBeInTheDocument();
  expect(screen.getByText('Chope, tapau, kosong and 3 more')).toBeInTheDocument();
});

test('picking a place selects it, stores it and updates the Show button', async () => {
  renderPlaces();

  await userEvent.click(screen.getByRole('button', { name: /^Office/ }));
  expect(screen.getByRole('button', { name: /^Office/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^Hawker centre/ })).toHaveAttribute('aria-pressed', 'false');
  expect(placeStore.get()).toBe('Office');
  expect(screen.getByRole('button', { name: 'Show 4 phrases for Office' })).toBeInTheDocument();
  expect(screen.getByText('Can or not?, paiseh, chope and 1 more')).toBeInTheDocument();
});

test('Show phrases opens the heads-up phrase screen', async () => {
  renderPlaces();

  await userEvent.click(screen.getByRole('button', { name: /^Show \d+ phrases for/ }));
  expect(screen.getByText('phrases page')).toBeInTheDocument();
});

test('Back opens Nearby', async () => {
  renderPlaces();

  await userEvent.click(screen.getByRole('button', { name: 'Back to Nearby' }));
  expect(screen.getByText('nearby page')).toBeInTheDocument();
});

test('"Use my location" is off by default, with honest copy', () => {
  renderPlaces();

  expect(screen.getByRole('switch', { name: 'Use my location' })).toHaveAttribute('aria-checked', 'false');
  expect(screen.getByText('Only on this device, off by default')).toBeInTheDocument();
});

const SG_FIX = { coords: { latitude: 1.2804, longitude: 103.8448, accuracy: 20 }, timestamp: 1 } as unknown as GeolocationPosition;

test('turning location on explains first, then asks the browser once and stays on when found', async () => {
  const getCurrentPosition = vi.fn((success: PositionCallback, _error?: PositionErrorCallback | null, _options?: PositionOptions) => success(SG_FIX));
  mockGeolocation({ getCurrentPosition });
  renderPlaces();

  await userEvent.click(screen.getByRole('switch', { name: 'Use my location' }));
  // Nothing is requested before the explanation is accepted.
  expect(getCurrentPosition).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'Use your location?' })).toHaveTextContent(/not sent to any server/);
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(getCurrentPosition.mock.calls[0][2]).toEqual(expect.objectContaining({ timeout: 10000, maximumAge: 60000 }));
  expect(await screen.findByRole('switch', { name: 'Use my location' })).toHaveAttribute('aria-checked', 'true');
  expect(settingsStore.get().location).toBe(true);
  // The position itself is never stored.
  expect(JSON.stringify({ ...window.localStorage })).not.toContain('103.84');
});

test('location stays off with a message when permission is refused', async () => {
  mockGeolocation({
    getCurrentPosition: (_success: PositionCallback, error?: PositionErrorCallback | null) =>
      error?.({ code: 1 } as GeolocationPositionError),
  });
  renderPlaces();

  await userEvent.click(screen.getByRole('switch', { name: 'Use my location' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('switch', { name: 'Use my location' })).toHaveAttribute('aria-checked', 'false');
  expect(settingsStore.get().location).toBe(false);
  expect(await screen.findByRole('status')).toHaveTextContent(/Location permission is off/);
});

test('location stays off with a message when the browser has no geolocation', async () => {
  mockGeolocation(undefined);
  renderPlaces();

  await userEvent.click(screen.getByRole('switch', { name: 'Use my location' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('switch', { name: 'Use my location' })).toHaveAttribute('aria-checked', 'false');
  expect(await screen.findByRole('status')).toHaveTextContent(/cannot share a location/);
});

test('turning location off does not ask the browser', async () => {
  const getCurrentPosition = vi.fn();
  mockGeolocation({ getCurrentPosition });
  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  renderPlaces();

  await userEvent.click(screen.getByRole('switch', { name: 'Use my location' }));
  expect(getCurrentPosition).not.toHaveBeenCalled();
  expect(settingsStore.get().location).toBe(false);
});
