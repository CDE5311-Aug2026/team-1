import type { Question } from '../../data/domain';

/** Figma 7:1119 shows richer copy for the seeded "sabo" question than the store keeps. */
interface QuestionExtras {
  word?: string;
  pronunciation?: string;
  headline?: string;
  place?: { emoji: string; label: string };
  askedAt?: string;
  reviewersNote?: string;
}

const EXTRAS: Record<string, QuestionExtras> = {
  sabo: {
    word: 'Sabo',
    pronunciation: '/sah-boh/',
    headline: 'Did my colleague insult me?',
    place: { emoji: '🏢', label: 'Enquiry office · work' },
    askedAt: '8:55',
    reviewersNote: 'Locals who speak Hokkien & Singlish are looking at the tone, not just the word.',
  },
};

export interface QuestionDisplay {
  word?: string;
  pronunciation?: string;
  headline: string;
  place?: { emoji: string; label: string };
  /** Context line under the headline, e.g. "in an office · asked 8:55". */
  contextLine: string;
  sentNote: string;
  reviewersNote: string;
}

export function displayQuestion(question: Question): QuestionDisplay {
  const extras = EXTRAS[question.id] ?? {};
  const asked = extras.askedAt ? `asked ${extras.askedAt}` : '';
  return {
    word: extras.word,
    pronunciation: extras.pronunciation,
    headline: extras.headline ?? question.text,
    place: extras.place,
    contextLine: [question.context, asked].filter(Boolean).join(' · '),
    sentNote: [extras.askedAt, 'shared anonymously'].filter(Boolean).join(', '),
    reviewersNote: extras.reviewersNote ?? 'Locals are looking at the tone, not just the word.',
  };
}

/** List-card note next to the status pill (Figma 3:899 / 3:909). */
export function statusNote(question: Question): string {
  return question.status === 'Answered' ? 'by a local, now in the entry' : '2 locals reviewing';
}
