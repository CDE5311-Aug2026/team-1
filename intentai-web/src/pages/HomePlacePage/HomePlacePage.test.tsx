import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { patterns, paths } from '../../routes';
import { homePlace } from '../../data/homePlaces';
import HomePlacePage from './HomePlacePage';

// Every real place has a photo now, so the no-photo branch needs a stubbed place.
const mockHomePlace = vi.hoisted(() => ({ override: undefined as unknown }));
vi.mock('../../data/homePlaces', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/homePlaces')>();
  return {
    ...actual,
    homePlace: (id: string) => (mockHomePlace.override as ReturnType<typeof actual.homePlace>) ?? actual.homePlace(id),
  };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path={patterns.homePlace} element={<HomePlacePage />} />
        <Route path={paths.today} element={<p>today page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('builds an encoded place path', () => {
  expect(paths.homePlace('a b')).toBe('/place/a%20b');
});

test('a place with a photo shows it with alt text and credit', () => {
  renderAt(paths.homePlace('chinatown'));
  expect(screen.getByRole('heading', { level: 1, name: 'Chinatown' })).toBeInTheDocument();
  expect(
    screen.getByRole('img', { name: 'Pagoda Street shophouses in Chinatown, Singapore, with lanterns and shoppers' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Marcin Konsek, CC BY-SA 4\.0, via Wikimedia Commons/)).toBeInTheDocument();
  expect(screen.getByText(/Culture cards are coming soon/)).toBeInTheDocument();
});

test('Berlin Wall Fragments shows its photo with alt text and credit', () => {
  renderAt(paths.homePlace('berlin-wall-fragments'));
  expect(screen.getByRole('heading', { level: 1, name: 'Berlin Wall Fragments' })).toBeInTheDocument();
  expect(
    screen.getByRole('img', { name: 'Two painted Berlin Wall panels in a garden at NUS University Town' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Photo supplied by the IntentAI team')).toBeInTheDocument();
});

test('a place without a photo renders no image', () => {
  const base = homePlace('berlin-wall-fragments')!;
  mockHomePlace.override = { ...base, name: 'Stub Place', photo: undefined, photoAlt: '', credit: '' };
  try {
    renderAt(paths.homePlace('stub'));
    expect(screen.getByRole('heading', { level: 1, name: 'Stub Place' })).toBeInTheDocument();
    expect(screen.getByText(/Culture cards are coming soon/)).toBeInTheDocument();
    expect(screen.queryAllByRole('img').filter((i) => i.getAttribute('alt'))).toHaveLength(0);
  } finally {
    mockHomePlace.override = undefined;
  }
});

test('Back to Home returns to Today', async () => {
  renderAt(paths.homePlace('berlin-wall-fragments'));
  await userEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
  expect(screen.getByText('today page')).toBeInTheDocument();
});

test('an unknown place shows not found with a way back', async () => {
  renderAt(paths.homePlace('nope'));
  expect(screen.getByRole('heading', { level: 1, name: 'Place not found' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
  expect(screen.getByText('today page')).toBeInTheDocument();
});
