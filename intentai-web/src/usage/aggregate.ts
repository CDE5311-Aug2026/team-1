import type { UsageEvent, UsageKind } from './event';

export interface SummaryRow {
  kind: UsageKind;
  name: string;
  people: number;
  visits: number;
  totalMs: number;
  avgPerVisitMs: number;
  avgPerPersonMs: number;
}

export interface PersonRow {
  uid: string;
  sessions: number;
  /** Page time only: sections and activities happen inside pages. */
  totalMs: number;
  firstSeen: number;
  /** Newest session first; pages in the order they were opened. */
  pathsBySession: { sid: string; pages: string[] }[];
  /** This person's total time on each page, section and activity, by name. */
  msByName: Record<UsageKind, Record<string, number>>;
}

export interface Summary {
  rows: SummaryRow[];
  landing: { name: string; sessions: number }[];
  people: PersonRow[];
}

const byStart = (a: UsageEvent, b: UsageEvent) => a.at - b.at;

function groupBy<K>(events: UsageEvent[], key: (event: UsageEvent) => K): Map<K, UsageEvent[]> {
  const groups = new Map<K, UsageEvent[]>();
  for (const event of events) {
    const group = groups.get(key(event));
    if (group) group.push(event);
    else groups.set(key(event), [event]);
  }
  return groups;
}

const sumMs = (events: UsageEvent[]) => events.reduce((sum, event) => sum + event.ms, 0);
const earliest = (events: UsageEvent[]) => events.reduce((min, event) => Math.min(min, event.at), Infinity);
// A span resumed after the tab was hidden (`cont`) continues the same visit.
const isVisit = (event: UsageEvent) => !event.cont;

function msByName(events: UsageEvent[]): Record<UsageKind, Record<string, number>> {
  const totals: Record<UsageKind, Record<string, number>> = { page: {}, section: {}, activity: {}, tap: {} };
  for (const event of events) totals[event.kind][event.name] = (totals[event.kind][event.name] ?? 0) + event.ms;
  return totals;
}

export function summarize(events: UsageEvent[]): Summary {
  const rows = [...groupBy(events, (event) => `${event.kind}\u0000${event.name}`).values()].map((group): SummaryRow => {
    const totalMs = sumMs(group);
    const people = new Set(group.map((event) => event.uid)).size;
    const visits = Math.max(1, group.filter(isVisit).length);
    return {
      kind: group[0].kind,
      name: group[0].name,
      people,
      visits,
      totalMs,
      avgPerVisitMs: Math.round(totalMs / visits),
      avgPerPersonMs: Math.round(totalMs / people),
    };
  });

  const pagesBySession = groupBy(
    events.filter((event) => event.kind === 'page').sort(byStart),
    (event) => event.sid,
  );
  const landingCounts = new Map<string, number>();
  for (const pages of pagesBySession.values()) {
    landingCounts.set(pages[0].name, (landingCounts.get(pages[0].name) ?? 0) + 1);
  }
  const landing = [...landingCounts]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));

  const people = [...groupBy(events, (event) => event.uid)].map(([uid, mine]): PersonRow => {
    const sessions = [...groupBy(mine, (event) => event.sid)].map(([sid, inSession]) => ({
      sid,
      start: earliest(inSession),
      pages: (pagesBySession.get(sid) ?? []).filter(isVisit).map((event) => event.name),
    }));
    sessions.sort((a, b) => b.start - a.start);
    return {
      uid,
      sessions: sessions.length,
      totalMs: sumMs(mine.filter((event) => event.kind === 'page')),
      firstSeen: earliest(mine),
      pathsBySession: sessions.map(({ sid, pages }) => ({ sid, pages })),
      msByName: msByName(mine),
    };
  });

  return { rows, landing, people };
}

/** "m:ss", or "h:mm:ss" from one hour. */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

const csvCell = (value: string | number) => {
  let text = String(value);
  // A leading = + - @ (or tab/CR) would run as a formula in Excel or Sheets.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(events: UsageEvent[]): string {
  // the test name column only when a user test recorded one (older exports keep their shape)
  const withUser = events.some((e) => e.user);
  const header = withUser ? 'uid,sid,kind,name,ms,at,user' : 'uid,sid,kind,name,ms,at';
  const lines = events.map((e) => [e.uid, e.sid, e.kind, e.name, e.ms, e.at, ...(withUser ? [e.user ?? ''] : [])].map(csvCell).join(','));
  return [header, ...lines].join('\n');
}
