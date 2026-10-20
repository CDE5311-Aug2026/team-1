import { describe, expect, test, vi } from 'vitest';
import { fixInSingapore, locationStatusText } from './components/LocationFlow';
import { LOCATION_OPTIONS, getLocationState, isPrecise, requestLocation, stopLocation } from './location';

const pos = (lat: number, lng: number, accuracy: number) =>
  ({ coords: { latitude: lat, longitude: lng, accuracy }, timestamp: 123 }) as unknown as GeolocationPosition;

function geo(respond: (ok: PositionCallback, err: PositionErrorCallback) => void) {
  const getCurrentPosition = vi.fn((ok: PositionCallback, err?: PositionErrorCallback | null, _options?: PositionOptions) => respond(ok, err!));
  return { geolocation: { getCurrentPosition } as unknown as Geolocation, getCurrentPosition };
}

describe('location controller', () => {
  test('one request with a 10 s timeout and 60 s maximum age; latitude, longitude, accuracy and time are read', async () => {
    const { geolocation, getCurrentPosition } = geo((ok) => ok(pos(1.2804, 103.8448, 25)));
    const state = await requestLocation(geolocation);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition.mock.calls[0][2]).toBe(LOCATION_OPTIONS);
    expect(LOCATION_OPTIONS).toMatchObject({ timeout: 10_000, maximumAge: 60_000 });
    expect(state).toEqual({ status: 'active', fix: { lat: 1.2804, lng: 103.8448, accuracyM: 25, timestamp: 123 } });
    expect(isPrecise(state.fix)).toBe(true);
    expect(fixInSingapore(state)).toBe(true);
    expect(locationStatusText(state)).toBeNull();
    // Nothing is stored anywhere.
    expect(Object.keys(window.localStorage).some((k) => window.localStorage.getItem(k)?.includes('103.8448'))).toBe(false);
  });

  test('an inaccurate fix is "approximate"', async () => {
    const state = await requestLocation(geo((ok) => ok(pos(1.3, 103.85, 1200))).geolocation);
    expect(isPrecise(state.fix)).toBe(false);
    expect(locationStatusText(state)).toMatch(/Approximate location/);
  });

  test('a fix outside Singapore keeps manual exploration (no relocation, no dot)', async () => {
    const kl = await requestLocation(geo((ok) => ok(pos(3.139, 101.687, 20))).geolocation);
    expect(fixInSingapore(kl)).toBe(false);
    expect(locationStatusText(kl)).toMatch(/Nearby works in Singapore/);
    // Johor Bahru is across the strait: in Malaysia, not counted as Singapore.
    const jb = await requestLocation(geo((ok) => ok(pos(1.4927, 103.7414, 20))).geolocation);
    expect(fixInSingapore(jb)).toBe(false);
  });

  test.each([
    [1, 'denied', /permission is off/],
    [2, 'unavailable', /not available/],
    [3, 'timeout', /took too long/],
  ])('error code %i → %s', async (code, status, text) => {
    const state = await requestLocation(geo((_ok, err) => err({ code } as GeolocationPositionError)).geolocation);
    expect(state.status).toBe(status);
    expect(state.fix).toBeUndefined();
    expect(locationStatusText(state)).toMatch(text);
  });

  test('no geolocation → unsupported', async () => {
    expect((await requestLocation(undefined)).status).toBe('unsupported');
  });

  test('switching off while a request is pending clears it, and the late answer cannot turn it back on', async () => {
    let answer: PositionCallback | undefined;
    const pending = requestLocation(geo((ok) => (answer = ok)).geolocation);
    expect(getLocationState().status).toBe('requesting');
    stopLocation();
    expect(getLocationState()).toEqual({ status: 'manual' });
    answer!(pos(1.28, 103.84, 10));
    await pending;
    expect(getLocationState()).toEqual({ status: 'manual' });
  });

  test('a newer request wins over a slower older one', async () => {
    let slow: PositionCallback | undefined;
    const first = requestLocation(geo((ok) => (slow = ok)).geolocation);
    await requestLocation(geo((ok) => ok(pos(1.35, 103.82, 30))).geolocation);
    slow!(pos(1.29, 103.85, 10));
    await first;
    expect(getLocationState().fix).toMatchObject({ lat: 1.35, lng: 103.82 });
  });
});
