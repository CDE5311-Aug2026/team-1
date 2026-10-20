import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import { DEFAULT_SETTINGS } from '../../data/domain';
import { lookupsStore, placeStore, settingsStore } from '../../data/stores';
import AppShell from '../../components/AppShell/AppShell';
import NearbyPage from './NearbyPage';

function renderNearby() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={['/nearby']}>
      <Routes>
        <Route path="/nearby" element={<NearbyPage />} />
        <Route path="/nearby/places" element={<AppShell><p>places page</p></AppShell>} />
        <Route path="/ask" element={<AppShell><p>ask page</p></AppShell>} />
        <Route path="/" element={<p>today page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('shows the Figma heads-up for the default place: Chope at the hawker centre, plus two more', () => {
  renderNearby();

  expect(screen.getByRole('heading', { level: 1, name: 'Nearby' })).toBeInTheDocument();
  expect(screen.getByText('Old Airport Rd Food Centre')).toBeInTheDocument();
  const card = screen.getByRole('region', { name: 'Chope' });
  expect(within(card).getByText('Hawker centre · lunch')).toBeInTheDocument();
  expect(within(card).getByText('/chohp/')).toBeInTheDocument();
  expect(within(card).getByText('Save a seat, often with a tissue packet on the table.')).toBeInTheDocument();
  expect(within(card).getByText('Tissue packet on a table = seat taken. Look for an empty table instead.')).toBeInTheDocument();

  const also = screen.getByRole('region', { name: /also heard here/i });
  expect(within(also).getAllByRole('listitem').map((item) => item.querySelector('h3')?.textContent)).toEqual(['Tapau', 'Kosong']);
});

test('location is off by default: the chip says Manual place and no distance is shown', () => {
  renderNearby();

  expect(screen.getByRole('button', { name: 'Manual place' })).toBeInTheDocument();
  expect(screen.queryByText('· 120 m')).not.toBeInTheDocument();
});

test('even with location on, this illustrated phrase screen shows no position and no fake distance', () => {
  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  renderNearby();

  expect(screen.getByRole('button', { name: 'Manual place' })).toBeInTheDocument();
  expect(screen.queryByText(/\d+ m$/)).not.toBeInTheDocument();
  expect(screen.queryByText('Location on')).not.toBeInTheDocument();
});

test('the phrase follows the chosen place', () => {
  placeStore.set('Office');
  renderNearby();

  expect(screen.getAllByText('Office').length).toBeGreaterThan(0);
  expect(screen.getByRole('region', { name: 'Can or not?' })).toBeInTheDocument();
  const also = screen.getByRole('region', { name: /also heard here/i });
  expect(within(also).getByText('Paiseh')).toBeInTheDocument();
});

test('transport places lead with Paiseh', () => {
  placeStore.set('MRT · bus');
  renderNearby();

  expect(screen.getByRole('region', { name: 'Paiseh' })).toBeInTheDocument();
});

test('Change opens the place list', async () => {
  renderNearby();

  await userEvent.click(screen.getByRole('button', { name: 'Change' }));
  expect(screen.getByText('places page')).toBeInTheDocument();
});

test('the location chip opens the place list (where the location switch lives)', async () => {
  renderNearby();

  await userEvent.click(screen.getByRole('button', { name: 'Manual place' }));
  expect(screen.getByText('places page')).toBeInTheDocument();
});

test('Got it saves the phrase to Moments with a toast, and Undo removes it again', async () => {
  lookupsStore.set([]);
  renderNearby();

  await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
  expect(screen.getByRole('status')).toHaveTextContent('Chope saved to Moments');
  expect(lookupsStore.get().map((item) => item.word)).toEqual(['Chope']);

  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(lookupsStore.get()).toEqual([]);
});

test('Got it on a phrase already in Moments keeps one copy and offers no undo', async () => {
  renderNearby(); // seed lookups already include "chope"
  const before = lookupsStore.get();

  await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
  expect(screen.getByRole('status')).toHaveTextContent('Chope is already in Moments');
  expect(lookupsStore.get()).toEqual(before);
  expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
});

test('Got it saves whichever phrase is shown for the place', async () => {
  lookupsStore.set([]);
  placeStore.set('Grab · taxi');
  renderNearby();

  await userEvent.click(screen.getByRole('button', { name: 'Got it' }));
  expect(lookupsStore.get()[0]).toMatchObject({ word: 'Paiseh', meaning: 'Sorry or embarrassed — a soft, polite apology.' });
});

test('Ask IntentAI opens Ask', async () => {
  renderNearby();

  await userEvent.click(screen.getByRole('button', { name: 'Ask IntentAI' }));
  expect(screen.getByText('ask page')).toBeInTheDocument();
});

test('every phrase has a play button', () => {
  renderNearby();

  for (const word of ['Chope', 'Tapau', 'Kosong']) {
    expect(screen.getByRole('button', { name: `Play audio for ${word}` })).toBeInTheDocument();
  }
});
