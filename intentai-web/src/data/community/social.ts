// Community social layer (ZIP sixth round, community-social.js): one thread model for my own questions
// (questionsStore) and the example channel threads, plus what this device adds on top — my replies, likes, follows,
// read notifications, closed (Resolved) questions and conversations saved to Moments.
// Every count shown in Community is worked out here from stored data; nothing is seeded as a number.
import { answererFor } from './people';
import { ARTICLE_IMAGES } from '../articleImages';
import { isAnswered, makeId, type Lookup, type Question, type QuestionTopic } from '../domain';
import { cardTitle, linkedLookup } from '../localAnswer';
import { createPersistentStore } from '../persistentStore';
import { V3_PHOTO_CREDITS } from '../../assets/v3/credits';
import bakKwa from '../../assets/v3/community/bak-kwa.jpg';
import street from '../../assets/v3/community/street.jpg';
import temple from '../../assets/v3/community/temple.jpg';
import {
  CHANNELS,
  FEEDS,
  SAMPLE_NOTIFICATIONS,
  SAMPLE_REPLIES,
  SAMPLE_THREADS,
  channelName,
  sampleThread,
  type ChannelId,
  type Feed,
} from './channels';

/* ---------- Stored on this device ---------- */

export interface LocalReply {
  id: string;
  threadId: string;
  parentId?: string;
  text: string;
  createdAt: number;
}

/** A conversation saved to Moments: a snapshot, so it stays readable after the question is withdrawn. */
export interface SavedConversation {
  threadId: string;
  title: string;
  body: string;
  topic: string;
  replies: { author: string; text: string }[];
  savedAt: number;
}

export interface CommunitySocial {
  likes: string[];
  following: string[];
  readNotifications: string[];
  /** My questions I closed (shown as Resolved; replies closed). */
  closed: string[];
  replies: LocalReply[];
  saved: SavedConversation[];
  /** Where I pinned each question when asking (a Nearby place or an area centre). */
  places: QuestionPlace[];
  /** Show me on the Locals map (only while Answer as a local is on), at area level. */
  profile: { shown: boolean; areaId?: string };
  /** Example people I follow on the map. */
  followingPeople: string[];
}

/** The spot a question is about: an area or a Nearby place (placeKey), with its published coordinates. */
export interface QuestionPlace {
  questionId: string;
  areaId: string;
  placeKey?: string;
  name: string;
  lat: number;
  lng: number;
}

export const EMPTY_SOCIAL: CommunitySocial = {
  likes: [],
  following: [],
  readNotifications: [],
  closed: [],
  replies: [],
  saved: [],
  places: [],
  profile: { shown: false },
  followingPeople: [],
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');

function isLocalReply(v: unknown): v is LocalReply {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.threadId === 'string' &&
    typeof v.text === 'string' &&
    typeof v.createdAt === 'number' &&
    (v.parentId === undefined || typeof v.parentId === 'string')
  );
}

function isSaved(v: unknown): v is SavedConversation {
  return (
    isRecord(v) &&
    ['threadId', 'title', 'body', 'topic'].every((k) => typeof v[k] === 'string') &&
    typeof v.savedAt === 'number' &&
    Array.isArray(v.replies) &&
    v.replies.every((r) => isRecord(r) && typeof r.author === 'string' && typeof r.text === 'string')
  );
}

function isQuestionPlace(v: unknown): v is QuestionPlace {
  return (
    isRecord(v) &&
    ['questionId', 'areaId', 'name'].every((k) => typeof v[k] === 'string') &&
    typeof v.lat === 'number' &&
    typeof v.lng === 'number' &&
    (v.placeKey === undefined || typeof v.placeKey === 'string')
  );
}

export function isCommunitySocial(v: unknown): v is CommunitySocial {
  return (
    isRecord(v) &&
    isStrings(v.likes) &&
    isStrings(v.following) &&
    isStrings(v.readNotifications) &&
    isStrings(v.closed) &&
    Array.isArray(v.replies) &&
    v.replies.every(isLocalReply) &&
    Array.isArray(v.saved) &&
    v.saved.every(isSaved) &&
    Array.isArray(v.places) &&
    v.places.every(isQuestionPlace) &&
    isRecord(v.profile) &&
    typeof v.profile.shown === 'boolean' &&
    (v.profile.areaId === undefined || typeof v.profile.areaId === 'string') &&
    isStrings(v.followingPeople)
  );
}

/** deleteAllData(): communitySocialStore.set(EMPTY_SOCIAL) */
export const communitySocialStore = createPersistentStore<CommunitySocial>({
  key: 'community-social',
  fallback: EMPTY_SOCIAL,
  isValid: isCommunitySocial,
});

export const toggleIn = (list: string[], id: string): string[] => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export function newLocalReply(threadId: string, text: string, parentId?: string, now = Date.now()): LocalReply {
  return { id: `local-${makeId()}`, threadId, text, createdAt: now, ...(parentId ? { parentId } : {}) };
}

/* ---------- Photos and credits ---------- */

const PHRASE_PHOTOS = import.meta.glob<string>('../../assets/*-photo.jpg', { eager: true, import: 'default' });

/** CC BY-SA photos from the Intent v3 Figma must show their credit wherever they appear. */
const CREDITED: Record<string, string> = {
  [temple]: 'Thian Hock Keng Temple',
  [bakKwa]: 'Bak kwa',
  [street]: 'Chinatown street',
};

export function photoCredit(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const cardCredit = Object.values(ARTICLE_IMAGES).find((image) => image.src === src)?.credit;
  if (cardCredit) return cardCredit;
  const subject = CREDITED[src];
  return subject ? V3_PHOTO_CREDITS.find((c) => c.subject === subject)?.credit : undefined;
}

/** Credits for every credited photo in a list, once each ("Thian Hock Keng Temple — Photo: Zairon · CC BY-SA 4.0"). */
export function creditLines(photos: (string | undefined)[]): string[] {
  const lines = new Set<string>();
  for (const src of photos) {
    const credit = photoCredit(src);
    if (!credit || !src) continue;
    const subject = CREDITED[src] ?? Object.values(ARTICLE_IMAGES).find((image) => image.src === src)?.alt;
    lines.add(subject ? `${subject} — ${credit}` : credit);
  }
  return [...lines];
}

/* ---------- Threads ---------- */

export interface ThreadReply {
  id: string;
  parentId?: string;
  author: string;
  text: string;
  /** From this device only: 1 if I liked it. */
  likes: number;
  liked: boolean;
  mine: boolean;
  /** Written by the person who asked the question. */
  byAsker: boolean;
  createdAt?: number;
  sample: boolean;
}

export interface Thread {
  id: string;
  own: boolean;
  title: string;
  body: string;
  topic: string;
  channel?: ChannelId;
  tags: string[];
  photo?: string;
  photoAlt?: string;
  author: string;
  createdAt?: number;
  /** Members who opened it (demo community threads). */
  views?: number;
  closed: boolean;
  /** A saved snapshot of a question that was withdrawn. */
  archived: boolean;
  sample: boolean;
  replies: ThreadReply[];
  question?: Question;
}

const TOPIC_LABELS: Partial<Record<QuestionTopic, string>> = {
  food: 'Food',
  monument: 'Monument',
  festival: 'Festival',
  history: 'History',
};

/** The label on my question's card: its topic (or the channel it would sit in) and the place. */
export function ownTopic(question: Question, lookups: readonly Lookup[]): string {
  const topic = question.topic && TOPIC_LABELS[question.topic];
  const phrase = !topic && (question.lookupId || linkedLookup(question, lookups));
  const label = topic || (phrase ? channelName('singapore-singlish') : channelName('daily-usage'));
  return question.areaName ? `${label} · ${question.areaName}` : label;
}

export function ownPhoto(question: Question, lookups: readonly Lookup[]): string | undefined {
  if (question.cardId && ARTICLE_IMAGES[question.cardId]) return ARTICLE_IMAGES[question.cardId].src;
  const lookup = linkedLookup(question, lookups);
  const word = (lookup?.word ?? question.lookupId)?.toLowerCase().replace(/\s+/g, '-');
  if (word && PHRASE_PHOTOS[`../../assets/${word}-photo.jpg`]) return PHRASE_PHOTOS[`../../assets/${word}-photo.jpg`];
  // A phrase named in the question that has its own photo in the app (e.g. “paiseh”).
  const text = question.text.toLowerCase();
  const named = Object.keys(PHRASE_PHOTOS).find((key) => {
    const phrase = key.replace('../../assets/', '').replace('-photo.jpg', '').replace(/-/g, ' ');
    return new RegExp(`\\b${phrase}\\b`).test(text);
  });
  return named ? PHRASE_PHOTOS[named] : undefined;
}

/** The body under my question's title: what I wrote (when it adds to the title) and where I heard it. */
function ownBody(question: Question): string {
  const detail = question.detail.trim() !== question.text.trim() ? question.detail.trim() : '';
  return [detail, question.context ? `Where: ${question.context}` : ''].filter(Boolean).join('\n\n');
}

function localReplies(social: CommunitySocial, threadId: string, byAsker: boolean): ThreadReply[] {
  return social.replies
    .filter((reply) => reply.threadId === threadId)
    .map((reply) => ({
      id: reply.id,
      parentId: reply.parentId,
      author: 'You',
      text: reply.text,
      likes: 0,
      liked: false,
      mine: true,
      byAsker,
      createdAt: reply.createdAt,
      sample: false,
    }));
}

/** Likes = other members' likes (seeded for the demo community) + mine on this device. */
const withLikes = (replies: ThreadReply[], social: CommunitySocial): ThreadReply[] =>
  replies.map((reply) => {
    const liked = social.likes.includes(reply.id);
    return { ...reply, liked, likes: reply.likes + (liked ? 1 : 0) };
  });

/** The demo community's times are relative to when the app opened, so the feed always reads as recent. */
const OPENED_AT = Date.now();
export const agoToTime = (minutes: number) => OPENED_AT - minutes * 60000;

export const answerReplyId = (questionId: string) => `${questionId}:answer`;

export function threadFor(id: string, questions: readonly Question[], lookups: readonly Lookup[], social: CommunitySocial): Thread | undefined {
  const question = questions.find((q) => q.id === id);
  if (question) {
    const replies: ThreadReply[] = [];
    if (isAnswered(question) && question.answer) {
      replies.push({
        id: answerReplyId(question.id),
        author: answererFor(question.id, question.answeredBy),
        text: question.answer,
        likes: 0,
        liked: false,
        mine: false,
        byAsker: false,
        createdAt: question.answeredAt,
        sample: Boolean(question.sample),
      });
    }
    replies.push(...localReplies(social, id, true));
    return {
      id,
      own: true,
      title: question.text,
      body: ownBody(question),
      topic: ownTopic(question, lookups),
      tags: question.areaName ? [question.areaName] : [],
      photo: ownPhoto(question, lookups),
      author: 'You',
      createdAt: question.postedAt,
      closed: social.closed.includes(id),
      archived: false,
      sample: Boolean(question.sample),
      replies: withLikes(replies, social),
      question,
    };
  }
  const sample = sampleThread(id);
  if (sample) {
    const replies: ThreadReply[] = SAMPLE_REPLIES.filter((reply) => reply.threadId === id).map((reply) => ({
      id: reply.id,
      parentId: reply.parentId,
      author: reply.author,
      text: reply.text,
      likes: reply.likes,
      liked: false,
      mine: reply.author === 'You',
      byAsker: reply.author === sample.author,
      createdAt: agoToTime(reply.ago),
      sample: true,
    }));
    replies.push(...localReplies(social, id, false));
    return {
      id,
      own: false,
      title: sample.title,
      body: sample.body,
      topic: channelName(sample.channel),
      channel: sample.channel,
      tags: sample.tags,
      photo: sample.photo,
      photoAlt: sample.photoAlt,
      author: sample.author,
      createdAt: agoToTime(sample.ago),
      views: sample.views,
      closed: Boolean(sample.closed) || social.closed.includes(id),
      archived: false,
      sample: true,
      replies: withLikes(replies, social),
    };
  }
  const saved = social.saved.find((s) => s.threadId === id);
  if (saved) {
    return {
      id,
      own: false,
      title: saved.title,
      body: saved.body,
      topic: saved.topic,
      tags: [],
      author: 'You',
      closed: true,
      archived: true,
      sample: false,
      replies: saved.replies.map((reply, i) => ({
        id: `${id}:saved-${i}`,
        author: reply.author,
        text: reply.text,
        likes: 0,
        liked: false,
        mine: reply.author === 'You',
        byAsker: false,
        sample: false,
      })),
    };
  }
  return undefined;
}

export function snapshotOf(thread: Thread, now = Date.now()): SavedConversation {
  return {
    threadId: thread.id,
    title: thread.title,
    body: thread.body,
    topic: thread.topic,
    replies: thread.replies.map((r) => ({ author: r.author, text: r.text })),
    savedAt: now,
  };
}

/* ---------- Reply tree ---------- */

export type ReplySort = 'top' | 'latest';

export interface ReplyTree {
  roots: ThreadReply[];
  children: Map<string, ThreadReply[]>;
  byId: Map<string, ThreadReply>;
}

export function replyTree(replies: readonly ThreadReply[], sort: ReplySort): ReplyTree {
  const byId = new Map(replies.map((r) => [r.id, r]));
  const position = new Map(replies.map((r, i) => [r.id, i]));
  const children = new Map<string, ThreadReply[]>();
  const roots: ThreadReply[] = [];
  for (const reply of replies) {
    if (reply.parentId && reply.parentId !== reply.id && byId.has(reply.parentId)) {
      children.set(reply.parentId, [...(children.get(reply.parentId) ?? []), reply]);
    } else roots.push(reply);
  }
  const descendants = (id: string): number => (children.get(id) ?? []).reduce((n, c) => n + 1 + descendants(c.id), 0);
  // Latest: newest first (replies without a time are older than any written on this device, in their seeded order).
  const latest = (a: ThreadReply, b: ThreadReply) =>
    (b.createdAt ?? -1) - (a.createdAt ?? -1) || position.get(b.id)! - position.get(a.id)!;
  // Top: most liked on this device, then the busiest conversation, then the original order.
  const top = (a: ThreadReply, b: ThreadReply) => b.likes - a.likes || descendants(b.id) - descendants(a.id) || position.get(a.id)! - position.get(b.id)!;
  roots.sort(sort === 'latest' ? latest : top);
  return { roots, children, byId };
}

export function descendantCount(tree: ReplyTree, id: string): number {
  return (tree.children.get(id) ?? []).reduce((n, c) => n + 1 + descendantCount(tree, c.id), 0);
}

/** The replies that must be expanded so that `id` is visible. */
export function ancestorsOf(tree: ReplyTree, id: string): string[] {
  const out: string[] = [];
  let current = tree.byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId);
    out.push(current.parentId);
    current = tree.byId.get(current.parentId);
  }
  return out;
}

/* ---------- My questions: Posted → Read → Replied → Resolved ---------- */

export const STAGES = ['Posted', 'Read', 'Replied', 'Resolved'] as const;
export type Stage = (typeof STAGES)[number];

/**
 * Read = a local opened it (Seen); Replied = a local answered (Answered / Added); Resolved = I closed it on this device.
 * My own replies never move a question to Replied.
 */
export function stageOf(question: Question, closed: boolean): Stage {
  if (closed) return 'Resolved';
  if (isAnswered(question)) return 'Replied';
  if (question.status === 'Seen') return 'Read';
  return 'Posted';
}

export function statusLabel(stage: Stage): 'Resolved' | 'Replied' | 'Waiting' {
  return stage === 'Resolved' ? 'Resolved' : stage === 'Replied' ? 'Replied' : 'Waiting';
}

export function questionSummary(questions: readonly Question[], closed: readonly string[]) {
  let replied = 0;
  let waiting = 0;
  let resolved = 0;
  for (const q of questions) {
    const stage = stageOf(q, closed.includes(q.id));
    if (stage === 'Resolved') resolved++;
    else if (stage === 'Replied') replied++;
    else waiting++;
  }
  return { replied, waiting, resolved };
}

/** What a local's answer goes back to, said plainly (PRD §2 rule 1: nothing is linked silently). */
export function linkLine(question: Question, lookups: readonly Lookup[], tipCited?: number): string {
  const card = question.cardId ? cardTitle(question.cardId) : undefined;
  if (card) {
    if (question.status === 'Added') {
      const cited = tipCited && tipCited > 0 ? ` · cited in Ask ${tipCited === 1 ? 'once' : `${tipCited} times`}` : '';
      return `Added to your ${card} card as a local tip${cited}.`;
    }
    return `Linked to your ${card} card: a local’s answer will be added to it.`;
  }
  const phrase = linkedLookup(question, lookups);
  if (phrase) {
    return question.status === 'Added' ? `Added to “${phrase.word}” in Moments.` : `Linked to “${phrase.word}” in Moments: a local’s answer will be added to it.`;
  }
  return 'Not linked to a card or phrase: the answer stays here.';
}

/* ---------- Channels, feeds, search ---------- */

export interface ThreadSummary {
  id: string;
  title: string;
  topic: string;
  channel?: ChannelId;
  photo?: string;
  replies: number;
  answered: boolean;
  sample: boolean;
  own: boolean;
  author: string;
  views?: number;
  /** The latest activity: the newest reply, or the question. */
  lastAt?: number;
  /** Up to three people who replied, newest first (for the avatar stack). */
  repliers: string[];
}

export function summaryOf(thread: Thread): ThreadSummary {
  return {
    id: thread.id,
    title: thread.title,
    topic: thread.topic,
    channel: thread.channel,
    photo: thread.photo,
    replies: thread.replies.length,
    answered: thread.own ? Boolean(thread.question && isAnswered(thread.question)) : thread.replies.length > 0,
    sample: thread.sample,
    own: thread.own,
    author: thread.author,
    views: thread.views,
    lastAt: Math.max(thread.createdAt ?? 0, ...thread.replies.map((r) => r.createdAt ?? 0)) || undefined,
    repliers: [...new Set([...thread.replies].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).map((r) => r.author))].slice(0, 3),
  };
}

export function publicSummaries(social: CommunitySocial): ThreadSummary[] {
  return SAMPLE_THREADS.map((s) => summaryOf(threadFor(s.id, [], [], social)!));
}

export function feedSummaries(feed: Feed, social: CommunitySocial): ThreadSummary[] {
  const all = publicSummaries(social);
  return FEEDS[feed].map((id) => all.find((s) => s.id === id)).filter((s): s is ThreadSummary => Boolean(s));
}

export type AnswerFilter = 'all' | 'open' | 'answered';

export function matches(summary: ThreadSummary, query: string, extra: string[] = []): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [summary.title, summary.topic, ...extra].join(' ').toLocaleLowerCase().includes(needle);
}

export function searchText(id: string): string[] {
  const s = sampleThread(id);
  return s ? [s.body, s.author, ...s.tags] : [];
}

export function filterSummaries(list: ThreadSummary[], filter: AnswerFilter): ThreadSummary[] {
  if (filter === 'all') return list;
  return list.filter((s) => (filter === 'answered' ? s.answered : !s.answered));
}

export { CHANNELS };

/* ---------- Notifications ---------- */

export interface CommunityNotification {
  id: string;
  kind: 'reply' | 'mention';
  actor: string;
  threadId: string;
  threadTitle: string;
  replyId: string;
  text: string;
  at?: number;
  sample: boolean;
  unread: boolean;
}

/**
 * A notification for each local answer to one of my questions (real, from questionsStore), then the example ones.
 * Unread until opened or marked read on this device.
 */
export function notificationsFor(questions: readonly Question[], social: CommunitySocial): CommunityNotification[] {
  const real: CommunityNotification[] = questions
    .filter((q) => isAnswered(q) && q.answer)
    .map((q) => ({
      id: `answer:${q.id}`,
      kind: 'reply' as const,
      actor: answererFor(q.id, q.answeredBy),
      threadId: q.id,
      threadTitle: q.text,
      replyId: answerReplyId(q.id),
      text: q.answer ?? '',
      at: q.answeredAt,
      sample: Boolean(q.sample),
      unread: !social.readNotifications.includes(`answer:${q.id}`),
    }))
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  const samples = SAMPLE_NOTIFICATIONS.map((n) => {
    const reply = SAMPLE_REPLIES.find((r) => r.id === n.replyId);
    return {
      id: n.id,
      kind: n.kind,
      actor: n.actor,
      threadId: n.threadId,
      threadTitle: sampleThread(n.threadId)?.title ?? '',
      replyId: n.replyId,
      text: reply?.text ?? '',
      at: reply ? agoToTime(reply.ago) : undefined,
      sample: true,
      unread: !social.readNotifications.includes(n.id),
    };
  });
  return [...real, ...samples.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))];
}

/** "5 min ago", "2 h ago", "3 Oct" — only for things with a real time on this device. */
export function timeAgo(at: number | undefined, now = Date.now()): string | undefined {
  if (at === undefined) return undefined;
  const minutes = Math.round((now - at) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
}
