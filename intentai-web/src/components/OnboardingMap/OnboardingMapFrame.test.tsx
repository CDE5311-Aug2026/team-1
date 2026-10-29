import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { HomeBase } from '../../data/domain';
import OnboardingMapFrame from './OnboardingMapFrame';
import type { OnboardingMapViewProps } from './OnboardingMapView';

const UTOWN: HomeBase = { lat: 1.3049, lng: 103.7735, label: 'NUS UTown' };

/** Stand-in map: shows the props it was given and exposes its callbacks as buttons. */
let lastView: OnboardingMapViewProps | null = null;
function FakeView(p: OnboardingMapViewProps) {
  lastView = p;
  return (
    <div data-testid="map" data-zoomed={p.zoomed} data-out={p.outSeq}>
      <button type="button" onClick={() => p.onDrop({ lat: 1.3, lng: 103.8 })}>
        fake tap
      </button>
      <button type="button" onClick={p.onTilesFailed}>
        fake tile failure
      </button>
    </div>
  );
}
const okLoader = () => vi.fn(() => Promise.resolve({ default: FakeView }));

type Props = ComponentProps<typeof OnboardingMapFrame>;
function props(over: Partial<Props> = {}): Props {
  return { base: null, drops: 0, onDrop: vi.fn(), onLocate: vi.fn(), loadMap: okLoader(), ...over };
}

test('loads the map lazily and passes taps through', async () => {
  const onDrop = vi.fn();
  render(<OnboardingMapFrame {...props({ onDrop })} />);
  fireEvent.click(await screen.findByRole('button', { name: 'fake tap' }));
  expect(onDrop).toHaveBeenCalledWith({ lat: 1.3, lng: 103.8 });
  expect(screen.getByRole('link', { name: '© OpenStreetMap contributors' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
});

test('a failed chunk shows Retry, and Retry imports again', async () => {
  const loadMap = vi
    .fn<() => Promise<{ default: typeof FakeView }>>()
    .mockRejectedValueOnce(new Error('chunk failed'))
    .mockResolvedValue({ default: FakeView });
  // React rethrows the rejected import to the error boundary; keep jsdom and React from logging it.
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const quiet = (e: ErrorEvent) => e.preventDefault();
  window.addEventListener('error', quiet);
  render(<OnboardingMapFrame {...props({ base: UTOWN, loadMap })} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Map unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByTestId('map')).toBeInTheDocument();
  expect(loadMap).toHaveBeenCalledTimes(2);
  // The answer lives in the store, so Retry loses nothing: the map comes back with the pin.
  expect(lastView?.base).toEqual(UTOWN);
  window.removeEventListener('error', quiet);
  spy.mockRestore();
});

test('failing tiles switch to the error state', async () => {
  render(<OnboardingMapFrame {...props()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'fake tile failure' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Map unavailable');
});

test('zoom out appears after a drop and goes back to the overview', async () => {
  const p = props();
  const { rerender } = render(<OnboardingMapFrame {...p} />);
  await screen.findByTestId('map');
  expect(screen.queryByRole('button', { name: 'Zoom out' })).toBeNull();
  rerender(<OnboardingMapFrame {...p} base={UTOWN} drops={1} />);
  expect(screen.getByTestId('map')).toHaveAttribute('data-zoomed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
  expect(screen.queryByRole('button', { name: 'Zoom out' })).toBeNull();
  expect(screen.getByTestId('map')).toHaveAttribute('data-zoomed', 'false');
  expect(screen.getByTestId('map')).toHaveAttribute('data-out', '1');
  expect(screen.getByRole('button', { name: 'Use my location' })).toHaveFocus();
  // The next drop zooms in again.
  rerender(<OnboardingMapFrame {...p} base={UTOWN} drops={2} />);
  expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
});

test('starts zoomed in when a pin is already set', async () => {
  render(<OnboardingMapFrame {...props({ base: UTOWN })} />);
  expect(await screen.findByTestId('map')).toHaveAttribute('data-zoomed', 'true');
  expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
});

test('a pin that appears without a drop (the pre-pin) zooms the map in once', async () => {
  const p = props();
  const { rerender } = render(<OnboardingMapFrame {...p} />);
  expect(await screen.findByTestId('map')).toHaveAttribute('data-zoomed', 'false');
  rerender(<OnboardingMapFrame {...p} base={UTOWN} />);
  expect(screen.getByTestId('map')).toHaveAttribute('data-zoomed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
  expect(screen.getByTestId('map')).toHaveAttribute('data-zoomed', 'false');
});

test('locate and zoom out do not reach the map underneath', async () => {
  const onLocate = vi.fn();
  const outer = { pointer: vi.fn(), click: vi.fn() };
  render(
    <div onPointerDown={outer.pointer} onClick={outer.click}>
      <OnboardingMapFrame {...props({ base: UTOWN, onLocate })} />
    </div>,
  );
  await screen.findByTestId('map');
  for (const name of ['Use my location', 'Zoom out']) {
    const button = screen.getByRole('button', { name });
    fireEvent.pointerDown(button);
    act(() => button.click());
  }
  expect(onLocate).toHaveBeenCalledTimes(1);
  expect(outer.pointer).not.toHaveBeenCalled();
  expect(outer.click).not.toHaveBeenCalled();
});
