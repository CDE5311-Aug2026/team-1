// User test log kept on this device: every timing and tap the tracker records also lands here, so a test
// can run with no server at all. The dashboard (/admin) reads it ("This device") and exports it as a file;
// files from several devices are merged there. Time and button labels only: never what people typed.
import { parseEvents, type UsageEvent } from './event';

export const LOCAL_USAGE_KEY = 'intentai:v1:usage-log';
/** Oldest events go first past this (about 2 MB of JSON). */
export const LOCAL_USAGE_MAX = 20_000;

export const EXPORT_FORMAT = 'intentai-usage';

/** Window event fired after the log changes (same tab), so storage sizes can refresh. */
export const LOCAL_USAGE_EVENT = 'intentai:usage-log';
const changed = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LOCAL_USAGE_EVENT));
};

export interface UsageExport {
  format: typeof EXPORT_FORMAT;
  version: 1;
  exportedAt: string;
  events: UsageEvent[];
}

export function readLocalUsage(): UsageEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_USAGE_KEY);
    return raw ? parseEvents(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function appendLocalUsage(events: UsageEvent[]): void {
  if (events.length === 0) return;
  try {
    const next = [...readLocalUsage(), ...events];
    localStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(next.slice(-LOCAL_USAGE_MAX)));
  } catch {
    // Storage full or blocked: the timing is only lost on this device.
  }
  changed();
}

export function clearLocalUsage(): void {
  try {
    localStorage.removeItem(LOCAL_USAGE_KEY);
  } catch {
    // nothing to clear
  }
  changed();
}

export function toExport(events: UsageEvent[], now = new Date()): UsageExport {
  return { format: EXPORT_FORMAT, version: 1, exportedAt: now.toISOString(), events };
}

/** Events from an exported file (or a bare array of events); null when the file is not one of ours. */
export function fromExport(json: unknown): UsageEvent[] | null {
  if (Array.isArray(json)) return parseEvents(json);
  if (typeof json === 'object' && json !== null && (json as UsageExport).format === EXPORT_FORMAT) return parseEvents((json as UsageExport).events);
  return null;
}

/** Several files (or the same file twice) together: each timing counts once. */
export function mergeEvents(...lists: UsageEvent[][]): UsageEvent[] {
  const seen = new Set<string>();
  const out: UsageEvent[] = [];
  for (const list of lists)
    for (const e of list) {
      const key = `${e.uid}|${e.sid}|${e.kind}|${e.name}|${e.at}|${e.ms}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  return out.sort((a, b) => a.at - b.at);
}
