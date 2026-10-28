import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import App from './App';
import { resetPersistentStores } from './data/persistentStore';
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

test('a place card route renders that card; an unknown facet renders not found', () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const { unmount } = render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard('chinatown', 'food')]}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Bak kwa, Chinatown’s festive queue' })).toBeInTheDocument();
  unmount();
  render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard('chinatown', 'nope')]}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Place not found' })).toBeInTheDocument();
  vi.restoreAllMocks();
});

test('a place route renders the place page', () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.homePlace('berlin-wall-fragments')]}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Berlin Wall Fragments' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /^Album rail/ })).toBeInTheDocument();
  vi.restoreAllMocks();
});

test('paths.placeCard encodes both segments', () => {
  expect(paths.placeCard('a b', 'food')).toBe('/place/a%20b/food');
  expect(patterns.placeCard).toBe('/place/:placeId/:facet');
});

test('collecting the Berlin history stamp shows it in the Moments "Place stories" row, and it survives a reload', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const first = render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard('berlin-wall-fragments', 'history')]}>
      <App />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Collect stamp' }));
  await userEvent.click(screen.getByRole('link', { name: 'Stamped · see passport' }));
  const row = () => within(screen.getByRole('list', { name: 'Place stories' })).getAllByRole('link');
  expect(row().map((a) => a.textContent)).toEqual([expect.stringMatching(/^Berlin Wall Fragments/)]);
  first.unmount();
  // A reload keeps only localStorage: drop the in-memory store caches and mount the app fresh.
  resetPersistentStores();
  render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.moments]}>
      <App />
    </MemoryRouter>,
  );
  expect(row().map((a) => a.textContent)).toEqual([expect.stringMatching(/^Berlin Wall Fragments/)]);
  vi.restoreAllMocks();
});
