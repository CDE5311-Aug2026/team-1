import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DEFAULT_SETTINGS } from '../../data/domain';
import { culturePrefsStore, explorePersonalStore, placeStore, settingsStore } from '../../data/stores';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import TodayPage from './TodayPage';

function renderWithRoutes() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/holidays/deepavali" element={<p>holiday page</p>} />
        <Route path="/nearby" element={<p>nearby page</p>} />
        <Route path="/my-space/notices" element={<p>notices page</p>} />
        <Route path="/place/:placeKey" element={<p>place page</p>} />
        <Route path="/nearby/place/:placeKey" element={<p>nearby place page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('greets by time of day and shows the date line', () => {
  renderWithRoutes();
  expect(screen.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), W$/ })).toBeInTheDocument();
  expect(screen.getByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]{2}$/)).toBeInTheDocument();
});

test('the occasion banner shows today’s holiday from the repo, and Learn more opens it', async () => {
  renderWithRoutes();
  expect(screen.getByRole('heading', { level: 2, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
  // its place in Nearby: Little India, from the holiday's own text
  expect(screen.getByRole('link', { name: /^In Nearby · Little India/ })).toHaveAttribute('href', '/place/sg-little-india');
  await userEvent.click(screen.getByRole('button', { name: 'Learn more' }));
  expect(screen.getByText('holiday page')).toBeInTheDocument();
});

test('Nearby: one card per published place, with check-in state from Nearby', () => {
  explorePersonalStore.set((d) => ({
    ...d,
    places: [{ placeKey: 'curated:sg-thian-hock-keng-temple', saved: false, visited: true, visitedOn: '2026-10-20', updatedAt: '2026-10-20T10:00:00Z' }],
  }));
  renderWithRoutes();
  const strip = screen.getByRole('list', { name: '173 places nearby' });
  expect(within(strip).getAllByRole('listitem')).toHaveLength(173);
  // the designed places (with a culture-card photo) come first
  expect(within(strip).getAllByRole('button')[0]).toHaveAccessibleName(/Open in Nearby$/);
  expect(within(strip).getByRole('button', { name: /^Thian Hock Keng Temple, Landmark, checked in/ })).toBeInTheDocument();
  expect(screen.getByText(/places to explore/)).toHaveTextContent('173 places to explore');
});

test('a card opens that place in Nearby', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /^Thian Hock Keng Temple, / }));
  expect(screen.getByText('nearby place page')).toBeInTheDocument();
});

// Nearby PRD §6: Near you opens Nearby Explore with location on or off.
test('Near you opens Nearby Explore while location is off (the default)', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /near you/i }));
  expect(screen.getByText('nearby page')).toBeInTheDocument();
});

test('Near you opens Nearby Explore when location is on', async () => {
  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /near you/i }));
  expect(screen.getByText('nearby page')).toBeInTheDocument();
});

test('Near you names the place picked on the Nearby place list', () => {
  placeStore.set('Office');
  renderWithRoutes();
  expect(screen.getByRole('button', { name: /near you/i })).toHaveTextContent('Office');
});

test('the bell opens notices', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
  expect(screen.getByText('notices page')).toBeInTheDocument();
});

test('the culture tabs stay on Home, in survey rank order, with no Singlish lesson', () => {
  culturePrefsStore.set({ categories: ['history', 'unesco', 'ich'] });
  renderWithRoutes();
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['UNESCO', 'Heritage', 'History']);
  expect(screen.getByRole('article', { name: 'Hawker culture' })).toBeInTheDocument();
  expect(screen.queryByText("Today's three expressions, Can or cannot learn?")).not.toBeInTheDocument();
});

test('default culture tabs are the survey top three', () => {
  renderWithRoutes();
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Foods', 'Monuments', 'Festivals']);
});
