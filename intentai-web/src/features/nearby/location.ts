// Permission-aware, in-memory location controller (PRD NBR 03–06).
// The precise position lives only in this module's memory: never in storage, URLs, exports or analytics.
// One-time request (10 s timeout, 60 s maximum age); no background watch. Every request carries a
// generation number, so a late callback after "off", a newer request or data deletion is ignored.
import { useSyncExternalStore } from 'react';
import type { LatLng } from './types';

export type LocationStatus = 'manual' | 'requesting' | 'active' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export interface LocationFix extends LatLng {
  accuracyM: number;
  timestamp: number;
}

export interface LocationState {
  status: LocationStatus;
  fix?: LocationFix;
}

/** Worse than this, the UI says "Approximate location" and gives no distances "from you". */
export const APPROXIMATE_ACCURACY_M = 500;
export const LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 };

let state: LocationState = { status: 'manual' };
let generation = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(next: LocationState) {
  state = next;
  emit();
}

export function getLocationState(): LocationState {
  return state;
}

export function isPrecise(fix: LocationFix | undefined): fix is LocationFix {
  return !!fix && Number.isFinite(fix.accuracyM) && fix.accuracyM <= APPROXIMATE_ACCURACY_M;
}

/** Requests one position. Resolves with the resulting state (also published to subscribers). */
export function requestLocation(geolocation: Geolocation | undefined = typeof navigator !== 'undefined' ? navigator.geolocation : undefined): Promise<LocationState> {
  const mine = ++generation;
  if (!geolocation) {
    set({ status: 'unsupported' });
    return Promise.resolve(state);
  }
  set({ status: 'requesting' });
  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        if (mine !== generation) return resolve(state); // switched off or superseded meanwhile
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          set({ status: 'unavailable' });
        } else {
          set({
            status: 'active',
            fix: { lat: latitude, lng: longitude, accuracyM: Number.isFinite(accuracy) ? accuracy : Infinity, timestamp: position.timestamp },
          });
        }
        resolve(state);
      },
      (error) => {
        if (mine !== generation) return resolve(state);
        const status: LocationStatus =
          error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable';
        set({ status });
        resolve(state);
      },
      LOCATION_OPTIONS,
    );
  });
}

/** Location off: clears the position immediately and invalidates pending callbacks. */
export function stopLocation() {
  generation++;
  set({ status: 'manual' });
}

export function subscribeLocation(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLocationState(): LocationState {
  return useSyncExternalStore(subscribeLocation, getLocationState);
}

/** Test-only reset. */
export function resetLocationForTests() {
  generation++;
  state = { status: 'manual' };
}
