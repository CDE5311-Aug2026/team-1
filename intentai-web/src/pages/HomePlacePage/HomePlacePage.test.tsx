import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { patterns, paths } from '../../routes';
import HomePlacePage from './HomePlacePage';

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

test('a place without a photo renders no image', () => {
  renderAt(paths.homePlace('berlin-wall-fragments'));
  expect(screen.getByRole('heading', { level: 1, name: 'Berlin Wall Fragments' })).toBeInTheDocument();
  expect(screen.getByText(/Culture cards are coming soon/)).toBeInTheDocument();
  expect(screen.queryAllByRole('img').filter((i) => i.getAttribute('alt'))).toHaveLength(0);
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
