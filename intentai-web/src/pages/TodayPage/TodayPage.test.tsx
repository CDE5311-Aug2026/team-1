import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DEFAULT_SETTINGS } from '../../data/domain';
import { culturePrefsStore, placeStore, settingsStore } from '../../data/stores';
import { render, screen } from '@testing-library/react';
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
        <Route path="/nearby/places" element={<p>places page</p>} />
        <Route path="/my-space/notices" element={<p>notices page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('renders the holiday card and the survey top three as culture tabs, with no Singlish lesson', () => {
  renderWithRoutes();

  expect(screen.getByRole('heading', { level: 1, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Foods', 'Monuments', 'Festivals']);
  expect(screen.queryByText("Today's three expressions, Can or cannot learn?")).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/learned today/)).not.toBeInTheDocument();
});

test('Learn more opens the holiday detail', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: 'Learn more' }));
  expect(screen.getByText('holiday page')).toBeInTheDocument();
});

test('Near you asks for a place while location is off (the default)', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /near you/i }));
  expect(screen.getByText('places page')).toBeInTheDocument();
});

test('Near you opens Nearby directly when location is on', async () => {
  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /near you/i }));
  expect(screen.getByText('nearby page')).toBeInTheDocument();
});

test('the bell opens notices', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
  expect(screen.getByText('notices page')).toBeInTheDocument();
});

test('Near you names the place picked on the Nearby place list', () => {
  placeStore.set('Office');
  renderWithRoutes();
  expect(screen.getByRole('button', { name: /near you/i })).toHaveTextContent('Office');
});

test('the culture tabs follow the saved questionnaire picks in survey rank order', () => {
  culturePrefsStore.set({ categories: ['history', 'unesco', 'ich'] });
  renderWithRoutes();

  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['UNESCO', 'Heritage', 'History']);
  expect(screen.getByRole('button', { name: /^Play video:/ })).toBeInTheDocument();
});
