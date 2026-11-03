import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { openedCardsStore, placeStoriesStore, reduceMotionStore } from '../../../data/stores';
import { paths, patterns } from '../../../routes';
import { homePlaceHref } from '../../../data/homeLinks';
import SnapSheet from './SnapSheet';

function Probe({ name }: { name: string }) {
  const { state, pathname } = useLocation();
  return (
    <p data-testid="probe">
      {name} {pathname} {JSON.stringify(state)}
    </p>
  );
}

function renderSnap(onClose = vi.fn()) {
  const utils = render(
    <MemoryRouter initialEntries={[paths.moments]}>
      <Routes>
        <Route path={paths.moments} element={<SnapSheet stamps={[]} onClose={onClose} />} />
        <Route path={paths.nearby} element={<Probe name="nearby" />} />
        <Route path={patterns.nearbyPlace} element={<Probe name="place" />} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...utils, onClose };
}

const stop = vi.fn();
const getUserMedia = vi.fn();

beforeEach(() => {
  stop.mockReset();
  getUserMedia.mockReset();
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  // jsdom has no canvas (ShinyText reads colours through one).
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('reduced motion: a recent photo is matched at once, its story card opened and its stamp gains ink', async () => {
  reduceMotionStore.set(true);
  const user = userEvent.setup();
  renderSnap();
  const dialog = screen.getByRole('dialog', { name: 'Snap a moment' });
  await user.click(within(dialog).getByRole('button', { name: /^The Wall panels/ }));
  await user.click(within(dialog).getByRole('button', { name: /^Take photo/ }));

  const heading = await screen.findByRole('heading', { level: 3, name: 'The Wall panels' });
  expect(heading).toHaveFocus();
  expect(screen.getByText('MATCH FOUND')).toBeInTheDocument();
  expect(screen.getByText('Berlin Wall Fragments · Monument')).toBeInTheDocument();
  expect(screen.getByText('94% match')).toBeInTheDocument();
  const tags = within(screen.getByRole('list', { name: 'Tags' }));
  expect(tags.getAllByRole('listitem').map((li) => li.textContent?.replace('✓', ''))).toEqual(['Graffiti panel', 'Concrete slab', 'Berlin, 1989']);
  expect(placeStoriesStore.get()['berlin-wall-fragments'].opened).toEqual(['monument']);
  expect(screen.getByText('1 of 4 cards')).toBeInTheDocument();
  expect(screen.getByText('+1 card · ink added to your stamp')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Show on the map/ })).toHaveAttribute('href', homePlaceHref('curated:sg-berlin-wall-fragments-utown'));
  expect(screen.getByRole('status')).toHaveTextContent('Match found: The Wall panels, 94% match.');
});

test('full motion: flash, "Recognising image", tags pop onto the photo, then the result; the card is marked opened', () => {
  vi.useFakeTimers();
  renderSnap();
  fireEvent.click(screen.getByRole('button', { name: /^Laksa/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Take photo of Laksa' }));
  expect(screen.getByText('Recognising image')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Take photo/ })).not.toBeInTheDocument();
  expect(openedCardsStore.get()).not.toContain('laksa');

  act(() => {
    vi.advanceTimersByTime(380 + 1800);
  });
  expect(openedCardsStore.get()).toContain('laksa');
  expect(within(screen.getByRole('list', { name: 'Tags found' })).getAllByRole('listitem')).toHaveLength(3);
  expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(screen.getByRole('heading', { level: 3, name: 'Laksa' })).toBeInTheDocument();
  expect(screen.getByText('MATCH FOUND')).toBeInTheDocument();
  expect(screen.getByText('88% match')).toBeInTheDocument();
  expect(screen.getAllByText('Coconut broth').length).toBeGreaterThan(0);
});

test('a card opened before: "Already in your stamp"; Snap again returns to the viewfinder', async () => {
  reduceMotionStore.set(true);
  placeStoriesStore.set({ 'berlin-wall-fragments': { opened: ['monument'], checkedIn: true, stamped: true, stampedOn: '2026-10-28' } });
  const user = userEvent.setup();
  renderSnap();
  await user.click(screen.getByRole('button', { name: 'The Wall panels, opened' }));
  await user.click(screen.getByRole('button', { name: /^Take photo/ }));
  await screen.findByRole('heading', { level: 3, name: 'The Wall panels' });
  expect(screen.getByText('Already in your stamp')).toBeInTheDocument();
  expect(screen.queryByText('+1 card · ink added to your stamp')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Not right? Snap again' }));
  expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Recent photos' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Take photo/ })).toBeInTheDocument();
});

test('Save to Moments closes the sheet', async () => {
  reduceMotionStore.set(true);
  const user = userEvent.setup();
  const { onClose } = renderSnap();
  await user.click(screen.getByRole('button', { name: /^Take photo/ }));
  await user.click(await screen.findByRole('button', { name: 'Save to Moments' }));
  expect(onClose).toHaveBeenCalled();
  expect(placeStoriesStore.get()['berlin-wall-fragments'].opened).toEqual(['monument']);
});

test('camera: only after "Use camera"; a camera photo is never matched; Ask a local goes to Community', async () => {
  reduceMotionStore.set(true);
  const user = userEvent.setup();
  renderSnap();
  expect(getUserMedia).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Use camera' }));
  expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
  expect(await screen.findByLabelText('Live camera view')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Take photo' }));
  expect(stop).toHaveBeenCalled();
  expect(await screen.findByRole('heading', { level: 3, name: 'No match yet' })).toHaveFocus();
  expect(screen.getByText(/We couldn’t place this one\. Try a photo from Recent photos\./)).toBeInTheDocument();
  expect(screen.queryByText('MATCH FOUND')).not.toBeInTheDocument();
  expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  expect(openedCardsStore.get()).toEqual([]);
  expect(screen.queryByRole('button', { name: 'Ask a local' })).toBeNull();
});

test('the camera is stopped when the sheet closes', async () => {
  const user = userEvent.setup();
  const { unmount, onClose } = renderSnap();
  await user.click(screen.getByRole('button', { name: 'Use camera' }));
  await screen.findByLabelText('Live camera view');
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalled();
  expect(stop).not.toHaveBeenCalled();
  unmount();
  expect(stop).toHaveBeenCalledTimes(1);
});

test('a refused camera says so and keeps the recent photos', async () => {
  getUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
  const user = userEvent.setup();
  renderSnap();
  await user.click(screen.getByRole('button', { name: 'Use camera' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Camera access is off for this site.');
  expect(screen.getByRole('button', { name: /^Take photo of The Wall panels/ })).toBeEnabled();
});
