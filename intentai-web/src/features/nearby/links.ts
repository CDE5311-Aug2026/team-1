// External links and the 3D view address. None of them sends the user's position to a server.
import type { CuratedPlace } from './domain';
import type { LatLng } from './types';

/**
 * Google Maps directions to the destination's coordinates. No origin: the user picks it (and walking,
 * transit or driving) in Google Maps. This is a plain link; the app makes no Google API call.
 */
export function directionsUrl(place: Pick<CuratedPlace, 'coordinates'>): string {
  const { lat, lng } = place.coordinates;
  const params = new URLSearchParams({ api: '1', destination: `${lat.toFixed(6)},${lng.toFixed(6)}` });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * The phone-friendly EARTH ONLINE 3D page: bundled under /earth-online/sg/lite.html (built by
 * scripts/sync-earth-online.mjs), or VITE_EARTH_ONLINE_SG_URL.
 */
export function earthOnline3dBase(): string {
  const configured = import.meta.env.VITE_EARTH_ONLINE_SG_URL as string | undefined;
  return configured && configured.trim() ? configured.trim() : `${import.meta.env.BASE_URL}earth-online/sg/lite.html`;
}

/** The origin the 3D page runs on, for postMessage. */
export function earthOnline3dOrigin(): string {
  try {
    return new URL(earthOnline3dBase(), window.location.href).origin;
  } catch {
    return window.location.origin;
  }
}

/** What the 3D view shows: a point, and the landmark card to open when the dataset has a model for it. */
export interface View3DTarget {
  at: LatLng;
  card?: string;
  /** Pin the point (places without a model, "you"). Default: pinned when there is no card. */
  pin?: boolean;
}

export function view3dTarget(place: Pick<CuratedPlace, 'earthKey' | 'coordinates'>): View3DTarget {
  return place.earthKey ? { at: place.coordinates, card: place.earthKey } : { at: place.coordinates };
}

/**
 * The 3D page address. Everything is in the hash (#at=…&card=…), which browsers never send to a server,
 * so even a "near you" view does not put the position in a request.
 */
export function view3dUrl(target: View3DTarget, opts: { still?: boolean; hideCards?: boolean; lang?: 'en' | 'zh' } = {}): string {
  const params = new URLSearchParams();
  params.set('at', `${target.at.lat.toFixed(5)},${target.at.lng.toFixed(5)}`);
  if (target.card) params.set('card', target.card);
  if (target.pin === false || (target.pin === undefined && target.card)) params.set('pin', '0');
  if (opts.still) params.set('still', '1');
  if (opts.hideCards) params.set('cards', '0');
  if (opts.lang && opts.lang !== 'en') params.set('lang', opts.lang);
  return `${earthOnline3dBase()}#${params.toString()}`;
}

/** Apple Maps at the place's coordinates, with its name as the label. A plain link: nothing is sent first. */
export function appleMapsUrl(place: Pick<CuratedPlace, 'coordinates' | 'name'>): string {
  const { lat, lng } = place.coordinates;
  const params = new URLSearchParams({ ll: `${lat.toFixed(6)},${lng.toFixed(6)}`, q: place.name });
  return `https://maps.apple.com/?${params.toString()}`;
}
