// Home's search (the 🔍 key; owner, 1 Nov 2026: "is search really done?"). It used to match names only, so "hawker",
// "UTown" or "Kent Ridge" found nothing. Now a place is found by its name (English or Chinese), its other names
// ("NUS", "UTown", "Tiger Balm Garden"), what it is ("Hawker centre", "Mosque"), its category, its neighbourhood
// ("Chinatown & Tanjong Pagar") and its URA planning area. Every word typed must match something; names count most.
// Planning areas and Editor's Picks (walks and lists) are found by name too. A few Chinese words map to English ones.
import { ALL_HOME_PLACES } from '../../data/homePlaces';
import { areaOfPlace, URA_AREAS, type UraArea } from '../../data/ura/ura';
import { area as localityOf, PUBLISHED_PLACES, regionName } from '../../features/nearby/catalogue';
import { CATEGORY_INFO, type CuratedPlace } from '../../features/nearby/domain';

export interface SearchPick {
  id: string;
  kind: 'walk' | 'list';
  title: string;
  subtitle: string;
}

export interface PlaceHit {
  place: CuratedPlace;
  /** "Hawker centre · Outram" */
  line: string;
}

export interface SearchResults {
  areas: UraArea[];
  picks: SearchPick[];
  places: PlaceHit[];
  /** All the places that matched (only the first `PLACE_LIMIT` are listed). */
  placeCount: number;
}

const PLACE_LIMIT = 20;

/** Lower case, no accents or punctuation, single spaces. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const CJK = /[㐀-鿿]/;

// Words people search with that the data spells another way
const SYNONYMS: Record<string, string[]> = {
  hawker: ['hawker', 'food centre'],
  'food centre': ['food centre', 'hawker'],
  uni: ['university'],
  temple: ['temple', 'monastery'],
  小贩: ['hawker'],
  小贩中心: ['hawker'],
  熟食中心: ['hawker'],
  美食: ['food'],
  餐厅: ['restaurant'],
  寺: ['temple', 'monastery'],
  庙: ['temple'],
  寺庙: ['temple', 'monastery'],
  清真寺: ['mosque'],
  教堂: ['church'],
  博物馆: ['museum'],
  公园: ['park'],
  自然: ['nature'],
  地标: ['landmark'],
  文化: ['culture'],
  大学: ['university'],
  桥: ['bridge'],
  牛车水: ['chinatown'],
  小印度: ['little india'],
  甘榜格南: ['kampong glam'],
  圣淘沙: ['sentosa'],
  国大: ['nus'],
  滨海湾: ['marina bay'],
};

interface Field {
  text: string;
  weight: number;
}

interface Entry {
  place: CuratedPlace;
  fields: Field[];
  name: string;
  line: string;
}

let index: Entry[] | null = null;

function buildIndex(): Entry[] {
  const aliases = new Map(ALL_HOME_PLACES.map((h) => [h.id, h.aliases ?? []]));
  return PUBLISHED_PLACES.map((p) => {
    const ura = areaOfPlace(p.id);
    const locality = localityOf(p.areaId)?.name;
    const cat = CATEGORY_INFO[p.category];
    const fields: Field[] = [
      { text: normalise(p.name), weight: 10 },
      ...(p.nameZh ? [{ text: p.nameZh, weight: 9 }] : []),
      ...(aliases.get(p.id) ?? []).filter((a) => a !== locality).map((a) => ({ text: normalise(a), weight: 7 })),
      { text: normalise(p.kind), weight: 5 },
      ...(locality ? [{ text: normalise(locality), weight: 4 }] : []),
      ...(ura ? [{ text: normalise(ura.name), weight: 4 }] : []),
      { text: normalise(`${cat.label} ${cat.plural}`), weight: 3 },
      { text: normalise(regionName(p.regionId)), weight: 2 },
    ];
    return { place: p, fields, name: normalise(p.name), line: [p.kind, ura?.name].filter(Boolean).join(' · ') };
  });
}

/** How well one typed word matches one field: whole field, start of a word, or inside (3+ letters, or Chinese). */
function fieldScore(token: string, f: Field): number {
  if (!f.text) return 0;
  if (f.text === token) return f.weight * 3;
  if (f.text.startsWith(token) || f.text.includes(` ${token}`)) return f.weight * 2;
  if ((token.length >= 3 || CJK.test(token)) && f.text.includes(token)) return f.weight;
  return 0;
}

function tokenScore(token: string, fields: Field[]): number {
  const alts = SYNONYMS[token];
  let best = 0;
  for (const f of fields) best = Math.max(best, fieldScore(token, f));
  if (alts) for (const alt of alts) for (const f of fields) best = Math.max(best, fieldScore(alt, f) * (alt === token ? 1 : 0.8));
  return best;
}

/** The words of a query; Chinese without spaces stays one word, and a known phrase ("food centre") stays together. */
export function tokens(query: string): string[] {
  const q = normalise(query);
  if (!q) return [];
  if (SYNONYMS[q]) return [q];
  return q.split(' ');
}

export function searchMap(query: string, picks: readonly SearchPick[] = []): SearchResults {
  const q = normalise(query);
  const words = tokens(query);
  const empty = { areas: [], picks: [], places: [], placeCount: 0 };
  if (!words.length || (q.length < 2 && !CJK.test(q))) return empty;
  index ??= buildIndex();

  const scored: { e: Entry; score: number }[] = [];
  for (const e of index) {
    let score = 0;
    let all = true;
    for (const w of words) {
      const s = tokenScore(w, e.fields);
      if (!s) {
        all = false;
        break;
      }
      score += s;
    }
    if (!all) continue;
    if (e.name.startsWith(q)) score += 15; // the name starts with what was typed
    scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score || a.e.place.name.localeCompare(b.e.place.name));

  const nameMatch = (text: string) => words.every((w) => tokenScore(w, [{ text: normalise(text), weight: 1 }]) > 0);
  return {
    areas: URA_AREAS.filter((a) => nameMatch(a.name)).slice(0, 5),
    picks: picks.filter((k) => nameMatch(`${k.title} ${k.subtitle}`)).slice(0, 4),
    places: scored.slice(0, PLACE_LIMIT).map(({ e }) => ({ place: e.place, line: e.line })),
    placeCount: scored.length,
  };
}
