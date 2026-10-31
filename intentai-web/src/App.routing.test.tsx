import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import App from './App';

test('default route shows Home with the greeting and the holiday title', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: /^Good morning/ })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
});

test('the tab bar is Home, Moments, Hunt, Mine; Hunt opens its page', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  const tabs = within(screen.getByRole('navigation', { name: 'Primary' })).getAllByRole('button');
  expect(tabs.map((t) => t.textContent)).toEqual(['Home', 'Moments', 'Hunt', 'Mine']);
  await userEvent.click(screen.getByRole('button', { name: /^hunt$/i }));
  expect(screen.getByRole('heading', { level: 1, name: 'Hunt' })).toBeInTheDocument();
});

test('an unknown route redirects to Home instead of rendering blank', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/this-path-does-not-exist']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 2, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
});

test.each(['/ask', '/community', '/community/sabo', '/place/chinatown', '/place/chinatown/food', '/card/laksa', '/nearby/phrases'])(
  'removed page %s redirects to Home (Discovery redesign)',
  (path) => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(
      <MemoryRouter useTransitions={false} initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /^Good morning/ })).toBeInTheDocument();
    vi.restoreAllMocks();
  },
);
