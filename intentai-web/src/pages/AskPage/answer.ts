// Local, canned answer engine for Ask (no backend). It knows Today's three expressions plus "sabo",
// and explains each in the setting where it was heard (v0 DesignApp.jsx `ask`, Figma 2:328).
import { SEED_LOOKUPS, type Place } from '../../data/domain';
import { phraseBank } from '../../data/expressions';

export interface AskContext {
  label: string;
  /** Emoji shown in the context card's badge (Figma uses 💬 for the group chat). */
  icon: string;
  /** Who says the phrase in this setting, written to start a sentence. */
  who: string;
}

export const ASK_CONTEXTS: readonly AskContext[] = [
  { label: 'group chat · classmates', icon: '💬', who: 'Your classmate' },
  { label: 'Office · work', icon: '💼', who: 'Your colleague' },
  { label: 'Hawker centre · lunch', icon: '🍜', who: 'The person at the hawker centre' },
  { label: 'MRT · commute', icon: '🚇', who: 'The other commuter' },
  { label: 'At home · friends', icon: '🏠', who: 'Your friend' },
];

export const DEFAULT_CONTEXT = ASK_CONTEXTS[0].label;

export function contextFor(label: string): AskContext {
  return ASK_CONTEXTS.find((context) => context.label === label) ?? ASK_CONTEXTS[0];
}

const PLACE_CONTEXT: Record<Place, string> = {
  'Hawker centre': 'Hawker centre · lunch',
  Kopitiam: 'Hawker centre · lunch',
  'Wet market': 'Hawker centre · lunch',
  'MRT · bus': 'MRT · commute',
  'Grab · taxi': 'MRT · commute',
  Office: 'Office · work',
  School: 'group chat · classmates',
  'Void deck': 'At home · friends',
  Mall: 'At home · friends',
};

/** The Ask context closest to a Nearby place, for the Nearby → Ask handoff. */
export function askContextForPlace(place: Place): string {
  return PLACE_CONTEXT[place];
}

export interface Phrase {
  id: string;
  title: string;
  /** Short meaning saved to Moments as a lookup. */
  meaning: string;
  example: string;
  /** Spelling variants matched in a question, lower case. */
  keys: string[];
  /** Continues “<title>” in the first answer paragraph. */
  lead: string;
  inContext: (who: string) => string;
}

interface PhraseCopy {
  keys: string[];
  lead: string;
  inContext: (who: string) => string;
}

const COPY: Record<string, PhraseCopy> = {
  chope: {
    keys: ['chope'],
    lead: ' is Singlish for reserving a seat — usually at a hawker centre, by leaving a tissue packet on the table.',
    inContext: (who) => `${who} is asking you to save a seat for them.`,
  },
  'can-or-not': {
    keys: ['can or not', 'can anot'],
    lead: ' is Singlish for asking whether something is possible or OK.',
    inContext: (who) => `${who} is checking if this works for you. Reply “Can!” if yes, or “Cannot lah” if not.`,
  },
  paiseh: {
    keys: ['paiseh', 'pai seh'],
    lead: ' is Singlish for feeling sorry or embarrassed — a soft, polite apology.',
    inContext: (who) => `${who} is apologising for the trouble. It is friendly, not serious; “No problem!” is a good reply.`,
  },
};

const sabo = SEED_LOOKUPS.find((lookup) => lookup.id === 'sabo');

export const PHRASES: Phrase[] = [
  ...phraseBank.flatMap((expression) => {
    const copy = COPY[expression.id];
    return copy
      ? [{ id: expression.id, title: expression.title, meaning: expression.description, example: expression.example ?? '', ...copy }]
      : [];
  }),
  {
    id: 'sabo',
    title: 'Sabo',
    meaning: sabo?.meaning ?? 'To sell someone out — joking or serious; tone decides.',
    example: '“Wah, you kena sabo lah.”',
    keys: ['sabo'],
    lead: ' is Singlish for selling someone out or getting them into trouble.',
    inContext: (who) =>
      `${who} may be teasing or serious — the tone decides. Said with a laugh, it is usually a joke; if unsure, ask a local.`,
  },
];

/** The known phrase mentioned earliest in the text, if any. */
export function findPhrase(text: string): Phrase | undefined {
  const lower = text.toLowerCase();
  let best: { phrase: Phrase; at: number } | undefined;
  for (const phrase of PHRASES) {
    for (const key of phrase.keys) {
      const at = lower.indexOf(key);
      if (at >= 0 && (!best || at < best.at)) best = { phrase, at };
    }
  }
  return best?.phrase;
}

/** An answer renders as “<term>”<lead>, then an optional second paragraph. */
export interface Answer {
  phraseId?: string;
  term?: string;
  lead: string;
  detail?: string;
}

export function explain(question: string, contextLabel: string): Answer {
  const phrase = findPhrase(question);
  if (!phrase) {
    return {
      lead: 'This prototype can explain chope, can or not, paiseh and sabo.',
      detail: 'For another phrase, ask a local in Community.',
    };
  }
  return {
    phraseId: phrase.id,
    term: phrase.title,
    lead: phrase.lead,
    detail: phrase.inContext(contextFor(contextLabel).who),
  };
}

export function inSentence(phrase: Phrase): Answer {
  return { phraseId: phrase.id, term: phrase.title, lead: ' in a sentence:', detail: phrase.example };
}

/** Plain text, for copying and reports. */
export function answerText(answer: Answer): string {
  const first = answer.term ? `“${answer.term}”${answer.lead}` : answer.lead;
  return answer.detail ? `${first}\n\n${answer.detail}` : first;
}
