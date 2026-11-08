import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { challengeJoinedStore } from '../../data/hunt/challenges';
import { resetPersistentStores } from '../../data/persistentStore';
import { explorePersonalStore } from '../../data/stores';
import { huntModeStore } from '../../data/v2Stores';
import ChallengePage from './ChallengePage';

function Where() {
  const { pathname, hash } = useLocation();
  return <p data-testid="where">{pathname + hash}</p>;
}

function open(id = 'wk45-civic') {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[`/hunt/challenge/${id}`]}>
      <Routes>
        <Route path="/hunt/challenge/:challengeId" element={<ChallengePage />} />
        <Route path="/hunt" element={<p>hunt page</p>} />
        <Route path="/nearby/place/:placeKey" element={<p>place page</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetPersistentStores();
});

test('the challenge: its category, dates, its route’s stops (any order) with the story’s names, and a demo label', async () => {
  open();
  expect(screen.getByRole('heading', { level: 1, name: 'Challenge' })).toBeInTheDocument();
  const hero = screen.getByRole('region', { name: 'Civic District' });
  expect(within(hero).getByText('Attractions')).toBeInTheDocument();
  expect(within(hero).getByText(/Sat 7 – Sun 8 Nov · 8 stops/)).toBeInTheDocument();
  expect(screen.getByText(/^Demo challenge/)).toBeInTheDocument();
  expect(screen.getByText('any order · self-reported')).toBeInTheDocument();
  const stops = within(screen.getByRole('region', { name: 'Stops' })).getAllByRole('listitem');
  expect(stops).toHaveLength(8);
  // the names come from the story once it has loaded
  expect(await screen.findByText('Gate of Hope', undefined, { timeout: 10000 })).toBeInTheDocument();
  expect(stops[1]).toHaveAccessibleName(/^Stop 2: The family side of the Old Hill Street Police Station, not stamped yet$/);
  expect(screen.getByText('0/8')).toBeInTheDocument();
  expect(screen.getByRole('timer', { name: 'Your time: Not started' })).toBeInTheDocument();
});

test('Play the story opens the story itself in Hunt (#story/<route>), joined or not', async () => {
  const user = userEvent.setup();
  open();
  expect(screen.getByRole('link', { name: 'Play the story' })).toHaveAttribute('href', '/hunt#story/civic-f1');
  await user.click(screen.getByRole('link', { name: 'Play the story' }));
  expect(screen.getByTestId('where')).toHaveTextContent('/hunt#story/civic-f1');
});

test('Join is kept on this phone (challenge-joined) and turns into the way to the next stop', async () => {
  const user = userEvent.setup();
  const first = open();
  await user.click(screen.getByRole('button', { name: /Join this challenge/ }));
  expect(Object.keys(challengeJoinedStore.get())).toEqual(['wk45-civic']);
  expect(JSON.parse(localStorage.getItem('intentai:v1:challenge-joined')!)['wk45-civic'].joinedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  const go = screen.getByRole('link', { name: /Joined · go to stop 1/ });
  expect(go).toHaveAttribute('href', '/hunt#story/civic-f1');
  first.unmount();
  // still joined after leaving and coming back (a reload reads the same key)
  resetPersistentStores();
  open();
  expect(screen.getByRole('link', { name: /Joined · go to stop 1/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Leave this challenge' }));
  expect(challengeJoinedStore.get()).toEqual({});
  expect(screen.getByRole('button', { name: /Join this challenge/ })).toBeInTheDocument();
});

test('a check-in at a stop’s place stamps it: the count and the stop say so', () => {
  explorePersonalStore.set((d) => ({
    ...d,
    places: [
      {
        placeKey: 'curated:sg-old-hill-street-police-station',
        saved: false,
        visited: true,
        visitedOn: '2026-11-07',
        updatedAt: '2026-11-07T00:00:00.000Z',
      },
    ],
  }));
  open();
  expect(screen.getByText('1/8')).toBeInTheDocument();
  const stops = within(screen.getByRole('region', { name: 'Stops' })).getAllByRole('listitem');
  expect(stops[1]).toHaveAccessibleName(/, stamped$/);
  expect(within(stops[1]).getByText('Stamped Sat 7 Nov')).toBeInTheDocument();
  expect(screen.getByRole('timer', { name: 'Your time: Clock running' })).toBeInTheDocument();
});

test('together mode shows the example hunter counts, labelled; solo shows none', () => {
  huntModeStore.set({ mode: 'together', region: 'central' });
  const t = open();
  expect(screen.getByText('214 joined')).toBeInTheDocument();
  expect(screen.getByText('96 min')).toBeInTheDocument();
  expect(screen.getAllByText('Example').length).toBeGreaterThanOrEqual(2);
  t.unmount();
  huntModeStore.set({ mode: 'solo' });
  open();
  expect(screen.queryByText(/joined$/)).toBeNull();
  expect(screen.queryByText('96 min')).toBeNull();
  expect(screen.queryByText('Example')).toBeNull();
});

test('an unknown challenge says so', () => {
  open('nope');
  expect(screen.getByRole('heading', { name: 'Challenge not found' })).toBeInTheDocument();
});
