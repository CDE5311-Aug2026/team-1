import type { Duration, Topic } from '../../data/domain';
import { QUIZ_LENGTH } from './quiz';

// Copy that follows the user's answers. Each default case reproduces the Figma text exactly.

const TIME_HINTS: Record<Duration, string> = {
  'Less than 3 months': "Welcome! We'll start with the essentials you'll hear in your first weeks.",
  '3 months – 1 year': 'Nice — at this stage most people learn fastest with phrases they hear every day.',
  '1 – 3 years': "Great — let's polish the phrases that make you sound like a local.",
};

const STAY: Record<Duration, string> = {
  'Less than 3 months': 'under 3 months',
  '3 months – 1 year': 'under a year',
  '1 – 3 years': 'a few years',
};

function joinList(items: readonly string[], last: string): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${last} ${items[items.length - 1]}`;
}

export function timeHint(duration: Duration | null): string {
  return duration ? TIME_HINTS[duration] : "Pick one and I'll match your first phrases to it.";
}

export function topicsHint(duration: Duration | null, topics: readonly Topic[]): string {
  if (topics.length === 0) return 'Pick at least one topic so I know where to start.';
  const basics = `I'll start with ${joinList(topics, 'and')} basics.`;
  return duration ? `Since you've been here ${STAY[duration]}, ${basics}` : basics;
}

export function resultSummary(score: number): string {
  const lead = `${score} of ${QUIZ_LENGTH} correct — `;
  if (score >= 3) return `${lead}you already sound local. Let's add the finer slang.`;
  if (score === 2) return `${lead}you get the gist. Now let's make it sound natural.`;
  return `${lead}no worries, we'll start with the everyday basics.`;
}

export function focusLabel(topics: readonly Topic[]): string {
  return `Focus: ${joinList(topics, '&')}`;
}

/** Today now shows culture picked in the next step, so the plan hint points there. */
export function planHint(): string {
  return 'Next, pick the culture topics Today shows.';
}

/** The result score travels in the URL (?score=); anything invalid counts as 0. */
export function parseScore(raw: string | null): number {
  const value = Math.floor(Number(raw));
  if (!Number.isFinite(value)) return 0;
  return Math.min(QUIZ_LENGTH, Math.max(0, value));
}
