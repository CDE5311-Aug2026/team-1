import { expect, test } from 'vitest';
import { URA_AREAS, URA_REGIONS } from '../../data/ura/ura';
import { backdropKey, backdropSrc } from './backdrop';

// the files only listed, never loaded
const FILES = new Set(Object.keys(import.meta.glob('../../../public/home/bg/*.webp')).map((p) => p.replace(/^.*\/bg\/|\.webp$/g, '')));
const existsSync = (key: string) => FILES.has(key);
const file = (key: string) => key;

test('every deck has its own map: the island, each region, each planning area', () => {
  expect(FILES.size).toBe(1 + URA_REGIONS.length + URA_AREAS.length);
  expect(backdropKey({ level: 'regions' })).toBe('sg');
  expect(existsSync(file('sg'))).toBe(true);
  for (const r of URA_REGIONS) expect(existsSync(file(backdropKey({ level: 'areas', region: r.id })!)), r.id).toBe(true);
  for (const a of URA_AREAS) expect(existsSync(file(backdropKey({ level: 'places', areaId: a.id })!)), a.id).toBe(true);
});

test("Editor's Picks keep the kraft paper", () => {
  expect(backdropKey({ level: 'picks' })).toBeNull();
  expect(backdropSrc({ level: 'picks' })).toMatch(/home\/paper\.webp$/);
});
