// Every link to a place, an area or an editor's pick goes to Home's map (owner, 31 Oct 2026: "it should not open
// something new; it should go back to Home and show the map at that place, and let the user open the card").
// Place → its planning area's places, that place's card selected in the deck (not opened). Area → that planning area.
// Pick → Editor's Pick: a walk or a list (list:<collection id>).
// Reads only the URA tables (no catalogue), so Today and Moments stay light.
import { paths } from '../routes';
import uraJson from './ura/areas.json';
import placeAreasJson from './ura/placeAreas.json';

const PLACE_AREA = placeAreasJson as Record<string, string>;
const AREA_REGION = new Map((uraJson as { areas: { id: string; region: string }[] }).areas.map((a) => [a.id, a.region]));
const AREAS_WITH_PLACES = new Set(Object.values(PLACE_AREA));

/** Nearby's own neighbourhoods → the URA planning area that holds most of them (Kampong Glam and Katong by hand:
 *  their places spread over several areas; the names belong to Rochor and Marine Parade). */
const CATALOGUE_AREA: Record<string, string> = {
  'sg-ang-mo-kio': 'am',
  'sg-bedok': 'bd',
  'sg-bukit-timah': 'bt',
  'sg-changi': 'ch',
  'sg-chinatown': 'ot',
  'sg-clementi': 'cl',
  'sg-jurong': 'je',
  'sg-kampong-glam': 'rc',
  'sg-katong': 'mp',
  'sg-kranji': 'lk',
  'sg-little-india': 'rc',
  'sg-marina-bay': 'dt',
  'sg-orchard': 'or',
  'sg-pulau-ubin': 'ne',
  'sg-punggol': 'pg',
  'sg-queenstown': 'qt',
  'sg-sentosa': 'si',
  'sg-tampines': 'tm',
  'sg-tiong-bahru': 'bm',
  'sg-toa-payoh': 'tp',
  'sg-woodlands': 'wd',
};

const home = (q: Record<string, string>) => `${paths.today}?${new URLSearchParams(q).toString()}`;

/** A URA planning area on Home's map: its places' deck when it has places, else the region's areas with it selected. */
export function homeAreaHref(uraAreaId: string): string {
  const r = AREA_REGION.get(uraAreaId);
  if (!r) return paths.today;
  return AREAS_WITH_PLACES.has(uraAreaId) ? home({ lvl: 'places', r, a: uraAreaId }) : home({ lvl: 'areas', r, a: uraAreaId });
}

/** A place on Home's map: its planning area, the place's card selected (the user opens it). */
export function homePlaceHref(placeId: string): string {
  const a = PLACE_AREA[placeId];
  const r = a && AREA_REGION.get(a);
  return a && r ? home({ lvl: 'places', r, a, p: placeId }) : paths.today;
}

/** One of Nearby's neighbourhoods (e.g. sg-katong) on Home's map. */
export function homeNeighbourhoodHref(catalogueAreaId: string): string {
  const a = CATALOGUE_AREA[catalogueAreaId];
  return a ? homeAreaHref(a) : paths.today;
}

/** An editor's pick on Home: a walk (route id) or a list (collection id, as list:<id>). */
export function homePickHref(pickId: string): string {
  return home({ lvl: 'pick', k: pickId });
}

export const homeListHref = (collectionId: string) => homePickHref(`list:${collectionId}`);
