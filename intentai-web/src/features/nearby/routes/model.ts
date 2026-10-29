// Routes for Nearby: the atlas's five editor routes and routes generated from an MRT / LRT station, as one view
// model the detail page draws. A stop is an atlas place; when it is in the Nearby catalogue (via placeKeys.json)
// it links to its place page and can be checked in, otherwise the page shows the atlas record.
import {
  ATLAS_CATEGORIES,
  ATLAS_CATEGORY_LABEL,
  ATLAS_PLACES,
  atlasPlace,
  atlasRoute,
  atlasStation,
  atlasStations,
  placeKeyOf,
  routeTextLang,
  stationByName,
  stationPoint,
  type AtlasCategory,
  type AtlasPlace,
  type AtlasStation,
  type LocalText,
} from '../../../data/atlas/atlas';
import { curatedPlace } from '../catalogue';
import type { CuratedPlace, PlaceKey } from '../domain';
import { isLocalDate } from '../domain';
import type { Category, LatLng } from '../types';
import { closure, generate, mapsLinks, stats, visitMinutes, type EngineStation, type MapsLink, type RouteMode, type RouteStats } from './engine';

/** The map pin / tile category of an atlas category (Nearby has no history or urban category). */
export const PIN_CATEGORY: Record<AtlasCategory, Category> = {
  food: 'food',
  nature: 'nature',
  culture: 'culture',
  history: 'landmark',
  urban: 'landmark',
};

export const MAX_STOPS = 6;
export const HOURS = [1, 2, 3, 4, 5, 6] as const;
export const DEFAULT_HOURS = 3;

export interface RouteStop {
  atlasId: string;
  atlas: AtlasPlace;
  key: PlaceKey;
  /** The Nearby catalogue place, once the catalogue has it. */
  curated?: CuratedPlace;
  name: string;
  category: AtlasCategory;
  pinCategory: Category;
  location?: LatLng;
  approximate: boolean;
  visitMinutes: number;
  /** Booking, closure on the date, check-before-you-go. */
  warnings: string[];
}

export interface PlanOptions {
  station: string;
  hours: number;
  mode: RouteMode;
  theme: AtlasCategory | 'any';
  /** YYYY-MM-DD */
  date: string;
  /** Include places that need booking (the visitor books ahead). */
  booking: boolean;
}

export interface RouteView {
  kind: 'editor' | 'generated';
  id: string;
  title: LocalText;
  subtitle?: LocalText;
  duration?: LocalText;
  note?: LocalText;
  station?: AtlasStation;
  mode: RouteMode;
  date: string;
  stops: RouteStop[];
  stats: RouteStats;
  links: MapsLink[];
  /** Generated routes: station places that could not be used, with the reason. */
  excluded: { id: string; name: string; reason: string }[];
  options?: PlanOptions;
  estimatedMinutes?: number;
}

const en = (text: string): LocalText => ({ text, lang: 'en' });

function shortDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function stopOf(p: AtlasPlace, date: string, mode: RouteMode): RouteStop {
  const key = placeKeyOf(p.id);
  const curated = curatedPlace(key);
  const warnings: string[] = [];
  const closed = closure(p, date);
  if (closed) warnings.push(`${shortDate(date)}: ${closed.reason}`);
  if (p.requires_booking) warnings.push('Book ahead');
  if (p.status === 'check_before_visit' && !closed) warnings.push('Check it is open before you go');
  if (p.transport_required === 'ferry') warnings.push('Needs a ferry');
  else if (p.transport_required === 'taxi') warnings.push('Needs a car');
  else if (p.transport_required && mode === 'walking') warnings.push('Needs a bus or other transport');
  const atlasPoint = Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat as number, lng: p.lng as number } : undefined;
  return {
    atlasId: p.id,
    atlas: p,
    key,
    curated,
    name: curated?.name ?? p.name_en,
    category: p.category,
    pinCategory: PIN_CATEGORY[p.category] ?? 'landmark',
    location: curated ? { lat: curated.coordinates.lat, lng: curated.coordinates.lng } : atlasPoint,
    approximate: !curated && p.coordinates_quality !== 'verified',
    visitMinutes: visitMinutes(p),
    warnings,
  };
}

export function engineStation(s: AtlasStation): EngineStation {
  const pt = stationPoint(s);
  return { name_en: s.name_en, kind: s.kind, place_ids: s.place_ids, lat: pt?.lat ?? null, lng: pt?.lng ?? null };
}

export function editorRoute(id: string, date: string): RouteView | undefined {
  const r = atlasRoute(id);
  if (!r) return undefined;
  const station = stationByName(r.station);
  const places = r.place_ids.map((pid) => atlasPlace(pid)).filter((p): p is AtlasPlace => !!p);
  return {
    kind: 'editor',
    id: r.id,
    title: routeTextLang(r.id, 'title'),
    subtitle: routeTextLang(r.id, 'subtitle'),
    duration: routeTextLang(r.id, 'duration'),
    note: routeTextLang(r.id, 'note'),
    station,
    mode: r.mode,
    date,
    stops: places.map((p) => stopOf(p, date, r.mode)),
    stats: stats(places),
    links: mapsLinks(places, station ? engineStation(station) : null, r.mode),
    excluded: [],
  };
}

export function isAtlasCategory(v: unknown): v is AtlasCategory {
  return typeof v === 'string' && (ATLAS_CATEGORIES as string[]).includes(v);
}

/** Options from a shareable query (station, budget in hours, mode, theme, date, booking); null without a known station. */
export function parsePlan(sp: URLSearchParams, today: string): PlanOptions | null {
  const station = sp.get('station') ?? '';
  if (!atlasStations.some((s) => s.id === station)) return null;
  const hours = Number(sp.get('budget'));
  const theme = sp.get('theme');
  const date = sp.get('date') ?? '';
  return {
    station,
    hours: (HOURS as readonly number[]).includes(hours) ? hours : DEFAULT_HOURS,
    mode: sp.get('mode') === 'transit' ? 'transit' : 'walking',
    theme: isAtlasCategory(theme) ? theme : 'any',
    date: isLocalDate(date) ? date : today,
    booking: sp.get('booking') === '1',
  };
}

export function planSearch(o: PlanOptions): string {
  const q = new URLSearchParams({ station: o.station, budget: String(o.hours), mode: o.mode });
  if (o.theme !== 'any') q.set('theme', o.theme);
  q.set('date', o.date);
  if (o.booking) q.set('booking', '1');
  return q.toString();
}

export function generatedRoute(o: PlanOptions): RouteView | undefined {
  const station = atlasStation(o.station);
  if (!station) return undefined;
  const es = engineStation(station);
  const result = generate(ATLAS_PLACES, es, {
    theme: o.theme === 'any' ? undefined : o.theme,
    date: o.date,
    mode: o.mode,
    budget: o.hours * 60,
    max: MAX_STOPS,
    booking: o.booking,
  });
  const places = result.ids.map((id) => atlasPlace(id)).filter((p): p is AtlasPlace => !!p);
  const name = (id: string) => atlasPlace(id)?.name_en ?? id;
  const themeLabel = o.theme === 'any' ? '' : `${ATLAS_CATEGORY_LABEL[o.theme]} · `;
  return {
    kind: 'generated',
    id: 'plan',
    title: en(`From ${station.name_en} · ${themeLabel}${o.hours} h`),
    subtitle: en(`${o.mode === 'walking' ? 'On foot' : 'On foot and by public transport'} · ${shortDate(o.date)}`),
    station,
    mode: o.mode,
    date: o.date,
    stops: places.map((p) => stopOf(p, o.date, o.mode)),
    stats: result.stats,
    links: mapsLinks(places, es, o.mode),
    excluded: [
      ...result.excluded.map((e) => ({ id: e.id, name: name(e.id), reason: e.reason })),
      ...result.notChosen.map((id) => ({
        id,
        name: name(id),
        reason: o.mode === 'walking' ? 'Did not fit in the time, or is more than 3.5 km on foot from the last stop' : 'Did not fit in the time',
      })),
    ],
    options: o,
    estimatedMinutes: result.estimatedMinutes,
  };
}

/** One line on the atlas place: a summary trimmed to its first sentence. */
export function firstSentence(text: string): string {
  const m = /^.+?[。！？.!?](?=\s|$|[^\d])/u.exec(text);
  return m ? m[0] : text;
}
