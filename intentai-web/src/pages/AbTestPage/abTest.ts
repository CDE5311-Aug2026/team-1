// The A/B test of the real app: A = Explore (map exploration only), B = Hunt (the same app plus story hunts).
// Only the Hunt differs, so a difference in the answers can be put down to it. What is asked, in what order,
// and how the answers are summed up live here; the page (/test) only draws it.
// The server (server/abtest) keeps the same answer shape.

export type Version = 'A' | 'B';
export type Score = number | 'na';
export type Outcome = 'alone' | 'helped' | 'not';

/** One participant's answers, saved after every step. Versions are keyed 'A' and 'B'. */
export interface AbResponse {
  code: string;
  n: number;
  first: Version;
  status: 'started' | 'done';
  startedAt: number;
  updatedAt: number;
  tasks: Record<string, Record<string, string>>;
  ratings: Record<string, Record<string, Score>>;
  quick: Record<string, Record<string, Score | string[]>>;
  compare: Record<string, Score | string>;
}

export type HypothesisKey = 'H1' | 'H2' | 'H3';

/** Stated before testing. Every task, rating and compare row below is there to test one of these. */
export const HYPOTHESES: { key: HypothesisKey; name: string; claim: string; pref: string; nonInferior?: boolean }[] = [
  { key: 'H1', name: 'More fun', claim: 'Adding story hunts to map exploration (B) makes exploring Singapore more fun than map exploration alone (A).', pref: 'fun' },
  { key: 'H2', name: 'Keep exploring', claim: 'With story hunts (B), people want to keep exploring and visit more places than without them (A).', pref: 'explore' },
  {
    key: 'H3',
    name: 'Easy to get into',
    claim: 'Story hunts (B) are no harder to get into than plain map exploration (A): as many tasks done alone, and not rated harder to start.',
    pref: 'start',
    nonInferior: true,
  },
];

/** Each phone runs the real app in one version; the start screen picks it (?v= preselects it). */
export const PHONES: Record<Version, { name: string; side: string; about: string; href: string }> = {
  A: { name: 'Explore', side: 'Left', about: 'Map exploration only. No Hunt tab.', href: '/?v=A' },
  B: { name: 'Hunt', side: 'Right', about: 'The same app with the Hunt tab: story hunts with clues.', href: '/?v=B' },
};

/** The same goals on both phones, so they can be compared; how each version reaches them is what differs. */
export const TASKS: { key: string; name: string; say: string; h: HypothesisKey[] }[] = [
  { key: 't1', name: 'Get started', say: 'Open the app and set it up so it shows places you like.', h: ['H3'] },
  { key: 't2', name: 'Find a place', say: 'Find a place in Outram you would like to visit, and open it.', h: ['H3'] },
  { key: 't3', name: 'Plan an afternoon', say: 'You have a free afternoon in Kampong Gelam. Find something to do there and start it.', h: ['H1', 'H2'] },
  { key: 't4', name: 'Look back', say: 'Show me what you have done in the app so far.', h: ['H2'] },
];

export const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: 'alone', label: 'On their own' },
  { key: 'helped', label: 'With help' },
  { key: 'not', label: 'Not done' },
];

/** Rated 1–5 (or N/A) after each phone, stored as i1…i8. Each one measures one hypothesis. */
export const ITEMS: { text: string; h: HypothesisKey }[] = [
  { text: 'Exploring with the app was fun.', h: 'H1' },
  { text: 'I enjoyed using the app.', h: 'H1' },
  { text: 'I wanted to keep exploring.', h: 'H2' },
  { text: 'I would like to visit a place I saw in the app.', h: 'H2' },
  { text: 'I would use this app again.', h: 'H2' },
  { text: 'It was easy to get started.', h: 'H3' },
  { text: 'I always knew what to do next.', h: 'H3' },
  { text: 'I could use the app without help.', h: 'H3' },
];
export const itemKey = (n: number) => 'i' + (n + 1);

export interface Quick {
  key: string;
  text: string;
  h: HypothesisKey;
  options: string[];
  max: number;
}
/** Why, behind the ratings: what was fun (H1) and where people got stuck (H3). "Story hunts" shows on B only. */
export const HUNT_OPTION = 'Story hunts';
export const QUICK: Quick[] = [
  { key: 'q1', text: 'Which part was the most fun?', h: 'H1', options: ['The map', 'Place pages', 'Check-ins and stamps', HUNT_OPTION, 'Moments journal', 'None'], max: 2 },
  { key: 'q2', text: 'Where did you get stuck?', h: 'H3', options: ['Getting started', 'Finding a place', 'Knowing what to do next', 'Check-ins', HUNT_OPTION, 'Nowhere'], max: 2 },
];
export const optionsFor = (q: Quick, v: Version) => (v === 'A' ? q.options.filter((o) => o !== HUNT_OPTION) : q.options);
/** Answers that stand alone: picking one clears the others. */
const ALONE = ['None', 'Nowhere'];

/** After both phones: which version did better, one row per hypothesis plus overall. */
export const PREFS: { key: string; label: string; h?: HypothesisKey }[] = [
  { key: 'fun', label: 'More fun', h: 'H1' },
  { key: 'explore', label: 'Made me want to explore more', h: 'H2' },
  { key: 'start', label: 'Easier to get into', h: 'H3' },
  { key: 'overall', label: 'Overall' },
];
/** The compare scale: 1–2 favour A, 3 no preference, 4–5 favour B. */
export const COMPARE: { value: number; label: string; name: string }[] = [
  { value: 1, label: 'A+', name: 'Strongly prefer A' },
  { value: 2, label: 'A', name: 'Slightly prefer A' },
  { value: 3, label: '=', name: 'No preference' },
  { value: 4, label: 'B', name: 'Slightly prefer B' },
  { value: 5, label: 'B+', name: 'Strongly prefer B' },
];
export const USE_AGAIN = ['A', 'B', 'Either version', 'Neither version', 'Unsure'];

export const STEPS = ['start', 'tasks1', 'rate1', 'quick1', 'tasks2', 'rate2', 'quick2', 'compare', 'done'] as const;
export type Step = (typeof STEPS)[number];

/** The session running on the facilitator's phone: the saved answers plus where it is up to. */
export type Session = AbResponse & { step: Step };

export const orderOf = (first: Version): [Version, Version] => (first === 'A' ? ['A', 'B'] : ['B', 'A']);
/** Which phone a step is about: steps ending in 1 use the first phone, ending in 2 the second. */
export const versionAt = (s: Pick<Session, 'first' | 'step'>): Version => orderOf(s.first)[s.step.endsWith('2') ? 1 : 0];

/** A multiple-choice tap: toggles the option, keeps at most `max`, and lets "None"-style answers stand alone. */
export function toggleOption(current: unknown, option: string, max = 2): string[] {
  const cur = Array.isArray(current) ? (current as string[]) : [];
  if (cur.includes(option)) return cur.filter((x) => x !== option);
  if (ALONE.includes(option) || max === 1) return [option];
  const next = [...cur.filter((x) => !ALONE.includes(x)), option];
  return next.length > max ? next.slice(next.length - max) : next;
}

const answered = (v: unknown) => v != null && !(Array.isArray(v) && v.length === 0);

/** How many questions on this step are still open (0 = ready to move on). */
export function openCount(s: Session): number {
  const v = versionAt(s);
  if (s.step.startsWith('tasks')) return TASKS.filter((t) => !s.tasks[v]?.[t.key]).length;
  if (s.step.startsWith('rate')) return ITEMS.filter((_, n) => !answered(s.ratings[v]?.[itemKey(n)])).length;
  if (s.step.startsWith('quick')) return QUICK.filter((q) => !answered(s.quick[v]?.[q.key])).length;
  if (s.step === 'compare') return PREFS.filter((p) => !answered(s.compare[p.key])).length + (s.compare.useAgain ? 0 : 1);
  return 0;
}

export const nextStep = (step: Step): Step => STEPS[Math.min(STEPS.indexOf(step) + 1, STEPS.length - 1)];

/* ---------- results ---------- */

export function median(values: unknown[]): number | null {
  const v = values.filter((x): x is number => typeof x === 'number').sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
export const fmt = (x: number | null) => (x == null ? '–' : String(Math.round(x * 10) / 10));

export interface Preference {
  a: number;
  same: number;
  b: number;
  na: number;
  valid: number;
  side: Version | null;
  verdict: string;
  short: string;
}

/** One compare row across participants. A side wins only with more than half of the valid answers, and only once `min` are in. */
export function preference(key: string, rows: AbResponse[], min: number): Preference {
  const vals = rows.map((r) => r.compare[key]).filter((x) => x != null);
  const a = vals.filter((x) => x === 1 || x === 2).length;
  const same = vals.filter((x) => x === 3).length;
  const b = vals.filter((x) => x === 4 || x === 5).length;
  const na = vals.filter((x) => x === 'na').length;
  const valid = a + same + b;
  if (valid < min) return { a, same, b, na, valid, side: null, verdict: `Inconclusive (${valid} of ${min})`, short: 'Too few' };
  if (a > valid / 2) return { a, same, b, na, valid, side: 'A', verdict: 'Majority favours A', short: 'A' };
  if (b > valid / 2) return { a, same, b, na, valid, side: 'B', verdict: 'Majority favours B', short: 'B' };
  if (same > valid / 2) return { a, same, b, na, valid, side: null, verdict: 'Majority: no preference', short: 'Same' };
  return { a, same, b, na, valid, side: null, verdict: 'No majority', short: 'Split' };
}

/** Tasks done on their own, per task and in total, for one version. */
export function tasksDone(rows: AbResponse[], v: Version) {
  const by: Record<string, { alone: number; tried: number }> = {};
  let alone = 0;
  let tried = 0;
  for (const r of rows)
    for (const t of TASKS) {
      const o = r.tasks[v]?.[t.key];
      if (!o) continue;
      by[t.key] ??= { alone: 0, tried: 0 };
      by[t.key].tried++;
      tried++;
      if (o === 'alone') {
        by[t.key].alone++;
        alone++;
      }
    }
  return { alone, tried, by };
}

export interface HypothesisResult {
  pref: Preference;
  /** Supported, Not supported or Inconclusive (too few answers yet). */
  verdict: 'Supported' | 'Not supported' | 'Inconclusive';
  /** Median of this hypothesis's ratings, all answers pooled, per version. */
  rating: Record<Version, number | null>;
  /** Share of tasks done alone, per version (null before any). */
  alone: Record<Version, number | null>;
}

/**
 * H1 and H2 hold when a majority prefers B on their compare row. H3 is a "no worse" claim: it holds unless a
 * majority prefers A for getting in, or B's tasks done alone fall more than 10 points below A's.
 */
export function judge(h: (typeof HYPOTHESES)[number], rows: AbResponse[], min: number): HypothesisResult {
  const paired = rows.filter((r) => Object.keys(r.compare).length > 0);
  const pref = preference(h.pref, paired, min);
  const keys = ITEMS.map((it, n) => (it.h === h.key ? itemKey(n) : null)).filter((k): k is string => !!k);
  const rating = (v: Version) => median(rows.flatMap((r) => keys.map((k) => r.ratings[v]?.[k])));
  const rate = (v: Version) => {
    const t = tasksDone(rows, v);
    return t.tried ? t.alone / t.tried : null;
  };
  const alone = { A: rate('A'), B: rate('B') };
  let verdict: HypothesisResult['verdict'];
  if (pref.valid < min) verdict = 'Inconclusive';
  else if (h.nonInferior) verdict = pref.side !== 'A' && (alone.B ?? 0) >= (alone.A ?? 0) - 0.1 ? 'Supported' : 'Not supported';
  else verdict = pref.side === 'B' ? 'Supported' : 'Not supported';
  return { pref, verdict, rating: { A: rating('A'), B: rating('B') }, alone };
}

export function toCsv(rows: AbResponse[]): string {
  const head = ['code', 'first', 'status', 'started'];
  for (const v of ['A', 'B']) {
    TASKS.forEach((t) => head.push(`${v}_task_${t.key}`));
    ITEMS.forEach((_, n) => head.push(`${v}_item${n + 1}`));
    QUICK.forEach((q) => head.push(`${v}_${q.key}`));
  }
  PREFS.forEach((p) => head.push('pref_' + p.key));
  head.push('use_again', 'comment');
  const cell = (x: unknown) => {
    const s = x == null ? '' : Array.isArray(x) ? x.join('; ') : String(x);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [...rows]
    .sort((a, b) => a.n - b.n)
    .map((r) => {
      const line: unknown[] = [r.code, r.first, r.status, new Date(r.startedAt).toISOString()];
      for (const v of ['A', 'B']) {
        TASKS.forEach((t) => line.push(r.tasks[v]?.[t.key]));
        ITEMS.forEach((_, n) => line.push(r.ratings[v]?.[itemKey(n)]));
        QUICK.forEach((q) => line.push(r.quick[v]?.[q.key]));
      }
      PREFS.forEach((p) => line.push(r.compare[p.key]));
      line.push(r.compare.useAgain, r.compare.comment);
      return line.map(cell).join(',');
    });
  return [head.join(','), ...lines].join('\n');
}
