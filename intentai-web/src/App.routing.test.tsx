import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, expect, test, vi } from 'vitest';
import App from './App';

// The map (its badges and pins) is a lazy chunk: load it once up front, so a slow first import under a full run does
// not eat a test's time; the map's buttons are still awaited (findBy) as they draw after Home.
const MAP = { timeout: 4000 };
beforeAll(async () => {
  await import('./components/Discovery/MapCard3D');
});

test('default route shows Home: the regions on the map, no holiday card', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Regions' })).toBeInTheDocument();
  expect(await screen.findAllByRole('button', { name: /^Region \d: / }, MAP)).toHaveLength(5);
  expect(screen.queryByRole('button', { name: /Deepavali long weekend/ })).not.toBeInTheDocument();
});

test('the v2 tab bar is Home, Hunt, Passport plus Search; Hunt opens FindSG', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  const tabs = within(screen.getByRole('navigation', { name: 'Primary' })).getAllByRole('button');
  expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['Home', 'Hunt', 'Passport', 'Search']);
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
