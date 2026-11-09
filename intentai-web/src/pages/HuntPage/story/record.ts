// What the medals page (and Passport) shows, worked out from real progress only (no sample data):
// - one medal per story, won when the story is finished (every stop solved; the Golden Dome's two buildings);
// - stamps: stops checked in on site, out of every stop there is;
// - time taken: from the first sign of play in a story to its last stop.
// FindSG's own saves keep check-in and observation times but no start/finish, so Hunt keeps its own small log of when
// it first saw a story started and finished (`hunt-times-v1`), filling it from those saved times where it can.
import { ONSITE_ROUTES, readOnsite, readShort } from '../../../findsg';
import { HUNTS, type HuntId } from '../hunts';
import { chapters } from './chapters';

const TIMES_KEY = 'hunt-times-v1';
type Times = Partial<Record<HuntId, { startedAt?: number; finishedAt?: number }>>;

function readTimes(): Times {
  try {
    return JSON.parse(localStorage.getItem(TIMES_KEY) || '{}') as Times;
  } catch {
    return {};
  }
}
function writeTimes(t: Times) {
  try {
    localStorage.setItem(TIMES_KEY, JSON.stringify(t));
  } catch {
    /* fine */
  }
}
/** Note the moment a story starts or ends (the prologue calls this as it happens; routes are filled in on view). */
export function markStory(id: HuntId, what: 'start' | 'finish', at = Date.now()) {
  const t = readTimes();
  const cur = t[id] ?? {};
  if (what === 'start' && !cur.startedAt) cur.startedAt = at;
  if (what === 'finish' && !cur.finishedAt) cur.finishedAt = at;
  t[id] = cur;
  writeTimes(t);
}

export interface Stamp {
  story: HuntId;
  /** The stop's id in its chapter (its pin and its film still). */
  stop: string;
  name: string;
  at: number;
}
export interface StoryRecord {
  id: HuntId;
  roman: string;
  title: string;
  place: string;
  tone: string;
  /** Stops solved. */
  done: number;
  total: number;
  finished: boolean;
  /** Stops checked in on site (these are the stamps). */
  stamps: Stamp[];
  startedAt?: number;
  finishedAt?: number;
}

type OnsiteSave = {
  completed: string[];
  stops: Record<string, { checkin: { confirmedAt?: string; countsAsVisit?: boolean } | null; observation?: { confirmedAt?: string | null } }>;
};
const time = (iso?: string | null) => (iso ? Date.parse(iso) || undefined : undefined);

export function storyRecords(): StoryRecord[] {
  const times = readTimes();
  const chs = chapters();
  let changed = false;
  const out = HUNTS.map((b): StoryRecord => {
    const base = { id: b.id, roman: b.roman, title: b.title, place: b.place, tone: b.tone };
    if (b.id === 'short') {
      const on = readShort('manual');
      const done = Number(on.deduce) + Number(on.bottle);
      const stamps: Stamp[] = [];
      // the prologue's stamps are its two buildings, stamped on site
      if ((on as { arrival1?: boolean }).arrival1) stamps.push({ story: b.id, stop: 'short-press', name: '101 Jalan Sultan', at: times.short?.startedAt ?? 0 });
      if ((on as { arrival2?: boolean }).arrival2) stamps.push({ story: b.id, stop: 'short-mosque', name: 'Sultan Mosque', at: times.short?.finishedAt ?? times.short?.startedAt ?? 0 });
      return { ...base, done, total: 2, finished: done >= 2, stamps, ...times.short };
    }
    const stops = ONSITE_ROUTES[b.id].stops;
    const on = readOnsite(b.id, stops, 'manual') as unknown as OnsiteSave;
    const solved = new Set(on.completed);
    const ch = chs.find((c) => c.routeId === b.id);
    const nameOf = (id: string) => ch?.stops.find((s) => s.id === id)?.name ?? id;
    const stamps: Stamp[] = Object.entries(on.stops ?? {})
      .filter(([, r]) => r?.checkin?.countsAsVisit)
      .map(([id, r]) => ({ story: b.id, stop: id, name: nameOf(id), at: time(r.checkin?.confirmedAt) ?? 0 }));
    const rec: StoryRecord = { ...base, done: solved.size, total: stops.length, finished: solved.size >= stops.length, stamps };
    // fill the time log from FindSG's saved times the first time we see a story under way or finished
    const all = [on].flatMap((s) => Object.values(s.stops ?? {}));
    const t = { ...times[b.id] };
    if (rec.done > 0 && !t.startedAt) {
      const first = Math.min(...all.map((r) => time(r?.checkin?.confirmedAt) ?? Infinity));
      t.startedAt = Number.isFinite(first) ? first : Date.now();
      changed = true;
    }
    if (rec.finished && !t.finishedAt) {
      const last = Math.max(...all.map((r) => time(r?.observation?.confirmedAt) ?? -Infinity));
      t.finishedAt = Number.isFinite(last) ? last : Date.now();
      changed = true;
    }
    times[b.id] = t;
    return { ...rec, ...t };
  });
  if (changed) writeTimes(times);
  return out;
}

/** Every stop there is to stamp: the prologue's two buildings and every route stop. */
export const STAMP_TOTAL = 2 + Object.values(ONSITE_ROUTES).reduce((n, r) => n + r.stops.length, 0);

export function took(r: StoryRecord): string | null {
  if (!r.startedAt || !r.finishedAt) return null;
  const min = Math.max(1, Math.round((r.finishedAt - r.startedAt) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${min % 60} min`;
  return `${Math.round(h / 24)} days`;
}
export const dayOf = (t?: number) => (t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

export interface StopRow {
  id: string;
  name: string;
  /** Checked in on site, and when (the stamp). */
  stampedAt?: number;
  stamped: boolean;
  /** Solved. */
  solved: boolean;
}
/** One line per stop of a route, for the medals page. */
export function routeRows(routeId: string, names: { id: string; name: string }[]): StopRow[] {
  const route = ONSITE_ROUTES[routeId];
  if (!route) return [];
  const on = readOnsite(routeId, route.stops, 'manual') as unknown as OnsiteSave;
  const solved = new Set(on.completed);
  return names.map(({ id, name }) => {
    const c = on.stops?.[id]?.checkin;
    return { id, name, stamped: !!c?.countsAsVisit, stampedAt: c?.countsAsVisit ? time(c.confirmedAt) : undefined, solved: solved.has(id) };
  });
}
export const recordOf = (id: HuntId) => storyRecords().find((r) => r.id === id)!;
export const clock = (t?: number) => (t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

const NOTES_KEY = (id: HuntId) => `findsg-notes:${id}`;
export function readNotes(id: HuntId): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY(id)) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}
export function writeNote(id: HuntId, key: string, text: string) {
  const all = readNotes(id);
  if (text.trim()) all[key] = text;
  else delete all[key];
  try {
    localStorage.setItem(NOTES_KEY(id), JSON.stringify(all));
  } catch {
    /* fine */
  }
}
