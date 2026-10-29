import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App';

test('default route shows Home with the greeting title', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), W$/ })).toBeInTheDocument();
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

test('an unknown route redirects to Home instead of rendering blank', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/this-path-does-not-exist']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), W$/ })).toBeInTheDocument();
});
