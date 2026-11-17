import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { testerStore } from '../../data/stores';
import type { UsageEvent } from '../../usage/event';
import { appendLocalUsage, readLocalUsage, toExport } from '../../usage/localLog';
import { GESTURE_EVENT } from '../../usage/gesture';
import PageTracker from '../../usage/PageTracker';
import { createTracker, type TrackerDeps } from '../../usage/tracker';
import AdminPage from './AdminPage';

const EVENTS: UsageEvent[] = [
  { uid: 'u1', sid: 's1', kind: 'page', name: 'Today', ms: 20_000, at: 1_000, user: 'P01' },
  { uid: 'u1', sid: 's1', kind: 'tap', name: 'Today › Near you', ms: 0, at: 15_000, user: 'P01' },
  { uid: 'u1', sid: 's1', kind: 'page', name: 'Nearby', ms: 60_000, at: 21_000, user: 'P01' },
  { uid: 'u2', sid: 's2', kind: 'page', name: 'Today', ms: 4_000, at: 2_000, user: 'P02' },
];

test("presses count on the page they happen on: a button by its name, a link by the page it opens", () => {
  const sent: UsageEvent[] = [];
  const deps: TrackerDeps = {
    now: () => 5_000,
    send: (events) => sent.push(...events),
    uid: () => 'me',
    user: () => 'P07',
    newId: () => 's1',
    doc: { visibilityState: 'visible', addEventListener: () => {} } as unknown as TrackerDeps['doc'],
    win: { addEventListener: () => {} } as unknown as TrackerDeps['win'],
  };
  const t = createTracker(deps);
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/moments']}>
      <PageTracker t={t} />
      <button type="button" aria-label="Practise: chope">
        <span>Practise</span>
      </button>
      <Link to="/nearby/saved">a phrase someone typed</Link>
      <div data-no-track>
        <button type="button">Secret</button>
      </div>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Practise: chope' }));
  fireEvent.click(screen.getByRole('link'));
  fireEvent.click(screen.getByRole('button', { name: 'Secret' }));
  // a swipe is no click: the card pile sends it as a gesture with a fixed label
  document.dispatchEvent(new CustomEvent(GESTURE_EVENT, { detail: 'Swipe card' }));
  t.flush();
  const taps = sent.filter((e) => e.kind === 'tap');
  expect(taps.map((e) => [e.name, e.ms, e.user])).toEqual([
    ['Moments › Practise chope', 0, 'P07'],
    ['Moments › to Nearby saved', 0, 'P07'],
    ['Nearby saved › Swipe card', 0, 'P07'], // the link above moved to Saved (the /nearby explorer is retired)
  ]);
});

test('This device: the test log shows as an analysis without a server, exports, and ends the test', async () => {
  appendLocalUsage(EVENTS);
  testerStore.set({ name: 'P01' });
  render(<AdminPage />);
  expect(screen.getByRole('button', { name: 'This device' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByLabelText('Admin password')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'User test analysis' })).toBeInTheDocument();
  const people = screen.getByText('People', { selector: 'dt' });
  expect(people.nextSibling).toHaveTextContent('2');
  expect(screen.getByRole('table', { name: 'Pages in detail' })).toHaveTextContent(/Nearby/);
  expect(screen.getByText('Most pressed').closest('div')).toHaveTextContent('Near you');
  expect(screen.getByRole('button', { name: 'Export file (JSON)' })).toBeEnabled();
  await userEvent.click(screen.getByRole('button', { name: /End test/ }));
  expect(testerStore.get().name).toBe('');
  await userEvent.click(screen.getByRole('button', { name: 'Clear this device' }));
  await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
  expect(readLocalUsage()).toEqual([]);
});

test('Files: exported files from several devices merge; other files are named and skipped', async () => {
  render(<AdminPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Files' }));
  const input = screen.getByLabelText(/Add exported files/) as HTMLInputElement;
  const good = new File([JSON.stringify(toExport(EVENTS))], 'p01.json', { type: 'application/json' });
  const dup = new File([JSON.stringify(toExport(EVENTS))], 'p01-again.json', { type: 'application/json' });
  const bad = new File(['{"hello":1}'], 'notes.json', { type: 'application/json' });
  await userEvent.upload(input, [good, dup, bad]);
  await waitFor(() => expect(screen.getByText(/2 files added · 4 records · not usage files: notes.json/)).toBeInTheDocument());
  expect(screen.getByRole('heading', { name: 'User test analysis' })).toBeInTheDocument();
});
