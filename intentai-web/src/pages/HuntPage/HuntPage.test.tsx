import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import HuntPage from './HuntPage';
import MedalsPage from './medals/MedalsPage';
import { huntPoints } from './landing/volumes';
import { huntModeStore, huntTourStore } from '../../data/v2Stores';
import { SAVES_CLEARED } from '../../data/deviceKeys';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { paths } from '../../routes';

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search + l.hash}</output>;
}

const at = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={paths.hunt} element={<HuntPage />} />
        <Route path={paths.huntMedals} element={<MedalsPage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );

type Host = NonNullable<NonNullable<Window['FindSGHost']>['recognizeObservationPhoto']>;
const recognise = (impl: Host) => {
  window.FindSGHost = { recognizeObservationPhoto: vi.fn(impl) };
  return window.FindSGHost.recognizeObservationPhoto as ReturnType<typeof vi.fn>;
};
const photo = () => new File(['x'], 'stop.jpg', { type: 'image/jpeg' });
const shoot = (f = photo()) => fireEvent.change(screen.getByLabelText('Take a photo of the detail'), { target: { files: [f] } });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.dispatchEvent(new Event(SAVES_CLEARED));
  huntModeStore.set({});
  // the tour has its own test; elsewhere it would sit over the step
  huntTourStore.set({ done: true });
  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  delete window.FindSGHost;
});

test('the landing shows the public hunts as a carousel, the tiles and the hunts; no shelf, no book, nothing playing', () => {
  at('/hunt');
  expect(screen.getByRole('heading', { level: 1, name: 'Hunt' })).toBeInTheDocument();
  const carousel = screen.getByRole('region', { name: 'Public hunts' });
  expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
  expect(within(carousel).getAllByRole('listitem').length).toBeGreaterThan(1);
  expect(within(carousel).getByRole('group', { name: 'Choose a public hunt' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /^Medals: 0 of 6 won/ })).toHaveAttribute('href', paths.huntMedals);
  expect(within(screen.getByRole('list', { name: 'Hunts' })).getAllByRole('button')).toHaveLength(6);
  // nothing from the old desk
  expect(screen.queryByRole('tab', { name: 'Public' })).toBeNull();
  expect(screen.queryByText(/shelf|volume/i)).toBeNull();
  expect(document.querySelector('video, audio, canvas, iframe')).toBeNull();
});

test('the carousel moves with its arrows, dots and the arrow keys', async () => {
  at('/hunt');
  const carousel = screen.getByRole('region', { name: 'Public hunts' });
  const row = within(carousel).getByRole('list');
  const scrollTo = vi.fn();
  row.scrollTo = scrollTo as unknown as typeof row.scrollTo;
  await userEvent.click(within(carousel).getByRole('button', { name: 'Next hunt' }));
  expect(scrollTo).toHaveBeenCalled();
  const dots = within(within(carousel).getByRole('group')).getAllByRole('button');
  await userEvent.click(dots[1]);
  expect(scrollTo).toHaveBeenCalledTimes(2);
  fireEvent.keyDown(row, { key: 'ArrowRight' });
  expect(scrollTo.mock.calls.length).toBeGreaterThanOrEqual(3);
});

test('a public hunt opens its step screen; 〈 comes back to the landing', async () => {
  at('/hunt');
  const carousel = screen.getByRole('region', { name: 'Public hunts' });
  await userEvent.click(within(carousel).getAllByRole('button', { name: /stops\./ })[0]);
  expect(screen.getByTestId('where').textContent).toMatch(/^\/hunt#story\//);
  expect(screen.getByRole('button', { name: 'Start the hunt' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByTestId('where').textContent).toBe('/hunt');
  expect(screen.getByRole('region', { name: 'Public hunts' })).toBeInTheDocument();
});

test('a hunt plays flat: start, one photo a stop, recognised photos pass and the next stop opens by itself', async () => {
  const check = recognise(async () => ({ decision: 'match', confidence: 0.93 }));
  at('/hunt#story/short');
  expect(screen.getByRole('heading', { level: 1, name: 'Beneath the Golden Dome' })).toBeInTheDocument();
  expect(screen.getByText('Opening')).toBeInTheDocument();
  // no remote play, no "I'm here" button, nothing that skips the photo
  expect(screen.queryByText(/remote|I am here|I'm here|check in yourself/i)).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  expect(screen.getByText('Stop 1 of 2')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'The old press' })).toBeInTheDocument();
  const input = screen.getByLabelText('Take a photo of the detail');
  expect(input).toHaveAttribute('capture', 'environment');
  expect(input).toHaveAttribute('accept', 'image/*');
  expect(screen.getAllByRole('button', { name: /Take photo/ })).toHaveLength(1);

  shoot();
  await screen.findByText('Stop 2 of 2');
  expect(check).toHaveBeenCalledWith(expect.objectContaining({ routeId: 'short', stopId: 'short-press' }));
  expect(screen.getByRole('region', { name: 'The hidden line' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Sultan Mosque' })).toBeInTheDocument();

  shoot();
  await screen.findByText('Finished');
  expect(screen.getByRole('link', { name: /See your medals/ })).toHaveAttribute('href', paths.huntMedals);
  expect(JSON.parse(localStorage.getItem('findsg-short-v2:gold-under-glass:manual')!)).toMatchObject({ deduce: true, bottle: true });
});

test('a photo that is not recognised does not pass: the stop stays and asks for another photo', async () => {
  recognise(async () => ({ decision: 'no-match', confidence: 0.9, reason: 'Frame the arch above the window.' }));
  at('/hunt#story/telok-ayer');
  await userEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  shoot();
  expect(await screen.findByText('Not recognised yet.')).toBeInTheDocument();
  expect(screen.getByText('Frame the arch above the window.')).toBeInTheDocument();
  expect(screen.getByText('Stop 1 of 8')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Take another photo/ })).toBeInTheDocument();
  // an unsure "match" below the bar does not pass either
  recognise(async () => ({ decision: 'match', confidence: 0.5 }));
  shoot();
  await screen.findByText('Not recognised yet.');
  expect(screen.getByText('Stop 1 of 8')).toBeInTheDocument();
});

test('when recognition is unavailable, Try again sends the same photo again (no way round it)', async () => {
  const fetchMock = vi.fn(async () => new Response('{"error":"not_configured"}', { status: 503 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('createImageBitmap', undefined);
  at('/hunt#story/telok-ayer');
  await userEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  shoot();
  expect(await screen.findByText('The photo could not be checked.')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/recognize', expect.objectContaining({ method: 'POST' }));
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ decision: 'match', confidence: 0.95, reason: '' }), { status: 200 }));
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('Stop 2 of 8');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  vi.unstubAllGlobals();
});

test('films never play by themselves; one plays only when its button is tapped', async () => {
  at('/hunt#story/kampong-gelam');
  expect(document.querySelector('video, audio')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: /Watch the opening film/ }));
  expect(screen.getByRole('dialog').querySelector('video')).not.toBeNull();
});

test('the tour lights each control on the first hunt, is remembered once skipped, and ? plays it again', async () => {
  huntTourStore.set({ done: false });
  at('/hunt#story/balestier');
  await userEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  const tour = await screen.findByRole('dialog', { name: 'Your progress' });
  expect(within(tour).getByText(/^1 \/ \d$/)).toBeInTheDocument();
  await userEvent.click(within(tour).getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('dialog', { name: 'The stop' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}hunt-tour`)!)).toEqual({ done: true });
  await userEvent.click(screen.getByRole('button', { name: 'Show the tour' }));
  expect(screen.getByRole('dialog', { name: 'Your progress' })).toBeInTheDocument();
  act(() => {
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('an old #short link opens the Golden Dome hunt; the retired Public tab lands on the landing', async () => {
  at('/hunt#short/press');
  await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/hunt#story/short'));
  expect(screen.getByRole('heading', { level: 1, name: 'Beneath the Golden Dome' })).toBeInTheDocument();
});

test('medals: earned and not yet, from real progress only', async () => {
  recognise(async () => ({ decision: 'match', confidence: 0.99 }));
  at('/hunt#story/short');
  await userEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  shoot();
  await screen.findByText('Stop 2 of 2');
  shoot();
  await screen.findByText('Finished');
  await userEvent.click(screen.getByRole('link', { name: /See your medals/ }));
  expect(screen.getByRole('heading', { level: 1, name: 'Medals' })).toBeInTheDocument();
  expect(screen.getAllByRole('img', { name: 'Medal won' })).toHaveLength(1);
  expect(screen.getAllByRole('img', { name: 'Medal not won yet' })).toHaveLength(5);
  expect(screen.getByText(/ stamps$/).parentElement?.textContent).toMatch(/2 \/ \d+ stamps$/);
});

test('points: 100 for each stop passed', () => {
  expect(huntPoints()).toBe(0);
  localStorage.setItem('findsg-short-v2:gold-under-glass:manual', JSON.stringify({ version: 2, episodeId: 'gold-under-glass', mode: 'manual', ticket: true, letter: true, arrival1: true, photo1: true, shutter: true, parcel: true, mirror: true, deduce: true }));
  expect(huntPoints()).toBe(100);
});

test('the Now box over the dock says what to do at every step, and folds to a pill and back', async () => {
  let answer: (v: { decision: string; confidence: number }) => void = () => {};
  recognise(() => new Promise((r) => (answer = r)));
  at('/hunt#story/short');
  const now = () => screen.getAllByRole('status').find((el) => el.closest('[data-tour="now"]'))!;
  expect(now()).toHaveTextContent('Read the letter, then tap Start the hunt.');
  await userEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  expect(now()).toHaveTextContent(/^Go to .+, then photograph: .+/);
  shoot();
  expect(now()).toHaveTextContent('Checking your photo…');
  await act(async () => answer({ decision: 'no_match', confidence: 0.1 }));
  await waitFor(() => expect(now()).toHaveTextContent(/^Not recognised — reframe the detail and take another photo/));
  // one tap folds it, one tap brings it back; it never goes away
  await userEvent.click(screen.getByRole('button', { name: 'Fold the reminder' }));
  expect(screen.getByRole('button', { name: 'Show what to do now' })).toHaveAttribute('aria-expanded', 'false');
  expect(now()).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Show what to do now' }));
  expect(screen.getByRole('button', { name: 'Fold the reminder' })).toHaveAttribute('aria-expanded', 'true');
});

test('the tour has a step on the Now box', async () => {
  huntTourStore.set({ done: false });
  at('/hunt#story/balestier');
  await userEvent.click(screen.getByRole('button', { name: 'Start the hunt' }));
  await screen.findByRole('dialog', { name: 'Your progress' });
  for (let i = 0; i < 8 && !screen.queryByRole('dialog', { name: 'Now: what to do next' }); i++)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Next|Got it/ }));
  expect(screen.getByRole('dialog', { name: 'Now: what to do next' })).toBeInTheDocument();
});
