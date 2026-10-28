import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import type { OnboardingMapFrameProps } from '../../../components/OnboardingMap/OnboardingMapFrame';
import { DEFAULT_ONBOARDING, type HomeBase, type Onboarding } from '../../../data/domain';
import { HOME_BASE, homePlace } from '../../../data/homePlaces';
import { distanceM } from '../../../features/nearby/geo';
import { formatDistance } from '../areas';
import { LOCATE_LABEL, LOCATE_TOAST, step } from './Base';

// The real frame lazy-loads Leaflet (covered by the OnboardingMap tests); here it is a set of buttons.
const frame = vi.hoisted(() => ({ last: null as OnboardingMapFrameProps | null }));
vi.mock('../../../components/OnboardingMap/OnboardingMapFrame', () => ({
  default: function FakeFrame(p: OnboardingMapFrameProps) {
    frame.last = p;
    return (
      <div data-testid="frame" data-drops={p.drops}>
        <button type="button" onClick={() => p.onDrop({ lat: 1.2836, lng: 103.8443 })}>
          tap Chinatown
        </button>
        <button type="button" onClick={() => p.onDrop({ lat: 1.31, lng: 103.92 })}>
          tap far east
        </button>
        <button type="button" onClick={() => p.onDrop({ lat: 1.7, lng: 103.8 })}>
          tap outside
        </button>
        <button type="button" onClick={p.onLocate}>
          Use my location
        </button>
      </div>
    );
  },
}));

const BERLIN = homePlace('berlin-wall-fragments')!;
const CHINATOWN = homePlace('chinatown')!;

function Harness({ initial, toast }: { initial: Onboarding; toast: (m: string) => void }) {
  const [data, setData] = useState(initial);
  const props = { data, update: (patch: Partial<Onboarding>) => setData((d) => ({ ...d, ...patch })), toast, next: () => {} };
  const { Body, Preview } = step;
  return (
    <>
      <Body {...props} />
      {Preview && <Preview {...props} />}
      <output data-testid="base">{JSON.stringify(data.base)}</output>
    </>
  );
}

function renderBase(base: HomeBase | null = null) {
  const toast = vi.fn();
  render(<Harness initial={{ ...DEFAULT_ONBOARDING, base }} toast={toast} />);
  const saved = () => JSON.parse(screen.getByTestId('base').textContent!) as HomeBase | null;
  return { toast, saved };
}

test('keeps the step contract', () => {
  expect(step.id).toBe('base');
  expect(step.shell).toBe('question');
  expect(step.blockedToast).toBe('Tap the map to drop your pin');
  expect(step.answered(DEFAULT_ONBOARDING)).toBe(false);
  expect(step.answered({ ...DEFAULT_ONBOARDING, base: { lat: 1.3, lng: 103.8, label: 'Dempsey' } })).toBe(true);
});

test('shows the canvas header and the empty preview', () => {
  renderBase();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Where do you spend most of your time?');
  expect(screen.getByText('Tap the map to set where Nearby searches from')).toBeInTheDocument();
  expect(screen.getByText('PREVIEW · NEARBY FROM HERE')).toBeInTheDocument();
  expect(screen.getByText('Your preview')).toBeInTheDocument();
  expect(screen.getByText('Drop a pin to see what’s closest.')).toBeInTheDocument();
});

test('a tap saves the base with its area label and zooms the map in', () => {
  const { saved } = renderBase();
  fireEvent.click(screen.getByRole('button', { name: 'tap Chinatown' }));
  expect(saved()).toEqual({ lat: 1.2836, lng: 103.8443, label: 'Chinatown' });
  expect(screen.getByTestId('frame')).toHaveAttribute('data-drops', '1');
  expect(frame.last?.base).toEqual(saved());
});

test('a tap far from every area is labelled Near <area>', () => {
  const { saved } = renderBase();
  fireEvent.click(screen.getByRole('button', { name: 'tap far east' }));
  expect(saved()?.label).toMatch(/^Near /);
});

test('a drop outside the accepted range is ignored', () => {
  const { saved } = renderBase();
  fireEvent.click(screen.getByRole('button', { name: 'tap outside' }));
  expect(saved()).toBeNull();
  expect(screen.getByTestId('frame')).toHaveAttribute('data-drops', '0');
});

test('locate drops at NUS UTown without geolocation and toasts', () => {
  const geo = vi.fn();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: geo, watchPosition: geo } });
  const { saved, toast } = renderBase();
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  expect(saved()).toEqual({ ...HOME_BASE, label: LOCATE_LABEL });
  expect(LOCATE_LABEL).toBe('NUS UTown');
  expect(toast).toHaveBeenCalledWith(LOCATE_TOAST);
  expect(LOCATE_TOAST).toBe('Location used once, only for Nearby');
  expect(geo).not.toHaveBeenCalled();
  // Locating twice still counts as a new drop (the map recentres).
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  expect(screen.getByTestId('frame')).toHaveAttribute('data-drops', '2');
});

test('preview near UTown: Berlin Wall first, Chinatown distance in the body', () => {
  renderBase({ ...HOME_BASE, label: 'NUS UTown' });
  const toWall = distanceM(HOME_BASE, BERLIN.point);
  const toChinatown = distanceM(HOME_BASE, CHINATOWN.point);
  expect(screen.getByText('Berlin Wall Fragments')).toBeInTheDocument();
  expect(screen.getByText(formatDistance(toWall))).toBeInTheDocument();
  expect(screen.getByText(`Closest to NUS UTown. Chinatown is ${formatDistance(toChinatown)} away.`)).toBeInTheDocument();
  expect(formatDistance(toChinatown)).toMatch(/km$/);
});

test('preview near Chinatown: Chinatown first, and "Near " is dropped from the area', () => {
  const base = { lat: 1.29, lng: 103.86, label: 'Near Marina Bay' };
  renderBase(base);
  const toChinatown = distanceM(base, CHINATOWN.point);
  const toWall = distanceM(base, BERLIN.point);
  expect(screen.getByText('Chinatown')).toBeInTheDocument();
  expect(screen.getByText(formatDistance(toChinatown))).toBeInTheDocument();
  expect(screen.getByText(`Closest to Marina Bay. Berlin Wall Fragments is ${formatDistance(toWall)} away.`)).toBeInTheDocument();
});
