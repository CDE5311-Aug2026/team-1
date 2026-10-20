import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import { NO_STREAK, todayKey } from '../../data/progress';
import { streakStore } from '../../data/stores';
import HolidayPage from './HolidayPage';

function renderPage() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={['/holidays/deepavali']}>
      <Routes>
        <Route path="/holidays/deepavali" element={<HolidayPage />} />
        <Route path="/" element={<p>today page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('shows meaning and origins: quick facts first, then the deeper read and its source', () => {
  renderPage();

  expect(screen.getByRole('heading', { level: 1, name: 'Deepavali' })).toBeInTheDocument();
  // v2: just the date above the title, like the Today card (no all-caps "Today ·" label).
  expect(screen.getByText('Sat 7 Nov')).toBeInTheDocument();
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual(['Meaning and origins', 'The deeper read']);
  expect(screen.getByText(/means “row of lights”/)).toBeInTheDocument();
  expect(screen.getByText(/Serangoon Road in Little India/)).toBeInTheDocument();
  expect(screen.getByText('Source: National Heritage Board, Roots.gov.sg')).toBeInTheDocument();
});

test('opening the detail records today as a learning day for the streak', () => {
  streakStore.set(NO_STREAK);
  renderPage();
  expect(streakStore.get()).toEqual({ date: todayKey(), count: 1 });
});

test('the back link returns to Today', async () => {
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: 'Back to Today' }));
  expect(screen.getByText('today page')).toBeInTheDocument();
});

test('opens with a photo of the festival, credited with its licence', () => {
  renderPage();
  const photo = screen.getByRole('img', { name: /Deepavali light-up on Serangoon Road/ });
  expect(photo).toHaveAttribute('width', '1280');
  const credit = screen.getByRole('link', { name: 'Photo: Cpgfella · CC BY-SA 4.0 · cropped' });
  expect(credit).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Deepavali_on_Serangoon_Road.jpg');
  expect(credit).toHaveAttribute('target', '_blank');
});
