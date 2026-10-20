// External links. Neither carries the user's position.
import type { CuratedPlace } from './domain';

/**
 * Google Maps directions to the destination's coordinates. No origin: the user picks it (and walking,
 * transit or driving) in Google Maps. This is a plain link; the app makes no Google API call.
 */
export function directionsUrl(place: Pick<CuratedPlace, 'coordinates'>): string {
  const { lat, lng } = place.coordinates;
  const params = new URLSearchParams({ api: '1', destination: `${lat.toFixed(6)},${lng.toFixed(6)}` });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** The EARTH ONLINE 3D Singapore page (bundled under /earth-online/sg/, or VITE_EARTH_ONLINE_SG_URL). */
export function earthOnlineBase(): string {
  const configured = import.meta.env.VITE_EARTH_ONLINE_SG_URL as string | undefined;
  return configured && configured.trim() ? configured.trim() : '/earth-online/sg/index.html';
}

/** Opens the 3D map on the place: its landmark card when the dataset has a model, otherwise its point. */
export function view3dUrl(place: Pick<CuratedPlace, 'earthKey' | 'coordinates'>): string {
  const params = new URLSearchParams();
  if (place.earthKey) params.set('card', place.earthKey);
  else params.set('at', `${place.coordinates.lat.toFixed(5)},${place.coordinates.lng.toFixed(5)}`);
  return `${earthOnlineBase()}?${params.toString()}`;
}
