import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App';

test('renders without error with a main content region and the primary nav present', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
});
