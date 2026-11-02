import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import App from './App';

test('default route shows Home: the regions deck and the holiday event', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Regions' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Deepavali long weekend starts today/ })).toBeInTheDocument();
});

test('the tab bar is Home, Moments, Hunt, Passport; Hunt opens FindSG', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  const tabs = within(screen.getByRole('navigation', { name: 'Primary' })).getAllByRole('button');
  expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['Home', 'Moments', 'Hunt', 'Passport', 'Tabs: on Home. Unroll to switch']);
  await userEvent.click(screen.getByRole('button', { name: /^hunt$/i }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Hunt' })).toBeInTheDocument();
});

test('an unknown route redirects to Home instead of rendering blank', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/this-path-does-not-exist']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeInTheDocument();
    vi.restoreAllMocks();
  },
);
