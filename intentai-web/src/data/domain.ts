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

export interface Onboarding {
  done: boolean;
  /** null until the user picks one: onboarding pre-selects nothing. */
  duration: Duration | null;
  topics: Topic[];
}

export const DEFAULT_ONBOARDING: Onboarding = { done: false, duration: null, topics: [] };

export function isOnboarding(value: unknown): value is Onboarding {
  return (
    isRecord(value) &&
    typeof value.done === 'boolean' &&
    (value.duration === null || isOneOf(DURATIONS, value.duration)) &&
    Array.isArray(value.topics) &&
    value.topics.every((topic) => isOneOf(TOPICS, topic))
  );
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
/** The stored value for team-written phrases keeps its old name, so data saved by earlier builds stays valid. */
export const LEGACY_EDITORIAL = 'IntentAI editorial';
export const EDITORIAL_LABEL = 'FindSG editorial';
/** What a phrase's source says on screen. */
export const lookupSourceLabel = (source: LookupSource): string => (source === LEGACY_EDITORIAL ? EDITORIAL_LABEL : source);

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

/**
 * Pending = posted, waiting for a local · Seen = a local opened it (Answer as a local) · Answered · Added = the answer
 * was added to the card or phrase the question came from. Older records only have Pending / Answered.
 */
export const QUESTION_STATUSES = ['Pending', 'Seen', 'Answered', 'Added'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const QUESTION_TOPICS = ['food', 'monument', 'festival', 'history', 'other'] as const;
export type QuestionTopic = (typeof QUESTION_TOPICS)[number];

/** Where a question came from and what a local's answer can be added to. All optional, so old records stay valid. */
export interface QuestionLink {
  /** Nearby area id (e.g. sg-chinatown) and its short name, so locals know where the asker means. */
  areaId?: string;
  areaName?: string;
  topic?: QuestionTopic;
  /** The culture card (Today article id) the question came from: an answer becomes a tip on it. */
  cardId?: string;
  /** The Moments phrase (lookup id) the question came from: an answer confirms it. */
  lookupId?: string;
  from?: 'ask' | 'community' | 'moments';
}

export interface Question extends QuestionLink {
  id: string;
  text: string;
  context: string;
  detail: string;
  status: QuestionStatus;
  answer?: string;
  /** The first name or label the local chose to show with the answer; never the asker's. */
  answeredBy?: string;
  postedAt?: number;
  seenAt?: number;
  answeredAt?: number;
  /** Seeded demo content, shown with a Sample label. */
  sample?: boolean;
}

export const SEED_QUESTIONS: Question[] = [
  {
    id: 'sabo',
    text: '“sabo” — did my colleague insult me?',
    context: 'in a Chinese-Singaporean enquiry office',
    detail:
      '“After the manager gave me extra forms, my colleague laughed and said ‘wah, you kena sabo lah.’ Was she being rude to me?”',
    status: 'Pending',
    lookupId: 'sabo',
    sample: true,
  },
  {
    id: 'paiseh',
    text: '“paiseh to trouble you”',
    context: 'group chat · classmates',
    detail: 'My classmate said “paiseh to trouble you”. What does it mean?',
    status: 'Answered',
    answer: 'A friendly apology for inconveniencing someone: sorry to trouble you.',
    sample: true,
  },
];

const optional = (value: unknown, type: 'string' | 'number' | 'boolean') => value === undefined || typeof value === type;

function isQuestion(value: unknown): value is Question {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    typeof value.context === 'string' &&
    typeof value.detail === 'string' &&
    isOneOf(QUESTION_STATUSES, value.status) &&
    optional(value.answer, 'string') &&
    optional(value.areaId, 'string') &&
    optional(value.areaName, 'string') &&
    (value.topic === undefined || isOneOf(QUESTION_TOPICS, value.topic)) &&
    optional(value.cardId, 'string') &&
    optional(value.lookupId, 'string') &&
    (value.from === undefined || isOneOf(['ask', 'community', 'moments'] as const, value.from)) &&
    optional(value.answeredBy, 'string') &&
    optional(value.postedAt, 'number') &&
    optional(value.seenAt, 'number') &&
    optional(value.answeredAt, 'number') &&
    optional(value.sample, 'boolean')
  );
}
export const isQuestionList = arrayOf(isQuestion);

/** A new anonymous question, pending until a local answers it. */
export function newQuestion(text: string, context: string, link: QuestionLink = {}, now: number = Date.now()): Question {
  const clean = Object.fromEntries(Object.entries(link).filter(([, v]) => v !== undefined && v !== '')) as QuestionLink;
  return { id: makeId(), text, context, detail: text, status: 'Pending', postedAt: now, ...clean };
}

/** Answered or added: a local has replied. */
export function isAnswered(question: Question): boolean {
  return question.status === 'Answered' || question.status === 'Added';
}

/* ---------- Local tips (Community writes, Ask and cards read) ---------- */

/** A local's answer, added to the culture card the question came from. */
export interface Tip {
  id: string;
  cardId: string;
  questionId: string;
  text: string;
  by: string;
  areaName?: string;
  createdAt: number;
  /** How many Ask answers have cited it. */
  cited: number;
  sample?: boolean;
}

function isTip(value: unknown): value is Tip {
  return (
    isRecord(value) &&
    ['id', 'cardId', 'questionId', 'text', 'by'].every((k) => typeof value[k] === 'string') &&
    optional(value.areaName, 'string') &&
    typeof value.createdAt === 'number' &&
    typeof value.cited === 'number' &&
    optional(value.sample, 'boolean')
  );
}
export const isTipList = arrayOf(isTip);

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

/* ---------- Saved insights (Ask "Save insight" writes, Moments reads) ---------- */

/** An Ask answer the user chose to keep. History keeps every chat; Moments keeps only what is saved. */
export interface Insight {
  id: string;
  question: string;
  kind: 'card' | 'phrase';
  /** Card title or phrase, shown on the Moments tile. */
  title: string;
  /** One line of the answer. */
  summary: string;
  cardId?: string;
  lookupId?: string;
  areaName?: string;
  /** Where / who / topic the user added, as one line. */
  situation?: string;
  savedAt: number;
}

function isInsight(value: unknown): value is Insight {
  return (
    isRecord(value) &&
    ['id', 'question', 'title', 'summary'].every((k) => typeof value[k] === 'string') &&
    isOneOf(['card', 'phrase'] as const, value.kind) &&
    optional(value.cardId, 'string') &&
    optional(value.lookupId, 'string') &&
    optional(value.areaName, 'string') &&
    optional(value.situation, 'string') &&
    typeof value.savedAt === 'number'
  );
}
export const isInsightList = arrayOf(isInsight);

/* ---------- Ask history (History sheet) ---------- */

/** One question in a saved chat: enough to rebuild its answer (answers are recomputed from cards and phrases). */
export interface AskTurn {
  kind: 'meaning' | 'card';
  question: string;
  /** meaning: where / who / topic. */
  situation?: { where: string; who: string; topic: string; tone?: 'Smiling' | 'Flat' | 'Rushed' | 'Annoyed' | 'Not sure'; detail?: string };
  showingReply?: boolean;
  softer?: boolean;
  /** card: the area it was answered from, a card the question was bound to (example, recommendation, topic), an attached card. */
  subjectId?: string;
  boundCardId?: string;
  attachedId?: string;
  /** meaning: the Community question sent to confirm the reading. */
  questionId?: string;
  /** Files sent with the question: metadata only (the files themselves are never stored). */
  attachments?: AskAttachmentMeta[];
  /** Context the user added from the + menu ("About: Thian Hock Keng Temple"). */
  context?: AskContextRef[];
  /** The text Ask matched against when it was more than the question (added context, a document's opening). */
  lens?: string;
  /** The line the answer added about attached files. */
  note?: string;
  /** What memory kept from this question ("From Lyon"). */
  remembered?: string;
}

export type AskAttachmentKind = 'photo' | 'audio' | 'document';
export interface AskAttachmentMeta {
  name: string;
  kind: AskAttachmentKind;
  size: number;
  mime: string;
}
export type AskContextKind = 'card' | 'phrase' | 'question' | 'thread';
export interface AskContextRef {
  kind: AskContextKind;
  label: string;
}

function isAttachmentMeta(v: unknown): v is AskAttachmentMeta {
  return isRecord(v) && typeof v.name === 'string' && isOneOf(['photo', 'audio', 'document'] as const, v.kind) && typeof v.size === 'number' && typeof v.mime === 'string';
}
function isContextRef(v: unknown): v is AskContextRef {
  return isRecord(v) && isOneOf(['card', 'phrase', 'question', 'thread'] as const, v.kind) && typeof v.label === 'string';
}

export interface AskThread {
  id: string;
  /** The first question. */
  title: string;
  turns: AskTurn[];
  createdAt: number;
  updatedAt: number;
}

function isAskTurn(value: unknown): value is AskTurn {
  if (!isRecord(value) || !isOneOf(['meaning', 'card'] as const, value.kind) || typeof value.question !== 'string') return false;
  const s = value.situation;
  return (
    (s === undefined ||
      (isRecord(s) &&
        ['where', 'who', 'topic'].every((k) => typeof s[k] === 'string') &&
        optional(s.tone, 'string') &&
        optional(s.detail, 'string'))) &&
    optional(value.questionId, 'string') &&
    optional(value.showingReply, 'boolean') &&
    optional(value.softer, 'boolean') &&
    optional(value.subjectId, 'string') &&
    optional(value.boundCardId, 'string') &&
    optional(value.attachedId, 'string') &&
    (value.attachments === undefined || (Array.isArray(value.attachments) && value.attachments.every(isAttachmentMeta))) &&
    (value.context === undefined || (Array.isArray(value.context) && value.context.every(isContextRef))) &&
    optional(value.lens, 'string') &&
    optional(value.note, 'string') &&
    optional(value.remembered, 'string')
  );
}

function isAskThread(value: unknown): value is AskThread {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    Array.isArray(value.turns) &&
    value.turns.every(isAskTurn) &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  );
}
export const isAskThreadList = arrayOf(isAskThread);
