// What Community keeps on this device (likes, replies, saved conversations, pinned places), apart from the sample
// threads and people in channels.ts / kit.json: the app's stores (stores.ts) load with every page, and only need this.
import { createPersistentStore } from '../persistentStore';

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
