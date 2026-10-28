import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { HOME_BASE, homePlace, visiblePins } from '../../data/homePlaces';
import type { LatLng } from '../../features/nearby/types';
import { setReducedMotion } from '../../test/media';
import { triggerResize } from '../../test/resizeObserver';
import HomeMap from './HomeMap';
import HomeMapFrame from './HomeMapFrame';
import { offsetCentre, visibleCentre, type MapCommand } from './camera';

// ---- Fake Leaflet: records camera calls, renders divIcon html like Leaflet does. ----
interface XY {
  x: number;
  y: number;
}

const fake = vi.hoisted(() => ({
  calls: [] as [string, ...unknown[]][],
  maps: [] as Array<Record<string, any>>,
  tiles: [] as Array<Record<string, any>>,
  markers: [] as Array<Record<string, any>>,
}));

/** Linear stand-in for Web Mercator: 1 degree = 2^zoom px, y grows southwards. */
const fakeProject = (ll: LatLng, z: number): XY => ({ x: ll.lng * 2 ** z, y: -ll.lat * 2 ** z });
const fakeUnproject = (p: XY, z: number): LatLng => ({ lat: -p.y / 2 ** z, lng: p.x / 2 ** z });

vi.mock('leaflet', () => {
  const proj = (ll: { lat: number; lng: number }, z: number) => ({ x: ll.lng * 2 ** z, y: -ll.lat * 2 ** z });
  const unproj = (p: [number, number] | { x: number; y: number }, z: number) => {
    const [x, y] = Array.isArray(p) ? p : [p.x, p.y];
    return { lat: -y / 2 ** z, lng: x / 2 ** z };
  };
  const map = function map(el: HTMLElement, options: unknown) {
    const handlers: Record<string, Array<() => void>> = {};
    let center = { lat: 0, lng: 0 };
    let zoom = 0;
    const m = {
      el,
      options,
      removed: false,
      /** Test hook: what Leaflet's stop() does to the view (it snaps a running flight's zoom). */
      onStop: null as null | (() => void),
      /** Test hook: leave moves running; the test fires their moveend. */
      deferEnd: false,
      project: (ll: { lat: number; lng: number }, z: number) => proj(ll, z),
      unproject: (p: [number, number], z: number) => unproj(p, z),
      getCenter: () => center,
      getZoom: () => zoom,
      getContainer: () => el,
      stop() {
        fake.calls.push(['stop']);
        m.onStop?.();
        return m;
      },
      // Moves end at once (as with animate: false), firing zoomend (if the zoom changed) then moveend.
      end(prevZoom: number) {
        if (m.deferEnd) return;
        if (zoom !== prevZoom) m.fire('zoomend');
        m.fire('moveend');
      },
      clamp(z: number) {
        const o = options as { minZoom?: number; maxZoom?: number };
        return Math.min(o.maxZoom ?? Infinity, Math.max(o.minZoom ?? -Infinity, z));
      },
      setView(c: { lat: number; lng: number }, z: number, opts?: unknown) {
        fake.calls.push(['setView', c, z, opts]);
        const z0 = zoom;
        center = c;
        zoom = m.clamp(z);
        m.end(z0);
        return m;
      },
      flyTo(c: { lat: number; lng: number }, z: number, opts?: unknown) {
        fake.calls.push(['flyTo', c, z, opts]);
        const z0 = zoom;
        center = c;
        zoom = m.clamp(z);
        m.end(z0);
        return m;
      },
      panTo(c: { lat: number; lng: number }, opts?: unknown) {
        fake.calls.push(['panTo', c, opts]);
        center = c;
        m.end(zoom);
        return m;
      },
      panBy(off: [number, number], opts?: unknown) {
        fake.calls.push(['panBy', off, opts]);
        const p = proj(center, zoom);
        center = unproj([p.x + off[0], p.y + off[1]], zoom);
        m.end(zoom);
        return m;
      },
      invalidateSize(opts?: unknown) {
        fake.calls.push(['invalidateSize', opts]);
        return m;
      },
      /** Test helper: a manual pan/zoom by the user (not recorded as a camera call). */
      userMove(c: { lat: number; lng: number }, z: number) {
        center = c;
        zoom = z;
      },
      on(type: string, fn: () => void) {
        (handlers[type] ??= []).push(fn);
        return m;
      },
      fire(type: string) {
        for (const fn of handlers[type] ?? []) fn();
      },
      remove() {
        m.removed = true;
        el.innerHTML = '';
        return m;
      },
    };
    fake.maps.push(m);
    return m;
  };
  const tileLayer = function tileLayer(url: string, options: unknown) {
    const handlers: Record<string, Array<() => void>> = {};
    const t = {
      url,
      options,
      on(type: string, fn: () => void) {
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
  const marker = function marker(latlng: unknown, options: { icon: { options: Record<string, unknown> }; keyboard?: boolean; interactive?: boolean }) {
    let el: HTMLElement | null = null;
    const mk = {
      latlng,
      options,
      addTo(m: { el: HTMLElement }) {
        // As Leaflet 1.9: a div with the divIcon html; keyboard adds tabindex + role="button".
        el = document.createElement('div');
        el.className = `leaflet-marker-icon ${String(options.icon.options.className ?? '')}`;
        el.innerHTML = String(options.icon.options.html ?? '');
        if (options.keyboard !== false) {
          el.tabIndex = 0;
          el.setAttribute('role', 'button');
        }
        if (options.interactive !== false) el.classList.add('leaflet-interactive');
        m.el.appendChild(el);
        return mk;
      },
      getElement: () => el ?? undefined,
      remove() {
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

const BERLIN = homePlace('berlin-wall-fragments')!;
const CHINATOWN = homePlace('chinatown')!;
const HAW_PAR = homePlace('curated:sg-haw-par-villa')!;
const HOLLAND = homePlace('curated:sg-holland-village')!;

type MapProps = ComponentProps<typeof HomeMap>;

function baseProps(over: Partial<MapProps> = {}): MapProps {
  return {
    pins: visiblePins('berlin-wall-fragments'),
    selectedId: 'berlin-wall-fragments',
    command: { seq: 0, kind: 'focus', target: BERLIN.point, fly: false },
    lastFocus: BERLIN.point,
    zoom: 16,
    bottomInset: 200,
    onPinActivate: vi.fn(),
    onTilesFailed: vi.fn(),
    onUserZoom: vi.fn(),
    ...over,
  };
}

const oc = (t: LatLng, z: number, inset = 200) => offsetCentre(fakeProject, fakeUnproject, t, z, inset);
const vc = (c: LatLng, z: number, inset = 200) => visibleCentre(fakeProject, fakeUnproject, c, z, inset);
const MOVES = new Set(['setView', 'flyTo', 'panTo', 'panBy']);
const moves = () => fake.calls.filter((c) => MOVES.has(c[0]));
const lastMap = () => fake.maps[fake.maps.length - 1];
const lastTiles = () => fake.tiles[fake.tiles.length - 1];

function expectLatLng(actual: unknown, expected: LatLng) {
  const a = actual as LatLng;
  expect(a.lat).toBeCloseTo(expected.lat, 9);
  expect(a.lng).toBeCloseTo(expected.lng, 9);
}

function focus(seq: number, target: LatLng, fly: boolean): MapCommand {
  return { seq, kind: 'focus', target, fly };
}
function zoomCmd(seq: number, delta: 1 | -1): MapCommand {
  return { seq, kind: 'zoom', delta };
}

beforeEach(() => {
  fake.calls.length = 0;
  fake.maps.length = 0;
  fake.tiles.length = 0;
  fake.markers.length = 0;
});

describe('camera', () => {
  const project = (ll: LatLng): XY => ({ x: ll.lng, y: ll.lat });
  const unproject = (p: XY): LatLng => ({ lat: p.y, lng: p.x });

  it('offsetCentre puts the centre half the inset below the target', () => {
    const c = offsetCentre(project, unproject, { lat: 0, lng: 0 }, 16, 200);
    expect(project(c)).toEqual({ x: 0, y: 100 });
  });

  it('visibleCentre is the inverse of offsetCentre', () => {
    const p = { lat: 1.2834, lng: 103.8443 };
    const back = visibleCentre(fakeProject, fakeUnproject, offsetCentre(fakeProject, fakeUnproject, p, 17, 240), 17, 240);
    expectLatLng(back, p);
  });
});

describe('HomeMap', () => {
  it('creates an OpenStreetMap layer with its own controls off', () => {
    render(<HomeMap {...baseProps()} />);
    expect(lastMap().options).toMatchObject({ zoomControl: false, attributionControl: false, minZoom: 12, maxZoom: 19 });
    expect(lastTiles().url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(lastTiles().options).toMatchObject({ maxZoom: 19 });
  });

  it('shows 4 pins, then 5 with a fly to Chinatown when it is selected', () => {
    const { rerender, container } = render(<HomeMap {...baseProps()} />);
    expect(within(container).getAllByRole('button')).toHaveLength(4);
    fake.calls.length = 0;
    rerender(
      <HomeMap
        {...baseProps({ pins: visiblePins('chinatown'), selectedId: 'chinatown', command: focus(1, CHINATOWN.point, true), lastFocus: CHINATOWN.point })}
      />,
    );
    expect(within(container).getAllByRole('button')).toHaveLength(5);
    expect(fake.calls.map((c) => c[0])).toEqual(['stop', 'flyTo']);
    expectLatLng(fake.calls[1][1], oc(CHINATOWN.point, 16));
    expect(fake.calls[1][2]).toBe(16);
    expect(fake.calls[1][3]).toMatchObject({ animate: true, duration: 0.6 });
  });

  it('a new selection with the same command does not move the camera', () => {
    const { rerender } = render(<HomeMap {...baseProps()} />);
    fake.calls.length = 0;
    rerender(<HomeMap {...baseProps({ selectedId: HAW_PAR.id })} />);
    expect(moves()).toEqual([]);
    expect(screen.getByRole('button', { name: HAW_PAR.name })).toHaveAttribute('data-selected', 'true');
    expect(screen.getByRole('button', { name: BERLIN.name })).toHaveAttribute('data-selected', 'false');
  });

  it('mounts at the current focus, not at Berlin, when it loads late', () => {
    render(
      <HomeMap
        {...baseProps({ pins: visiblePins('chinatown'), selectedId: 'chinatown', command: focus(5, CHINATOWN.point, true), lastFocus: CHINATOWN.point })}
      />,
    );
    const first = moves()[0];
    expect(first[0]).toBe('setView');
    expectLatLng(first[1], oc(CHINATOWN.point, 16));
    expect(first[2]).toBe(16);
    expect(moves()).toHaveLength(1);
  });

  it('compensates a bottomInset change with panBy only, keeping a manual pan', () => {
    const { rerender } = render(<HomeMap {...baseProps({ bottomInset: 100 })} />);
    lastMap().userMove(HOLLAND.point, 15);
    fake.calls.length = 0;
    rerender(<HomeMap {...baseProps({ bottomInset: 160 })} />);
    expect(moves()).toEqual([['panBy', [0, 30], { animate: false }]]);
  });

  it('applies a batched focus + zoom as one absolute move', () => {
    const { rerender } = render(<HomeMap {...baseProps({ command: focus(1, BERLIN.point, false) })} />);
    fake.calls.length = 0;
    rerender(<HomeMap {...baseProps({ command: zoomCmd(3, 1), lastFocus: CHINATOWN.point, zoom: 17 })} />);
    expect(moves()).toHaveLength(1);
    const [kind, centre, z] = moves()[0];
    expect(kind).toBe('flyTo');
    expectLatLng(centre, oc(CHINATOWN.point, 17));
    expect(z).toBe(17);
    expect(fake.calls[0][0]).toBe('stop');
  });

  it('a batched nearby jump uses setView, not flyTo', () => {
    const { rerender } = render(<HomeMap {...baseProps()} />);
    fake.calls.length = 0;
    const nus = homePlace('curated:sg-national-university-of-singapore')!;
    rerender(<HomeMap {...baseProps({ command: zoomCmd(2, 1), lastFocus: nus.point, zoom: 17 })} />);
    expect(moves()).toHaveLength(1);
    expect(moves()[0][0]).toBe('setView');
    expectLatLng(moves()[0][1], oc(nus.point, 17));
  });

  it('zooms around the centre of the visible area', () => {
    const { rerender } = render(<HomeMap {...baseProps()} />);
    const manual = { lat: 1.31, lng: 103.78 };
    lastMap().userMove(manual, 16);
    fake.calls.length = 0;
    rerender(<HomeMap {...baseProps({ command: zoomCmd(1, 1), zoom: 17 })} />);
    expect(moves()).toHaveLength(1);
    const [kind, centre, z] = moves()[0];
    expect(kind).toBe('setView');
    expectLatLng(centre, oc(vc(manual, 16), 17));
    expect(z).toBe(17);
  });

  it('a newer command stops the running pan first', () => {
    const { rerender } = render(<HomeMap {...baseProps()} />);
    fake.calls.length = 0;
    rerender(<HomeMap {...baseProps({ command: focus(1, HAW_PAR.point, false), lastFocus: HAW_PAR.point })} />);
    rerender(<HomeMap {...baseProps({ command: focus(2, HOLLAND.point, false), lastFocus: HOLLAND.point })} />);
    rerender(<HomeMap {...baseProps({ command: focus(3, CHINATOWN.point, true), lastFocus: CHINATOWN.point })} />);
    expect(fake.calls.map((c) => c[0])).toEqual(['stop', 'panTo', 'stop', 'panTo', 'stop', 'flyTo']);
    expectLatLng(fake.calls[1][1], oc(HAW_PAR.point, 16));
    expect(fake.calls[1][2]).toMatchObject({ animate: true, duration: 0.6 });
    expectLatLng(fake.calls[5][1], oc(CHINATOWN.point, 16));
  });

  it('moves without animation under reduced motion', () => {
    setReducedMotion(true);
    const { rerender } = render(<HomeMap {...baseProps()} />);
    fake.calls.length = 0;
    rerender(<HomeMap {...baseProps({ command: focus(1, HAW_PAR.point, false) })} />);
    rerender(<HomeMap {...baseProps({ command: focus(2, CHINATOWN.point, true) })} />);
    rerender(<HomeMap {...baseProps({ command: zoomCmd(3, 1), zoom: 17 })} />);
    const m = moves();
    expect(m.map((c) => c[0])).toEqual(['panTo', 'flyTo', 'setView']);
    expect(m[0][2]).toMatchObject({ animate: false });
    expect(m[1][3]).toMatchObject({ animate: false });
    expect(m[2][3]).toMatchObject({ animate: false });
  });

  it('reports a manual zoom, but not its own', () => {
    const onUserZoom = vi.fn();
    render(<HomeMap {...baseProps({ onUserZoom })} />);
    lastMap().fire('zoomend');
    expect(onUserZoom).not.toHaveBeenCalled();
    lastMap().userMove(BERLIN.point, 18);
    lastMap().fire('zoomend');
    expect(onUserZoom).toHaveBeenCalledWith(18);
  });

  it('a flight interrupted by stop() is not reported as a user zoom, and the next pan lands on props.zoom', () => {
    const onUserZoom = vi.fn();
    const { rerender } = render(<HomeMap {...baseProps({ onUserZoom })} />);
    rerender(<HomeMap {...baseProps({ onUserZoom, command: zoomCmd(1, 1), zoom: 17 })} />);
    rerender(<HomeMap {...baseProps({ onUserZoom, zoom: 17, command: focus(2, CHINATOWN.point, true), lastFocus: CHINATOWN.point })} />);
    const map = lastMap();
    // Mid-flight: Leaflet is zoomed out to 14.6; its stop() snaps to 15 and fires zoomend + moveend.
    map.userMove({ lat: 1.29, lng: 103.81 }, 14.6);
    map.onStop = () => {
      map.userMove(map.getCenter(), 15);
      map.fire('zoomend');
      map.fire('moveend');
    };
    fake.calls.length = 0;
    rerender(<HomeMap {...baseProps({ onUserZoom, zoom: 17, command: focus(3, HAW_PAR.point, false), lastFocus: HAW_PAR.point })} />);
    expect(onUserZoom).not.toHaveBeenCalled();
    // Mid-flight, Leaflet's stop() would start an animated snap that swallows the next setView: skipped.
    expect(fake.calls.map((c) => c[0])).not.toContain('stop');
    expect(map.getZoom()).toBe(17);
    const m = moves();
    expect(m).toHaveLength(1);
    expect(m[0][0]).toBe('setView');
    expectLatLng(m[0][1], oc(HAW_PAR.point, 17));
    expect(m[0][2]).toBe(17);
    // Once our move has settled, a real user zoom is reported again.
    map.onStop = null;
    map.userMove(map.getCenter(), 16);
    map.fire('zoomend');
    expect(onUserZoom).toHaveBeenCalledWith(16);
  });

  it('a user zoom during our pan is reported when the pan ends', () => {
    const onUserZoom = vi.fn();
    const { rerender } = render(<HomeMap {...baseProps({ onUserZoom })} />);
    const map = lastMap();
    map.deferEnd = true;
    rerender(<HomeMap {...baseProps({ onUserZoom, command: focus(1, HAW_PAR.point, false), lastFocus: HAW_PAR.point })} />);
    // A pinch the container did not see as input (no touchstart): its zoomend lands mid-pan.
    map.userMove(map.getCenter(), 18);
    map.fire('zoomend');
    expect(onUserZoom).not.toHaveBeenCalled();
    map.fire('moveend');
    expect(onUserZoom).toHaveBeenCalledWith(18);
    // The phase is over: the next user zoom is reported straight away.
    map.deferEnd = false;
    map.userMove(map.getCenter(), 15);
    map.fire('zoomend');
    expect(onUserZoom).toHaveBeenLastCalledWith(15);
  });

  it('user input during our move ends our phase at once', () => {
    const onUserZoom = vi.fn();
    const { rerender, container } = render(<HomeMap {...baseProps({ onUserZoom })} />);
    const map = lastMap();
    map.deferEnd = true;
    rerender(<HomeMap {...baseProps({ onUserZoom, command: focus(1, HAW_PAR.point, false), lastFocus: HAW_PAR.point })} />);
    fireEvent.wheel(container.firstElementChild!);
    map.userMove(map.getCenter(), 17);
    map.fire('zoomend');
    expect(onUserZoom).toHaveBeenCalledWith(17);

    onUserZoom.mockClear();
    rerender(<HomeMap {...baseProps({ onUserZoom, command: focus(2, HOLLAND.point, false), lastFocus: HOLLAND.point })} />);
    map.fire('dragstart');
    map.userMove(map.getCenter(), 14);
    map.fire('zoomend');
    expect(onUserZoom).toHaveBeenCalledWith(14);
  });

  it('a zoom Leaflet clamps is reported as clamped, and later user zooms still are', () => {
    const onUserZoom = vi.fn();
    const { rerender } = render(<HomeMap {...baseProps({ onUserZoom, zoom: 19 })} />);
    rerender(<HomeMap {...baseProps({ onUserZoom, zoom: 20, command: zoomCmd(1, 1) })} />);
    expect(lastMap().getZoom()).toBe(19);
    expect(onUserZoom).toHaveBeenCalledWith(19);
    onUserZoom.mockClear();
    lastMap().userMove(lastMap().getCenter(), 16);
    lastMap().fire('zoomend');
    expect(onUserZoom).toHaveBeenCalledWith(16);
  });

  it('refreshes its size when the container resizes, keeping the centre', () => {
    const { container } = render(<HomeMap {...baseProps()} />);
    fake.calls.length = 0;
    triggerResize(container.firstElementChild!, { width: 360, height: 520 });
    expect(fake.calls).toEqual([['invalidateSize', { pan: true }]]);
  });

  it('names the map region', () => {
    render(<HomeMap {...baseProps()} />);
    expect(screen.getByRole('region', { name: 'Map of places near you' })).toBeInTheDocument();
  });

  it('each pin is one button named by the place; the marker element is not focusable', () => {
    const onPinActivate = vi.fn();
    const { container } = render(<HomeMap {...baseProps({ onPinActivate })} />);
    const markers = container.querySelectorAll('.leaflet-marker-icon');
    const pinMarkers = [...markers].filter((m) => m.querySelector('button'));
    expect(pinMarkers).toHaveLength(4);
    for (const m of pinMarkers) {
      expect(m.querySelectorAll('button')).toHaveLength(1);
      expect(m).not.toHaveAttribute('tabindex');
      expect(m).not.toHaveAttribute('role');
    }
    for (const mk of fake.markers) expect(mk.options).toMatchObject({ keyboard: false, interactive: false });
    for (const p of visiblePins('berlin-wall-fragments')) expect(screen.getByRole('button', { name: p.name })).toHaveAttribute('type', 'button');
    fireEvent.click(screen.getByRole('button', { name: HAW_PAR.name }));
    expect(onPinActivate).toHaveBeenCalledTimes(1);
    expect(onPinActivate).toHaveBeenCalledWith(HAW_PAR.id);
  });

  it('escapes place names in pin markup', () => {
    const odd = { ...HAW_PAR, id: 'odd', name: 'A <b>"Q"</b> & co' };
    render(<HomeMap {...baseProps({ pins: [odd], selectedId: 'odd' })} />);
    expect(screen.getByRole('button', { name: 'A <b>"Q"</b> & co' })).toBeInTheDocument();
  });

  it('adds a non-interactive home-base dot', () => {
    const { container } = render(<HomeMap {...baseProps()} />);
    const you = fake.markers.find((m) => (m.latlng as LatLng).lat === HOME_BASE.lat && (m.latlng as LatLng).lng === HOME_BASE.lng);
    expect(you).toBeDefined();
    expect(you!.getElement()).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('button')).toHaveLength(4);
  });
});

describe('HomeMapFrame', () => {
  type FrameProps = ComponentProps<typeof HomeMapFrame>;
  function frameProps(over: Partial<FrameProps> = {}): FrameProps {
    return {
      ...baseProps(),
      onSearch: vi.fn(),
      onLocate: vi.fn(),
      onZoom: vi.fn(),
      ...over,
    } as FrameProps;
  }
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('renders the pill, count chip, controls and attribution, and wires them', async () => {
    const p = frameProps();
    render(<HomeMapFrame {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Near you · NUS University Town' }));
    expect(p.onSearch).toHaveBeenCalledTimes(1);
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === '4 places to explore')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(p.onZoom).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(p.onZoom).toHaveBeenLastCalledWith(-1);
    fireEvent.click(screen.getByRole('button', { name: 'Show my home base' }));
    expect(p.onLocate).toHaveBeenCalledTimes(1);
    const link = screen.getByRole('link', { name: '© OpenStreetMap contributors' });
    expect(link).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
    // The lazy map (default loader) arrives with its pins.
    expect(await screen.findByRole('button', { name: BERLIN.name })).toBeInTheDocument();
  });

  it('mounts with the zoom reached while the chunk was loading', async () => {
    let resolve!: (m: { default: typeof HomeMap }) => void;
    const loadMap = () => new Promise<{ default: typeof HomeMap }>((r) => (resolve = r));
    const { rerender } = render(<HomeMapFrame {...frameProps({ loadMap })} />);
    rerender(<HomeMapFrame {...frameProps({ loadMap, command: zoomCmd(1, 1), zoom: 17 })} />);
    rerender(<HomeMapFrame {...frameProps({ loadMap, command: zoomCmd(2, 1), zoom: 18 })} />);
    await act(async () => resolve({ default: HomeMap }));
    await screen.findByRole('button', { name: BERLIN.name });
    expect(moves()).toHaveLength(1);
    expect(moves()[0][0]).toBe('setView');
    expectLatLng(moves()[0][1], oc(BERLIN.point, 18));
    expect(moves()[0][2]).toBe(18);
  });

  it('forwards manual zoom', async () => {
    const onUserZoom = vi.fn();
    render(<HomeMapFrame {...frameProps({ onUserZoom })} />);
    await screen.findByRole('button', { name: BERLIN.name });
    lastMap().userMove(BERLIN.point, 15);
    lastMap().fire('zoomend');
    expect(onUserZoom).toHaveBeenCalledWith(15);
  });

  it('keeps zoom across a fly and a Retry', async () => {
    const { rerender } = render(<HomeMapFrame {...frameProps()} />);
    await screen.findByRole('button', { name: BERLIN.name });
    rerender(<HomeMapFrame {...frameProps({ command: zoomCmd(1, 1), zoom: 17 })} />);
    rerender(<HomeMapFrame {...frameProps({ command: zoomCmd(2, 1), zoom: 18 })} />);
    const chin = { pins: visiblePins('chinatown'), selectedId: 'chinatown', lastFocus: CHINATOWN.point, zoom: 18 };
    fake.calls.length = 0;
    rerender(<HomeMapFrame {...frameProps({ ...chin, command: focus(3, CHINATOWN.point, true) })} />);
    expect(moves()).toHaveLength(1);
    expect(moves()[0][0]).toBe('flyTo');
    expectLatLng(moves()[0][1], oc(CHINATOWN.point, 18));
    expect(moves()[0][2]).toBe(18);

    act(() => {
      for (let i = 0; i < 3; i++) lastTiles().fire('tileerror');
    });
    fake.calls.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('button', { name: 'Chinatown' });
    expect(moves()[0][0]).toBe('setView');
    expectLatLng(moves()[0][1], oc(CHINATOWN.point, 18));
    expect(moves()[0][2]).toBe(18);

    fake.calls.length = 0;
    rerender(<HomeMapFrame {...frameProps({ ...chin, zoom: 17, command: zoomCmd(4, -1) })} />);
    expect(moves()).toHaveLength(1);
    expect(moves()[0][0]).toBe('setView');
    expectLatLng(moves()[0][1], oc(CHINATOWN.point, 17));
    expect(moves()[0][2]).toBe(17);
  });

  it('shows "Map unavailable" after 3 tile errors in 5 s, and Retry restores the map', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    render(<HomeMapFrame {...frameProps()} />);
    await screen.findByRole('button', { name: BERLIN.name });
    const fire = (type: string) => act(() => lastTiles().fire(type));

    // 2 errors, a load, 2 errors: fine.
    fire('tileerror');
    fire('tileerror');
    fire('tileload');
    fire('tileerror');
    fire('tileerror');
    expect(screen.queryByText('Map unavailable')).not.toBeInTheDocument();

    // Errors spread over more than 5 s: fine. (Window now holds the 2 errors above at t0.)
    now += 6000;
    fire('tileerror');
    now += 6000;
    fire('tileerror');
    expect(screen.queryByText('Map unavailable')).not.toBeInTheDocument();

    now += 1000;
    fire('tileerror');
    fire('tileerror');
    expect(screen.getByText('Map unavailable')).toBeInTheDocument();
    expect(lastMap().removed).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: BERLIN.name })).toBeInTheDocument();
    expect(screen.queryByText('Map unavailable')).not.toBeInTheDocument();
  });

  it('shows the error state when the map chunk fails, and Retry loads it afresh', async () => {
    const loadMap = vi
      .fn<() => Promise<{ default: typeof HomeMap }>>()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValue({ default: HomeMap });
    // React rethrows the boundary's error to window; jsdom would print it.
    const quiet = (e: ErrorEvent) => e.preventDefault();
    window.addEventListener('error', quiet);
    render(<HomeMapFrame {...frameProps({ loadMap })} />);
    expect(await screen.findByText('Map unavailable')).toBeInTheDocument();
    window.removeEventListener('error', quiet);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: BERLIN.name })).toBeInTheDocument();
    expect(loadMap).toHaveBeenCalledTimes(2);
  });
});
