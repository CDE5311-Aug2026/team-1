import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { expect, test } from 'vitest';
import { recapStore } from '../../data/moments/recapStore';
import { explorePersonalStore, lookupsStore, openedCardsStore } from '../../data/stores';
import { markVisited } from '../../features/nearby/actions';
import { patterns, paths } from '../../routes';
import MomentsPage from './MomentsPage';

function Probe({ name }: { name: string }) {
  const { state } = useLocation();
  const params = useParams();
  return (
    <p data-testid="probe">
      {name} {params.cardId ?? params.placeKey ?? ''}{' '}
      {(state as { prompt?: string; askLocal?: string } | null)?.prompt ?? (state as { askLocal?: string } | null)?.askLocal ?? ''}
    </p>
  );
}

function renderPage() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.moments]}>
      <Routes>
        <Route path={paths.moments} element={<MomentsPage />} />
        <Route path={paths.nearby} element={<Probe name="nearby" />} />
        <Route path={patterns.nearbyPlace} element={<Probe name="place" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const checkIn = (key: `curated:${string}`, date = '2026-11-02') =>
  explorePersonalStore.set((d) => ({
    ...d,
    places: [...d.places, { placeKey: key, saved: false, visited: true, visitedOn: date, updatedAt: `${date}T00:00:00.000Z` }],
  }));

test('new user: no stamps, no locked areas, and the empty states say what to do', () => {
  lookupsStore.set([]);
  renderPage();
  expect(screen.getByRole('heading', { level: 1, name: 'Moments' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Snap a moment with the camera' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Rank: Visitor\. 3 more cards to Explorer/ })).toBeInTheDocument();
  expect(screen.getByText(/No stamps yet\./)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Check in at a place' })).toHaveAttribute('href', '/');
  expect(screen.queryByRole('button', { name: /no stamp yet/ })).not.toBeInTheDocument();
  expect(screen.getByText('Nothing collected yet')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explore places' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('button', { name: /Recap/ })).toBeDisabled();
});

test('a check-in collects the stamp at once; ink counts the opened cards of that place', () => {
  openedCardsStore.set(['chicken-rice', 'laksa']);
  renderPage();
  act(() => {
    markVisited('curated:sg-thian-hock-keng-temple', 'Thian Hock Keng Temple', true);
  });
  expect(screen.getByRole('button', { name: 'Chinatown, 1 of 3 cards opened. Open this stamp.' })).toBeInTheDocument();
  // Katong has an opened card but no check-in: still an outline
  expect(screen.getByRole('button', { name: 'Katong: no stamp yet. See its cards.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /1 of 100 places checked in/ })).toBeInTheDocument();
});

test('My places follows where you went: on-site Hunt stops, not a fixed list', async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    'findsg-onsite-v1:civic-f1:manual',
    JSON.stringify({ stops: { 'civic-f1-01': { checkin: { mode: 'manual', confirmedAt: '2026-11-02T08:00:00.000Z' } } } }),
  );
  renderPage();
  expect(screen.queryByRole('button', { name: /no stamp yet/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /0 of 100 places checked in, on 100 Places to Explore/ })).toHaveTextContent('0 / 100 places');
  await user.click(screen.getByRole('button', { name: /Marina Bay/ }));
  const sheet = screen.getByRole('dialog', { name: 'Marina Bay' });
  const visit = within(sheet).getByRole('link', { name: /2 Nov 2026/ });
  expect(visit).toHaveAttribute('href', '/hunt#story/civic-f1');
  expect(visit).not.toHaveTextContent('civic-f1-01');
});

test('a Balestier stop stamps Balestier, which has no place on the map', async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    'findsg-onsite-v1:balestier:manual',
    JSON.stringify({ stops: { 'balestier-01': { checkin: { mode: 'manual', confirmedAt: '2026-11-02T08:00:00.000Z' } } } }),
  );
  renderPage();
  await user.click(screen.getByRole('button', { name: /Balestier/ }));
  expect(within(screen.getByRole('dialog', { name: 'Balestier' })).queryByRole('link', { name: 'Show on the map' })).not.toBeInTheDocument();
});

test('an outline stamp, for a place you hold a card from, sends you to Nearby to check in', async () => {
  const user = userEvent.setup();
  openedCardsStore.set(['chicken-rice']);
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Chinatown: no stamp yet. See its cards.' }));
  const sheet = screen.getByRole('dialog', { name: 'Chinatown' });
  expect(within(sheet).getByText(/Not checked in yet/)).toBeInTheDocument();
  expect(within(sheet).getByRole('link', { name: 'Find a place to check in' })).toHaveAttribute('href', '/?lvl=places&r=central&a=ot');
  expect(within(sheet).queryByRole('button', { name: /Add ink/ })).not.toBeInTheDocument();
});

test('a phrase sheet deletes with Undo', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(within(screen.getByRole('article', { name: 'Phrase: chope' })).getAllByRole('button')[0]);
  await user.click(within(screen.getByRole('dialog', { name: 'chope' })).getByRole('button', { name: 'Delete phrase' }));
  expect(lookupsStore.get().map((l) => l.id)).not.toContain('chope');
});

test('rank sheet: rank from opened cards and badges with progress', async () => {
  openedCardsStore.set(['chicken-rice', 'thian-hock-keng', 'temasek-singapura']);
  checkIn('curated:sg-thian-hock-keng-temple');
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: /^Rank: Explorer/ }));
  const sheet = screen.getByRole('dialog', { name: 'Your rank: Explorer' });
  expect(within(sheet).getByText('5 more cards to Insider')).toBeInTheDocument();
  expect(within(sheet).getByRole('listitem', { name: 'First stamp: earned' })).toBeInTheDocument();
  expect(within(sheet).getByRole('listitem', { name: 'Historian: earned' })).toBeInTheDocument();
  expect(within(sheet).getByRole('listitem', { name: /^Two districts: 1 of 2/ })).toBeInTheDocument();
  expect(within(sheet).getByRole('listitem', { name: /^Full set: 2 of 3/ })).toBeInTheDocument();
});

test('recap: sort the facts, then a score; results are stored', async () => {
  const user = userEvent.setup();
  renderPage();
  expect(screen.getByText('3 facts · about 1 min')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Recap/ }));
  const recap = screen.getByRole('dialog', { name: 'Recap' });
  await user.click(within(recap).getByRole('button', { name: 'Show the answer' }));
  await user.click(within(recap).getByRole('button', { name: 'I knew it' }));
  await user.click(within(recap).getByRole('button', { name: 'See it again' }));
  await user.click(within(recap).getByRole('button', { name: 'I knew it' }));
  expect(within(recap).getByRole('heading', { name: 'You knew 2 of 3' })).toBeInTheDocument();
  expect(Object.values(recapStore.get().results).sort()).toEqual(['again', 'knew', 'knew']);
  expect(recapStore.get().last).toMatchObject({ knew: 2, total: 3 });
});
