import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App';
import { paths, patterns } from './routes';

test('default route shows Home with the greeting and the holiday title', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: /^Good morning/ })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
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
  expect(screen.getByRole('heading', { level: 2, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
});

test('a place card route renders the not-found state', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard('chinatown', 'food')]}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Place not found' })).toBeInTheDocument();
});

test('paths.placeCard encodes both segments', () => {
  expect(paths.placeCard('a b', 'food')).toBe('/place/a%20b/food');
  expect(patterns.placeCard).toBe('/place/:placeId/:facet');
});
