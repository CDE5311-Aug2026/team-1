// The owned editorial catalogue: reviewed destinations, areas and collections, version-controlled
// under src/data/explore/. Validated by `npm run validate:explore` (scripts/validate-explore.mjs) and
// by catalogue.test.ts. Built from the EARTH ONLINE Singapore dataset plus researched, source-linked entries.
import areasJson from '../../data/explore/areas.json';
import collectionsJson from '../../data/explore/collections.json';
import sgPlacesJson from '../../data/explore/places.sg.json';
import type {
  Area,
  CountryCode,
  CuratedPlace,
  ExploreCollection,
  ExplorePersonalData,
  PlaceKey,
  Region,
} from './domain';

export const ALL_PLACES = sgPlacesJson as CuratedPlace[];
/** Only published entries are shown or counted. Drafts stay in the files for the editor. */
export const PUBLISHED_PLACES: CuratedPlace[] = ALL_PLACES.filter((p) => p.editorialStatus === 'published');
export const REGIONS = (areasJson as { regions: Region[] }).regions;
export const AREAS = (areasJson as { areas: Area[] }).areas;
export const COLLECTIONS = collectionsJson as ExploreCollection[];

const byId = new Map<string, CuratedPlace>(PUBLISHED_PLACES.map((p) => [p.id, p]));

export function curatedPlace(id: string): CuratedPlace | undefined {
  return byId.get(id);
}

export function placesIn(country: CountryCode): CuratedPlace[] {
  return PUBLISHED_PLACES.filter((p) => p.country === country);
}

export function areasIn(country: CountryCode): Area[] {
  return AREAS.filter((a) => a.country === country && !a.overview);
}

export function overviewArea(country: CountryCode): Area {
  const found = AREAS.find((a) => a.country === country && a.overview);
  if (!found) throw new Error(`No overview area for ${country}`);
  return found;
}

export function area(id: string | undefined): Area | undefined {
  return id ? AREAS.find((a) => a.id === id) : undefined;
}

export function regionName(id: string): string {
  return REGIONS.find((r) => r.id === id)?.name ?? id;
}

export function regionsIn(country: CountryCode): Region[] {
  return REGIONS.filter((r) => r.country === country);
}

export function collection(id: string): ExploreCollection | undefined {
  return COLLECTIONS.find((c) => c.id === id);
}

/** Published members of a collection, in editorial order. Unpublished member ids never count. */
export function members(c: ExploreCollection): CuratedPlace[] {
  return c.memberIds.map((id) => byId.get(id)).filter((p): p is CuratedPlace => p !== undefined);
}

export function isMember(c: ExploreCollection, key: PlaceKey): boolean {
  return c.memberIds.includes(key) && byId.has(key);
}

export function collectionsContaining(key: PlaceKey): ExploreCollection[] {
  return COLLECTIONS.filter((c) => isMember(c, key));
}

/** "100 Places to Explore in Singapore" only once signed off with 100 members; otherwise the honest name and count. */
export function collectionTitle(c: ExploreCollection): string {
  const count = members(c).length;
  if (c.status === 'published' && count === c.targetCount) return c.title;
  return `${c.starterTitle} · ${count} ${count === 1 ? 'place' : 'places'}`;
}

export interface Progress {
  visited: number;
  total: number;
  percent: number;
}

/** visited published member ids / published member ids. Filters never change the denominator. */
export function collectionProgress(c: ExploreCollection, personal: ExplorePersonalData): Progress {
  const ids = new Set(members(c).map((p) => p.id as string));
  const visited = personal.places.filter((s) => s.visited && ids.has(s.placeKey)).length;
  const total = ids.size;
  return { visited, total, percent: total === 0 ? 0 : Math.floor((visited / total) * 100) };
}

const editorialIndex = new Map<string, number>();
COLLECTIONS.forEach((c) => c.memberIds.forEach((id, i) => editorialIndex.has(id) || editorialIndex.set(id, i)));

/** Editorial order: the collection's own order first, then everything else as listed in the catalogue. */
export function editorialRank(key: PlaceKey): number {
  return editorialIndex.get(key) ?? 10_000 + PUBLISHED_PLACES.findIndex((p) => p.id === key);
}
