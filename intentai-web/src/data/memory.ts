// Memory (like Claude's): what IntentAI remembers about the user so Ask has context without being told again.
// Two kinds of entries:
//  - from your profile: worked out from onboarding and "You as a local" on every read (never copied), so editing the
//    profile updates them. Forgetting one hides it (kept in `forgotten`).
//  - learned: sentences the user said in Ask ("I'm from Lyon", "我在新加坡读书") or added by hand.
// The user can switch memory off (Ask then uses none of it), forget one entry, clear everything, or reset to the
// profile. Stored on this device only.
import { createPersistentStore } from './persistentStore';
import { onDataDeleted } from './stores';
import { isRecord } from './validate';
import { countryOf, languageOf, roleOf, stayOf, type ProfileV3 } from './profile/profile';
import type { LocalProfile } from './profile/localProfile';

export type MemorySource = 'profile' | 'ask' | 'you';

export interface MemoryItem {
  id: string;
  text: string;
  source: MemorySource;
  /** ms since epoch; profile entries have none. */
  createdAt?: number;
}

export interface MemoryState {
  enabled: boolean;
  /** Learned and hand-added entries, newest first. */
  items: MemoryItem[];
  /** Profile entries the user forgot (their ids). */
  forgotten: string[];
}

export const EMPTY_MEMORY: MemoryState = { enabled: true, items: [], forgotten: [] };

function isItem(v: unknown): v is MemoryItem {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.text === 'string' &&
    (v.source === 'profile' || v.source === 'ask' || v.source === 'you') &&
    (v.createdAt === undefined || typeof v.createdAt === 'number')
  );
}

export function isMemoryState(v: unknown): v is MemoryState {
  return (
    isRecord(v) &&
    typeof v.enabled === 'boolean' &&
    Array.isArray(v.items) &&
    v.items.every(isItem) &&
    Array.isArray(v.forgotten) &&
    v.forgotten.every((x) => typeof x === 'string')
  );
}

export const memoryStore = createPersistentStore<MemoryState>({ key: 'memory', fallback: EMPTY_MEMORY, isValid: isMemoryState });

onDataDeleted(() => memoryStore.set(EMPTY_MEMORY));

/** Entries worked out from onboarding and the local profile. */
export function profileMemories(profile: ProfileV3, local?: LocalProfile): MemoryItem[] {
  const out: MemoryItem[] = [];
  const add = (id: string, text: string | undefined) => text && out.push({ id: `profile:${id}`, text, source: 'profile' });
  add('from', countryOf(profile.from) && `From ${countryOf(profile.from)!.name}`);
  add('stay', stayOf(profile.stay) && `In Singapore: ${stayOf(profile.stay)!.label.toLowerCase()}`);
  add('role', roleOf(profile.role) && `Here as: ${roleOf(profile.role)!.label.toLowerCase()}`);
  add('language', languageOf(profile.language) && `Prefers ${languageOf(profile.language)!.english.replace(/^Cards in /, '')}`);
  if (local) {
    if (local.nativeLanguages.length) add('native', `Native language: ${local.nativeLanguages.join(', ')}`);
    if (local.grewUp) add('grewUp', `Grew up in ${local.grewUp}`);
    if (local.culture.length) add('culture', `Culture: ${local.culture.join(', ')}`);
    if (local.background) add('background', `Background: ${local.background}`);
  }
  return out;
}

/** Everything Ask may use now: nothing when memory is off. Learned entries first (newest), then the profile. */
export function activeMemories(state: MemoryState, profile: ProfileV3, local?: LocalProfile): MemoryItem[] {
  if (!state.enabled) return [];
  return [...state.items, ...profileMemories(profile, local).filter((m) => !state.forgotten.includes(m.id))];
}

/* ---------- Learning from what the user says in Ask ---------- */

const PATTERNS: { re: RegExp; text: (m: RegExpMatchArray) => string }[] = [
  { re: /\bI(?:['’]m| am) from ([A-Z][\p{L} .'-]{1,40}?)(?=[,.!?]|$| and | but )/u, text: (m) => `From ${m[1].trim()}` },
  { re: /\bI grew up in ([A-Z][\p{L} .'-]{1,40}?)(?=[,.!?]|$| and | but )/u, text: (m) => `Grew up in ${m[1].trim()}` },
  { re: /\bmy (?:native|first|mother) (?:language|tongue) is ([A-Z][\p{L} -]{1,30}?)(?=[,.!?]|$| and | but )/iu, text: (m) => `Native language: ${m[1].trim()}` },
  { re: /\bI(?:['’]m| am) (?:a |an )?(student|intern|exchange student|researcher|teacher|engineer|nurse|designer)\b/i, text: (m) => `Here as: ${m[1].toLowerCase()}` },
  { re: /\bI (?:live|stay) (?:in|near|at) ([A-Z][\p{L} .'-]{1,30}?)(?=[,.!?]|$| and | but )/u, text: (m) => `Lives near ${m[1].trim()}` },
  { re: /我(?:来自|是从)([\p{Script=Han}]{2,8}?)(?:来的|来|，|。|$)/u, text: (m) => `来自${m[1]}` },
  { re: /我在([\p{Script=Han}]{2,8}?)长大/u, text: (m) => `在${m[1]}长大` },
  { re: /我(?:的)?母语是([\p{Script=Han}A-Za-z]{2,10}?)(?:，|。|$)/u, text: (m) => `母语：${m[1]}` },
  { re: /我(?:在新加坡)?(?:读书|上学|是学生)/u, text: () => '在新加坡读书' },
];

/** A fact about the user in one Ask message, or undefined. Only clear first-person statements count. */
export function learnFrom(message: string): string | undefined {
  for (const p of PATTERNS) {
    const m = message.match(p.re);
    if (m) return p.text(m);
  }
  return undefined;
}

const sameText = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** Adds an entry unless memory is off or the same text is already remembered. Returns the new item, if any. */
export function remember(text: string, source: Exclude<MemorySource, 'profile'>, now = Date.now()): MemoryItem | undefined {
  const state = memoryStore.get();
  const clean = text.trim().slice(0, 140);
  if (!state.enabled || !clean || state.items.some((m) => sameText(m.text, clean))) return undefined;
  const item: MemoryItem = { id: `m${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, text: clean, source, createdAt: now };
  memoryStore.set((prev) => ({ ...prev, items: [item, ...prev.items] }));
  return item;
}

export function forget(id: string) {
  memoryStore.set((prev) =>
    id.startsWith('profile:')
      ? { ...prev, forgotten: prev.forgotten.includes(id) ? prev.forgotten : [...prev.forgotten, id] }
      : { ...prev, items: prev.items.filter((m) => m.id !== id) },
  );
}

/** Clear: forget everything, including the profile entries (until reset). */
export function clearMemory(profileIds: readonly string[]) {
  memoryStore.set((prev) => ({ ...prev, items: [], forgotten: [...new Set([...prev.forgotten, ...profileIds])] }));
}

/** Reset: learned entries gone, profile entries back, memory on. */
export function resetMemory() {
  memoryStore.set(EMPTY_MEMORY);
}

export function setMemoryEnabled(enabled: boolean) {
  memoryStore.set((prev) => ({ ...prev, enabled }));
}
