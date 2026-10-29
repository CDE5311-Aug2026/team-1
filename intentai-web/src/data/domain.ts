// Persisted domain models: one type, validator and default per store declared in stores.ts.
// Seed content mirrors v0 (team-1 web/src/DesignApp.jsx `initial`) and the Figma frames.
import { arrayOf, isOneOf, isRecord, isStringArray } from './validate';

/** Unique id. `crypto.randomUUID` exists only in secure contexts (https/localhost), so a demo opened
 *  over a LAN IP falls back to a time + random id. */
export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------- Onboarding (Figma 17:45 → 17:271) ---------- */

export const DURATIONS = ['Less than 3 months', '3 months – 1 year', '1 – 3 years'] as const;
export type Duration = (typeof DURATIONS)[number];

export const TOPICS = ['Work', 'Food', 'Daily life', 'Getting around'] as const;
export type Topic = (typeof TOPICS)[number];

export const LEVELS = ['Beginner', 'Intermediate', 'Experienced'] as const;
export type Level = (typeof LEVELS)[number];

/** Figma notes: 3/3 Experienced, 2/3 Intermediate, 0–1/3 Beginner. */
export function levelFor(score: number): Level {
  if (score >= 3) return 'Experienced';
  if (score === 2) return 'Intermediate';
  return 'Beginner';
}

/** Home countries offered in onboarding, in canvas order (the answer is stored as the name). */
export const ONB_COUNTRIES = [
  'China',
  'India',
  'Malaysia',
  'Indonesia',
  'South Korea',
  'United States',
  'Philippines',
  'Vietnam',
  'Myanmar',
  'Thailand',
  'United Kingdom',
  'Australia',
] as const;
export type OnbCountry = (typeof ONB_COUNTRIES)[number];

export const ONB_TIMES = ['lt3m', '3to12m', '1to3y', 'gt3y'] as const;
export type OnbTime = (typeof ONB_TIMES)[number];

export const ONB_ROLES = ['student', 'intern', 'working', 'visiting', 'family', 'researcher'] as const;
export type OnbRole = (typeof ONB_ROLES)[number];

export const ONB_LANGS = ['en', 'zh', 'ms', 'ta', 'id', 'ko'] as const;
export type OnbLang = (typeof ONB_LANGS)[number];

export const CULTURE_TOPICS = ['food', 'monument', 'festival', 'history'] as const;
export type CultureTopic = (typeof CULTURE_TOPICS)[number];

export const ONB_FIELDS = ['from', 'time', 'role', 'language', 'base', 'topics'] as const;
export type OnbField = (typeof ONB_FIELDS)[number];

/** Home base the user dropped on the map. Bounds cover Singapore with some sea around it. */
export interface HomeBase {
  lat: number;
  lng: number;
  label: string;
}
export const HOME_BASE_BOUNDS = { latMin: 1.15, latMax: 1.48, lngMin: 103.6, lngMax: 104.1 } as const;

export interface Onboarding {
  done: boolean;
  from: OnbCountry | null;
  time: OnbTime | null;
  role: OnbRole | null;
  language: OnbLang | null;
  base: HomeBase | null;
  /** Ranked, unique; all four once done. */
  topics: CultureTopic[];
  /** Fields the user hid with the eye toggle on the passport card. */
  hidden: OnbField[];
  /** ISO date the passport was stamped; null until done. */
  completedAt: string | null;
}

export const DEFAULT_ONBOARDING: Onboarding = {
  done: false,
  from: null,
  time: null,
  role: null,
  language: null,
  base: null,
  topics: [],
  hidden: ['from'],
  completedAt: null,
};

function isUniqueOf<T extends string>(options: readonly T[], value: unknown): value is T[] {
  return Array.isArray(value) && value.every((v) => isOneOf(options, v)) && new Set(value).size === value.length;
}

function isHomeBase(value: unknown): value is HomeBase {
  if (!isRecord(value)) return false;
  const { lat, lng, label } = value;
  const b = HOME_BASE_BOUNDS;
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= b.latMin &&
    lat <= b.latMax &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= b.lngMin &&
    lng <= b.lngMax &&
    typeof label === 'string' &&
    label.length > 0 &&
    label.length <= 60
  );
}

/** `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss(.sss)Z`, and a real calendar date. */
function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z)?$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** True when every answer is set and all four topics are ranked. */
export function isOnboardingComplete(o: Onboarding): boolean {
  return (
    o.from !== null && o.time !== null && o.role !== null && o.language !== null && o.base !== null && o.topics.length === CULTURE_TOPICS.length
  );
}

export function isOnboarding(value: unknown): value is Onboarding {
  if (!isRecord(value)) return false;
  if (typeof value.done !== 'boolean') return false;
  if (!(value.from === null || isOneOf(ONB_COUNTRIES, value.from))) return false;
  if (!(value.time === null || isOneOf(ONB_TIMES, value.time))) return false;
  if (!(value.role === null || isOneOf(ONB_ROLES, value.role))) return false;
  if (!(value.language === null || isOneOf(ONB_LANGS, value.language))) return false;
  if (!(value.base === null || isHomeBase(value.base))) return false;
  if (!isUniqueOf(CULTURE_TOPICS, value.topics)) return false;
  if (!isUniqueOf(ONB_FIELDS, value.hidden)) return false;
  if (!(value.completedAt === null || isIsoDate(value.completedAt))) return false;
  // A finished passport has every answer and a stamp date; anything else is not a state the app writes.
  if (value.done) return isOnboardingComplete(value as unknown as Onboarding) && value.completedAt !== null;
  return true;
}

/* ---------- Profile (My Space 12:40) ---------- */

export interface Profile {
  from: string;
  time: string;
  role: string;
  level?: Level;
  topics?: Topic[];
}

export const PROFILE_FIELDS = [
  { key: 'from', label: 'From' },
  { key: 'time', label: 'In Singapore' },
  { key: 'role', label: 'Here as' },
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number]['key'];

export const DEFAULT_PROFILE: Profile = { from: 'China', time: '3 months', role: 'Student intern' };
export const EMPTY_PROFILE: Profile = { from: '', time: '', role: '' };

export function isProfile(value: unknown): value is Profile {
  return (
    isRecord(value) &&
    typeof value.from === 'string' &&
    typeof value.time === 'string' &&
    typeof value.role === 'string' &&
    (value.level === undefined || isOneOf(LEVELS, value.level)) &&
    (value.topics === undefined || (Array.isArray(value.topics) && value.topics.every((t) => isOneOf(TOPICS, t))))
  );
}

/* ---------- Settings (My Space switches; Nearby location) ---------- */

export interface Settings {
  daily: boolean;
  occasions: boolean;
  local: boolean;
  rehearse: boolean;
  judgement: boolean;
  location: boolean;
}

export type SettingKey = keyof Settings;

/** Figma notes: every switch starts off; location is off by default. */
export const DEFAULT_SETTINGS: Settings = {
  daily: false,
  occasions: false,
  local: false,
  rehearse: false,
  judgement: false,
  location: false,
};

export function isSettings(value: unknown): value is Settings {
  return isRecord(value) && Object.keys(DEFAULT_SETTINGS).every((key) => typeof value[key] === 'boolean');
}

/* ---------- Lookups (Ask writes, Moments reads) ---------- */

/** 'IntentAI editorial': phrase guidance written by the team (Nearby place tips); not a local's confirmation. */
export const LOOKUP_SOURCES = ['AI-generated', 'Confirmed by a local', 'IntentAI editorial'] as const;
export type LookupSource = (typeof LOOKUP_SOURCES)[number];

export interface Lookup {
  id: string;
  word: string;
  meaning: string;
  source: LookupSource;
  got?: boolean;
  encounters?: number;
  /** The user's own sentence from Practise. */
  example?: string;
}

export const SEED_LOOKUPS: Lookup[] = [
  { id: 'wah', word: 'wah, finally ah', meaning: 'Mostly teasing, with some impatience — both at once.', source: 'Confirmed by a local' },
  { id: 'chope', word: 'chope', meaning: 'To reserve a seat by leaving tissues on it.', source: 'Confirmed by a local' },
  { id: 'sabo', word: 'sabo', meaning: 'To sell someone out — joking or serious; tone decides.', source: 'AI-generated' },
];

function isLookup(value: unknown): value is Lookup {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.word === 'string' &&
    typeof value.meaning === 'string' &&
    isOneOf(LOOKUP_SOURCES, value.source) &&
    (value.got === undefined || typeof value.got === 'boolean') &&
    (value.encounters === undefined || (typeof value.encounters === 'number' && value.encounters >= 0)) &&
    (value.example === undefined || typeof value.example === 'string')
  );
}
export const isLookupList = arrayOf(isLookup);

/** Newest first; a phrase already saved (case-insensitive) is not added twice. */
export function addLookup(
  list: Lookup[],
  entry: { word: string; meaning: string; id?: string; source?: LookupSource },
  nextId: () => string = makeId,
): Lookup[] {
  if (list.some((item) => item.word.toLowerCase() === entry.word.toLowerCase())) return list;
  return [{ id: entry.id ?? nextId(), word: entry.word, meaning: entry.meaning, source: entry.source ?? 'AI-generated' }, ...list];
}

/* ---------- Community questions ---------- */

export const QUESTION_STATUSES = ['Pending', 'Answered'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export interface Question {
  id: string;
  text: string;
  context: string;
  detail: string;
  status: QuestionStatus;
  answer?: string;
}

export const SEED_QUESTIONS: Question[] = [
  {
    id: 'sabo',
    text: '“sabo” — did my colleague insult me?',
    context: 'in a Chinese-Singaporean enquiry office',
    detail:
      '“After the manager gave me extra forms, my colleague laughed and said ‘wah, you kena sabo lah.’ Was she being rude to me?”',
    status: 'Pending',
  },
  {
    id: 'paiseh',
    text: '“paiseh to trouble you”',
    context: 'group chat · classmates',
    detail: 'My classmate said “paiseh to trouble you”. What does it mean?',
    status: 'Answered',
    answer: 'A friendly apology for inconveniencing someone: sorry to trouble you.',
  },
];

function isQuestion(value: unknown): value is Question {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    typeof value.context === 'string' &&
    typeof value.detail === 'string' &&
    isOneOf(QUESTION_STATUSES, value.status) &&
    (value.answer === undefined || typeof value.answer === 'string')
  );
}
export const isQuestionList = arrayOf(isQuestion);

/** A new anonymous question, pending until a local answers it. */
export function newQuestion(text: string, context: string): Question {
  return { id: makeId(), text, context, detail: text, status: 'Pending' };
}

/* ---------- Nearby place (11:1571) ---------- */

export const PLACES = [
  'Hawker centre',
  'MRT · bus',
  'Kopitiam',
  'School',
  'Office',
  'Wet market',
  'Grab · taxi',
  'Void deck',
  'Mall',
] as const;
export type Place = (typeof PLACES)[number];
export const DEFAULT_PLACE: Place = 'Hawker centre';

export function isPlace(value: unknown): value is Place {
  return isOneOf(PLACES, value);
}

/* ---------- AI notice (My Space 12:182 → 14:850) ---------- */

export const NOTICE_STATUSES = ['pending', 'confirmed', 'rejected'] as const;
export type NoticeStatus = (typeof NOTICE_STATUSES)[number];

export interface Notices {
  status: NoticeStatus;
  dismissed: boolean;
  occasion: string;
  with: string;
}

export const DEFAULT_NOTICES: Notices = {
  status: 'pending',
  dismissed: false,
  occasion: 'Team dinner',
  with: 'Colleagues and manager',
};

export function isNotices(value: unknown): value is Notices {
  return (
    isRecord(value) &&
    isOneOf(NOTICE_STATUSES, value.status) &&
    typeof value.dismissed === 'boolean' &&
    typeof value.occasion === 'string' &&
    typeof value.with === 'string'
  );
}

/* ---------- Ask: answer reports; Home: saved expressions ---------- */

export interface Report {
  answer: string;
  reason: string;
}

function isReport(value: unknown): value is Report {
  return isRecord(value) && typeof value.answer === 'string' && typeof value.reason === 'string';
}
export const isReportList = arrayOf(isReport);

export const isSavedIds = isStringArray;
