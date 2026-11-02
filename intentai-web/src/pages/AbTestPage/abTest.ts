// The A/B test of the two prototype styles: A = Clean (left phone), B = Pirate (right phone).
// What is asked, in what order, and how the answers are summed up. The page (/test) only draws it.
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

const PROTOTYPE = 'https://claude.ai/artifact/Nb1Gh81rJ3kmmALscjgk5D#play-';

/** Each phone's first screen for every task, in the order they are used. */
export const PHONES: Record<Version, { name: string; side: string; links: { title: string; task: string; href: string }[] }> = {
  A: {
    name: 'Clean',
    side: 'Left',
    links: [
      ['Welcome', 'Task 1', '3ae89ba2b8be'],
      ['Home · Central', 'Task 2', '137108157d56'],
      ['Place page', 'Task 2', '74942ff720e1'],
      ['Story cover', 'Task 3', '68817d859581'],
      ['Passport', 'Task 4', 'cf678e772870'],
      ['Moments', 'Task 4', '2fa4150d0bd9'],
    ].map(([title, task, id]) => ({ title, task, href: PROTOTYPE + id })),
  },
  B: {
    name: 'Pirate',
    side: 'Right',
    links: [
      ['Welcome', 'Task 1', 'a201cdaf9634'],
      ['Home · Central', 'Task 2', 'cb39f85f5798'],
      ['Place page', 'Task 2', '3dcaa03a3dd6'],
      ['Story cover', 'Task 3', '378e29207fa0'],
      ['Logbook', 'Task 4', '166d8761243e'],
      ['Moments', 'Task 4', '7709ab621564'],
    ].map(([title, task, id]) => ({ title, task, href: PROTOTYPE + id })),
  },
};

export const TASKS: { key: string; name: string; say: string }[] = [
  { key: 't1', name: 'Set up', say: 'Set up the app so it starts with places you like, near where you stay.' },
  { key: 't2', name: 'Find a place', say: 'You want to visit a place in Outram. Where would you tap? Then: how would you get there and check in?' },
  { key: 't3', name: 'Start a story', say: 'Start the Kampong Gelam story and get ready for its first stop.' },
  { key: 't4', name: 'Check progress', say: 'How many stamps do you have, and what did you do today?' },
];

export const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: 'alone', label: 'On their own' },
  { key: 'helped', label: 'With help' },
  { key: 'not', label: 'Not done' },
];

/** The 15 statements of the user test form, rated 1–5 (or N/A) for each version. Stored as i1…i15. */
export const ITEMS = [
  'The app was easy to use.',
  'I could find my way around the app.',
  'I understood what to do next.',
  'The wording was easy to understand.',
  'The amount of text felt manageable.',
  'I could use the app independently.',
  'I felt free to choose what to explore.',
  'The experience was interesting.',
  'I enjoyed using the app.',
  'I learned something new about Singapore or its culture.',
  'The app would help me choose where to visit.',
  'I had enough information to judge what to trust.',
  'I felt comfortable with the information I was asked to share.',
  'Overall, I was satisfied with the experience.',
  'I would use this app again.',
];
export const itemKey = (n: number) => 'i' + (n + 1);

const PARTS = ['Setup', 'Finding places', 'Stories and puzzles', 'Viewing progress', 'None', 'Unsure'];
export const IMPROVE = ['Navigation', 'Wording', 'Place information', 'Stories and puzzles', 'Privacy information', 'No changes needed', 'Unsure'];
export interface Quick {
  key: string;
  text: string;
  scale?: [string, string];
  options?: string[];
  max?: number;
}
export const QUICK: Quick[] = [
  { key: 'q1', text: 'Which parts interested you most?', options: PARTS, max: 2 },
  { key: 'q2', text: 'How much did you want to keep exploring?', scale: ['Very little', 'Very much'] },
  { key: 'q3', text: 'Where did you have difficulty?', options: PARTS, max: 2 },
  { key: 'q4', text: 'How did the amount of text feel?', scale: ['Much too little', 'Much too much'] },
  { key: 'q5', text: 'How much did you learn about Singapore or its culture?', scale: ['Nothing', 'A great deal'] },
  { key: 'q6', text: 'What information would help you decide to visit a place?', options: ['Directions', 'Opening hours', 'Cost', 'Accessibility', 'Visitor experiences', 'Nothing more', 'Unsure'], max: 2 },
  { key: 'q7', text: 'What would help you judge the information?', options: ['Source links', 'Date last checked', 'Clearer explanations', 'Visitor experiences', 'Nothing more', 'Unsure'], max: 2 },
  { key: 'q8', text: 'What concerns did you have?', options: ['Personal information', 'Location sharing', 'Accuracy', 'Unclear instructions', 'None', 'Unsure'], max: 2 },
  { key: 'q9', text: 'When would you use the app?', options: ['Planning a visit', 'During a visit', 'Learning about culture', 'Playing a story', 'Showing a friend', 'Unlikely to use', 'Unsure'], max: 2 },
  { key: 'q10', text: 'Which area would you improve first?', options: IMPROVE, max: 1 },
];
/** Answers that stand alone: picking one clears the others. */
const ALONE = ['None', 'Nothing more', 'Unlikely to use', 'Unsure', 'No changes needed'];

export const PREFS: { key: string; label: string }[] = [
  { key: 'ease', label: 'Ease of use' },
  { key: 'interest', label: 'Interest' },
  { key: 'enjoy', label: 'Enjoyment' },
  { key: 'clarity', label: 'Clarity of information' },
  { key: 'useful', label: 'Usefulness when exploring Singapore' },
  { key: 'comfort', label: 'Comfort with information sharing' },
  { key: 'overall', label: 'Overall experience' },
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
  if (s.step === 'compare') return PREFS.filter((p) => !answered(s.compare[p.key])).length + (s.compare.useAgain ? 0 : 1) + (s.compare.improve ? 0 : 1);
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

/** Amount of text (q4) as too little / about right / too much. */
export function textAmount(rows: AbResponse[], v: Version): [number, number, number] {
  const x = rows.map((r) => r.quick[v]?.q4).filter((n): n is number => typeof n === 'number');
  return [x.filter((n) => n <= 2).length, x.filter((n) => n === 3).length, x.filter((n) => n >= 4).length];
}

export function toCsv(rows: AbResponse[]): string {
  const head = ['code', 'first', 'status', 'started'];
  for (const v of ['A', 'B']) {
    TASKS.forEach((t) => head.push(`${v}_task_${t.key}`));
    ITEMS.forEach((_, n) => head.push(`${v}_item${n + 1}`));
    QUICK.forEach((q) => head.push(`${v}_${q.key}`));
  }
  PREFS.forEach((p) => head.push('pref_' + p.key));
  head.push('use_again', 'improve_first', 'comment');
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
      line.push(r.compare.useAgain, r.compare.improve, r.compare.comment);
      return line.map(cell).join(',');
    });
  return [head.join(','), ...lines].join('\n');
}
