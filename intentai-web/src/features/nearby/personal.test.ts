import { describe, expect, test } from 'vitest';
import { DEFAULT_EXPLORE_PERSONAL, isExplorePersonalData, type ExplorePersonalData } from './domain';
import {
  EXPORT_FORMAT,
  MAX_IMPORT_BYTES,
  exportData,
  localToday,
  mergeImport,
  parseImport,
  restore,
  setSaved,
  setVisited,
  stateOf,
  VisitDateError,
} from './personal';

const NOW = new Date(2026, 9, 20, 12, 0);
const A = 'curated:sg-maxwell-food-centre' as const;
const B = 'curated:sg-merlion-park' as const;
const empty = (): ExplorePersonalData => ({ ...DEFAULT_EXPLORE_PERSONAL, places: [] });

describe('save and visited are independent', () => {
  test('saving does not visit; visiting does not save', () => {
    const saved = setSaved(empty(), A, true, NOW).data;
    expect(stateOf(saved, A)).toMatchObject({ saved: true, visited: false });
    const visited = setVisited(empty(), A, true, { now: NOW }).data;
    expect(stateOf(visited, A)).toMatchObject({ saved: false, visited: true, visitedOn: '2026-10-20' });
  });

  test('removing a save keeps the visit, removing a visit keeps the save', () => {
    let d = setSaved(empty(), A, true, NOW).data;
    d = setVisited(d, A, true, { now: NOW }).data;
    expect(stateOf(setSaved(d, A, false, NOW).data, A)).toMatchObject({ saved: false, visited: true });
    expect(stateOf(setVisited(d, A, false, { now: NOW }).data, A)).toMatchObject({ saved: true, visited: false });
    expect(stateOf(setVisited(d, A, false, { now: NOW }).data, A)?.visitedOn).toBeUndefined();
  });

  test('repeat actions are idempotent: one record, unchanged flag, date kept', () => {
    const first = setVisited(empty(), A, true, { date: '2026-10-01', now: NOW });
    const again = setVisited(first.data, A, true, { now: NOW });
    expect(again.unchanged).toBe(true);
    expect(again.data.places).toHaveLength(1);
    expect(stateOf(again.data, A)?.visitedOn).toBe('2026-10-01');
    expect(setSaved(setSaved(empty(), A, true).data, A, true).unchanged).toBe(true);
  });

  test('a record with both flags off is removed', () => {
    const d = setSaved(empty(), A, true, NOW).data;
    expect(setSaved(d, A, false, NOW).data.places).toEqual([]);
  });
});

describe('visit dates', () => {
  test('defaults to today in the local calendar and accepts an earlier date', () => {
    expect(localToday(NOW)).toBe('2026-10-20');
    expect(stateOf(setVisited(empty(), A, true, { date: '2025-12-31', now: NOW }).data, A)?.visitedOn).toBe('2025-12-31');
  });

  test('rejects a future date and an impossible date', () => {
    expect(() => setVisited(empty(), A, true, { date: '2026-10-21', now: NOW })).toThrow(VisitDateError);
    expect(() => setVisited(empty(), A, true, { date: '2026-02-30', now: NOW })).toThrow(VisitDateError);
  });
});

test('restore puts back exactly the previous record (Undo)', () => {
  let d = setSaved(empty(), A, true, NOW).data;
  d = setSaved(d, B, true, NOW).data;
  const before = stateOf(d, A);
  const change = setVisited(d, A, true, { now: NOW });
  const undone = restore(change.data, change.key, change.previous);
  expect(stateOf(undone, A)).toEqual(before);
  expect(stateOf(undone, B)?.saved).toBe(true);
  // Undo of a first action removes the record entirely.
  const first = setSaved(empty(), A, true, NOW);
  expect(restore(first.data, first.key, first.previous).places).toEqual([]);
});

describe('export / import', () => {
  const data: ExplorePersonalData = {
    ...empty(),
    selectedAreaId: 'sg-chinatown',
    locationDisclosureAcceptedAt: NOW.toISOString(),
    places: [
      { placeKey: A, saved: true, visited: true, visitedOn: '2026-10-01', updatedAt: NOW.toISOString() },
      { placeKey: B, saved: true, visited: false, updatedAt: NOW.toISOString() },
    ],
  };

  test('exports ids, dates and flags only (no location, no disclosure time)', () => {
    const file = exportData(data, NOW);
    expect(file).toMatchObject({ format: EXPORT_FORMAT, schemaVersion: 1, preferredCountry: 'SG' });
    expect(Object.keys(file.places[0]).sort()).toEqual(['placeKey', 'saved', 'updatedAt', 'visited', 'visitedOn']);
    expect(JSON.stringify(file)).not.toContain('locationDisclosure');
  });

  test('a round trip merges idempotently', () => {
    const text = JSON.stringify(exportData(data, NOW));
    const parsed = parseImport(text, text.length, NOW);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const once = mergeImport(data, parsed.records);
    expect(once.preview).toMatchObject({ newSaved: 0, newVisited: 0, datesChanged: 0, unchanged: 2, total: 2 });
    expect(once.data.places).toEqual(data.places);
    const twice = mergeImport(once.data, parsed.records);
    expect(twice.data.places).toEqual(data.places);
  });

  test('union never removes existing state and keeps the earliest visit date', () => {
    const incoming = [
      { placeKey: A, saved: false, visited: true, visitedOn: '2026-09-01', updatedAt: NOW.toISOString() },
      { placeKey: 'curated:sg-unknown-place' as const, saved: true, visited: false, updatedAt: NOW.toISOString() },
    ];
    const { data: merged, preview } = mergeImport(data, incoming);
    expect(stateOf(merged, A)).toMatchObject({ saved: true, visited: true, visitedOn: '2026-09-01' });
    // Unknown ids stay recoverable.
    expect(merged.places.some((p) => p.placeKey === 'curated:sg-unknown-place')).toBe(true);
    expect(preview.newSaved).toBe(1);
    expect(preview.datesChanged).toBe(1);
    expect(isExplorePersonalData(merged)).toBe(true);
  });

  test('rejects bad JSON, other files, oversize files, unknown versions and too many records', () => {
    expect(parseImport('{nope', 5, NOW)).toEqual({ ok: false, error: 'This file is not valid JSON.' });
    expect(parseImport('{"places":[]}', 13, NOW)).toMatchObject({ ok: false });
    expect(parseImport('{}', MAX_IMPORT_BYTES + 1, NOW)).toEqual({ ok: false, error: 'This file is larger than 1 MB.' });
    expect(parseImport(JSON.stringify({ format: EXPORT_FORMAT, schemaVersion: 2, places: [] }), 60, NOW)).toMatchObject({ ok: false });
    const many = JSON.stringify({ format: EXPORT_FORMAT, schemaVersion: 1, places: Array.from({ length: 5001 }, () => ({})) });
    expect(parseImport(many, many.length, NOW)).toEqual({ ok: false, error: 'This backup has more than 5,000 records.' });
  });

  test('skips invalid records and drops future visit dates without losing the visit', () => {
    const text = JSON.stringify({
      format: EXPORT_FORMAT,
      schemaVersion: 1,
      places: [
        { placeKey: 'javascript:alert(1)', saved: true, visited: false },
        { placeKey: A, saved: 'yes', visited: false },
        { placeKey: B, saved: false, visited: true, visitedOn: '2030-01-01', updatedAt: 'garbage' },
      ],
    });
    const parsed = parseImport(text, text.length, NOW);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.skipped).toBe(2);
    expect(parsed.records).toEqual([{ placeKey: B, saved: false, visited: true, updatedAt: NOW.toISOString() }]);
  });
});

test('stored personal data is validated', () => {
  expect(isExplorePersonalData(DEFAULT_EXPLORE_PERSONAL)).toBe(true);
  expect(isExplorePersonalData({ ...DEFAULT_EXPLORE_PERSONAL, preferredCountry: 'XX' })).toBe(false);
  expect(isExplorePersonalData({ ...DEFAULT_EXPLORE_PERSONAL, places: [{ placeKey: A, saved: true, visited: false }] })).toBe(false);
  // The record never holds a position.
  expect(isExplorePersonalData({ ...DEFAULT_EXPLORE_PERSONAL, milestonesSeen: { 'sg-100': [10, 33] } })).toBe(false);
});
