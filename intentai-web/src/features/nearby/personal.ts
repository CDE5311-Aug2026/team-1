// Pure operations on the device-local exploration record (saved / visited / preferences).
// Save and Visited are independent booleans; each change is idempotent and returns an exact Undo snapshot.
import { canonicalKey } from './identity';
import {
  DEFAULT_EXPLORE_PERSONAL,
  isLocalDate,
  isPersonalPlaceState,
  isPlaceKey,
  type CountryCode,
  type ExplorePersonalData,
  type PersonalPlaceState,
  type PlaceKey,
} from './domain';
import { isCountry } from './types';
import { isRecord } from '../../data/validate';

/** Today's date in the user's local calendar (YYYY-MM-DD). */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function stateOf(data: ExplorePersonalData, key: PlaceKey): PersonalPlaceState | undefined {
  const canonical = canonicalKey(key);
  return data.places.find((s) => s.placeKey === canonical);
}

/** Replaces one place's record (or removes it when both flags are off). */
function put(data: ExplorePersonalData, key: PlaceKey, next: PersonalPlaceState | undefined): ExplorePersonalData {
  const rest = data.places.filter((s) => s.placeKey !== key);
  return { ...data, places: next && (next.saved || next.visited) ? [...rest, next] : rest };
}

export interface Change {
  data: ExplorePersonalData;
  /** True when nothing changed (repeat action). */
  unchanged: boolean;
  key: PlaceKey;
  /** Exact previous record, for Undo. */
  previous: PersonalPlaceState | undefined;
}

function change(
  data: ExplorePersonalData,
  rawKey: PlaceKey,
  patch: (current: PersonalPlaceState) => PersonalPlaceState,
  now: Date,
): Change {
  const key = canonicalKey(rawKey);
  const previous = data.places.find((s) => s.placeKey === key);
  const base: PersonalPlaceState = previous ?? { placeKey: key, saved: false, visited: false, updatedAt: now.toISOString() };
  const patched = patch(base);
  const same =
    patched.saved === base.saved && patched.visited === base.visited && patched.visitedOn === base.visitedOn;
  if (same) return { data, unchanged: true, key, previous };
  const next = { ...patched, updatedAt: now.toISOString() };
  if (!next.visited) delete next.visitedOn;
  return { data: put(data, key, next), unchanged: false, key, previous };
}

export function setSaved(data: ExplorePersonalData, key: PlaceKey, saved: boolean, now = new Date()): Change {
  return change(data, key, (s) => ({ ...s, saved }), now);
}

export class VisitDateError extends Error {}

/**
 * Self-reported visit. Defaults to today; an earlier valid date is allowed, a future date is rejected.
 * Marking an already-visited place again keeps its date (idempotent) unless a new date is given.
 */
export function setVisited(
  data: ExplorePersonalData,
  key: PlaceKey,
  visited: boolean,
  options: { date?: string; now?: Date } = {},
): Change {
  const now = options.now ?? new Date();
  const today = localToday(now);
  if (options.date !== undefined) {
    if (!isLocalDate(options.date)) throw new VisitDateError('Enter a valid date.');
    if (options.date > today) throw new VisitDateError('A visit date cannot be in the future.');
  }
  return change(
    data,
    key,
    (s) =>
      visited
        ? { ...s, visited: true, visitedOn: options.date ?? s.visitedOn ?? today }
        : { ...s, visited: false, visitedOn: undefined },
    now,
  );
}

/** Puts back exactly the record a Change replaced. */
export function restore(data: ExplorePersonalData, key: PlaceKey, previous: PersonalPlaceState | undefined): ExplorePersonalData {
  return put(data, key, previous);
}

/* ---------- Export / import (PRD NBR 27) ---------- */

export const EXPORT_FORMAT = 'intentai-explore-personal';
export const MAX_IMPORT_BYTES = 1024 * 1024;
export const MAX_IMPORT_RECORDS = 5000;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  schemaVersion: 1;
  exportedAt: string;
  preferredCountry: CountryCode;
  selectedAreaId?: string;
  /** Our canonical ids / provider ids, dates and flags only. No provider names, ratings or photos. */
  places: PersonalPlaceState[];
}

export function exportData(data: ExplorePersonalData, now = new Date()): ExportFile {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    preferredCountry: data.preferredCountry,
    ...(data.selectedAreaId ? { selectedAreaId: data.selectedAreaId } : {}),
    places: data.places.map(({ placeKey, saved, visited, visitedOn, updatedAt }) => ({
      placeKey,
      saved,
      visited,
      ...(visitedOn ? { visitedOn } : {}),
      updatedAt,
    })),
  };
}

export type ImportResult =
  | { ok: true; records: PersonalPlaceState[]; preferredCountry?: CountryCode; skipped: number }
  | { ok: false; error: string };

/** Parses and validates an import file. Never throws; never touches stored data. */
export function parseImport(text: string, byteLength: number, now = new Date()): ImportResult {
  if (byteLength > MAX_IMPORT_BYTES) return { ok: false, error: 'This file is larger than 1 MB.' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  if (!isRecord(parsed) || parsed.format !== EXPORT_FORMAT) {
    return { ok: false, error: 'This is not an IntentAI exploration backup.' };
  }
  if (parsed.schemaVersion !== 1) return { ok: false, error: 'This backup uses an unsupported version.' };
  if (!Array.isArray(parsed.places)) return { ok: false, error: 'This backup has no places list.' };
  if (parsed.places.length > MAX_IMPORT_RECORDS) return { ok: false, error: 'This backup has more than 5,000 records.' };
  const today = localToday(now);
  let skipped = 0;
  const byKey = new Map<PlaceKey, PersonalPlaceState>();
  for (const item of parsed.places) {
    if (!isRecord(item) || !isPlaceKey(item.placeKey)) {
      skipped++;
      continue;
    }
    const candidate = {
      placeKey: canonicalKey(item.placeKey),
      saved: item.saved === true,
      visited: item.visited === true,
      ...(item.visited === true && isLocalDate(item.visitedOn) && (item.visitedOn as string) <= today
        ? { visitedOn: item.visitedOn as string }
        : {}),
      updatedAt: typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt)) ? item.updatedAt : now.toISOString(),
    };
    // A visit with a future or invalid date keeps the visit but drops the date.
    if (!isPersonalPlaceState(candidate) || (!candidate.saved && !candidate.visited)) {
      skipped++;
      continue;
    }
    const existing = byKey.get(candidate.placeKey);
    byKey.set(candidate.placeKey, existing ? unionState(existing, candidate) : candidate);
  }
  return {
    ok: true,
    records: [...byKey.values()],
    preferredCountry: isCountry(parsed.preferredCountry) ? parsed.preferredCountry : undefined,
    skipped,
  };
}

function unionState(a: PersonalPlaceState, b: PersonalPlaceState): PersonalPlaceState {
  const visited = a.visited || b.visited;
  const dates = [a.visitedOn, b.visitedOn].filter((d): d is string => !!d).sort();
  return {
    placeKey: a.placeKey,
    saved: a.saved || b.saved,
    visited,
    ...(visited && dates.length ? { visitedOn: dates[0] } : {}),
    updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt,
  };
}

export interface MergePreview {
  newSaved: number;
  newVisited: number;
  /** Visits already here whose date moves to an earlier imported date. */
  datesChanged: number;
  unchanged: number;
  total: number;
}

/** Union by canonical id: nothing already saved or visited is removed. */
export function mergeImport(data: ExplorePersonalData, records: PersonalPlaceState[]): { data: ExplorePersonalData; preview: MergePreview } {
  let newSaved = 0;
  let newVisited = 0;
  let datesChanged = 0;
  let unchanged = 0;
  const map = new Map(data.places.map((s) => [s.placeKey, s]));
  for (const record of records) {
    const existing = map.get(record.placeKey);
    if (!existing) {
      map.set(record.placeKey, record);
      if (record.saved) newSaved++;
      if (record.visited) newVisited++;
      continue;
    }
    const merged = unionState(existing, record);
    if (merged.saved && !existing.saved) newSaved++;
    if (merged.visited && !existing.visited) newVisited++;
    if (existing.visited && merged.visitedOn !== existing.visitedOn) datesChanged++;
    if (merged.saved === existing.saved && merged.visited === existing.visited && merged.visitedOn === existing.visitedOn) {
      unchanged++;
      continue;
    }
    map.set(record.placeKey, { ...merged, updatedAt: existing.updatedAt > record.updatedAt ? existing.updatedAt : record.updatedAt });
  }
  return {
    data: { ...data, places: [...map.values()] },
    preview: { newSaved, newVisited, datesChanged, unchanged, total: records.length },
  };
}

export function emptyPersonal(): ExplorePersonalData {
  return { ...DEFAULT_EXPLORE_PERSONAL, places: [] };
}
