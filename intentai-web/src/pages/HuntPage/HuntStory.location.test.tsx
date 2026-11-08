// Plan B8: nothing gates the remote story engine on location. In its own file: mounting the game fills its in-memory saves.
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getLocationState, requestLocation, resetLocationForTests } from '../../features/nearby/location';
import HuntPage from './HuntPage';

const denied = {
  getCurrentPosition: (_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    fail?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
} as unknown as Geolocation;

const at = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/hunt" element={<HuntPage />} />
      </Routes>
      <Hash />
    </MemoryRouter>,
  );
function Hash() {
  return <output data-testid="hash">{useLocation().hash}</output>;
}

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('findsg-hunt-how-seen', '1');
  vi.stubGlobal('navigator', { ...navigator, geolocation: denied });
  await requestLocation(denied);
  expect(getLocationState().status).toBe('denied');
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetLocationForTests();
  window.location.hash = '';
});

test('#story/<id> opens the story with location denied, in its book', () => {
  window.location.hash = '#story/telok-ayer';
  at('/hunt#story/telok-ayer');
  expect(screen.getAllByText('Letters to the Shore').length).toBeGreaterThan(0);
  expect(within(screen.getByRole('navigation', { name: 'Chapters' })).getByRole('button', { name: 'Play' })).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('list', { name: 'Volumes' })).toBeNull();
});

test('with location denied, the archive shows no distances and Continue still goes into the story', async () => {
  localStorage.setItem('findsg-onsite-mode:balestier', 'preview');
  localStorage.setItem(
    'findsg-onsite-v1:balestier:preview',
    JSON.stringify({ version: 1, routeId: 'balestier', mode: 'preview', started: true, stopIndex: 0, stops: {}, completed: [], inventory: [], endingSeen: false, feedback: '' }),
  );
  at('/hunt');
  const card = screen.getByRole('article', { name: 'Continue' });
  expect(within(card).getByText('Stop 1 of 7')).toBeInTheDocument();
  expect(screen.queryByText(/\d km/)).toBeNull();
  await userEvent.click(within(card).getByRole('button', { name: /Continue/ }));
  // Continue is the same #story/ link as today (the browser's hash is what FindSG follows)
  expect(screen.getByTestId('hash')).toHaveTextContent('#story/balestier');
});
