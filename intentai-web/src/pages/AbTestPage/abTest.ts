// The FindSG user study (FindSG_Study_Hypotheses and FindSG_User_Questionnaire): A = UI1, B = UI2.
// UI1 is the app as it was at commit 6fc0d8c (PR #6), served unchanged from /ui1; UI2 is the current app.
// What is asked, in what order, and how the answers are summed up live here; the page (/test) only draws it.
// The server (server/abtest) keeps the same answer shape. Item numbers match the paper forms.

export type Version = 'A' | 'B';
export type RouteKey = 'X' | 'Y';
export type Score = number | 'na';
export type Outcome = 'independent' | 'assisted' | 'incomplete' | 'skipped' | 'technical';

/** The questionnaire this build asks. Answers saved with an earlier form are kept but left out of the results. */
export const FORM = 2;

/** One participant's answers, saved after every step. Versions are keyed 'A' and 'B'. */
export interface AbResponse {
  code: string;
  n: number;
  first: Version;
  /** The route played on the first version; the second version gets the other one. */
  route: RouteKey;
  /** Pilot sessions (codes T01…) are kept apart from the main results. */
  pilot?: boolean;
  form?: number;
  status: 'started' | 'done';
  startedAt: number;
  updatedAt: number;
  /** Per version: task outcome (t1…t4) and the facilitator's end-state checks (t2c1, t3c1…). */
  tasks: Record<string, Record<string, string>>;
  ratings: Record<string, Record<string, Score>>;
  quick: Record<string, Record<string, Score | string[]>>;
  compare: Record<string, Score | string>;
}

export type HypothesisKey = 'H1' | 'H2' | 'H3' | 'H4' | 'H5';

/** Stated before testing (FindSG Study Hypotheses). Proposed criteria: agree after the pilot, then freeze. */
export const HYPOTHESES: { key: HypothesisKey; name: string; claim: string; criterion: string }[] = [
  {
    key: 'H1',
    name: 'Independent use',
    claim: 'First-time users can find place information and return to a saved clue independently.',
    criterion: 'At least 80% complete T2 and T4 independently in each UI, reported separately. Built-in help is allowed.',
  },
  {
    key: 'H2',
    name: 'Clear instructions',
    claim: 'FindSG’s instructions allow first-time users to complete a remote story stop independently.',
    criterion: 'At least 80% complete every puzzle stage and receive the clue in remote mode, without navigation or puzzle-answer help.',
  },
  {
    key: 'H3',
    name: 'Understanding the information',
    claim: 'Users understand that remote progress records remote play, and that the story combines a real place with fictional characters.',
    criterion: 'At least 80% answer both Q11 and Q12 correctly in each UI after the same information is shown.',
  },
  {
    key: 'H4',
    name: 'Interest and perceived learning',
    claim: 'FindSG’s place information and stories interest users and help them feel they have learned about Singapore or its culture.',
    criterion: 'Median agreement of at least 4 on each of ratings 8, 9 and 10, reported separately.',
  },
  {
    key: 'H5',
    name: 'UI2 usability',
    claim: 'Users find UI2 easier to use and clearer than UI1.',
    criterion: 'Positive median paired difference (UI2 − UI1) on each of ratings 1–4, and more B than A preferences for ease of use and clarity.',
  },
];

/** Each phone runs one UI; the start screen picks it (?v= preselects it). A loads the frozen UI1 build. */
export const PHONES: Record<Version, { name: string; side: string; about: string; href: string }> = {
  A: { name: 'UI1', side: 'Left', about: 'The app as in PR #6 (commit 6fc0d8c), unchanged.', href: '/?v=A' },
  B: { name: 'UI2', side: 'Right', about: 'The current app.', href: '/?v=B' },
};

/** The two story routes for T3. Both exist unchanged in UI1 and UI2; each participant plays one per UI. */
export const ROUTES: Record<RouteKey, { id: string; place: string; book: string }> = {
  X: { id: 'kampong-gelam', place: 'Kampong Gelam', book: 'The Last Edition' },
  Y: { id: 'telok-ayer', place: 'Telok Ayer', book: 'Letters to the Shore' },
};

/** T4's prepared profile: one named remote clue already saved (Balestier, stop 1). Loaded on the phone at /t4. */
export const T4_CLUE = { route: 'balestier', title: 'Credit Line 1 · Those Who Worked and Watched', path: '/t4' };

export interface Task {
  key: string;
  name: string;
  /** Read aloud. {book} is the route's story for this version. */
  say: string;
  h: HypothesisKey[];
  /** Done by the facilitator before reading the task out. */
  before?: string;
  /** End-state checks the facilitator ticks, kept as t2c1, t3c1… */
  checks: string[];
}
export const TASKS: Task[] = [
  { key: 't1', name: 'Get started', say: 'Open the app and set it up so it shows places you like.', h: [], checks: [] },
  {
    key: 't2',
    name: 'Place access',
    say: 'Find information about a place in Outram you would like to visit.',
    h: ['H1'],
    checks: ['A place’s information page is open'],
  },
  {
    key: 't3',
    name: 'Remote stop',
    say: 'Without going there, play the first stop of the story “{book}” until you receive its clue.',
    h: ['H2'],
    checks: ['Played in remote mode', 'Every puzzle stage done and the clue received'],
  },
  {
    key: 't4',
    name: 'Clue retrieval',
    say: `Earlier you saved a clue called “${T4_CLUE.title}”. Find it and show it to me.`,
    h: ['H1'],
    before: `Load the prepared profile: on this phone open ${T4_CLUE.path}.`,
    checks: ['Prepared profile loaded', 'The named clue is shown'],
  },
];
export const checkKey = (task: string, i: number) => `${task}c${i + 1}`;

export const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: 'independent', label: 'Independent' },
  { key: 'assisted', label: 'Assisted' },
  { key: 'incomplete', label: 'Incomplete' },
  { key: 'skipped', label: 'Skipped' },
  { key: 'technical', label: 'Technical' },
];

/** Experience ratings, 1–5 or N/A, stored as i1…i15. `h` marks the hypothesis an item supports. */
export const ITEMS: { text: string; h?: HypothesisKey }[] = [
  { text: 'The app was easy to use.', h: 'H5' },
  { text: 'I could find my way around the app.', h: 'H5' },
  { text: 'I understood what to do next.', h: 'H5' },
  { text: 'The wording was easy to understand.', h: 'H5' },
  { text: 'The amount of text felt manageable.', h: 'H2' },
  { text: 'I could use the app independently.', h: 'H1' },
  { text: 'I felt free to choose what to explore.' },
  { text: 'The experience was interesting.', h: 'H4' },
  { text: 'I enjoyed using the app.', h: 'H4' },
  { text: 'I learned something new about Singapore or its culture.', h: 'H4' },
  { text: 'The app would help me choose where to visit.' },
  { text: 'I had enough information to judge what to trust.', h: 'H3' },
  { text: 'I felt comfortable with the information I was asked to share.' },
  { text: 'Overall, I was satisfied with the experience.' },
  { text: 'I would use this app again.' },
];
export const itemKey = (n: number) => 'i' + (n + 1);

export interface Quick {
  key: string;
  text: string;
  h?: HypothesisKey;
  /** 'scale': one of five labelled points (stored 1–5) or N/A; 'many': up to `max`; 'one': a single choice. */
  kind: 'scale' | 'many' | 'one';
  options: string[];
  max: number;
  /** Shown to the facilitator before the question. */
  show?: string;
}
const PARTS = ['Setup', 'Finding places', 'Stories and puzzles', 'Viewing progress', 'None', 'Unsure'];
const IMPROVE = ['Navigation', 'Wording', 'Place information', 'Stories and puzzles', 'Privacy information', 'No changes needed', 'Unsure'];
const SHOW_RECORD = `Show the prepared remote record (${T4_CLUE.path}) and its place file’s Story entry.`;
export const QUICK: Quick[] = [
  { key: 'q1', text: 'Which parts interested you most?', h: 'H4', kind: 'many', options: PARTS, max: 2 },
  { key: 'q2', text: 'How much did you want to keep exploring?', h: 'H4', kind: 'scale', options: ['Very little', 'A little', 'Moderately', 'Quite a lot', 'Very much'], max: 1 },
  { key: 'q3', text: 'Where did you have difficulty?', h: 'H2', kind: 'many', options: PARTS, max: 2 },
  { key: 'q4', text: 'How did the amount of text feel?', kind: 'scale', options: ['Much too little', 'Too little', 'About right', 'Too much', 'Much too much'], max: 1 },
  { key: 'q5', text: 'How much did you learn about Singapore or its culture?', h: 'H4', kind: 'scale', options: ['Nothing', 'A little', 'Some', 'Quite a lot', 'A great deal'], max: 1 },
  {
    key: 'q6',
    text: 'What information would help you decide to visit a place?',
    kind: 'many',
    options: ['Directions', 'Opening hours', 'Cost', 'Accessibility', 'Visitor experiences', 'Nothing more', 'Unsure'],
    max: 2,
  },
  {
    key: 'q7',
    text: 'What would help you judge the information?',
    kind: 'many',
    options: ['Source links', 'Date last checked', 'Clearer explanations', 'Visitor experiences', 'Nothing more', 'Unsure'],
    max: 2,
  },
  { key: 'q8', text: 'What concerns did you have?', kind: 'many', options: ['Personal information', 'Location sharing', 'Accuracy', 'Unclear instructions', 'None', 'Unsure'], max: 2 },
  {
    key: 'q9',
    text: 'When would you use the app?',
    kind: 'many',
    options: ['Planning a visit', 'During a visit', 'Learning about culture', 'Playing a story', 'Showing a friend', 'Unlikely to use', 'Unsure'],
    max: 2,
  },
  { key: 'q10', text: 'Which area would you improve first?', kind: 'one', options: IMPROVE, max: 1 },
  {
    key: 'q11',
    text: 'What does the displayed progress record confirm?',
    h: 'H3',
    kind: 'one',
    options: ['A location-verified visit', 'Remote play progress', 'A self-reported visit', 'Unsure'],
    max: 1,
    show: SHOW_RECORD,
  },
  {
    key: 'q12',
    text: 'Which description matches the place and story shown?',
    h: 'H3',
    kind: 'one',
    options: ['Every character and event is a historical fact', 'The place is fictional', 'The place is real; the characters are fictional', 'Unsure'],
    max: 1,
  },
];
/** Researcher key for H3 (Q11 B, Q12 C). Only the results use it; participants get the answers after both UIs. */
export const KEY: Record<string, string> = { q11: 'Remote play progress', q12: 'The place is real; the characters are fictional' };
/** Answers that stand alone: picking one clears the others. */
const ALONE = ['None', 'Nothing more', 'Unlikely to use', 'Unsure', 'No changes needed'];

/** After both UIs (Version preferences): 1 strongly prefer A … 5 strongly prefer B, or N/A. */
export const PREFS: { key: string; label: string; h?: HypothesisKey }[] = [
  { key: 'ease', label: 'Ease of use', h: 'H5' },
  { key: 'interest', label: 'Interest', h: 'H4' },
  { key: 'enjoy', label: 'Enjoyment', h: 'H4' },
  { key: 'clarity', label: 'Clarity of information', h: 'H5' },
  { key: 'useful', label: 'Usefulness when exploring Singapore' },
  { key: 'comfort', label: 'Comfort with information sharing' },
  { key: 'overall', label: 'Overall experience' },
];
export const COMPARE: { value: number; label: string; name: string }[] = [
  { value: 1, label: 'A+', name: 'Strongly prefer A' },
  { value: 2, label: 'A', name: 'Slightly prefer A' },
  { value: 3, label: '=', name: 'No preference' },
  { value: 4, label: 'B', name: 'Slightly prefer B' },
  { value: 5, label: 'B+', name: 'Strongly prefer B' },
];
export const USE_AGAIN = ['A', 'B', 'Either version', 'Neither version', 'Unsure'];
export const IMPROVE_FIRST = IMPROVE;

export const STEPS = ['start', 'tasks1', 'rate1', 'quick1', 'tasks2', 'rate2', 'quick2', 'compare', 'done'] as const;
export type Step = (typeof STEPS)[number];

/** The session running on the facilitator's phone: the saved answers plus where it is up to. */
export type Session = AbResponse & { step: Step };

export const orderOf = (first: Version): [Version, Version] => (first === 'A' ? ['A', 'B'] : ['B', 'A']);
/** Balanced order: 1 A·X, 2 B·X, 3 A·Y, 4 B·Y, then again. */
export const firstOf = (n: number): Version => (n % 2 ? 'A' : 'B');
export const routeOf = (n: number): RouteKey => (Math.floor((n - 1) / 2) % 2 ? 'Y' : 'X');
/** Which phone a step is about: steps ending in 1 use the first phone, ending in 2 the second. */
export const versionAt = (s: Pick<Session, 'first' | 'step'>): Version => orderOf(s.first)[s.step.endsWith('2') ? 1 : 0];
/** The route a participant plays on one version. */
export const routeFor = (s: Pick<AbResponse, 'first' | 'route'>, v: Version): RouteKey => (v === s.first ? s.route : s.route === 'X' ? 'Y' : 'X');
export const taskScript = (t: Task, route: RouteKey) => t.say.replace('{book}', ROUTES[route].book);

/** A multiple-choice tap: toggles the option, keeps at most `max`, and lets "None"-style answers stand alone. */
export function toggleOption(current: unknown, option: string, max = 2): string[] {
  const cur = Array.isArray(current) ? (current as string[]) : [];
  if (cur.includes(option)) return cur.filter((x) => x !== option);
  if (ALONE.includes(option) || max === 1) return [option];
  const next = [...cur.filter((x) => !ALONE.includes(x)), option];
  return next.length > max ? next.slice(next.length - max) : next;
}

const answered = (v: unknown) => v != null && !(Array.isArray(v) && v.length === 0);

/** How many questions on this step are still open (0 = ready to move on). End-state checks are optional. */
export function openCount(s: Session): number {
  const v = versionAt(s);
  if (s.step.startsWith('tasks')) return TASKS.filter((t) => !s.tasks[v]?.[t.key]).length;
  if (s.step.startsWith('rate')) return ITEMS.filter((_, n) => !answered(s.ratings[v]?.[itemKey(n)])).length;
  if (s.step.startsWith('quick')) return QUICK.filter((q) => !answered(s.quick[v]?.[q.key])).length;
  if (s.step === 'compare') return PREFS.filter((p) => !answered(s.compare[p.key])).length + (s.compare.useAgain ? 0 : 1) + (s.compare.improve ? 0 : 1);
  return 0;
}

export const nextStep = (step: Step): Step => STEPS[Math.min(STEPS.indexOf(step) + 1, STEPS.length - 1)];

/* ---------- results ---------- */

/** Rows the results count: this form only; pilots only when asked for. */
export const counted = (rows: AbResponse[], pilots = false) => rows.filter((r) => r.form === FORM && (pilots || !r.pilot));

export function median(values: unknown[]): number | null {
  const v = values.filter((x): x is number => typeof x === 'number').sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
export const fmt = (x: number | null) => (x == null ? '–' : String(Math.round(x * 10) / 10));
/** The proposed 80% target, rounded up: 10 offered → 8 needed. */
export const target = (n: number) => Math.ceil(n * 0.8);

export type Label = 'Target met' | 'Below target' | 'Inconclusive';

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

/** One task in one version: every outcome, over everyone offered it (all outcomes count in the denominator). */
export interface TaskTally {
  offered: number;
  counts: Record<Outcome, number>;
  /** Independent and, where the task has end-state checks, every check ticked yes. */
  met: number;
  /** Offered but an end-state check was never recorded. */
  unchecked: number;
}
export function taskTally(rows: AbResponse[], v: Version, key: string): TaskTally {
  const task = TASKS.find((t) => t.key === key)!;
  const counts = Object.fromEntries(OUTCOMES.map((o) => [o.key, 0])) as Record<Outcome, number>;
  let offered = 0;
  let met = 0;
  let unchecked = 0;
  for (const r of rows) {
    const t = r.tasks[v] ?? {};
    const o = t[key] as Outcome | undefined;
    if (!o || !(o in counts)) continue;
    offered++;
    counts[o]++;
    const checks = task.checks.map((_, i) => t[checkKey(key, i)]);
    if (checks.some((c) => c == null)) unchecked++;
    if (o === 'independent' && checks.every((c) => c === 'yes')) met++;
  }
  return { offered, counts, met, unchecked };
}

const labelFor = (met: number, offered: number, min: number, missing = 0): Label =>
  offered < min || missing > 0 ? 'Inconclusive' : met >= target(offered) ? 'Target met' : 'Below target';

/** H1 (T2 and T4, separately) and H2 (T3) for one version. Missing end-state records make it inconclusive. */
export function taskResult(rows: AbResponse[], v: Version, key: string, min: number) {
  const t = taskTally(rows, v, key);
  return { ...t, need: target(t.offered), label: labelFor(t.met, t.offered, min, t.unchecked) };
}

/** H3 for one version: both comprehension checks right, over everyone presented with them. */
export function comprehension(rows: AbResponse[], v: Version, min: number, firstOnly = false) {
  const shown = rows.filter((r) => r.quick[v] && Object.keys(r.quick[v]).length > 0 && (!firstOnly || r.first === v));
  const pick = (r: AbResponse, k: string) => {
    const x = r.quick[v]?.[k];
    return Array.isArray(x) ? x[0] : undefined;
  };
  const q11 = shown.filter((r) => pick(r, 'q11') === KEY.q11).length;
  const q12 = shown.filter((r) => pick(r, 'q12') === KEY.q12).length;
  const both = shown.filter((r) => pick(r, 'q11') === KEY.q11 && pick(r, 'q12') === KEY.q12).length;
  const missing = shown.filter((r) => !pick(r, 'q11') || !pick(r, 'q12')).length;
  return { shown: shown.length, q11, q12, both, missing, need: target(shown.length), label: labelFor(both, shown.length, min) };
}

/** H4 for one version: the median, N/A and missing of ratings 8, 9 and 10, each reported on its own. */
export function interest(rows: AbResponse[], v: Version, min: number) {
  return [7, 8, 9].map((n) => {
    const vals = rows.map((r) => r.ratings[v]?.[itemKey(n)]);
    const nums = vals.filter((x): x is number => typeof x === 'number');
    const m = median(nums);
    const label: Label = nums.length < min ? 'Inconclusive' : (m ?? 0) >= 4 ? 'Target met' : 'Below target';
    return { item: n + 1, median: m, n: nums.length, na: vals.filter((x) => x === 'na').length, missing: vals.filter((x) => x == null).length, label };
  });
}

/** H5: UI2 − UI1 per person on ratings 1–4, plus the ease and clarity preferences. */
export function usability(rows: AbResponse[], min: number) {
  const items = [0, 1, 2, 3].map((n) => {
    const k = itemKey(n);
    const diffs = rows
      .map((r) => [r.ratings.A?.[k], r.ratings.B?.[k]])
      .filter((p): p is [number, number] => typeof p[0] === 'number' && typeof p[1] === 'number')
      .map(([a, b]) => b - a);
    return { item: n + 1, paired: diffs.length, median: median(diffs), higherB: diffs.filter((d) => d > 0).length, equal: diffs.filter((d) => d === 0).length, higherA: diffs.filter((d) => d < 0).length };
  });
  const prefs = ['ease', 'clarity'].map((k) => ({ key: k, ...preference(k, rows, min) }));
  const enough = items.every((i) => i.paired >= min) && prefs.every((p) => p.valid >= min);
  const label: Label = !enough ? 'Inconclusive' : items.every((i) => (i.median ?? 0) > 0) && prefs.every((p) => p.b > p.a) ? 'Target met' : 'Below target';
  return { items, prefs, label };
}

export function toCsv(rows: AbResponse[]): string {
  const head = ['code', 'pilot', 'first', 'route_first', 'status', 'started'];
  for (const v of ['A', 'B']) {
    head.push(`${v}_route`);
    TASKS.forEach((t) => {
      head.push(`${v}_${t.key}`);
      t.checks.forEach((_, i) => head.push(`${v}_${checkKey(t.key, i)}`));
    });
    ITEMS.forEach((_, n) => head.push(`${v}_rating${n + 1}`));
    QUICK.forEach((q) => head.push(`${v}_${q.key}`));
  }
  PREFS.forEach((p) => head.push('pref_' + p.key));
  head.push('use_again', 'improve_first', 'comment');
  const cell = (x: unknown) => {
    const s = x == null ? '' : Array.isArray(x) ? x.join('; ') : String(x);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [...rows]
    .sort((a, b) => Number(!!a.pilot) - Number(!!b.pilot) || a.n - b.n)
    .map((r) => {
      const line: unknown[] = [r.code, r.pilot ? 'yes' : '', r.first, r.route, r.status, new Date(r.startedAt).toISOString()];
      for (const v of ['A', 'B'] as Version[]) {
        line.push(routeFor(r, v));
        TASKS.forEach((t) => {
          line.push(r.tasks[v]?.[t.key]);
          t.checks.forEach((_, i) => line.push(r.tasks[v]?.[checkKey(t.key, i)]));
        });
        ITEMS.forEach((_, n) => line.push(r.ratings[v]?.[itemKey(n)]));
        QUICK.forEach((q) => line.push(r.quick[v]?.[q.key]));
      }
      PREFS.forEach((p) => line.push(r.compare[p.key]));
      line.push(r.compare.useAgain, r.compare.improve, r.compare.comment);
      return line.map(cell).join(',');
    });
  return [head.join(','), ...lines].join('\n');
}
