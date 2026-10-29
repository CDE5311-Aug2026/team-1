import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { placeState } from '../../data/placeStories';
import { placeStoriesStore, setStamped } from '../../data/stores';
import { paths, patterns } from '../../routes';
import { CollectCard } from './CollectCard';

const NOTE = {
  before: 'Check in at the panels to add this place to your passport.',
  after: 'Berlin Wall Fragments is in your passport in Moments.',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 28, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function Probe() {
  const location = useLocation();
  return <p data-testid="at">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}

function renderCard(onCollect = vi.fn()) {
  render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard('berlin-wall-fragments', 'history')]}>
      <Routes>
        <Route
          path={patterns.placeCard}
          element={
            <CollectCard
              placeId="berlin-wall-fragments"
              title="That’s all 4 cards here"
              note={NOTE}
              stampIcon="monument"
              secondary={{ label: 'Back to place', to: paths.homePlace('berlin-wall-fragments'), state: { railIndex: 3 }, replace: true }}
              onCollect={onCollect}
            />
          }
        />
        <Route path={patterns.homePlace} element={<Probe />} />
        <Route path={paths.moments} element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
  return onCollect;
}

test('before collecting: title, note, Collect stamp button and the secondary link', () => {
  renderCard();
  const section = screen.getByRole('region', { name: 'Collection complete' });
  expect(section).toHaveTextContent('That’s all 4 cards here');
  expect(section).toHaveTextContent(NOTE.before);
  expect(screen.getByRole('button', { name: 'Collect stamp' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to place' })).toBeInTheDocument();
});

test('collect stamps the place, calls onCollect, bursts aria-hidden sparks and focuses the passport link', () => {
  const onCollect = renderCard();
  fireEvent.click(screen.getByRole('button', { name: 'Collect stamp' }));
  expect(onCollect).toHaveBeenCalledTimes(1);
  expect(placeState(placeStoriesStore.get(), 'berlin-wall-fragments')).toMatchObject({ stamped: true, stampedOn: '2026-10-28' });

  const link = screen.getByRole('link', { name: 'Stamped · see passport' });
  expect(link).toHaveAttribute('href', paths.moments);
  expect(link).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Collect stamp' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Collection complete' })).toHaveTextContent(NOTE.after);

  const sparks = document.querySelectorAll('.spark');
  expect(sparks).toHaveLength(8);
  sparks.forEach((s) => expect(s.closest('[aria-hidden="true"]')).not.toBeNull());
  act(() => vi.advanceTimersByTime(700));
  expect(document.querySelectorAll('.spark')).toHaveLength(0);
});

test('an already stamped place shows the passport link straight away', () => {
  setStamped('berlin-wall-fragments', '2026-10-01');
  renderCard();
  expect(screen.getByRole('link', { name: 'Stamped · see passport' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Collect stamp' })).not.toBeInTheDocument();
  expect(document.querySelectorAll('.spark')).toHaveLength(0);
});

test('the secondary link carries its router state', () => {
  renderCard();
  fireEvent.click(screen.getByRole('link', { name: 'Back to place' }));
  expect(screen.getByTestId('at')).toHaveTextContent(`${paths.homePlace('berlin-wall-fragments')} {"railIndex":3}`);
});

test('the passport link goes to Moments', () => {
  setStamped('berlin-wall-fragments', '2026-10-01');
  renderCard();
  fireEvent.click(screen.getByRole('link', { name: 'Stamped · see passport' }));
  expect(screen.getByTestId('at')).toHaveTextContent(paths.moments);
});
