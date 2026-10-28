// A local answers a Community question. The answer goes back only to what the question is linked to:
// a culture card (cardId → a tip on that card) or a Moments phrase (lookupId → "Confirmed by a local").
// A question with no link is answered and nothing else changes; the message says so (PRD v3 §2 rule 1).
import { CATEGORIES, articlesFor } from './culture';
import { makeId, type Lookup, type Question, type Tip } from './domain';

export function cardTitle(cardId: string): string | undefined {
  for (const { id } of CATEGORIES) {
    const article = articlesFor(id).find((a) => a.id === cardId);
    if (article) return article.title;
  }
  return undefined;
}

/** The phrase a question is about: its lookupId, or (older questions without one) the longest saved phrase its text names. */
export function linkedLookup(question: Question, lookups: readonly Lookup[]): Lookup | undefined {
  if (question.lookupId) return lookups.find((l) => l.id === question.lookupId);
  const text = question.text.toLowerCase();
  return lookups.filter((l) => text.includes(l.word.toLowerCase())).sort((a, b) => b.word.length - a.word.length)[0];
}

export type AnswerOutcome =
  | { kind: 'card'; cardId: string; cardTitle: string }
  | { kind: 'phrase'; lookupId: string; word: string }
  | { kind: 'none' };

export interface AnswerResult {
  question: Question;
  tip?: Tip;
  lookups: Lookup[];
  outcome: AnswerOutcome;
}

export const DEFAULT_LOCAL_NAME = 'A local';

export function answerQuestion(
  question: Question,
  answer: { text: string; by?: string },
  lookups: readonly Lookup[],
  now: number = Date.now(),
  nextId: () => string = makeId,
): AnswerResult {
  const by = answer.by?.trim() || DEFAULT_LOCAL_NAME;
  const answered: Question = { ...question, status: 'Answered', answer: answer.text, answeredBy: by, answeredAt: now };

  const title = question.cardId ? cardTitle(question.cardId) : undefined;
  if (question.cardId && title) {
    const tip: Tip = {
      id: nextId(),
      cardId: question.cardId,
      questionId: question.id,
      text: answer.text,
      by,
      areaName: question.areaName,
      createdAt: now,
      cited: 0,
    };
    return { question: { ...answered, status: 'Added' }, tip, lookups: [...lookups], outcome: { kind: 'card', cardId: question.cardId, cardTitle: title } };
  }

  const lookup = linkedLookup(question, lookups);
  if (lookup) {
    const next = lookups.map((l) => (l.id === lookup.id ? { ...l, meaning: answer.text, source: 'Confirmed by a local' as const } : l));
    return { question: { ...answered, status: 'Added' }, lookups: next, outcome: { kind: 'phrase', lookupId: lookup.id, word: lookup.word } };
  }

  return { question: answered, lookups: [...lookups], outcome: { kind: 'none' } };
}

/** The toast after a local answers: it names exactly what changed, and nothing else. */
export function answerMessage(outcome: AnswerOutcome): string {
  if (outcome.kind === 'card') return `Answer added to the ${outcome.cardTitle} card as a local tip`;
  if (outcome.kind === 'phrase') return `Answer added to “${outcome.word}” in Moments`;
  return 'Answer saved. It isn’t linked to a card or phrase.';
}

/** A local opens a waiting question in Answer as a local mode. */
export function markSeen(question: Question, now: number = Date.now()): Question {
  return question.status === 'Pending' ? { ...question, status: 'Seen', seenAt: now } : question;
}

export interface Step {
  key: 'posted' | 'seen' | 'answered' | 'added';
  title: string;
  state: 'done' | 'now' | 'todo';
}

/** Posted → Seen → Answered → Added. The last step is there only when the question is linked to a card or phrase. */
export function progressOf(question: Question, linked: boolean): Step[] {
  const order: QuestionStatusIndex = { Pending: 0, Seen: 1, Answered: 2, Added: 3 };
  const at = order[question.status];
  const steps: Omit<Step, 'state'>[] = [
    { key: 'posted', title: 'Posted' },
    { key: 'seen', title: 'Seen by a local' },
    { key: 'answered', title: 'Answered' },
  ];
  if (linked) steps.push({ key: 'added', title: question.cardId ? 'Added to your card' : 'Added to your phrase' });
  // An answered question counts the "seen" step as done even if it was never recorded (older records).
  return steps.map((s, i) => ({ ...s, state: i <= at ? 'done' : i === at + 1 ? 'now' : 'todo' }));
}
type QuestionStatusIndex = Record<Question['status'], number>;
