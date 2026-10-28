import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { HOME_BASE, homePlace } from '../../data/homePlaces';
import { triggerResize } from '../../test/resizeObserver';
import type { HomeMapProps } from '../HomeMap/HomeMap';
import { NearbySection, initialNearbyState, nearbyReducer, type NearbyState } from './NearbySection';

// Stub for the lazily loaded Leaflet map: pins as buttons, the inset as a data attribute.
vi.mock('../HomeMap/HomeMap', () => ({
  default: function HomeMapStub({ pins, onPinActivate, bottomInset }: HomeMapProps) {
    return (
      <div data-testid="map" data-inset={bottomInset}>
        {pins.map((p) => (
          <button key={p.id} type="button" aria-label={p.name} onClick={() => onPinActivate(p.id)} />
        ))}
      </div>
    );
  },
}));

const BERLIN = 'berlin-wall-fragments';
const CHINATOWN = 'chinatown';
const HAW_PAR = 'curated:sg-haw-par-villa';
const berlin = homePlace(BERLIN)!;
const chinatown = homePlace(CHINATOWN)!;

function run(...actions: Parameters<typeof nearbyReducer>[1][]): NearbyState {
  return actions.reduce(nearbyReducer, initialNearbyState);
}

test('initial state: Berlin selected, focus on Berlin without flying, zoom 16', () => {
  expect(initialNearbyState).toEqual({
    selectedId: BERLIN,
    command: { seq: 0, kind: 'focus', target: berlin.point, fly: false },
    lastFocus: berlin.point,
    zoom: 16,
  });
});

test('select, locate and activate drive selection and the camera', () => {
  const s1 = run({ type: 'select', id: CHINATOWN });
  expect(s1.selectedId).toBe(CHINATOWN);
  expect(s1.command).toEqual({ seq: 1, kind: 'focus', target: chinatown.point, fly: true });
  expect(s1.lastFocus).toEqual(chinatown.point);

  const s2 = nearbyReducer(s1, { type: 'locate' });
  expect(s2.selectedId).toBe(BERLIN);
  expect(s2.command).toMatchObject({ seq: 2, kind: 'focus', target: HOME_BASE });
  expect(s2.lastFocus).toEqual(HOME_BASE);

  const s3 = nearbyReducer(s2, { type: 'activate', id: BERLIN });
  expect(s3.selectedId).toBe(BERLIN);
  expect(s3.command).toMatchObject({ seq: 3, kind: 'focus', target: berlin.point });

  const s4 = nearbyReducer(s3, { type: 'activate', id: BERLIN });
  expect(s4.command).toMatchObject({ seq: 4, kind: 'focus', target: berlin.point });
  expect(s4.zoom).toBe(16);
});

test('zoom clamps to 12..19 and leaves lastFocus alone; focus actions never change zoom', () => {
  const s = run({ type: 'zoom', delta: 1 }, { type: 'zoom', delta: 1 });
  expect(s.zoom).toBe(18);
  expect(s.command).toEqual({ seq: 2, kind: 'zoom', delta: 1 });
  expect(s.lastFocus).toEqual(berlin.point);
  expect(run({ type: 'zoom', delta: 1 }, { type: 'zoom', delta: 1 }, { type: 'zoom', delta: 1 }, { type: 'zoom', delta: 1 }).zoom).toBe(19);
  const low = run(...Array.from({ length: 6 }, () => ({ type: 'zoom' as const, delta: -1 as const })));
  expect(low.zoom).toBe(12);
  expect(nearbyReducer(s, { type: 'select', id: CHINATOWN }).zoom).toBe(18);
  expect(nearbyReducer(s, { type: 'locate' }).zoom).toBe(18);
});

test('activate on another place behaves as select', () => {
  expect(run({ type: 'activate', id: CHINATOWN })).toEqual(run({ type: 'select', id: CHINATOWN }));
});

test('fly is measured from the last focus, not from a zoom command', () => {
  const s = run({ type: 'select', id: CHINATOWN }, { type: 'zoom', delta: 1 }, { type: 'select', id: BERLIN });
  expect(s.command).toEqual({ seq: 3, kind: 'focus', target: berlin.point, fly: true });
  expect(run({ type: 'select', id: HAW_PAR }).command).toMatchObject({ fly: false });
});

test('userZoom sets zoom without a command; unknown ids are ignored', () => {
  const s = nearbyReducer(initialNearbyState, { type: 'userZoom', zoom: 14 });
  expect(s.zoom).toBe(14);
  expect(s.command).toBe(initialNearbyState.command);
  expect(nearbyReducer(initialNearbyState, { type: 'select', id: 'nope' })).toBe(initialNearbyState);
});

function setup() {
  const onOpenPlace = vi.fn();
  const onSearch = vi.fn();
  render(
    <MemoryRouter useTransitions={false}>
      <NearbySection onOpenPlace={onOpenPlace} onSearch={onSearch} />
    </MemoryRouter>,
  );
  const card = (name: string) => screen.getByRole('group', { name });
  return { onOpenPlace, onSearch, card };
}

const pinCount = () => within(screen.getByTestId('map')).getAllByRole('button').length;

test('renders the heading and hint, 4 pins and the Berlin card current', async () => {
  const { card } = setup();
  expect(screen.getByRole('heading', { level: 2, name: 'Nearby' })).toBeInTheDocument();
  expect(screen.getByText('Swipe a card or tap a pin')).toBeInTheDocument();
  await screen.findByTestId('map');
  expect(pinCount()).toBe(4);
  expect(card('Berlin Wall Fragments')).toHaveAttribute('aria-current', 'true');
});

test('cards, pins and Locate stay in sync; Open and the search pill call the props', async () => {
  const user = userEvent.setup();
  const { card, onOpenPlace, onSearch } = setup();
  const map = await screen.findByTestId('map');

  fireEvent.keyDown(card('Berlin Wall Fragments'), { key: 'ArrowRight' });
  expect(card('Chinatown')).toHaveAttribute('aria-current', 'true');
  expect(pinCount()).toBe(5);
  expect(within(map).getByRole('button', { name: 'Chinatown' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Show my home base' }));
  expect(pinCount()).toBe(4);
  expect(card('Berlin Wall Fragments')).toHaveAttribute('aria-current', 'true');

  await user.click(within(map).getByRole('button', { name: 'Haw Par Villa' }));
  expect(card('Haw Par Villa')).toHaveAttribute('aria-current', 'true');

  await user.click(within(card('Chinatown')).getByRole('button', { name: /Open/ }));
  expect(onOpenPlace).toHaveBeenCalledWith(CHINATOWN);

  await user.click(screen.getByRole('button', { name: /Near you/ }));
  expect(onSearch).toHaveBeenCalledTimes(1);
});

test('measures the carousel overlap with the map and passes it as the inset', async () => {
  setup();
  const map = await screen.findByTestId('map');
  const mapBox = screen.getByTestId('nearby-map');
  const carouselBox = screen.getByTestId('nearby-carousel');
  const rect = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON() {} }) as DOMRect;
  vi.spyOn(mapBox, 'getBoundingClientRect').mockReturnValue(rect(0, 500));
  const carouselRect = vi.spyOn(carouselBox, 'getBoundingClientRect').mockReturnValue(rect(330, 488));

  act(() => triggerResize(mapBox, { height: 500 }));
  expect(map).toHaveAttribute('data-inset', '170');

  carouselRect.mockReturnValue(rect(300, 488));
  act(() => triggerResize(carouselBox, { height: 188 }));
  expect(map).toHaveAttribute('data-inset', '200');
});

test('lists photo credits under the map, deduplicated', () => {
  setup();
  const credits = screen.getByText('Photo credits').closest('details')!;
  expect(within(credits).getByText(/Marcin Konsek, CC BY-SA 4.0, via Wikimedia Commons/)).toBeInTheDocument();
  const items = within(credits).getAllByRole('listitem');
  const texts = items.map((li) => li.textContent);
  expect(new Set(texts).size).toBe(texts.length);
  expect(items.length).toBeLessThan(5);
});
