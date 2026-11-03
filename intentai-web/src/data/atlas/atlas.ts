// Singapore Culture Atlas (team research snapshot, 2026-10-29): places, MRT/LRT stations and editor routes.
// The research text is Chinese (atlas.zh.json); English arrives as atlas.en.json with the shape
//   { places: { [id]: { area, summary, fun_fact, hours, price, access_notes, review_summary, …, collections[] } },
//     routes: { [id]: { title, subtitle, duration, note } }, stations: { [id]: { theme } }, collections: { [zh]: en } }
// Every text accessor returns the English when present and the Chinese otherwise, so the translation can be dropped
// in without code changes. The atlas's photos are reference-only (no reuse licence) and are never shown.
import { places as zhPlaces, stations as zhStations } from './atlas.zh.json';
import { collections as enCollectionsRaw, places as enPlacesRaw, stations as enStationsRaw } from './atlas.en.json';
import type { LocalText } from './atlasRoutes';

export * from './atlasRoutes';

export type AtlasCategory = 'food' | 'nature' | 'culture' | 'history' | 'urban';
export const ATLAS_CATEGORIES: AtlasCategory[] = ['food', 'culture', 'nature', 'history', 'urban'];
export const ATLAS_CATEGORY_LABEL: Record<AtlasCategory, string> = {
  food: 'Food',
  culture: 'Culture',
  nature: 'Nature',
  history: 'History',
  urban: 'Urban',
};

export interface AtlasClosure {
  from: string;
  to?: string | null;
  note?: string | null;
}

export interface AtlasReview {
  summary: string;
  url: string;
  platform: string;
  review_date?: string | null;
  confidence?: string;
}

export interface AtlasSource {
  title: string;
  url: string;
  type?: string;
  supports?: string[];
}

export interface AtlasPlace {
  id: string;
  name_en: string;
  name_zh: string;
  area: string;
  region: string;
  category: AtlasCategory;
  collections: string[];
  stations: string[];
  summary: string;
  fun_fact?: string | null;
  fun_fact_source?: string | null;
  address?: string | null;
  lat: number | null;
  lng: number | null;
  coordinates_quality: 'verified' | 'approximate' | 'unknown';
  hours?: string | null;
  price?: string | null;
  visit_minutes?: number | null;
  access_notes?: string | null;
  booking_note?: string | null;
  review?: AtlasReview | null;
  sources: AtlasSource[];
  /** open | check_before_visit | closed … */
  status: string;
  requires_booking?: boolean;
  route_eligible?: boolean;
  /** ferry | taxi | bus */
  transport_required?: string | null;
  /** 0 = Sunday … 6 = Saturday */
  closed_weekdays?: number[] | null;
  closures?: AtlasClosure[] | null;
  closes_on?: string | null;
  reopens_on?: string | null;
  maps_url?: string | null;
}

export interface AtlasStation {
  id: string;
  name_en: string;
  name_zh: string;
  codes: string[];
  lines: string[];
  kind: 'MRT' | 'LRT';
  theme: string;
  place_ids: string[];
  lat?: number | null;
  lng?: number | null;
  coordinates_quality?: string;
}

/** Fields of a place that the English file can translate. `review_summary` is the review's summary. */
export type PlaceTextField = 'area' | 'summary' | 'fun_fact' | 'hours' | 'price' | 'access_notes' | 'review_summary' | 'booking_note';

type PlaceTranslations = Record<string, Partial<Record<PlaceTextField, string>> & { collections?: string[] }>;

export const ATLAS_PLACES: AtlasPlace[] = zhPlaces as unknown as AtlasPlace[];
const ALL_STATIONS = zhStations as unknown as AtlasStation[];
/** Stations with at least one atlas place (the others have only a theme). */
export const atlasStations: AtlasStation[] = ALL_STATIONS.filter((s) => s.place_ids.length > 0);

const enPlaces = enPlacesRaw as unknown as PlaceTranslations;
const enStations = enStationsRaw as unknown as Record<string, { theme?: string }>;
const enCollections = enCollectionsRaw as unknown as Record<string, string>;

const placeById = new Map(ATLAS_PLACES.map((p) => [p.id, p]));
const stationById = new Map(ALL_STATIONS.map((s) => [s.id, s]));

export function atlasPlace(id: string): AtlasPlace | undefined {
  return placeById.get(id);
}

export function atlasStation(id: string): AtlasStation | undefined {
  return stationById.get(id);
}

/** The station an editor route starts from (routes name it by its English name). */
export function stationByName(name: string): AtlasStation | undefined {
  return ALL_STATIONS.find((s) => s.name_en === name);
}

function zhField(p: AtlasPlace, field: PlaceTextField): string | undefined {
  const v = field === 'review_summary' ? p.review?.summary : p[field];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

/** A place's text with its language: English when translated, else the atlas's Chinese; undefined when neither. */
export function atlasTextLang(id: string, field: PlaceTextField): LocalText | undefined {
  const en = enPlaces[id]?.[field];
  if (typeof en === 'string' && en.trim()) return { text: en, lang: 'en' };
  const p = placeById.get(id);
  const zh = p && zhField(p, field);
  return zh ? { text: zh, lang: 'zh-Hans' } : undefined;
}

/** A place's text: English when translated, else the atlas's Chinese (undefined when the atlas has none). */
export function atlasText(id: string, field: PlaceTextField): string | undefined {
  return atlasTextLang(id, field)?.text;
}

/** A place's collections: the English list, else each Chinese name through the collections dictionary. */
export function atlasCollections(id: string): LocalText[] {
  const en = enPlaces[id]?.collections;
  if (Array.isArray(en) && en.length) return en.map((text) => ({ text, lang: 'en' }));
  return (placeById.get(id)?.collections ?? []).map((zh) => (enCollections[zh] ? { text: enCollections[zh], lang: 'en' } : { text: zh, lang: 'zh-Hans' }));
}

export function stationThemeLang(id: string): LocalText {
  const en = enStations[id]?.theme;
  if (typeof en === 'string' && en.trim()) return { text: en, lang: 'en' };
  return { text: stationById.get(id)?.theme ?? '', lang: 'zh-Hans' };
}

export interface StationPoint {
  lat: number;
  lng: number;
  /** true: the atlas has no station coordinates; this is the centre of the station's places. */
  derived: boolean;
}

const hasPoint = (p: AtlasPlace | undefined): p is AtlasPlace & { lat: number; lng: number } =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

/**
 * Where a station is. The atlas gives coordinates for one station only and the app has no MRT station list, so
 * the others use the centroid of their linked places that name the station as theirs (else of all linked places).
 * Good enough to order stops; never shown as the station's position on the map.
 */
export function stationPoint(s: AtlasStation): StationPoint | undefined {
  if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) return { lat: s.lat as number, lng: s.lng as number, derived: false };
  const linked = s.place_ids.map((id) => placeById.get(id)).filter(hasPoint);
  const own = linked.filter((p) => p.stations.includes(s.name_en));
  const pts = own.length ? own : linked;
  if (!pts.length) return undefined;
  return {
    lat: pts.reduce((a, p) => a + p.lat, 0) / pts.length,
    lng: pts.reduce((a, p) => a + p.lng, 0) / pts.length,
    derived: true,
  };
}

const LINE_NAMES: Record<string, string> = {
  NSL: 'North–South Line',
  EWL: 'East–West Line',
  NEL: 'North East Line',
  CCL: 'Circle Line',
  DTL: 'Downtown Line',
  TEL: 'Thomson–East Coast Line',
  BPLRT: 'Bukit Panjang LRT',
  SKLRT: 'Sengkang LRT',
  PGLRT: 'Punggol LRT',
};
export const LINE_ORDER = Object.keys(LINE_NAMES);

export function lineName(code: string): string {
  return LINE_NAMES[code] ?? code;
}
