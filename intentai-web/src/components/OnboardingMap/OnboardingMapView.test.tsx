import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { HomeBase } from '../../data/domain';
import { setReducedMotion } from '../../test/media';
import styles from './OnboardingMapView.module.css';
import OnboardingMapView, { OVERVIEW_CENTER, OVERVIEW_ZOOM, PAN_PX, PINNED_ZOOM, TILE_URL } from './OnboardingMapView';

// ---- Fake Leaflet: records camera calls, fires payload-bearing events, renders divIcon html. ----
type Handler = (e?: unknown) => void;

const fake = vi.hoisted(() => ({
  calls: [] as [string, ...unknown[]][],
  maps: [] as Array<Record<string, any>>,
  tiles: [] as Array<Record<string, any>>,
  markers: [] as Array<Record<string, any>>,
}));

vi.mock('leaflet', () => {
  const map = function map(el: HTMLElement, options: unknown) {
    const handlers: Record<string, Handler[]> = {};
    let center = { lat: 0, lng: 0 };
    let zoom = 0;
    const m = {
      el,
      options,
      removed: false,
      getCenter: () => center,
      getZoom: () => zoom,
      setView(c: { lat: number; lng: number }, z: number, opts?: unknown) {
        fake.calls.push(['setView', c, z, opts]);
        center = c;
        zoom = z;
        return m;
      },
      flyTo(c: { lat: number; lng: number }, z: number, opts?: unknown) {
        fake.calls.push(['flyTo', c, z, opts]);
        center = c;
        zoom = z;
        return m;
      },
      panBy(off: [number, number], opts?: unknown) {
        fake.calls.push(['panBy', off, opts]);
        // 1 px = 0.001 degree is enough for the tests.
        center = { lat: center.lat - off[1] / 1000, lng: center.lng + off[0] / 1000 };
        return m;
      },
      invalidateSize(opts?: unknown) {
        fake.calls.push(['invalidateSize', opts]);
        return m;
      },
      on(type: string, fn: Handler) {
        (handlers[type] ??= []).push(fn);
        return m;
      },
      fire(type: string, payload?: unknown) {
        for (const fn of handlers[type] ?? []) fn(payload);
      },
      remove() {
        m.removed = true;
        return m;
      },
    };
    fake.maps.push(m);
    return m;
  };
  const tileLayer = function tileLayer(url: string, options: unknown) {
    const handlers: Record<string, Handler[]> = {};
    const t = {
      url,
      options,
      on(type: string, fn: Handler) {
        (handlers[type] ??= []).push(fn);
        return t;
      },
      fire(type: string) {
        for (const fn of handlers[type] ?? []) fn();
      },
      addTo() {
        return t;
      },
    };
    fake.tiles.push(t);
    return t;
  };
  const divIcon = function divIcon(options: Record<string, unknown>) {
    return { options };
  };
  const marker = function marker(latlng: unknown, options: { icon: { options: Record<string, unknown> } }) {
    let el: HTMLElement | null = null;
    const mk = {
      latlng,
      options,
      removed: false,
      addTo(m: { el: HTMLElement }) {
        el = document.createElement('div');
        el.className = `leaflet-marker-icon ${String(options.icon.options.className ?? '')}`;
        el.innerHTML = String(options.icon.options.html ?? '');
        m.el.appendChild(el);
        return mk;
      },
      remove() {
        mk.removed = true;
        el?.remove();
        el = null;
        return mk;
      },
    };
    fake.markers.push(mk);
    return mk;
  };
  return { map, tileLayer, divIcon, marker };
});

type Props = ComponentProps<typeof OnboardingMapView>;

const UTOWN: HomeBase = { lat: 1.3049, lng: 103.7735, label: 'NUS UTown' };

function props(over: Partial<Props> = {}): Props {
  return { base: null, drops: 0, outSeq: 0, zoomed: false, onDrop: vi.fn(), onTilesFailed: vi.fn(), ...over };
}

const lastMap = () => fake.maps[fake.maps.length - 1];
const lastTiles = () => fake.tiles[fake.tiles.length - 1];
const liveMarkers = () => fake.markers.filter((m) => !m.removed);
const pinMarkers = () => liveMarkers().filter((m) => String(m.options.icon.options.html).includes('<svg'));
const mapEl = () => screen.getByRole('application');

beforeEach(() => {
  fake.calls.length = 0;
  fake.maps.length = 0;
  fake.tiles.length = 0;
  fake.markers.length = 0;
  setReducedMotion(false);
});

describe('OnboardingMapView', () => {
  it('turns every zoom interaction off and keeps the view inside Singapore', () => {
    render(<OnboardingMapView {...props()} />);
    expect(lastMap().options).toMatchObject({
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.5,
      minZoom: 12.5,
      maxZoom: 14.5,
      keyboard: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      touchZoom: false,
      boxZoom: false,
      maxBounds: [
        [1.2, 103.6],
        [1.47, 104.05],
      ],
      maxBoundsViscosity: 1,
    });
    expect(lastTiles().url).toBe(TILE_URL);
    expect(TILE_URL).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  });

  it('opens at the overview without a pin, and on the pin at the pinned zoom with one', () => {
    const { unmount } = render(<OnboardingMapView {...props()} />);
    expect(fake.calls[0]).toEqual(['setView', OVERVIEW_CENTER, OVERVIEW_ZOOM, { animate: false }]);
    unmount();
    fake.calls.length = 0;
    render(<OnboardingMapView {...props({ base: UTOWN, zoomed: true })} />);
    expect(fake.calls[0]).toEqual(['setView', UTOWN, PINNED_ZOOM, { animate: false }]);
  });

  it('a tap drops the pin at the tapped point', () => {
    const onDrop = vi.fn();
    render(<OnboardingMapView {...props({ onDrop })} />);
    fireEvent.pointerDown(mapEl());
    act(() => lastMap().fire('click', { latlng: { lat: 1.3, lng: 103.85 } }));
    expect(onDrop).toHaveBeenCalledWith({ lat: 1.3, lng: 103.85 });
  });

  it('a drag pans without dropping; the next tap drops again', () => {
    const onDrop = vi.fn();
    render(<OnboardingMapView {...props({ onDrop })} />);
    fireEvent.pointerDown(mapEl());
    act(() => lastMap().fire('dragstart', { target: lastMap() }));
    act(() => lastMap().fire('click', { latlng: { lat: 1.3, lng: 103.85 } }));
    expect(onDrop).not.toHaveBeenCalled();
    fireEvent.pointerDown(mapEl());
    act(() => lastMap().fire('click', { latlng: { lat: 1.31, lng: 103.8 } }));
    expect(onDrop).toHaveBeenCalledWith({ lat: 1.31, lng: 103.8 });
  });

  it('ignores a drop outside the home-base range', () => {
    const onDrop = vi.fn();
    render(<OnboardingMapView {...props({ onDrop })} />);
    act(() => lastMap().fire('click', { latlng: { lat: 1.6, lng: 103.85 } }));
    act(() => lastMap().fire('click', { latlng: { lat: 1.3, lng: 104.3 } }));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('keyboard: arrows pan by 80 px, Enter and Space drop at the centre', () => {
    const onDrop = vi.fn();
    render(<OnboardingMapView {...props({ onDrop })} />);
    const el = mapEl();
    expect(el).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    fireEvent.keyDown(el, { key: 'ArrowUp' });
    expect(fake.calls.filter((c) => c[0] === 'panBy').map((c) => c[1])).toEqual([
      [PAN_PX, 0],
      [0, -PAN_PX],
    ]);
    const centre = lastMap().getCenter();
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onDrop).toHaveBeenLastCalledWith(centre);
    fireEvent.keyDown(el, { key: ' ' });
    expect(onDrop).toHaveBeenCalledTimes(2);
  });

  it('keyboard pans without animation under reduced motion', () => {
    setReducedMotion(true);
    render(<OnboardingMapView {...props()} />);
    fireEvent.keyDown(mapEl(), { key: 'ArrowDown' });
    expect(fake.calls.find((c) => c[0] === 'panBy')).toEqual(['panBy', [0, PAN_PX], { animate: false }]);
  });

  it('a new drop flies to the pin at the pinned zoom and replays the pin', () => {
    const { rerender } = render(<OnboardingMapView {...props()} />);
    expect(pinMarkers()).toHaveLength(0);
    fake.calls.length = 0;
    rerender(<OnboardingMapView {...props({ base: UTOWN, drops: 1, zoomed: true })} />);
    expect(fake.calls).toContainEqual(['flyTo', UTOWN, PINNED_ZOOM, { duration: 0.8 }]);
    const first = pinMarkers();
    expect(first).toHaveLength(1);
    // Same spot again (locate twice): still recentres, with a fresh marker.
    fake.calls.length = 0;
    rerender(<OnboardingMapView {...props({ base: UTOWN, drops: 2, zoomed: true })} />);
    expect(fake.calls).toContainEqual(['flyTo', UTOWN, PINNED_ZOOM, { duration: 0.8 }]);
    expect(pinMarkers()).toHaveLength(1);
    expect(pinMarkers()[0]).not.toBe(first[0]);
  });

  it('moves without animation under reduced motion', () => {
    setReducedMotion(true);
    const { rerender } = render(<OnboardingMapView {...props()} />);
    fake.calls.length = 0;
    rerender(<OnboardingMapView {...props({ base: UTOWN, drops: 1, zoomed: true })} />);
    expect(fake.calls).toEqual([['setView', UTOWN, PINNED_ZOOM, { animate: false }]]);
  });

  it('zoom out goes to the overview zoom around the current centre', () => {
    const { rerender } = render(<OnboardingMapView {...props({ base: UTOWN, zoomed: true })} />);
    fake.calls.length = 0;
    rerender(<OnboardingMapView {...props({ base: UTOWN, zoomed: false, outSeq: 1 })} />);
    expect(fake.calls).toEqual([['flyTo', UTOWN, OVERVIEW_ZOOM, { duration: 0.8 }]]);
  });

  it('pin shows its label (escaped) with ping and drop animation', () => {
    const { container } = render(<OnboardingMapView {...props({ base: { lat: 1.3, lng: 103.8, label: 'Near <b>Dempsey</b>' } })} />);
    expect(container.querySelector('svg path')).toHaveAttribute('d', 'M20 49s16-14.5 16-28A16 16 0 0 0 4 21c0 13.5 16 28 16 28Z');
    expect(screen.getByText('Near <b>Dempsey</b>')).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
  });

  it('overview shows exactly the canvas 9 areas; pinned shows all 17 except the pin’s own area', () => {
    const OVERVIEW_9 = ['NUS UTown', 'Holland Village', 'Orchard', 'Chinatown', 'Marina Bay', 'Clementi', 'Novena', 'Bugis', 'Queenstown'];
    const ALL_17 = ['NUS UTown', 'Clementi', 'Kent Ridge', 'Buona Vista', 'Holland Village', 'Dempsey', 'Queenstown', 'Tanglin', 'Orchard', 'Tiong Bahru', 'Novena', 'Dhoby Ghaut', 'Little India', 'Bugis', 'Chinatown', 'Marina Bay', 'Toa Payoh'];
    const { container, rerender } = render(<OnboardingMapView {...props()} />);
    const areas = () => [...container.querySelectorAll<HTMLElement>('[data-area]')];
    // jsdom applies no stylesheet: mirror the module's opacity rule
    // (`[data-zoomed='false'] .area:not(.overview)` and `.areaHidden` are hidden).
    const visible = () => {
      const zoomed = container.querySelector('[data-zoomed]')!.getAttribute('data-zoomed') === 'true';
      return areas()
        .filter((a) => (zoomed || a.classList.contains(styles.overview)) && !a.classList.contains(styles.areaHidden))
        .map((a) => a.dataset.area)
        .sort();
    };
    const hidden = () => areas().map((a) => a.dataset.area).filter((n) => !visible().includes(n)).sort();

    expect(areas().map((a) => a.dataset.area).sort()).toEqual([...ALL_17].sort());
    expect(visible()).toEqual([...OVERVIEW_9].sort());
    expect(hidden()).toEqual(ALL_17.filter((n) => !OVERVIEW_9.includes(n)).sort());

    rerender(<OnboardingMapView {...props({ base: UTOWN, drops: 1, zoomed: true })} />);
    expect(visible()).toEqual(ALL_17.filter((n) => n !== 'NUS UTown').sort());
    expect(hidden()).toEqual(['NUS UTown']);
  });

  it('describes the pin in the map label', () => {
    const { rerender } = render(<OnboardingMapView {...props()} />);
    expect(mapEl()).toHaveAccessibleName('Map. Tap where you usually are to set your home base');
    rerender(<OnboardingMapView {...props({ base: UTOWN, drops: 1, zoomed: true })} />);
    expect(mapEl()).toHaveAccessibleName('Map. Home base set to NUS UTown. Tap elsewhere to move it');
    expect(mapEl()).toHaveAccessibleDescription('Arrow keys move the map. Enter drops the pin at the centre.');
  });

  it('reports failed tiles after 3 errors with no successful load', () => {
    const onTilesFailed = vi.fn();
    render(<OnboardingMapView {...props({ onTilesFailed })} />);
    lastTiles().fire('tileerror');
    lastTiles().fire('tileerror');
    lastTiles().fire('tileload');
    lastTiles().fire('tileerror');
    expect(onTilesFailed).not.toHaveBeenCalled();
    lastTiles().fire('tileerror');
    lastTiles().fire('tileerror');
    expect(onTilesFailed).toHaveBeenCalledTimes(1);
  });

  it('removes the map and its listeners on unmount', () => {
    const onDrop = vi.fn();
    const { unmount } = render(<OnboardingMapView {...props({ onDrop })} />);
    const m = lastMap();
    const el = m.el as HTMLElement;
    const remove = vi.spyOn(el, 'removeEventListener');
    unmount();
    expect(m.removed).toBe(true);
    expect(remove.mock.calls.map((c) => c[0]).sort()).toEqual(['mousedown', 'pointerdown', 'touchstart']);
    expect(liveMarkers()).toHaveLength(0);
  });
});
