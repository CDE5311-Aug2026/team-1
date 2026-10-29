// The light part of the Singapore Culture Atlas: the five editor routes and the atlas id ↔ Nearby key mapping.
// Kept apart from atlas.ts so a Nearby place page can say "On routes: …" without loading the whole atlas
// (Vite turns each top-level JSON key into its own export, so only `routes` is bundled here).
import { routes as zhRoutes } from './atlas.zh.json';
import { routes as enRoutesRaw } from './atlas.en.json';
import placeKeysJson from './placeKeys.json';

export type AtlasMode = 'walking' | 'transit';

export interface AtlasRoute {
  id: string;
  title: string;
  subtitle: string;
  /** The MRT station's English name (atlas `stations[].name_en`). */
  station: string;
  duration: string;
  mode: AtlasMode;
  place_ids: string[];
  note: string;
}

export type RouteTextField = 'title' | 'subtitle' | 'duration' | 'note';
type RouteTranslations = Record<string, Partial<Record<RouteTextField, string>>>;

/** Text in English when the translation has it, else the atlas's Chinese, with the language to mark it up. */
export interface LocalText {
  text: string;
  lang: 'en' | 'zh-Hans';
}

export const atlasRoutes: AtlasRoute[] = zhRoutes as AtlasRoute[];
const enRoutes = enRoutesRaw as unknown as RouteTranslations;
const PLACE_KEYS = placeKeysJson as Record<string, string>;
const ATLAS_ID_BY_KEY = new Map(Object.entries(PLACE_KEYS).map(([id, key]) => [key, id]));

export function atlasRoute(id: string): AtlasRoute | undefined {
  return atlasRoutes.find((r) => r.id === id);
}

export function routeTextLang(id: string, field: RouteTextField): LocalText {
  const en = enRoutes[id]?.[field];
  if (typeof en === 'string' && en.trim()) return { text: en, lang: 'en' };
  return { text: atlasRoute(id)?.[field] ?? '', lang: 'zh-Hans' };
}

export function routeText(id: string, field: RouteTextField): string {
  return routeTextLang(id, field).text;
}

/** The Nearby catalogue key of an atlas place (`curated:sg-<atlas id>` when the mapping has none). The place may
 *  not be in the catalogue yet: check with `curatedPlace(key)`. */
export function placeKeyOf(atlasId: string): `curated:${string}` {
  return (PLACE_KEYS[atlasId] ?? `curated:sg-${atlasId}`) as `curated:${string}`;
}

/** The atlas id of a Nearby catalogue key, if the atlas has that place. */
export function atlasIdOfPlaceKey(key: string): string | undefined {
  return ATLAS_ID_BY_KEY.get(key);
}

/** Editor routes that stop at this Nearby place. */
export function routesWithPlace(key: string): AtlasRoute[] {
  const id = atlasIdOfPlaceKey(key);
  return id ? atlasRoutes.filter((r) => r.place_ids.includes(id)) : [];
}
