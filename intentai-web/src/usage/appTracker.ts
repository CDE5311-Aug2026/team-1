import { makeId } from '../data/domain';
import { ensureUsageId, testerStore } from '../data/stores';
import { appendLocalUsage } from './localLog';
import type { UsageEvent } from './event';
import { createTracker, type Tracker } from './tracker';

const ENDPOINT = '/api/track';

/** Best effort: a lost batch only loses timings, so failures stay silent. A copy stays on this device for the user test. */
function send(events: UsageEvent[]) {
  appendLocalUsage(events);
  const body = JSON.stringify({ events });
  try {
    // sendBeacon survives the tab closing (iOS Safari included) and needs a Blob for a JSON content type.
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // Fall through to fetch.
  }
  fetch(ENDPOINT, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
}

// The tracker adds document/window listeners once; a hot update would add a second set.
import.meta.hot?.accept(() => window.location.reload());

export const noopTracker: Tracker = { start: () => () => {}, tap: () => {}, flush: () => {}, sessionId: () => '' };

/** The app's tracker. Unit tests never send anything. */
export const tracker: Tracker =
  import.meta.env.MODE === 'test'
    ? noopTracker
    : createTracker({
        now: () => Date.now(),
        send,
        uid: ensureUsageId,
        user: () => testerStore.get().name || undefined,
        newId: makeId,
        doc: document,
        win: window,
      });
