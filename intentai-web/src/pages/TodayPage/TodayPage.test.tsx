import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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

/** A page away from Home, with a browser-style Back. */
function Away({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <>
      <p>
        {label} {useLocation().pathname}
      </p>
      <button type="button" onClick={() => navigate(-1)}>
        browser back
      </button>
    </>
  );
}

function GoHome({ state }: { state: unknown }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/', { state })}>
      go home
    </button>
  );
}

function renderWithRoutes(initialEntries: Parameters<typeof MemoryRouter>[0]['initialEntries'] = ['/']) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/holidays/deepavali" element={<p>holiday page</p>} />
        <Route path="/place/:placeId" element={<Away label="place page" />} />
        <Route path="/place/:placeId/:facet" element={<Away label="card page" />} />
        <Route path="/moments" element={<p>moments page</p>} />
        <Route path="/nearby" element={<p>nearby page</p>} />
        <Route path="/community" element={<p>community page</p>} />
        <Route path="/elsewhere" element={<GoHome state={{ focusPlace: 'chinatown' }} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const card = (name: string) => screen.getByRole('group', { name });

test('the header shows the Home logo, not the default mascot', () => {
  const { container } = renderWithRoutes();
  const logo = container.querySelector('header img');
  expect(logo).toHaveAttribute('src', homeLogo);
  expect(logo).toHaveAttribute('alt', 'IntentAI');
});

test('greets the tester by name in the page h1', () => {
  testerStore.set({ name: 'W' });
  renderWithRoutes();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning, W');
});

test('the streak chip opens Moments', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('link', { name: '1-day streak. See your rank and badges' }));
  expect(screen.getByText('moments page')).toBeInTheDocument();
});

test('the bell opens Community', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('link', { name: 'Notifications: Mei answered your question' }));
  expect(screen.getByText('community page')).toBeInTheDocument();
});

test('the Home tab pops in', () => {
  renderWithRoutes();
  const home = within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', { name: 'Home' });
  expect(home).toHaveAttribute('aria-current', 'page');
  expect(home).toHaveClass('a-pill');
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
  await userEvent.click(within(card('Berlin Wall Fragments')).getByRole('button', { name: /^Open/ }));
  expect(screen.getByText('place page /place/berlin-wall-fragments')).toBeInTheDocument();
});

test('Open on Chinatown, then browser Back: Home shows the Chinatown card again', async () => {
  const user = userEvent.setup();
  renderWithRoutes();
  await user.click(card('Chinatown'));
  await user.click(within(card('Chinatown')).getByRole('button', { name: /^Open/ }));
  expect(screen.getByText('place page /place/chinatown')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'browser back' }));
  expect(card('Chinatown')).toHaveAttribute('aria-current', 'true');
});

test('the places to explore chip opens Nearby Explore', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: '4 places to explore' }));
  expect(screen.getByText('nearby page')).toBeInTheDocument();
});

test('router state focusPlace selects that card on arrival', () => {
  renderWithRoutes([{ pathname: '/', state: { focusPlace: 'chinatown' } }]);
  expect(card('Chinatown')).toHaveAttribute('aria-current', 'true');
});

test('unknown or malformed focusPlace keeps the default Berlin card', () => {
  renderWithRoutes([{ pathname: '/', state: { focusPlace: 42 } }]);
  expect(card('Berlin Wall Fragments')).toHaveAttribute('aria-current', 'true');
});

test('a new visit to Home scrolls to the top and focuses the h1; the first load does not', async () => {
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  renderWithRoutes(['/elsewhere']);
  await userEvent.click(screen.getByRole('button', { name: 'go home' }));
  expect(scroll).toHaveBeenCalledWith(0, 0);
  expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  expect(card('Chinatown')).toHaveAttribute('aria-current', 'true');
  scroll.mockClear();

  // Back from a place page (POP) keeps the scroll position.
  await userEvent.click(within(card('Chinatown')).getByRole('button', { name: /^Open/ }));
  await userEvent.click(screen.getByRole('button', { name: 'browser back' }));
  expect(card('Chinatown')).toHaveAttribute('aria-current', 'true');
  expect(scroll).not.toHaveBeenCalled();
  scroll.mockRestore();
});
