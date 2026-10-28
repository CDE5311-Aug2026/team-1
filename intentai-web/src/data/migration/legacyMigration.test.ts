import { expect, test } from 'vitest';
import { DEFAULT_ONBOARDING } from '../domain';
import legacyV1 from './fixtures/legacy-v1-only.json';
import legacyPartial from './fixtures/legacy-v2-partial.json';
import legacyPopulated from './fixtures/legacy-v2-populated.json';
import newAppUser from './fixtures/new-app-user.json';
import {
  LEGACY_V2_KEY,
  MARKER_KEY,
  PENDING_KEY,
  RECOVERY_KEY,
  runLegacyMigration,
  type MigrationResult,
} from './legacyMigration';

/** In-memory Storage; `failOnSet` makes the Nth setItem (1-based) throw, like a quota error. */
class MemoryStorage implements Storage {
  map = new Map<string, string>();
  sets = 0;
  constructor(private failOnSet = 0) {}
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.sets += 1;
    if (this.failOnSet && this.sets === this.failOnSet) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    this.map.set(key, String(value));
  }
}

const NOW = new Date('2026-10-20T09:00:00Z');

function seeded(fixtures: Record<string, unknown>[], storage = new MemoryStorage()) {
  for (const fixture of fixtures) for (const [key, value] of Object.entries(fixture)) storage.map.set(key, JSON.stringify(value));
  return storage;
}

const read = (s: Storage, key: string) => JSON.parse(s.getItem(`intentai:v1:${key}`) ?? 'null');

/** Everything except the marker's timestamp, for comparing runs. */
function snapshot(s: MemoryStorage) {
  const out = Object.fromEntries(s.map);
  const marker = JSON.parse(out[MARKER_KEY]);
  delete marker.at;
  out[MARKER_KEY] = JSON.stringify(marker);
  return out;
}

test('(1) migrates a populated legacy v2 state into the new stores', () => {
  const s = seeded([legacyPopulated]);
  const result = runLegacyMigration(s, NOW);
  expect(result.status).toBe('migrated');

  expect(read(s, 'onboarding')).toEqual(DEFAULT_ONBOARDING);
  expect(read(s, 'profile')).toEqual({
    from: 'Vietnam',
    time: '3 months – 1 year',
    role: 'Exchange student',
    level: 'Intermediate',
    topics: ['Food', 'Work'],
  });
  expect(read(s, 'settings')).toEqual({ daily: true, occasions: true, local: true, rehearse: true, judgement: true, location: false });
  expect(read(s, 'notices')).toEqual({ status: 'confirmed', dismissed: false, occasion: 'Team dinner', with: 'Colleagues and manager' });
  expect(read(s, 'place')).toBe('Office');
  expect(read(s, 'saved')).toEqual(['can-or-not', 'paiseh']);
  expect(read(s, 'reports')).toEqual([{ answer: 'Save a seat, often with a tissue packet on the table.', reason: 'Too short' }]);
  expect(read(s, 'questions').map((q: { id: string; status: string }) => [q.id, q.status])).toEqual([
    ['q1', 'Pending'],
    ['paiseh', 'Answered'],
  ]);

  // Legacy lookups keep got/encounters/example; learned phrases are added the way the new app records them.
  const lookups = read(s, 'lookups');
  expect(lookups.map((l: { word: string }) => l.word)).toEqual(['Can or not?', 'Chope', 'wah, finally ah', 'shiok']);
  expect(lookups.find((l: { id: string }) => l.id === 'wah')).toMatchObject({ got: true, encounters: 2 });
  expect(lookups.find((l: { id: string }) => l.id === 'can-or-not')).toMatchObject({ source: 'AI-generated' });

  // No invented learning dates or streaks.
  expect(s.getItem('intentai:v1:progress')).toBeNull();
  expect(s.getItem('intentai:v1:streak')).toBeNull();

  const marker = JSON.parse(s.getItem(MARKER_KEY)!);
  expect(marker).toMatchObject({ version: 1, from: 'singlish-v2-state', converted: { learnedAsLookups: 2, questions: 2 } });
  expect(s.getItem(PENDING_KEY)).toBeNull();
  // The learned list itself has no date, so it is kept for recovery.
  expect(JSON.parse(s.getItem(RECOVERY_KEY)!)[0].items).toContainEqual(expect.objectContaining({ field: 'learned', value: ['chope', 'can'] }));
});

test('(2a) invalid JSON in the v2 key falls back to v1 keys and keeps the raw value for recovery', () => {
  const s = seeded([legacyV1]);
  s.map.set(LEGACY_V2_KEY, '{"done": true, broken');
  const result = runLegacyMigration(s, NOW);
  expect(result.status).toBe('migrated');
  expect(read(s, 'saved')).toEqual(['chope']);
  const recovery = JSON.parse(s.getItem(RECOVERY_KEY)!);
  expect(recovery[0]).toEqual({ fromKey: LEGACY_V2_KEY, items: [{ field: '(whole value)', value: '{"done": true, broken', reason: 'invalid JSON' }] });
});

test('(2b) partial v2 state keeps what is valid and recovers the rest', () => {
  const s = seeded([legacyPartial]);
  expect(runLegacyMigration(s, NOW).status).toBe('migrated');
  expect(read(s, 'onboarding')).toEqual(DEFAULT_ONBOARDING);
  expect(read(s, 'profile')).toEqual({ from: 'India', time: '1 – 3 years', role: 'Engineer' });
  expect(read(s, 'settings')).toEqual({ daily: false, occasions: false, local: false, rehearse: false, judgement: false, location: false });
  expect(read(s, 'lookups').map((l: { word: string }) => l.word)).toEqual(['Chope', 'kiasu']);
  expect(read(s, 'questions')).toEqual([]);
  expect(read(s, 'notices').status).toBe('pending');
  expect(s.getItem('intentai:v1:place')).toBeNull();

  const items = JSON.parse(s.getItem(RECOVERY_KEY)!)[0].items as { field: string; value: unknown }[];
  const fields = items.map((i) => i.field);
  for (const field of ['duration', 'topics', 'profile.level', 'settings.daily', 'lookups[1]', 'lookups[2]', 'questions[0]', 'notice', 'place', 'learned', 'theme']) {
    expect(fields).toContain(field);
  }
  expect(items).toContainEqual(expect.objectContaining({ field: 'learned', value: 'lah-legacy' }));
});

test('(2c) v1-only learned and saved arrays are mapped; unknown ids are recovered, not guessed', () => {
  const s = seeded([legacyV1]);
  const result = runLegacyMigration(s, NOW) as Extract<MigrationResult, { status: 'migrated' }>;
  expect(result.status).toBe('migrated');
  expect(result.marker.from).toBe('singlish-v1');
  expect(read(s, 'saved')).toEqual(['chope']);
  // Seed lookups (shown by the legacy app alongside v1 data) plus learned phrases; seed chope is not duplicated.
  expect(read(s, 'lookups').map((l: { word: string }) => l.word)).toEqual([
    'Can or not?',
    'Paiseh',
    'wah, finally ah',
    'chope',
    'sabo',
  ]);
  const recovery = JSON.parse(s.getItem(RECOVERY_KEY)!);
  expect(recovery[0].fromKey).toBe('singlish-v1-learned');
  expect(recovery[0].items).toContainEqual(expect.objectContaining({ field: 'learned', value: 'mystery', reason: 'unknown phrase id' }));
});

test('(3) an existing new-app user keeps every populated new store untouched', () => {
  const s = seeded([newAppUser, legacyPopulated]);
  const before = Object.fromEntries([...s.map].filter(([key]) => key.startsWith('intentai:v1:')));
  const result = runLegacyMigration(s, NOW) as Extract<MigrationResult, { status: 'migrated' }>;
  expect(result.status).toBe('migrated');
  for (const [key, value] of Object.entries(before)) expect(s.getItem(key)).toBe(value);
  expect(result.keptExisting.sort()).toEqual(['lookups', 'onboarding', 'settings']);
  // Absent keys are still filled from legacy.
  expect(read(s, 'profile').from).toBe('Vietnam');
  expect(result.marker.converted.lookups).toBeUndefined();
  expect(result.marker.converted.learnedAsLookups).toBeUndefined();
});

test('(4) an interrupted migration resumes to the same state as one clean run, without duplicates', () => {
  const clean = seeded([legacyPopulated]);
  runLegacyMigration(clean, NOW);

  let interrupted = 0;
  for (let failAt = 1; failAt <= 14; failAt += 1) {
    const flaky = seeded([legacyPopulated], new MemoryStorage(failAt));
    const first = runLegacyMigration(flaky, NOW);
    if (first.status !== 'failed') continue; // fewer writes than failAt
    interrupted += 1;
    expect(flaky.getItem(MARKER_KEY), `marker written despite failure at ${failAt}`).toBeNull();
    // Retry with working storage (same data).
    const retry = new MemoryStorage();
    retry.map = new Map(flaky.map);
    expect(runLegacyMigration(retry, NOW).status).toBe('migrated');
    expect(snapshot(retry), `failure at write ${failAt}`).toEqual(snapshot(clean));
    const words = read(retry, 'lookups').map((l: { word: string }) => l.word.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  }
  // Journal + 9 store writes + recovery + marker: every one of them was interrupted once.
  expect(interrupted).toBe(12);
});

test('(4b) a key the user changed after an interrupted run is not overwritten on resume', () => {
  const flaky = seeded([legacyPopulated], new MemoryStorage(3)); // journal + one store write, then fail
  expect(runLegacyMigration(flaky, NOW).status).toBe('failed');
  const retry = new MemoryStorage();
  retry.map = new Map(flaky.map);
  const [firstWritten] = [...retry.map.keys()].filter((k) => k.startsWith('intentai:v1:') && k !== PENDING_KEY);
  retry.map.set(firstWritten, retry.map.get(firstWritten)!.replace('Vietnam', 'Vietnam (edited)'));
  const edited = retry.map.get(firstWritten);
  const result = runLegacyMigration(retry, NOW) as Extract<MigrationResult, { status: 'migrated' }>;
  expect(result.status).toBe('migrated');
  expect(retry.getItem(firstWritten)).toBe(edited);
});

test('(5) a second run is a no-op', () => {
  const s = seeded([legacyPopulated]);
  runLegacyMigration(s, NOW);
  const after = new Map(s.map);
  const second = runLegacyMigration(s, new Date('2026-10-21T09:00:00Z'));
  expect(second.status).toBe('skipped-already');
  expect(s.map).toEqual(after);
});

test('(5b) no legacy data: writes only the marker, then skips', () => {
  const s = seeded([newAppUser]);
  expect(runLegacyMigration(s, NOW).status).toBe('skipped-no-legacy');
  expect(JSON.parse(s.getItem(MARKER_KEY)!)).toMatchObject({ version: 1, from: 'none' });
  expect(runLegacyMigration(s, NOW).status).toBe('skipped-already');
});

test('(6) location is always off after migration, whatever the legacy value', () => {
  for (const fixture of [legacyPopulated, legacyPartial]) {
    const s = seeded([fixture]);
    runLegacyMigration(s, NOW);
    expect(read(s, 'settings').location).toBe(false);
  }
});

test('(7) legacy keys stay byte-identical for rollback', () => {
  const s = seeded([legacyPopulated, legacyV1]);
  const legacy = ['singlish-v2-state', 'singlish-v1-learned', 'singlish-v1-saved'].map((k) => [k, s.getItem(k)]);
  runLegacyMigration(s, NOW);
  for (const [key, value] of legacy) expect(s.getItem(key!)).toBe(value);
});

test('(8) unconvertible records land in recovery and are counted', () => {
  const s = seeded([legacyPartial]);
  const result = runLegacyMigration(s, NOW) as Extract<MigrationResult, { status: 'migrated' }>;
  const recovery = JSON.parse(s.getItem(RECOVERY_KEY)!);
  const total = recovery.reduce((n: number, e: { items: unknown[] }) => n + e.items.length, 0);
  expect(result.marker.unconverted).toBe(total);
  expect(recovery[0].items).toContainEqual(
    expect.objectContaining({ field: 'lookups[1]', value: { id: 'bad1', word: 'jialat', meaning: 'Terrible.', source: 'My uncle' } }),
  );
});

test('storage that throws on read fails safely without a marker', () => {
  const broken = {
    getItem() {
      throw new DOMException('denied', 'SecurityError');
    },
  } as unknown as Storage;
  const result = runLegacyMigration(broken, NOW);
  expect(result.status).toBe('failed');
  expect(result.status === 'failed' && result.error).toMatch(/denied/);
});

test('blocked site data (window.localStorage throws) fails softly so the app still starts', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
  try {
    expect(runLegacyMigration()).toEqual({ status: 'failed', error: expect.stringContaining('insecure') });
  } finally {
    if (original) Object.defineProperty(window, 'localStorage', original);
  }
});
