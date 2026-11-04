// The app is FindSG. The old name stays only in identifiers nobody sees, each allowed here for a stated reason.
import { expect, test } from 'vitest';
import { parseImport } from '../features/nearby/personal';
import { fromExport } from '../usage/localLog';
import { LOOKUP_SOURCES, lookupSourceLabel } from './domain';
import { STORAGE_PREFIX } from './persistentStore';
import { exportData } from './profile/storage';

const SOURCES = import.meta.glob('/src/**/*.{ts,tsx,js,jsx,json,html}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const ALLOWED: RegExp[] = [
  /intentai:/, // storage keys and event names: existing phones keep their data
  /source: ?['"]intentai['"]/, // the message the 3D page checks; public/earth-online is shared with /ui1
  /LEGACY_EXPORT_FORMAT = 'intentai-/, // old backups and usage files still load
  /LEGACY_EDITORIAL = 'IntentAI editorial'/, // the stored lookup value, see domain.ts
  /LOOKUP_SOURCES = \[.*'IntentAI editorial'/,
  /source: ['"]IntentAI editorial['"]/, // written to storage, shown through lookupSourceLabel
];

const withoutComments = (text: string) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');

test('the old name reaches no screen and no downloaded file', () => {
  const found = Object.entries(SOURCES)
    .filter(([file]) => !/\.test\.[jt]sx?$/.test(file))
    .flatMap(([file, text]) =>
      withoutComments(text)
        .split(/\r?\n/)
        .filter((line) => /intent ?ai/i.test(line) && !ALLOWED.some((ok) => ok.test(line)))
        .map((line) => `${file}: ${line.trim().slice(0, 120)}`),
    );
  expect(found).toEqual([]);
});

test('a stored team phrase keeps its value and says FindSG on screen', () => {
  expect(LOOKUP_SOURCES).toContain('IntentAI editorial');
  expect(lookupSourceLabel('IntentAI editorial')).toBe('FindSG editorial');
  expect(lookupSourceLabel('Confirmed by a local')).toBe('Confirmed by a local');
});

test('a download shows FindSG even with an old stored phrase; old backup formats still load', () => {
  localStorage.setItem(`${STORAGE_PREFIX}lookups`, JSON.stringify([{ id: 'a', word: 'w', meaning: 'm', source: 'IntentAI editorial' }]));
  expect(JSON.stringify(exportData())).not.toMatch(/intent ?ai/i);
  expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}lookups`)!)[0].source).toBe('IntentAI editorial');
  const old = JSON.stringify({ format: 'intentai-explore-personal', schemaVersion: 1, places: [] });
  expect(parseImport(old, old.length).ok).toBe(true);
  expect(fromExport({ format: 'intentai-usage', version: 1, exportedAt: '2026-11-01T00:00:00.000Z', events: [] })).toEqual([]);
});
