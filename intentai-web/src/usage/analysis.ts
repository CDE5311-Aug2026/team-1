// User test analysis for the dashboard: which pages hold people, where they leave, how much they press,
// how they move between pages, and simple warning signs. Pure functions over UsageEvent[] (tested).
import type { UsageEvent } from './event';

/** Under this a page visit counts as "left quickly". */
export const QUICK_MS = 5_000;
/** The same button this many times within RAPID_WINDOW_MS counts as repeated taps (it may not have responded). */
export const RAPID_TAPS = 3;
export const RAPID_WINDOW_MS = 2_000;

export interface PageVisit {
  name: string;
  at: number;
  ms: number;
  taps: number;
}

export interface SessionPath {
  key: string;
  person: string;
  at: number;
  ms: number;
  visits: PageVisit[];
}

export interface PageStat {
  name: string;
  visits: number;
  people: number;
  totalMs: number;
  medianMs: number;
  p75Ms: number;
  /** Share of all page time, 0–1. */
  share: number;
  entries: number;
  exits: number;
  /** exits / visits */
  exitRate: number;
  /** visits shorter than QUICK_MS, 0–1 */
  quickRate: number;
  taps: number;
  tapsPerMin: number;
  rapidTaps: number;
}

export interface FunctionStat {
  name: string;
  kind: 'section' | 'activity';
  uses: number;
  people: number;
  totalMs: number;
  medianMs: number;
}

export interface TapStat {
  name: string;
  page: string;
  label: string;
  count: number;
  people: number;
}

export interface PersonStat {
  person: string;
  /** a test name, or an anonymous id */
  named: boolean;
  sessions: number;
  totalMs: number;
  pages: number;
  taps: number;
  firstAt: number;
  lastAt: number;
}

export interface Flag {
  page: string;
  level: 'warn' | 'info';
  text: string;
}

export interface Analysis {
  people: number;
  sessions: number;
  pageMs: number;
  medianSessionMs: number;
  medianPagesPerSession: number;
  taps: number;
  from: number;
  to: number;
  pages: PageStat[];
  functions: FunctionStat[];
  tapsByButton: TapStat[];
  flows: { from: string; to: string; count: number }[];
  exits: { name: string; count: number }[];
  persons: PersonStat[];
  paths: SessionPath[];
  flags: Flag[];
  unusedPages: string[];
}

export const personOf = (e: UsageEvent) => e.user ?? `anon-${e.uid.slice(0, 6)}`;

export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(s[lo] + (s[hi] - s[lo]) * (pos - lo));
}
const median = (values: number[]) => quantile(values, 0.5);

/** Page visits of each session in order; a span resumed after the tab was hidden joins its visit. */
export function sessionPaths(events: UsageEvent[]): SessionPath[] {
  const bySession = new Map<string, UsageEvent[]>();
  for (const e of events) {
    const key = `${e.uid}|${e.sid}`;
    const list = bySession.get(key);
    if (list) list.push(e);
    else bySession.set(key, [e]);
  }
  const out: SessionPath[] = [];
  for (const [key, list] of bySession) {
    list.sort((a, b) => a.at - b.at);
    const visits: PageVisit[] = [];
    for (const e of list) {
      if (e.kind !== 'page') continue;
      const last = visits[visits.length - 1];
      if (e.cont && last && last.name === e.name) last.ms += e.ms;
      else visits.push({ name: e.name, at: e.at, ms: e.ms, taps: 0 });
    }
    // a press belongs to the visit open at that moment
    for (const e of list) {
      if (e.kind !== 'tap') continue;
      const page = e.name.split(' › ')[0];
      const visit = [...visits].reverse().find((v) => v.at <= e.at && v.name === page) ?? visits.find((v) => v.name === page);
      if (visit) visit.taps += 1;
    }
    if (visits.length === 0) continue;
    out.push({ key, person: personOf(list[0]), at: visits[0].at, ms: visits.reduce((s, v) => s + v.ms, 0), visits });
  }
  return out.sort((a, b) => b.at - a.at);
}

function rapidTapsByPage(events: UsageEvent[]): Map<string, number> {
  const taps = events.filter((e) => e.kind === 'tap').sort((a, b) => a.at - b.at);
  const byKey = new Map<string, number[]>();
  for (const t of taps) {
    const key = `${t.uid}|${t.name}`;
    const list = byKey.get(key);
    if (list) list.push(t.at);
    else byKey.set(key, [t.at]);
  }
  const out = new Map<string, number>();
  for (const [key, times] of byKey) {
    const page = key.split('|')[1].split(' › ')[0];
    let bursts = 0;
    for (let i = 0; i + RAPID_TAPS - 1 < times.length; i++) {
      if (times[i + RAPID_TAPS - 1] - times[i] <= RAPID_WINDOW_MS) {
        bursts += 1;
        i += RAPID_TAPS - 1;
      }
    }
    if (bursts) out.set(page, (out.get(page) ?? 0) + bursts);
  }
  return out;
}

export function analyze(events: UsageEvent[], knownPages: string[] = []): Analysis {
  const paths = sessionPaths(events);
  const allVisits = paths.flatMap((p) => p.visits.map((v) => ({ ...v, person: p.person })));
  const pageMs = allVisits.reduce((s, v) => s + v.ms, 0);
  const rapid = rapidTapsByPage(events);

  const pageNames = [...new Set(allVisits.map((v) => v.name))];
  const pages: PageStat[] = pageNames.map((name) => {
    const vs = allVisits.filter((v) => v.name === name);
    const ms = vs.map((v) => v.ms);
    const totalMs = ms.reduce((s, x) => s + x, 0);
    const taps = vs.reduce((s, v) => s + v.taps, 0);
    const exits = paths.filter((p) => p.visits[p.visits.length - 1].name === name).length;
    return {
      name,
      visits: vs.length,
      people: new Set(vs.map((v) => v.person)).size,
      totalMs,
      medianMs: median(ms),
      p75Ms: quantile(ms, 0.75),
      share: pageMs ? totalMs / pageMs : 0,
      entries: paths.filter((p) => p.visits[0].name === name).length,
      exits,
      exitRate: vs.length ? exits / vs.length : 0,
      quickRate: vs.length ? vs.filter((v) => v.ms < QUICK_MS).length / vs.length : 0,
      taps,
      tapsPerMin: totalMs ? taps / (totalMs / 60_000) : 0,
      rapidTaps: rapid.get(name) ?? 0,
    };
  });
  pages.sort((a, b) => b.totalMs - a.totalMs || a.name.localeCompare(b.name));

  const fnEvents = events.filter((e) => e.kind === 'section' || e.kind === 'activity');
  const functions: FunctionStat[] = [...new Set(fnEvents.map((e) => `${e.kind}\u0000${e.name}`))].map((k) => {
    const [kind, name] = k.split('\u0000') as ['section' | 'activity', string];
    const es = fnEvents.filter((e) => e.kind === kind && e.name === name);
    const uses = es.filter((e) => !e.cont);
    return {
      name,
      kind,
      uses: Math.max(1, uses.length),
      people: new Set(es.map(personOf)).size,
      totalMs: es.reduce((s, e) => s + e.ms, 0),
      medianMs: median((uses.length ? uses : es).map((e) => e.ms)),
    };
  });
  functions.sort((a, b) => b.totalMs - a.totalMs);

  const tapEvents = events.filter((e) => e.kind === 'tap');
  const tapsByButton: TapStat[] = [...new Set(tapEvents.map((e) => e.name))]
    .map((name) => {
      const es = tapEvents.filter((e) => e.name === name);
      const [page, ...rest] = name.split(' › ');
      return { name, page, label: rest.join(' › ') || name, count: es.length, people: new Set(es.map(personOf)).size };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const flowCount = new Map<string, number>();
  for (const p of paths)
    for (let i = 1; i < p.visits.length; i++) {
      const from = p.visits[i - 1].name;
      const to = p.visits[i].name;
      if (from === to) continue;
      const k = `${from}\u0000${to}`;
      flowCount.set(k, (flowCount.get(k) ?? 0) + 1);
    }
  const flows = [...flowCount]
    .map(([k, count]) => ({ from: k.split('\u0000')[0], to: k.split('\u0000')[1], count }))
    .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));

  const exits = pages
    .filter((p) => p.exits > 0)
    .map((p) => ({ name: p.name, count: p.exits }))
    .sort((a, b) => b.count - a.count);

  const personNames = [...new Set(events.map(personOf))];
  const persons: PersonStat[] = personNames
    .map((person) => {
      const mine = paths.filter((p) => p.person === person);
      const es = events.filter((e) => personOf(e) === person);
      return {
        person,
        named: !person.startsWith('anon-'),
        sessions: mine.length,
        totalMs: mine.reduce((s, p) => s + p.ms, 0),
        pages: new Set(mine.flatMap((p) => p.visits.map((v) => v.name))).size,
        taps: es.filter((e) => e.kind === 'tap').length,
        firstAt: Math.min(...es.map((e) => e.at)),
        lastAt: Math.max(...es.map((e) => e.at + e.ms)),
      };
    })
    .sort((a, b) => b.totalMs - a.totalMs);

  const flags: Flag[] = [];
  for (const p of pages) {
    if (p.visits < 3) continue;
    if (p.exitRate >= 0.4 && p.exits >= 2)
      flags.push({ page: p.name, level: 'warn', text: `${Math.round(p.exitRate * 100)}% of visits end the session here.` });
    if (p.quickRate >= 0.3)
      flags.push({ page: p.name, level: 'warn', text: `${Math.round(p.quickRate * 100)}% of visits last under ${QUICK_MS / 1000} s.` });
    if (p.rapidTaps > 0)
      flags.push({ page: p.name, level: 'warn', text: `${p.rapidTaps}× the same button pressed ${RAPID_TAPS}+ times within ${RAPID_WINDOW_MS / 1000} s — it may not respond.` });
    if (p.medianMs >= 60_000 && p.tapsPerMin >= 8)
      flags.push({ page: p.name, level: 'info', text: 'Long visits with many presses: people may be searching for something.' });
  }
  const seen = new Set(pageNames);
  const unusedPages = knownPages.filter((n) => !seen.has(n));

  const sessionMs = paths.map((p) => p.ms);
  const ats = events.map((e) => e.at);
  return {
    people: personNames.length,
    sessions: paths.length,
    pageMs,
    medianSessionMs: median(sessionMs),
    medianPagesPerSession: median(paths.map((p) => p.visits.length)),
    taps: tapEvents.length,
    from: ats.length ? Math.min(...ats) : 0,
    to: ats.length ? Math.max(...ats) : 0,
    pages,
    functions,
    tapsByButton,
    flows,
    exits,
    persons,
    paths,
    flags,
    unusedPages,
  };
}
