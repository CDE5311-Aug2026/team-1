// Near you (owner, 1 Nov 2026: "Locate should show the landmarks nearby and the nearest Picks, within 2 km by
// default", not just the deck of the planning area you are in). One deck, nearest first: the places within NEAR_M,
// and the Editor's Picks (walks and lists) with a stop within NEAR_M, measured to that nearest stop. Where nothing is
// that close, the nearest few places stand in, so the deck is never empty.
import type { HomePlace } from '../../data/homePlaces';
import type { EditorPick } from '../../data/picks';
import { distanceM } from '../../features/nearby/geo';
import type { LatLng } from '../../features/nearby/types';

/** How far round your position Near you reaches, m. */
export const NEAR_M = 2000;

export type NearItem = { kind: 'place'; id: string; place: HomePlace; m: number } | { kind: 'pick'; id: string; pick: EditorPick; m: number; stopId: string };

export interface NearYou {
  items: NearItem[];
  places: HomePlace[];
  /** False: nothing within NEAR_M, the items are the nearest places further out. */
  within: boolean;
}

const MAX_PLACES = 24;
const MAX_WALKS = 3;
const MAX_LISTS = 2;
const FALLBACK = 6;

export function nearYou(here: LatLng, places: readonly HomePlace[], picks: readonly EditorPick[]): NearYou {
  const byDistance = places.map((place) => ({ place, m: distanceM(here, place.point) })).sort((a, b) => a.m - b.m);
  const close = byDistance.filter((p) => p.m <= NEAR_M).slice(0, MAX_PLACES);
  const within = close.length > 0;
  const shown = within ? close : byDistance.slice(0, FALLBACK);
  const reach = picks
    .flatMap((pick) => {
      const nearest = pick.stops.map((st) => ({ id: st.place.id, m: distanceM(here, st.place.coordinates) })).sort((a, b) => a.m - b.m)[0];
      return nearest && nearest.m <= NEAR_M ? [{ kind: 'pick' as const, id: pick.id, pick, m: nearest.m, stopId: nearest.id }] : [];
    })
    .sort((a, b) => a.m - b.m);
  // walks first (a route to do from here), then a couple of the big island-wide lists, which have a stop near most places
  const pickItems = [...reach.filter((p) => p.pick.kind === 'walk').slice(0, MAX_WALKS), ...reach.filter((p) => p.pick.kind === 'list').slice(0, MAX_LISTS)];
  const items: NearItem[] = [...shown.map(({ place, m }) => ({ kind: 'place' as const, id: place.id, place, m })), ...pickItems].sort((a, b) => a.m - b.m);
  return { items, places: shown.map((p) => p.place), within };
}

/** "350 m" / "1.4 km" */
export function shortDistance(m: number): string {
  return m < 1000 ? `${Math.max(50, Math.round(m / 50) * 50)} m` : `${(m / 1000).toFixed(1)} km`;
}
