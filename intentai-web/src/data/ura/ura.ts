// URA's planning levels for Home (Discovery redesign, owner decision 31 Oct 2026): 5 regions → 55 planning areas
// (Master Plan 2019) → places. Outlines and the place → area table are built by scripts/ura/build-ura.py.
//
// Unlock rule (owner, 31 Oct): an area is unlocked only when every place in it is checked in. "Places" are every
// published Nearby place in the area until the owner settles which count as "fun places".
import type { ExplorePersonalData } from '../../features/nearby/domain';
import { PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import type { CuratedPlace } from '../../features/nearby/domain';
import type { XY } from '../../features/nearby/map/projection';
import uraJson from './areas.json';
import placeAreasJson from './placeAreas.json';

export type RegionId = 'central' | 'east' | 'north' | 'north-east' | 'west';

export interface UraRegion {
  id: RegionId;
  name: string;
}

export interface UraArea {
  /** URA planning-area code, lower case (e.g. "bt" for Bukit Timah). */
  id: string;
  name: string;
  region: RegionId;
  /** Label point and bounding box in map metres (projection.ts frame). */
  centre: [number, number];
  box: [number, number, number, number];
  /** Outer rings in map metres, simplified to about 30 m. */
  rings: [number, number][][];
}

interface UraFile {
  source: { title: string; publisher: string; url: string; licence: string; licenceUrl: string; note: string };
  regions: UraRegion[];
  areas: UraArea[];
}

const URA = uraJson as unknown as UraFile;

export const URA_SOURCE = URA.source;
export const URA_REGIONS: readonly UraRegion[] = URA.regions;
export const URA_AREAS: readonly UraArea[] = URA.areas;
const PLACE_AREA = placeAreasJson as Record<string, string>;

const areaById = new Map(URA_AREAS.map((a) => [a.id, a]));
export const uraArea = (id: string | undefined) => (id ? areaById.get(id) : undefined);
export const uraRegion = (id: string | undefined) => URA_REGIONS.find((r) => r.id === id);
export const areasOf = (region: RegionId) => URA_AREAS.filter((a) => a.region === region);
export const areaOfPlace = (placeId: string) => uraArea(PLACE_AREA[placeId]);

const placesByArea = new Map<string, CuratedPlace[]>();
for (const p of PUBLISHED_PLACES) {
  const id = PLACE_AREA[p.id];
  if (id) placesByArea.set(id, [...(placesByArea.get(id) ?? []), p]);
}
export const placesInArea = (areaId: string): readonly CuratedPlace[] => placesByArea.get(areaId) ?? [];
export const placesInRegion = (region: RegionId): CuratedPlace[] => areasOf(region).flatMap((a) => placesInArea(a.id));

/** none: nothing checked in (red) · exploring: some (yellow) · done: all, the area is unlocked (green). */
export type UnlockStatus = 'none' | 'exploring' | 'done';

export interface UnlockProgress {
  visited: number;
  total: number;
  status: UnlockStatus;
}

export function visitedSet(personal: ExplorePersonalData): Set<string> {
  return new Set(personal.places.filter((p) => p.visited).map((p) => p.placeKey));
}

function progressOf(places: readonly CuratedPlace[], visited: ReadonlySet<string>): UnlockProgress {
  const total = places.length;
  const done = places.filter((p) => visited.has(p.id)).length;
  return { visited: done, total, status: total > 0 && done === total ? 'done' : done > 0 ? 'exploring' : 'none' };
}

export const areaProgress = (areaId: string, visited: ReadonlySet<string>) => progressOf(placesInArea(areaId), visited);
export const regionProgress = (region: RegionId, visited: ReadonlySet<string>) => progressOf(placesInRegion(region), visited);

/** The region's bounding box in map metres. Offshore island areas are left out, so the main island fills the view. */
export function regionBox(region: RegionId): [number, number, number, number] {
  const all = areasOf(region);
  const mainland = all.filter((a) => !/Islands$/.test(a.name));
  const boxes = (mainland.length ? mainland : all).map((a) => a.box);
  return [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))];
}

export const boxCorners = (b: [number, number, number, number]): XY[] => [
  { x: b[0], y: b[1] },
  { x: b[2], y: b[3] },
];

/** "Landmark 2/9 · Food 1/12 · Culture 0/5": checked in / total for each kind of place that is there. */
export function categoryLine(places: readonly CuratedPlace[], visited: ReadonlySet<string>): string {
  const order = ['landmark', 'culture', 'food', 'nature'] as const;
  const name = { landmark: 'Landmark', culture: 'Culture', food: 'Food', nature: 'Nature' } as const;
  return order
    .map((c) => {
      const ps = places.filter((p) => p.category === c);
      return ps.length ? `${name[c]} ${ps.filter((p) => visited.has(p.id)).length}/${ps.length}` : '';
    })
    .filter(Boolean)
    .join(' · ');
}

/** Planning areas of a region with every place checked in. */
export function unlockedAreas(region: RegionId, visited: ReadonlySet<string>): { done: number; total: number } {
  const withPlaces = areasOf(region).filter((a) => placesInArea(a.id).length > 0);
  return { done: withPlaces.filter((a) => areaProgress(a.id, visited).status === 'done').length, total: withPlaces.length };
}

function inside(x: number, y: number, ring: readonly (readonly [number, number])[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** The planning area at a point in map metres (projection.ts frame), if it is on land in Singapore. */
export function areaAt(x: number, y: number): UraArea | undefined {
  return URA_AREAS.find((a) => x >= a.box[0] && x <= a.box[2] && y >= a.box[1] && y <= a.box[3] && a.rings.some((r) => inside(x, y, r)));
}
