// The one usage event shape shared by the tracker, the API handlers and the admin dashboard.
// Time only: never add a field that carries what people typed.

export type UsageKind = 'page' | 'section' | 'activity';

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
}

export const LIMITS = { minMs: 300, maxMs: 7_200_000, maxBatch: 50, maxBody: 16_384, maxName: 64 } as const;

const KINDS: readonly UsageKind[] = ['page', 'section', 'activity'];

const isId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(value);

// Names are fixed strings from the app ("Ask", "Today › Foods", "Moments › today's three card").
// Starting with a letter and using only these characters keeps spreadsheet formulas out of the CSV.
const NAME = /^\p{L}[\p{L}\p{N} ›'?&,.-]*$/u;

function parseEvent(value: unknown): UsageEvent | null {
  if (typeof value !== 'object' || value === null) return null;
  const { uid, sid, kind, name, ms, at, cont } = value as Record<string, unknown>;
  if (!isId(uid) || !isId(sid)) return null;
  if (!KINDS.includes(kind as UsageKind)) return null;
  if (typeof name !== 'string' || name.length > LIMITS.maxName || !NAME.test(name)) return null;
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < LIMITS.minMs || ms > LIMITS.maxMs) return null;
  if (typeof at !== 'number' || !Number.isFinite(at) || at < 0) return null;
  if (cont !== undefined && cont !== true) return null;
  // Rebuild the object so unknown fields never reach storage.
  const event: UsageEvent = { uid, sid, kind: kind as UsageKind, name, ms: Math.round(ms), at };
  if (cont) event.cont = true;
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
