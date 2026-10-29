/**
 * One-time migration from the legacy production app (web/, `singlish-v2-state`) into the validated
 * `intentai:v1:*` stores (PRD §11.1). Runs at startup, before any store is read.
 *
 * Rules
 * - Source: `singlish-v2-state` when it parses and has the legacy shape (profile, settings, lookups and
 *   questions arrays — the same test web/src/DesignApp.jsx `load()` uses). Only when it is absent or
 *   invalid do we fall back to the v1 keys `singlish-v1-learned` / `singlish-v1-saved`.
 * - Legacy keys are only read, never modified or removed, so a rollback to web/ still finds them.
 * - Absent-only: a new store key that already exists in storage (valid or not) is never overwritten or
 *   merged into. New-app data always wins; a corrupt new value is left for the store's own fallback.
 *   List stores are filled whole, from legacy, only when their key is absent — no partial union.
 * - Settings: every legacy switch is kept except `location`, which is always written as false. The new
 *   Nearby now explains how location is used (kept in this tab only) and must have that accepted first.
 * - Learning progress: legacy `learned` ids carry no date (the legacy app never reset them), so they
 *   cannot prove anything was learned *today*. We do NOT write `progress` or `streak`. Instead, mapped
 *   ids become Moments lookups exactly as the new app records a finished lesson phrase (App.tsx
 *   handleAdvance: id, title, description, source AI-generated) — only when the lookups key is absent —
 *   and the raw learned list is always copied to recovery so the "learned" status itself is not lost.
 * - Saved expression ids map to the `saved` store (ids mapped with LEGACY_PHRASE_IDS).
 * - Anything not representable goes to `intentai:v1:migration-recovery`
 *   (`[{ fromKey, items: [{ field, value, reason }] }]`, raw JSON values), never silently dropped.
 * - Interruption safety: the full write plan is journalled to `intentai:v1:migration-pending` before
 *   any store write. A re-run reuses that plan: keys still absent are written, keys holding exactly the
 *   planned value are ours, keys changed since are left alone. The marker `intentai:v1:migration` is
 *   written last, after every written key re-reads and validates; then the journal is removed.
 * - Storage errors return `{ status: 'failed' }` without a marker, so the app still starts and the
 *   next launch retries.
 */
import {
  DEFAULT_ONBOARDING,
  LEVELS,
  LOOKUP_SOURCES,
  NOTICE_STATUSES,
  SEED_LOOKUPS,
  TOPICS,
  isLookupList,
  isNotices,
  isOnboarding,
  isPlace,
  isProfile,
  isQuestionList,
  isReportList,
  isSavedIds,
  isSettings,
  type Lookup,
  type Profile,
  type Question,
  type Report,
  type Settings,
} from '../domain';
import { phraseBank } from '../expressions';
import { isOneOf, isRecord } from '../validate';

const PREFIX = 'intentai:v1:';
export const MIGRATION_VERSION = 1;
export const MARKER_KEY = `${PREFIX}migration`;
export const PENDING_KEY = `${PREFIX}migration-pending`;
export const RECOVERY_KEY = `${PREFIX}migration-recovery`;
export const LEGACY_V2_KEY = 'singlish-v2-state';
export const LEGACY_V1_LEARNED_KEY = 'singlish-v1-learned';
export const LEGACY_V1_SAVED_KEY = 'singlish-v1-saved';

/** Legacy phrase ids (web/src/DesignApp.jsx `phrases`) → new phraseBank ids. Unknown ids are not guessed. */
export const LEGACY_PHRASE_IDS: Readonly<Record<string, string>> = {
  chope: 'chope',
  can: 'can-or-not',
  paiseh: 'paiseh',
};

type From = 'singlish-v2-state' | 'singlish-v1' | 'none';

export interface MigrationMarker {
  version: number;
  from: From;
  at: string;
  converted: Record<string, number>;
  unconverted: number;
}

export type MigrationResult =
  | { status: 'skipped-already'; marker: MigrationMarker }
  | { status: 'skipped-no-legacy'; marker: MigrationMarker }
  | { status: 'migrated'; marker: MigrationMarker; written: string[]; keptExisting: string[] }
  | { status: 'failed'; error: string };

interface RecoveryItem {
  field: string;
  value: unknown;
  reason: string;
}
interface RecoveryEntry {
  fromKey: string;
  items: RecoveryItem[];
}

interface Plan {
  version: number;
  from: From;
  /** store key (without prefix) → JSON string to write when absent */
  writes: Record<string, string>;
  converted: Record<string, number>;
  recovery: RecoveryEntry[];
  /** Planned keys left alone because new-app data already existed. */
  keptExisting?: string[];
}

const VALIDATORS: Record<string, (value: unknown) => boolean> = {
  onboarding: isOnboarding,
  profile: isProfile,
  settings: isSettings,
  lookups: isLookupList,
  questions: isQuestionList,
  reports: isReportList,
  notices: isNotices,
  place: isPlace,
  saved: isSavedIds,
};

function parse(raw: string | null): { ok: true; value: unknown } | { ok: false } {
  if (raw === null) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function isLegacyV2(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isRecord(value.profile) &&
    isRecord(value.settings) &&
    Array.isArray(value.lookups) &&
    Array.isArray(value.questions)
  );
}

class Collector {
  items: RecoveryItem[] = [];
  add(field: string, value: unknown, reason: string) {
    this.items.push({ field, value, reason });
  }
}

function mapPhraseIds(ids: unknown, field: string, rec: Collector): string[] {
  if (!Array.isArray(ids)) {
    if (ids !== undefined) rec.add(field, ids, 'not a list');
    return [];
  }
  const out: string[] = [];
  for (const id of ids) {
    const mapped = typeof id === 'string' ? LEGACY_PHRASE_IDS[id] : undefined;
    if (mapped === undefined) rec.add(field, id, 'unknown phrase id');
    else if (!out.includes(mapped)) out.push(mapped);
  }
  return out;
}

/** Mapped learned ids as lookups, the way App.tsx records a finished lesson phrase. */
function learnedAsLookups(base: Lookup[], learned: string[]): { list: Lookup[]; added: number } {
  let list = base;
  let added = 0;
  for (const id of learned) {
    const phrase = phraseBank.find((p) => p.id === id);
    if (!phrase) continue;
    if (list.some((l) => l.word.toLowerCase() === phrase.title.toLowerCase() || l.id === phrase.id)) continue;
    list = [{ id: phrase.id, word: phrase.title, meaning: phrase.description, source: 'AI-generated' }, ...list];
    added += 1;
  }
  return { list, added };
}

function convertLookups(raw: unknown[], rec: Collector): Lookup[] {
  const out: Lookup[] = [];
  raw.forEach((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.word !== 'string' ||
      typeof item.meaning !== 'string' ||
      !isOneOf(LOOKUP_SOURCES, item.source)
    ) {
      rec.add(`lookups[${index}]`, item, 'not a valid lookup');
      return;
    }
    const id = typeof item.id === 'string' && item.id.length > 0 ? item.id : `legacy-lookup-${index}`;
    if (out.some((l) => l.word.toLowerCase() === (item.word as string).toLowerCase() || l.id === id)) {
      rec.add(`lookups[${index}]`, item, 'duplicate word or id');
      return;
    }
    const lookup: Lookup = { id, word: item.word, meaning: item.meaning, source: item.source };
    if (typeof item.got === 'boolean') lookup.got = item.got;
    if (typeof item.encounters === 'number' && Number.isFinite(item.encounters) && item.encounters >= 0) {
      lookup.encounters = Math.floor(item.encounters);
    }
    if (typeof item.example === 'string') lookup.example = item.example;
    out.push(lookup);
  });
  return out;
}

function convertQuestions(raw: unknown[], rec: Collector): Question[] {
  const out: Question[] = [];
  raw.forEach((item, index) => {
    const candidate = isRecord(item)
      ? {
          id: item.id,
          text: item.text,
          context: item.context,
          detail: item.detail,
          status: item.status,
          ...(item.answer !== undefined ? { answer: item.answer } : {}),
        }
      : item;
    if (!isQuestionList([candidate]) || out.some((q) => q.id === (candidate as Question).id)) {
      rec.add(`questions[${index}]`, item, 'not a valid question');
      return;
    }
    out.push(candidate as Question);
  });
  return out;
}

function planFromV2(v: Record<string, unknown>, rec: Collector): Omit<Plan, 'version' | 'from' | 'recovery'> {
  const writes: Record<string, unknown> = {};
  const converted: Record<string, number> = {};

  // Onboarding: the legacy answers (duration, Singlish topics) have no equivalent in the new passport
  // flow, so nothing is converted: the user onboards again (an absent-only default).
  writes.onboarding = DEFAULT_ONBOARDING;
  if (v.duration !== undefined) rec.add('duration', v.duration, 'onboarding answers are asked again in the new flow');
  if (v.topics !== undefined) rec.add('topics', v.topics, 'onboarding answers are asked again in the new flow');

  // Profile.
  const p = v.profile as Record<string, unknown>;
  if (typeof p.from === 'string' && typeof p.time === 'string' && typeof p.role === 'string') {
    const profile: Profile = { from: p.from, time: p.time, role: p.role };
    if (isOneOf(LEVELS, p.level)) profile.level = p.level;
    else if (p.level !== undefined) rec.add('profile.level', p.level, 'unknown level');
    if (Array.isArray(p.topics)) {
      const topics = p.topics.filter((t): t is (typeof TOPICS)[number] => isOneOf(TOPICS, t));
      if (topics.length !== p.topics.length) rec.add('profile.topics', p.topics, 'unknown topic');
      profile.topics = [...new Set(topics)];
    }
    writes.profile = profile;
    converted.profile = 1;
  } else {
    rec.add('profile', p, 'missing from/time/role');
  }

  // Settings: location is always off until the new disclosure is accepted.
  const s = v.settings as Record<string, unknown>;
  const settings: Settings = { daily: false, occasions: false, local: false, rehearse: false, judgement: false, location: false };
  for (const key of ['daily', 'occasions', 'local', 'rehearse', 'judgement'] as const) {
    if (typeof s[key] === 'boolean') settings[key] = s[key] as boolean;
    else if (s[key] !== undefined) rec.add(`settings.${key}`, s[key], 'not a boolean');
  }
  writes.settings = settings;
  converted.settings = 1;

  // Lookups (+ learned phrases recorded as lookups).
  let lookups = convertLookups(v.lookups as unknown[], rec);
  const learned = mapPhraseIds(v.learned, 'learned', rec);
  if (Array.isArray(v.learned) && v.learned.length > 0) {
    rec.add('learned', v.learned, 'learned status has no date; kept for recovery (mapped ids added to Moments)');
  }
  const fromLearned = learnedAsLookups(lookups, learned);
  lookups = fromLearned.list;
  writes.lookups = lookups;
  converted.lookups = lookups.length;
  converted.learnedAsLookups = fromLearned.added;

  writes.questions = convertQuestions(v.questions as unknown[], rec);
  converted.questions = (writes.questions as Question[]).length;

  if (v.reports !== undefined) {
    const reports: Report[] = [];
    if (Array.isArray(v.reports)) {
      v.reports.forEach((r, index) => {
        if (isRecord(r) && typeof r.answer === 'string' && typeof r.reason === 'string') reports.push({ answer: r.answer, reason: r.reason });
        else rec.add(`reports[${index}]`, r, 'not a valid report');
      });
    } else rec.add('reports', v.reports, 'not a list');
    writes.reports = reports;
    converted.reports = reports.length;
  }

  // Notices: the legacy app keeps them flat on the state.
  if (v.notice !== undefined || v.occasion !== undefined || v.with !== undefined || v.dismissed !== undefined) {
    const notices = {
      status: isOneOf(NOTICE_STATUSES, v.notice) ? v.notice : 'pending',
      dismissed: typeof v.dismissed === 'boolean' ? v.dismissed : false,
      occasion: typeof v.occasion === 'string' ? v.occasion : 'Team dinner',
      with: typeof v.with === 'string' ? v.with : 'Colleagues and manager',
    };
    if (v.notice !== undefined && !isOneOf(NOTICE_STATUSES, v.notice)) rec.add('notice', v.notice, 'unknown notice status');
    writes.notices = notices;
    converted.notices = 1;
  }

  if (v.place !== undefined) {
    if (isPlace(v.place)) {
      writes.place = v.place;
      converted.place = 1;
    } else rec.add('place', v.place, 'unknown place');
  }

  if (v.saved !== undefined) {
    writes.saved = mapPhraseIds(v.saved, 'saved', rec);
    converted.saved = (writes.saved as string[]).length;
  }

  // Fields the new app has no store for are recovered, not dropped.
  const known = new Set(['done', 'profile', 'settings', 'learned', 'saved', 'notice', 'occasion', 'with', 'dismissed', 'place', 'duration', 'topics', 'lookups', 'questions', 'reports']);
  for (const [key, value] of Object.entries(v)) if (!known.has(key)) rec.add(key, value, 'no matching store');

  return { writes: Object.fromEntries(Object.entries(writes).map(([k, val]) => [k, JSON.stringify(val)])), converted };
}

function buildPlan(storage: Storage): Plan {
  const recovery: RecoveryEntry[] = [];
  const v2raw = storage.getItem(LEGACY_V2_KEY);
  const v2 = parse(v2raw);
  if (v2.ok && isLegacyV2(v2.value)) {
    const rec = new Collector();
    const { writes, converted } = planFromV2(v2.value, rec);
    if (rec.items.length) recovery.push({ fromKey: LEGACY_V2_KEY, items: rec.items });
    return { version: MIGRATION_VERSION, from: 'singlish-v2-state', writes, converted, recovery };
  }
  if (v2raw !== null) {
    recovery.push({
      fromKey: LEGACY_V2_KEY,
      items: [{ field: '(whole value)', value: v2.ok ? v2.value : v2raw, reason: v2.ok ? 'not the legacy state shape' : 'invalid JSON' }],
    });
  }

  // v1 fallback: learned / saved id arrays only.
  const learnedRaw = storage.getItem(LEGACY_V1_LEARNED_KEY);
  const savedRaw = storage.getItem(LEGACY_V1_SAVED_KEY);
  const writes: Record<string, string> = {};
  const converted: Record<string, number> = {};
  if (learnedRaw !== null) {
    const rec = new Collector();
    const parsed = parse(learnedRaw);
    if (!parsed.ok) rec.add('(whole value)', learnedRaw, 'invalid JSON');
    else {
      const learned = mapPhraseIds(parsed.value, 'learned', rec);
      if (Array.isArray(parsed.value) && parsed.value.length > 0) {
        rec.add('learned', parsed.value, 'learned status has no date; kept for recovery (mapped ids added to Moments)');
      }
      // The legacy app showed its seed lookups next to v1 data, which are the new app's seed too.
      const { list, added } = learnedAsLookups(SEED_LOOKUPS, learned);
      if (added > 0) {
        writes.lookups = JSON.stringify(list);
        converted.lookups = list.length;
        converted.learnedAsLookups = added;
      }
    }
    if (rec.items.length) recovery.push({ fromKey: LEGACY_V1_LEARNED_KEY, items: rec.items });
  }
  if (savedRaw !== null) {
    const rec = new Collector();
    const parsed = parse(savedRaw);
    if (!parsed.ok) rec.add('(whole value)', savedRaw, 'invalid JSON');
    else {
      const saved = mapPhraseIds(parsed.value, 'saved', rec);
      writes.saved = JSON.stringify(saved);
      converted.saved = saved.length;
    }
    if (rec.items.length) recovery.push({ fromKey: LEGACY_V1_SAVED_KEY, items: rec.items });
  }
  const any = learnedRaw !== null || savedRaw !== null;
  return { version: MIGRATION_VERSION, from: any ? 'singlish-v1' : recovery.length ? 'singlish-v2-state' : 'none', writes, converted, recovery };
}

function readPending(storage: Storage): Plan | null {
  const parsed = parse(storage.getItem(PENDING_KEY));
  if (!parsed.ok || !isRecord(parsed.value)) return null;
  const p = parsed.value;
  if (p.version !== MIGRATION_VERSION || !isRecord(p.writes) || !isRecord(p.converted) || !Array.isArray(p.recovery)) return null;
  if (!Object.values(p.writes).every((w) => typeof w === 'string')) return null;
  return p as unknown as Plan;
}

function readMarker(storage: Storage): MigrationMarker | null {
  const parsed = parse(storage.getItem(MARKER_KEY));
  if (parsed.ok && isRecord(parsed.value) && typeof parsed.value.version === 'number' && parsed.value.version >= MIGRATION_VERSION) {
    return parsed.value as unknown as MigrationMarker;
  }
  return null;
}

export function runLegacyMigration(storageArg?: Storage, now: Date = new Date()): MigrationResult {
  let storage: Storage;
  try {
    // Reading window.localStorage itself throws when site data is blocked: the app must still start.
    storage = storageArg ?? window.localStorage;
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
  }
  try {
    const existingMarker = readMarker(storage);
    if (existingMarker) return { status: 'skipped-already', marker: existingMarker };

    // Resume an interrupted run with its original plan, so the result is the same as one clean run.
    const pending = readPending(storage);
    const plan = pending ?? buildPlan(storage);

    if (plan.from === 'none' && plan.recovery.length === 0) {
      const marker: MigrationMarker = { version: MIGRATION_VERSION, from: 'none', at: now.toISOString(), converted: {}, unconverted: 0 };
      storage.setItem(MARKER_KEY, JSON.stringify(marker));
      return { status: 'skipped-no-legacy', marker };
    }

    if (!pending) {
      // Keys already present (new-app data) are excluded from the plan before journalling it.
      const writes: Record<string, string> = {};
      for (const [key, json] of Object.entries(plan.writes)) if (storage.getItem(PREFIX + key) === null) writes[key] = json;
      plan.keptExisting = Object.keys(plan.writes).filter((key) => !(key in writes));
      plan.writes = writes;
      storage.setItem(PENDING_KEY, JSON.stringify(plan));
    }

    const written: string[] = [];
    const keptExisting = new Set<string>(plan.keptExisting ?? []);
    for (const [key, json] of Object.entries(plan.writes)) {
      const current = storage.getItem(PREFIX + key);
      if (current === null) {
        storage.setItem(PREFIX + key, json);
        written.push(key);
      } else if (current === json) {
        written.push(key); // written by the interrupted run
      } else {
        keptExisting.add(key); // changed since the interrupted run: the user's data wins
      }
    }

    // Recovery overwrites only its own key, so a resumed run never duplicates entries.
    const unconverted = plan.recovery.reduce((sum, entry) => sum + entry.items.length, 0);
    if (plan.recovery.length) storage.setItem(RECOVERY_KEY, JSON.stringify(plan.recovery));

    for (const key of written) {
      const back = parse(storage.getItem(PREFIX + key));
      if (!back.ok || !VALIDATORS[key]?.(back.value)) throw new Error(`Migrated ${key} did not validate`);
    }

    const converted = Object.fromEntries(Object.entries(plan.converted).filter(([key]) => key === 'learnedAsLookups' ? written.includes('lookups') : written.includes(key)));
    const marker: MigrationMarker = { version: MIGRATION_VERSION, from: plan.from, at: now.toISOString(), converted, unconverted };
    storage.setItem(MARKER_KEY, JSON.stringify(marker));
    try {
      storage.removeItem(PENDING_KEY);
    } catch {
      // The marker already stops any re-run; a stale journal is harmless.
    }
    return { status: 'migrated', marker, written, keptExisting: [...keptExisting] };
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
  }
}

