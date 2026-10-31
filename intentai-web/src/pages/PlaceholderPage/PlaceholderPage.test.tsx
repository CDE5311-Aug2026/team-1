import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import PlaceholderPage from './PlaceholderPage';

test('renders the page name and a coming-soon message', () => {
  render(<MemoryRouter useTransitions={false}><PlaceholderPage name="Hunt" icon="tab-hunt" /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Hunt' })).toBeInTheDocument();
  expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
});

test('clicking the bell opens notices', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/hunt']}>
      <Routes>
        <Route path="/hunt" element={<PlaceholderPage name="Hunt" icon="tab-hunt" />} />
        <Route path="/my-space/notices" element={<p>notices page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
  expect(screen.getByText('notices page')).toBeInTheDocument();
});
