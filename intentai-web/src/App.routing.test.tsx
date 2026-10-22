import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App';

test('default route shows Today with the greeting title', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
});

test('clicking the Ask tab navigates to the Ask page', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));
  expect(screen.getByRole('heading', { level: 1, name: 'Ask' })).toBeInTheDocument();
});

test('an unknown route redirects to Today instead of rendering blank', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/this-path-does-not-exist']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
});
