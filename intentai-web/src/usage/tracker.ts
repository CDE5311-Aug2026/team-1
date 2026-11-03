import { LIMITS, type UsageEvent, type UsageKind } from './event';

/** Visible-time tracker for pages, sections and activities. Framework-free so it can be tested with a fake clock. */
export interface Tracker {
  /** Starts a span; the returned function stops it (safe to call twice). */
  start(kind: UsageKind, name: string): () => void;
  /** One press on a button or link, named "Page › label" (no duration). */
  tap(name: string): void;
  flush(): void;
  /** Drops queued events and restarts open spans from now under the current uid and a new session (after deleting all data). */
  discard(): void;
  sessionId(): string;
}

export interface TrackerDeps {
  now(): number;
  send(events: UsageEvent[]): void;
  uid(): string;
  /** The test name typed at the start screen, if any. */
  user?(): string | undefined;
  newId(): string;
  doc: Pick<Document, 'visibilityState' | 'addEventListener'>;
  win: Pick<Window, 'addEventListener'>;
}

/** Away this long (hidden, or no span running) and the next visible time starts a new session. */
const SESSION_GAP_MS = 30 * 60_000;

interface Span {
  /** Anonymous id at the start, so a reset mid-span doesn't move this time to the new id. */
  uid: string;
  kind: UsageKind;
  name: string;
  /** Epoch ms when the current visible stretch began; null while hidden. */
  since: number | null;
  /** True once the span has been cut by a hide: later stretches continue the same visit. */
  resumed: boolean;
}

export function createTracker(deps: TrackerDeps): Tracker {
  const open = new Set<Span>();
  const queue: UsageEvent[] = [];
  let visible = deps.doc.visibilityState === 'visible';
  let sid = deps.newId();
  let lastSeen: number | null = null;

  const userField = (): { user?: string } => {
    const user = deps.user?.();
    return user ? { user } : {};
  };

  const flush = () => {
    if (queue.length > 0) deps.send(queue.splice(0));
  };

  const rotateIfAway = (now: number) => {
    if (lastSeen !== null && now - lastSeen >= SESSION_GAP_MS) sid = deps.newId();
  };

  // Records the visible stretch since `span.since` (if long enough) and closes it.
  const cut = (span: Span, now: number) => {
    if (span.since === null) return;
    const ms = now - span.since;
    const cont = span.resumed;
    span.since = null;
    span.resumed = true;
    lastSeen = now;
    if (ms < LIMITS.minMs) return;
    queue.push({
      uid: span.uid,
      sid,
      kind: span.kind,
      name: span.name.slice(0, LIMITS.maxName),
      ms: Math.min(ms, LIMITS.maxMs),
      at: now - ms,
      ...(cont ? { cont: true as const } : {}),
      ...userField(),
    });
    if (queue.length >= LIMITS.maxBatch) flush();
  };

  const hide = () => {
    if (!visible) return;
    visible = false;
    const now = deps.now();
    for (const span of open) cut(span, now);
    flush();
  };

  const show = () => {
    if (visible) return;
    visible = true;
    const now = deps.now();
    rotateIfAway(now);
    for (const span of open) span.since = now;
  };

  deps.doc.addEventListener('visibilitychange', () => (deps.doc.visibilityState === 'visible' ? show() : hide()));
  deps.win.addEventListener('pagehide', hide);
  // Restored from the back/forward cache: no visibilitychange fires, so resume here.
  deps.win.addEventListener('pageshow', () => {
    if (deps.doc.visibilityState === 'visible') show();
  });

  return {
    start(kind, name) {
      const now = deps.now();
      if (open.size === 0) rotateIfAway(now);
      const span: Span = { uid: deps.uid(), kind, name, since: visible ? now : null, resumed: false };
      open.add(span);
      return () => {
        if (!open.delete(span)) return;
        cut(span, deps.now());
        if (kind === 'page') flush();
      };
    },
    tap(name) {
      if (!visible) return;
      const now = deps.now();
      rotateIfAway(now);
      lastSeen = now;
      queue.push({ uid: deps.uid(), sid, kind: 'tap', name: name.slice(0, LIMITS.maxName), ms: 0, at: now, ...userField() });
      if (queue.length >= LIMITS.maxBatch) flush();
    },
    flush,
    discard() {
      queue.length = 0;
      // A new session too, so nothing sent after the reset can be joined to the old id.
      sid = deps.newId();
      lastSeen = null;
      const now = deps.now();
      for (const span of open) {
        span.uid = deps.uid();
        span.since = visible ? now : null;
        span.resumed = false;
      }
    },
    sessionId: () => sid,
  };
}
