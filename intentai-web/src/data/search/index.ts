// v2 Search (board 07): one index over the published places, Hunt's challenges and its story volumes, grouped by
// Tourism 2040 category. Places are found by Home's map search (components/Discovery/mapSearch.ts, used as it is: its
// names, aliases, synonyms and ranking), plus what that search does not know: the Tourism 2040 label and subtype.
// No people are indexed (board 07's "hunters" are left out: there is no real hunter data).
import { normalise, searchMap, tokens } from '../../components/Discovery/mapSearch';
import { area as localityOf, PUBLISHED_PLACES, regionName } from '../../features/nearby/catalogue';
import type { CuratedPlace } from '../../features/nearby/domain';
import { HUNT_CHALLENGES } from '../hunt/stories';
import { areaOfPlace } from '../ura/ura';
import { TOURISM_CATEGORIES, TOURISM_INFO, tourismOf, type TourismCategory, type TourismFilter } from '../tourism';
import { dateRange, HUNT_CATEGORY, HUNT_VOLUMES, stopCount, volumeHref, volumeOf } from './hunt';

export type SearchKind = 'place' | 'challenge' | 'volume';

export interface SearchEntry {
  /** Unique: `place:<id>`, `challenge:<id>`, `volume:<id>`. */
  key: string;
  kind: SearchKind;
  title: string;
  /** One line under the title: "Chinatown · Hawker centre", "Vol. VI · 7–8 Nov". */
  line: string;
  category: TourismCategory;
  href: string;
  place?: CuratedPlace;
}

export const KIND_LABEL: Record<SearchKind, string> = { place: 'Place', challenge: 'Challenge', volume: 'Volume' };

interface Indexed {
  entry: SearchEntry;
  /** Normalised texts a typed word may match. */
  fields: string[];
}

/** The place's neighbourhood (the catalogue's area, else its URA planning area, else its region). */
export function placeArea(p: CuratedPlace): string {
  return localityOf(p.areaId)?.name ?? areaOfPlace(p.id)?.name ?? regionName(p.regionId);
}

const placeHref = (id: string) => `/nearby/place/${encodeURIComponent(id)}`;

let index: Indexed[] | null = null;

function build(): Indexed[] {
  const out: Indexed[] = [];
  for (const p of PUBLISHED_PLACES) {
    const category = tourismOf(p);
    // planned places are drafts (never listed as if open); a place not yet sorted into a category is left out
    if (!category || p.operatingStatus === 'planned') continue;
    const info = TOURISM_INFO[category];
    out.push({
      entry: { key: `place:${p.id}`, kind: 'place', title: p.name, line: `${placeArea(p)} · ${p.kind}`, category, href: placeHref(p.id), place: p },
      fields: [p.name, p.kind, placeArea(p), areaOfPlace(p.id)?.name ?? '', info.label, info.stbName, p.tourism?.subtype ?? ''].map(normalise),
    });
  }
  for (const c of HUNT_CHALLENGES) {
    const v = volumeOf(c.routeId);
    out.push({
      entry: {
        key: `challenge:${c.id}`,
        kind: 'challenge',
        title: c.title,
        line: [v && `Vol. ${v.roman} · ${v.title}`, dateRange(c.from, c.to)].filter(Boolean).join(' · '),
        category: HUNT_CATEGORY,
        // the challenge page was retired (second canvas): a challenge opens its volume
        href: volumeHref(c.routeId),
      },
      fields: [c.title, v?.title ?? '', v?.place ?? '', 'challenge weekend hunt'].map(normalise),
    });
  }
  for (const v of HUNT_VOLUMES) {
    out.push({
      entry: {
        key: `volume:${v.id}`,
        kind: 'volume',
        title: v.title,
        line: `Vol. ${v.roman} · ${v.place} · ${stopCount(v.id)} stops`,
        category: HUNT_CATEGORY,
        href: volumeHref(v.id),
      },
      fields: [v.title, v.place, `vol ${v.roman} volume story hunt`].map(normalise),
    });
  }
  return out;
}

/** The same test as Home's map search: whole field, start of a word, or inside a field (3+ letters). */
function wordMatches(word: string, fields: string[]): boolean {
  return fields.some((f) => !!f && (f === word || f.startsWith(word) || f.includes(` ${word}`) || (word.length >= 3 && f.includes(word))));
}

export function allEntries(): SearchEntry[] {
  index ??= build();
  return index.map((i) => i.entry);
}

export type Counts = Record<TourismFilter, number>;

export function countByCategory(entries: readonly SearchEntry[]): Counts {
  const counts = { all: entries.length, att: 0, wel: 0, lei: 0, cru: 0 } as Counts;
  for (const e of entries) counts[e.category] += 1;
  return counts;
}

/** Everything matching the query, best first: Home's map-search order for places, then the rest by name. */
export function searchAll(query: string): SearchEntry[] {
  const q = normalise(query);
  const words = tokens(query);
  if (!words.length || (q.length < 2 && !/[㐀-鿿]/.test(q))) return [];
  index ??= build();
  const byKey = new Map(index.map((i) => [i.entry.key, i]));
  const ranked = searchMap(query, []).places.map((h) => byKey.get(`place:${h.place.id}`)?.entry).filter((e): e is SearchEntry => !!e);
  const seen = new Set(ranked.map((e) => e.key));
  const rest = index
    .filter((i) => !seen.has(i.entry.key) && words.every((w) => wordMatches(w, i.fields)))
    .map((i) => i.entry)
    .sort((a, b) => (a.kind === 'place' ? 1 : 0) - (b.kind === 'place' ? 1 : 0) || a.title.localeCompare(b.title));
  // Hunt entries are few: they come before the long tail of places
  const hunt = rest.filter((e) => e.kind !== 'place');
  const places = rest.filter((e) => e.kind === 'place');
  return [...hunt, ...ranked, ...places];
}

export interface SearchGroup {
  category: TourismCategory;
  entries: SearchEntry[];
}

/** Grouped under category headers, in the given order (Search passes the user's ranking). Empty groups are dropped. */
export function groupByCategory(entries: readonly SearchEntry[], order: readonly TourismCategory[] = TOURISM_CATEGORIES): SearchGroup[] {
  return order.map((category) => ({ category, entries: entries.filter((e) => e.category === category) })).filter((g) => g.entries.length > 0);
}

/** Test-only. */
export function resetSearchIndexForTests() {
  index = null;
}
