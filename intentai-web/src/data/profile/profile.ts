// Onboarding v3 (Figma O1–O8) and My Space (S1–S4): what the app knows about the user, answered once in onboarding and
// edited in My Space. Stored on this device only. Each answer is also written through to the stores the rest of the
// app already reads (profileStore, onboardingStore, culturePrefsStore, Nearby's selected area), see syncLegacy().
import type { CategoryId } from '../culture';
import { DEFAULT_PREFS, type CulturePrefs } from '../culturePrefs';
import type { Duration } from '../domain';
import { createPersistentStore } from '../persistentStore';
import { culturePrefsStore, explorePersonalStore, onboardingStore, onDataDeleted, profileStore } from '../stores';
import { isRecord } from '../validate';
import { DEFAULT_RADIUS_M, isRadius, type RadiusM } from '../../features/nearby/types';

/* ---------- Options (the Figma tiles) ---------- */

/** Country tiles: a code circle, never a flag image. */
export const COUNTRIES = [
  { code: 'CN', name: 'China', color: '#c8102e' },
  { code: 'IN', name: 'India', color: '#b35f00' },
  { code: 'MY', name: 'Malaysia', color: '#0b3d91' },
  { code: 'ID', name: 'Indonesia', color: '#a33a12' },
  { code: 'KR', name: 'South Korea', color: '#23211d' },
  { code: 'US', name: 'United States', color: '#3c3b6e' },
  { code: 'PH', name: 'Philippines', color: '#0038a8' },
  { code: 'VN', name: 'Vietnam', color: '#b3261e' },
  { code: 'MM', name: 'Myanmar', color: '#2e7d32' },
  { code: 'TH', name: 'Thailand', color: '#2d2a7a' },
  { code: 'GB', name: 'United Kingdom', color: '#012169' },
  { code: 'AU', name: 'Australia', color: '#00247d' },
] as const;
export type CountryCode = (typeof COUNTRIES)[number]['code'];

export const STAYS = [
  { id: 'lt3m', label: 'Less than 3 months', short: '< 3 months', tick: '< 3 mo', note: 'Just arrived', icon: 'plane' },
  { id: '3to12m', label: '3–12 months', short: '3–12 months', tick: '3–12 mo', note: 'Settling in', icon: 'pin' },
  { id: '1to3y', label: '1–3 years', short: '1–3 years', tick: '1–3 yr', note: 'Feeling at home', icon: 'home' },
  { id: '3yplus', label: 'More than 3 years', short: '3+ years', tick: '3+ yr', note: 'Almost a local', icon: 'star' },
] as const;
export type StayId = (typeof STAYS)[number]['id'];

export const ROLES = [
  { id: 'student', label: 'Student', icon: 'cap' },
  { id: 'intern', label: 'Student intern', icon: 'badge' },
  { id: 'working', label: 'Working', icon: 'briefcase' },
  { id: 'visiting', label: 'Visiting', icon: 'bag' },
  { id: 'family', label: 'Family', icon: 'people' },
  { id: 'researcher', label: 'Researcher', icon: 'book' },
] as const;
export type RoleId = (typeof ROLES)[number]['id'];

/** Language tiles in their own script. Only English cards exist; the others are kept as a preference. */
export const LANGUAGES = [
  { id: 'en', mark: 'EN', name: 'English', english: 'Cards in English', lang: 'en' },
  { id: 'zh', mark: '中', name: '中文', english: 'Chinese, simplified', lang: 'zh-Hans' },
  { id: 'ms', mark: 'MS', name: 'Bahasa Melayu', english: 'Malay', lang: 'ms' },
  { id: 'ta', mark: 'த', name: 'தமிழ்', english: 'Tamil', lang: 'ta' },
  { id: 'id', mark: 'ID', name: 'Bahasa Indonesia', english: 'Indonesian', lang: 'id' },
  { id: 'ko', mark: '한', name: '한국어', english: 'Korean', lang: 'ko' },
] as const;
export type LanguageId = (typeof LANGUAGES)[number]['id'];

/** The four kinds of place every Home place is tagged with (the place tags), with the old Today category each one maps
 *  to (Nature has none). */
export const TOPICS = [
  { id: 'landmark', label: 'Landmark', category: 'monuments' },
  { id: 'culture', label: 'Culture', category: 'history' },
  { id: 'food', label: 'Food', category: 'foods' },
  { id: 'nature', label: 'Nature', category: null },
] as const satisfies readonly { id: string; label: string; category: CategoryId | null }[];
export type TopicId = (typeof TOPICS)[number]['id'];

/** Topic ids from before the place tags, and the tag each one became. */
const OLD_TOPICS: Record<string, TopicId> = { monuments: 'landmark', festivals: 'culture', history: 'culture' };

export const FIELDS = ['from', 'stay', 'role', 'language', 'base', 'topics'] as const;
export type FieldKey = (typeof FIELDS)[number];

/** What onboarding asks: only what chooses places (which tags first, and where Nearby starts). */
export const ONBOARDING_FIELDS = ['topics', 'base'] as const satisfies readonly FieldKey[];

export const FIELD_LABELS: Record<FieldKey, string> = {
  from: 'From',
  stay: 'In Singapore',
  role: 'Here as',
  language: 'Language',
  base: 'Home base',
  topics: 'Place tags',
};

export const FIELD_USES: Record<FieldKey, string> = {
  from: 'Used to compare customs with home',
  stay: 'Used to decide how much background cards give',
  role: 'Used to pick examples that suit your days',
  language: 'Used for translations on cards and in Ask',
  base: 'Used as the point Nearby searches from',
  topics: 'Used to decide which places Home shows first',
};

/* ---------- The store ---------- */

export interface ProfileV3 {
  from: CountryCode | null;
  stay: StayId | null;
  role: RoleId | null;
  language: LanguageId | null;
  /** Nearby area id (src/data/explore/areas.json). A pin snaps to an area: no exact point is kept. */
  base: string | null;
  /** Ranked, #1 first. */
  topics: TopicId[];
  /** Fields shown with a closed eye. From starts hidden. */
  hidden: FieldKey[];
  /** When the passport was stamped (ISO date), set at the end of onboarding. */
  stampedOn?: string;
}

export const DEFAULT_PROFILE_V3: ProfileV3 = {
  from: null,
  stay: null,
  role: null,
  language: null,
  base: null,
  topics: [],
  hidden: ['from'],
};

const oneOf = <T extends { readonly [k: string]: unknown }>(list: readonly T[], key: keyof T, value: unknown) =>
  value === null || list.some((item) => item[key] === value);

export function isProfileV3(value: unknown): value is ProfileV3 {
  return (
    isRecord(value) &&
    oneOf(COUNTRIES, 'code', value.from) &&
    oneOf(STAYS, 'id', value.stay) &&
    oneOf(ROLES, 'id', value.role) &&
    oneOf(LANGUAGES, 'id', value.language) &&
    (value.base === null || typeof value.base === 'string') &&
    Array.isArray(value.topics) &&
    value.topics.every((t) => TOPICS.some((topic) => topic.id === t)) &&
    new Set(value.topics).size === value.topics.length &&
    Array.isArray(value.hidden) &&
    value.hidden.every((f) => (FIELDS as readonly unknown[]).includes(f)) &&
    (value.stampedOn === undefined || typeof value.stampedOn === 'string')
  );
}

/** A profile saved before the place tags: its old topics become tags, so no answer is lost. */
export function repairProfileV3(value: unknown): ProfileV3 | null {
  if (!isRecord(value) || !Array.isArray(value.topics)) return null;
  const topics = [...new Set(value.topics.map((t) => (typeof t === 'string' ? OLD_TOPICS[t] ?? t : t)))];
  const next = { ...value, topics };
  return isProfileV3(next) ? next : null;
}

export const profileV3Store = createPersistentStore<ProfileV3>({
  key: 'profile-v3',
  fallback: DEFAULT_PROFILE_V3,
  isValid: isProfileV3,
  repair: repairProfileV3,
});

/** S2 preferences that only this device keeps. The app sends no notifications: these are saved choices only. */
export interface MySpacePrefs {
  notify: { localAnswers: boolean; recaps: boolean; occasions: boolean; nearYou: boolean };
  notifyTime: 'morning' | 'evening';
  captions: boolean;
  haptics: boolean;
  /** Text size step (TEXT_SCALE): the root font size of the whole app. */
  textSize: TextSize;
  /** Nearby's default search radius, one of Explore's radii (metres). */
  radiusM: RadiusM;
  /** Anonymous page timing may leave the phone (Privacy & data). Off: nothing is sent. */
  usageTiming: boolean;
}

export const TEXT_SIZES = [0, 1, 2, 3, 4] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
/** Root font scale per text size step (the app is sized in rem). */
export const TEXT_SCALE: Record<TextSize, number> = { 0: 0.9, 1: 1, 2: 1.1, 3: 1.2, 4: 1.3 };
export const TEXT_SIZE_LABELS: Record<TextSize, string> = { 0: 'Small', 1: 'Default', 2: 'Large', 3: 'Larger', 4: 'Largest' };

export const DEFAULT_MY_SPACE_PREFS: MySpacePrefs = {
  notify: { localAnswers: false, recaps: false, occasions: false, nearYou: false },
  notifyTime: 'evening',
  captions: true,
  haptics: false,
  textSize: 1,
  radiusM: DEFAULT_RADIUS_M,
  usageTiming: true,
};

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isTextSize = (v: unknown): v is TextSize => (TEXT_SIZES as readonly unknown[]).includes(v);
const isNotifyTime = (v: unknown): v is MySpacePrefs['notifyTime'] => v === 'morning' || v === 'evening';

export function isMySpacePrefs(value: unknown): value is MySpacePrefs {
  return (
    isRecord(value) &&
    isRecord(value.notify) &&
    Object.keys(DEFAULT_MY_SPACE_PREFS.notify).every((k) => isBool((value.notify as Record<string, unknown>)[k])) &&
    isNotifyTime(value.notifyTime) &&
    isBool(value.captions) &&
    isBool(value.haptics) &&
    isTextSize(value.textSize) &&
    isRadius(value.radiusM) &&
    isBool(value.usageTiming)
  );
}

/** Keeps each valid field of an older or damaged record and defaults the rest, so a choice like page timing off is never silently undone. */
export function repairMySpacePrefs(value: unknown): MySpacePrefs | null {
  if (!isRecord(value)) return null;
  const d = DEFAULT_MY_SPACE_PREFS;
  const notify = isRecord(value.notify) ? value.notify : {};
  const bool = (v: unknown, fallback: boolean) => (isBool(v) ? v : fallback);
  return {
    notify: {
      localAnswers: bool(notify.localAnswers, d.notify.localAnswers),
      recaps: bool(notify.recaps, d.notify.recaps),
      occasions: bool(notify.occasions, d.notify.occasions),
      nearYou: bool(notify.nearYou, d.notify.nearYou),
    },
    notifyTime: isNotifyTime(value.notifyTime) ? value.notifyTime : d.notifyTime,
    captions: bool(value.captions, d.captions),
    haptics: bool(value.haptics, d.haptics),
    textSize: isTextSize(value.textSize) ? value.textSize : d.textSize,
    radiusM: isRadius(value.radiusM) ? value.radiusM : d.radiusM,
    usageTiming: bool(value.usageTiming, d.usageTiming),
  };
}

export const mySpacePrefsStore = createPersistentStore<MySpacePrefs>({
  key: 'my-space-prefs',
  fallback: DEFAULT_MY_SPACE_PREFS,
  isValid: isMySpacePrefs,
  repair: repairMySpacePrefs,
});

/** Resets this file's stores. deleteAllData() runs it through onDataDeleted until the integrator lists them there. */
export function clearProfileData() {
  profileV3Store.set(DEFAULT_PROFILE_V3);
  mySpacePrefsStore.set(DEFAULT_MY_SPACE_PREFS);
}
onDataDeleted(clearProfileData);

/* ---------- Lookups ---------- */

export const countryOf = (code: CountryCode | null) => COUNTRIES.find((c) => c.code === code);
export const stayOf = (id: StayId | null) => STAYS.find((s) => s.id === id);
export const roleOf = (id: RoleId | null) => ROLES.find((r) => r.id === id);
export const languageOf = (id: LanguageId | null) => LANGUAGES.find((l) => l.id === id);
export const topicOf = (id: TopicId) => TOPICS.find((t) => t.id === id)!;

/** The value shown on the passport and in My Space, or null while unanswered. */
export function fieldValue(profile: ProfileV3, field: FieldKey, areaName: (id: string) => string | undefined): string | null {
  switch (field) {
    case 'from':
      return countryOf(profile.from)?.name ?? null;
    case 'stay':
      return stayOf(profile.stay)?.short ?? null;
    case 'role':
      return roleOf(profile.role)?.label ?? null;
    case 'language':
      return languageOf(profile.language)?.name ?? null;
    case 'base':
      return profile.base ? areaName(profile.base) ?? null : null;
    case 'topics':
      return profile.topics.length ? profile.topics.map((t) => topicOf(t).label).join(' › ') : null;
  }
}

/**
 * The passport's machine-readable line, as in Figma: P<SGP + the holder's name, then the role in capitals. It holds A-Z and
 * digits only: accents drop to their base letter, a name with no such letters is left blank, and a long name gives way to the role.
 */
export function mrzLine(holder: string, profile: ProfileV3, length = 44): string {
  const spelled = holder.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9]+/g, '<').replace(/^<+|<+$/g, '');
  const role = profile.hidden.includes('role') ? '' : roleOf(profile.role)?.label.toUpperCase().replace(/[^A-Z]+/g, '<') ?? '';
  const tail = role ? `<<<<${role}` : '<<<';
  const name = spelled.slice(0, Math.max(0, length - 'P<SGP'.length - tail.length)).replace(/<+$/, '');
  return (`P<SGP${name}${tail}` + '<'.repeat(length)).slice(0, length);
}

/** The holder's initial for an avatar: one whole letter, however many code units it takes. */
export function holderInitial(holder: string): string {
  return Array.from(holder.trim())[0]?.toUpperCase() ?? 'W';
}

/** Today's three categories from the ranking: ranked topics first, then the default order fills the rest. */
export function prefsFromRanking(topics: readonly TopicId[]): CulturePrefs {
  const ranked = topics.flatMap((t): CategoryId[] => {
    const c = topicOf(t).category;
    return c ? [c] : [];
  });
  const filled = [...ranked, ...TOPICS.map((t) => t.category as CategoryId), ...DEFAULT_PREFS.categories];
  const categories = [...new Set(filled)].slice(0, 3) as CulturePrefs['categories'];
  return { categories };
}

const LEGACY_DURATION: Record<StayId, Duration | null> = {
  lt3m: 'Less than 3 months',
  '3to12m': '3 months – 1 year',
  '1to3y': '1 – 3 years',
  // The old onboarding had no longer option.
  '3yplus': null,
};

/** Writes the answers into the stores other pages read. */
export function syncLegacy(profile: ProfileV3) {
  profileStore.set((prev) => ({
    ...prev,
    from: countryOf(profile.from)?.name ?? '',
    time: stayOf(profile.stay)?.label ?? '',
    role: roleOf(profile.role)?.label ?? '',
  }));
  onboardingStore.set((prev) => ({ ...prev, duration: profile.stay ? LEGACY_DURATION[profile.stay] : null }));
  if (profile.topics.length > 0) culturePrefsStore.set(prefsFromRanking(profile.topics));
  if (profile.base) {
    const base = profile.base;
    explorePersonalStore.set((d) => (d.selectedAreaId === base ? d : { ...d, selectedAreaId: base }));
  }
}

/** Saves a change and writes it through. */
export function updateProfile(patch: Partial<ProfileV3> | ((prev: ProfileV3) => Partial<ProfileV3>)) {
  profileV3Store.set((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  syncLegacy(profileV3Store.get());
}

export function toggleHidden(field: FieldKey) {
  profileV3Store.set((prev) => ({
    ...prev,
    hidden: prev.hidden.includes(field) ? prev.hidden.filter((f) => f !== field) : [...prev.hidden, field],
  }));
}

/** Tap-in-order ranking: tapping a ranked topic removes it (and the order closes up). */
export function rankTap(topics: readonly TopicId[], id: TopicId): TopicId[] {
  return topics.includes(id) ? topics.filter((t) => t !== id) : [...topics, id];
}

/** Local date as YYYY-MM-DD. */
export function localDate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "27 OCT 2026" for the WELCOME seal. */
export function sealDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][m - 1] ?? '';
  return `${d} ${month} ${y}`;
}

/** Ends onboarding: stamps the passport, ranks every topic, and lets "/" open Home. */
export function finishOnboarding() {
  profileV3Store.set((prev) => {
    const rest = TOPICS.map((t) => t.id).filter((t) => !prev.topics.includes(t));
    return { ...prev, topics: [...prev.topics, ...rest], stampedOn: localDate() };
  });
  syncLegacy(profileV3Store.get());
  onboardingStore.set((prev) => ({ ...prev, done: true }));
}
