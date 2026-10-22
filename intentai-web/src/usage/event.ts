// The one usage event shape shared by the tracker, the API handlers and the admin dashboard.
// Time only: never add a field that carries what people typed.

/** page / section / activity: visible time. tap: one press on a button or link (ms 0), named "Page › label". */
export type UsageKind = 'page' | 'section' | 'activity' | 'tap';

export interface UsageEvent {
  /** Anonymous random id kept on the device. */
  uid: string;
  /** Session id; a new one starts after 30 minutes away. */
  sid: string;
  kind: UsageKind;
  /** Display name, e.g. "Ask" or "Today › Foods". */
  name: string;
  /** Visible time in milliseconds. */
  ms: number;
  /** Span start, epoch milliseconds. */
  at: number;
  /** Set when the span resumed after the tab was hidden: same visit, not a new one. */
  cont?: true;
  /** Test name typed at the start screen (user test builds); never a real account. */
  user?: string;
}

export const LIMITS = { minMs: 300, maxMs: 7_200_000, maxBatch: 50, maxBody: 16_384, maxName: 64 } as const;

const KINDS: readonly UsageKind[] = ['page', 'section', 'activity', 'tap'];

const isId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(value);

// Names are fixed strings from the app ("Ask", "Today › Foods", "Moments › today's three card").
// Starting with a letter and using only these characters keeps spreadsheet formulas out of the CSV.
const NAME = /^\p{L}[\p{L}\p{N} ›'?&,.-]*$/u;

/** A test name: 1–40 letters, digits, spaces and . _ - (starts with a letter or digit). */
export function isTestName(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && /^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(value);
}

function parseEvent(value: unknown): UsageEvent | null {
  if (typeof value !== 'object' || value === null) return null;
  const { uid, sid, kind, name, ms, at, cont, user } = value as Record<string, unknown>;
  if (!isId(uid) || !isId(sid)) return null;
  if (!KINDS.includes(kind as UsageKind)) return null;
  if (typeof name !== 'string' || name.length > LIMITS.maxName || !NAME.test(name)) return null;
  // a tap has no duration; every other kind is visible time
  const minMs = kind === 'tap' ? 0 : LIMITS.minMs;
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < minMs || ms > LIMITS.maxMs) return null;
  if (typeof at !== 'number' || !Number.isFinite(at) || at < 0) return null;
  if (cont !== undefined && cont !== true) return null;
  if (user !== undefined && !isTestName(user)) return null;
  // Rebuild the object so unknown fields never reach storage.
  const event: UsageEvent = { uid, sid, kind: kind as UsageKind, name, ms: Math.round(ms), at };
  if (cont) event.cont = true;
  if (typeof user === 'string') event.user = user;
  return event;
}

/** Validates a `{ events }` body; null when the batch is empty, too big, or any event is invalid. */
export function parseBatch(body: unknown): UsageEvent[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const { events } = body as { events?: unknown };
  if (!Array.isArray(events) || events.length === 0 || events.length > LIMITS.maxBatch) return null;
  const parsed = events.map(parseEvent);
  return parsed.every((event): event is UsageEvent => event !== null) ? parsed : null;
}

/** The valid events of an exported file (any number); invalid entries are dropped, unknown fields removed. */
export function parseEvents(list: unknown): UsageEvent[] {
  if (!Array.isArray(list)) return [];
  return list.map(parseEvent).filter((event): event is UsageEvent => event !== null);
}
