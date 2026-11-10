import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { SAVES_CLEARED } from '../../data/deviceKeys';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { deleteAllData } from '../../data/stores';
import { huntNowStore } from '../../data/v2Stores';
import { loadHunt, passStop, startHunt } from '../../pages/HuntPage/play/model';
import { huntUnderWay } from '../../pages/HuntPage/play/now';
import AppShell from './AppShell';

const photo = { name: 'stop.jpg', type: 'image/jpeg', size: 1000 };

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.hash}</output>;
}

function renderAt(path: string, chrome?: 'full' | 'status') {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<AppShell chrome={chrome}><p>content</p><Where /></AppShell>} />
      </Routes>
    </MemoryRouter>,
  );
}

const box = () => screen.findByRole('complementary', { name: /./ });

beforeEach(() => {
  localStorage.clear();
  window.dispatchEvent(new Event(SAVES_CLEARED));
  huntNowStore.set({});
});

test('no hunt under way: no remind box', async () => {
  renderAt('/');
  // let a lazy load (if any) settle
  await act(async () => {});
  expect(screen.queryByRole('complementary')).toBeNull();
});

test('a hunt under way: its title, stop and next step over the tab bar; Continue opens it', async () => {
  startHunt('telok-ayer');
  const hunt = loadHunt('telok-ayer')!;
  renderAt('/');
  const aside = await box();
  expect(aside).toHaveAccessibleName(hunt.title);
  expect(aside).toHaveTextContent(`Now · Stop 1 of ${hunt.stops.length}`);
  expect(aside).toHaveTextContent(/Go to .+ and take the photo\./);
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByTestId('where').textContent).toBe('/hunt#story/telok-ayer');
});

test('dismissed, it stays away until the hunt moves to another stop', async () => {
  startHunt('short');
  const first = renderAt('/hunt');
  await box();
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss the reminder' }));
  expect(screen.queryByRole('complementary')).toBeNull();
  expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}hunt-now`)!)).toEqual({ dismissed: { hunt: 'short', stop: 0 } });
  first.unmount();
  // the app opened again on the same stop: still away
  const again = renderAt('/');
  await act(async () => {});
  expect(screen.queryByRole('complementary')).toBeNull();
  again.unmount();
  // the next stop: back again
  passStop('short', 'short-press', photo);
  renderAt('/');
  expect(await box()).toHaveTextContent('Now · Stop 2 of 2');
});

test('not on onboarding, the desks, or inside a hunt (no tab bar there)', async () => {
  startHunt('balestier');
  for (const path of ['/onboarding', '/admin', '/test']) {
    const r = renderAt(path);
    await act(async () => {});
    expect(screen.queryByRole('complementary')).toBeNull();
    r.unmount();
  }
  renderAt('/hunt#story/balestier', 'status');
  await act(async () => {});
  expect(screen.queryByRole('complementary')).toBeNull();
});

test('a finished hunt does not remind; several under way: the one played last', async () => {
  startHunt('short');
  passStop('short', 'short-press', photo);
  passStop('short', 'short-mosque', photo);
  expect(huntUnderWay()).toBeNull();
  startHunt('telok-ayer');
  startHunt('kampong-gelam');
  // Telok Ayer comes first in HUNTS; Kampong Gelam's later check-in makes it the one played last
  passStop('telok-ayer', loadHunt('telok-ayer')!.stops[0].id, photo, new Date('2030-01-01T00:00:00Z'));
  passStop('kampong-gelam', loadHunt('kampong-gelam')!.stops[0].id, photo, new Date('2030-02-01T00:00:00Z'));
  expect(huntUnderWay()?.hunt.id).toBe('kampong-gelam');
  passStop('telok-ayer', loadHunt('telok-ayer')!.stops[1].id, photo, new Date('2030-03-01T00:00:00Z'));
  expect(huntUnderWay()?.hunt.id).toBe('telok-ayer');
});

test('Delete all clears the dismissal', async () => {
  huntNowStore.set({ dismissed: { hunt: 'short', stop: 0 } });
  await deleteAllData();
  await waitFor(() => expect(huntNowStore.get()).toEqual({}));
});
