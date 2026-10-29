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

/* ---------- "Behind the words" (ZIP prototype, view=intent), on the phrase guide (guide.ts) ---------- */

import {
  EMPTY_SITUATION,
  confidenceOf,
  findEntry,
  rankReadings,
  type Confidence,
  type GuideEntry,
  type GuideSource,
  type Likelihood,
  type Situation,
} from './guide';

export { EMPTY_SITUATION, type Situation };

/** "Office · Your colleague · smiling", plus the detail; empty when nothing is known. */
export function situationText(s: Situation): string {
  return [s.where, s.who, s.tone && s.tone !== 'Not sure' ? s.tone.toLowerCase() : '', s.topic, s.detail ?? '']
    .map((x) => x.trim())
    .filter(Boolean)
    .join(' · ');
}

/** Where, who and tone are all known. */
export function hasSituation(s: Situation): boolean {
  return Boolean(s.where.trim() && s.who.trim() && s.tone && s.tone !== 'Not sure');
}

/** The Add context sheet's quick picks (also the Nearby handoff's place contexts). */
export const SITUATION_PRESETS: readonly { label: string; situation: Situation }[] = [
  { label: 'Group chat · classmates', situation: { where: 'Group chat', who: 'Your classmate', topic: '' } },
  { label: 'Office · work', situation: { where: 'Office', who: 'Your colleague', topic: '' } },
  { label: 'Hawker centre · lunch', situation: { where: 'Hawker centre', who: 'The stall owner', topic: '' } },
  { label: 'MRT · commute', situation: { where: 'MRT', who: 'A stranger', topic: '' } },
  { label: 'At home · friends', situation: { where: 'Home', who: 'Your friend', topic: '' } },
];

export interface Reading {
  entry: GuideEntry;
  term: string;
  literal: string;
  /** What they most likely mean, for this situation. */
  meaning: string;
  /** Every way it can be meant, most likely first. */
  readings: { text: string; likelihood: Likelihood }[];
  unclear: string;
  reply: string;
  softer: string;
  confidence: Confidence;
  source: GuideSource | null;
}

/** "Behind the words" for a phrase the guide knows, or undefined (the caller then says so honestly). */
export function readingFor(question: string, situation: Situation): Reading | undefined {
  const entry = findEntry(question);
  if (!entry) return undefined;
  const readings = rankReadings(entry, situation);
  const who = situation.who.trim();
  const toneKnown = Boolean(situation.tone && situation.tone !== 'Not sure');
  // The older Singlish phrases have a sentence written for "who said it" (answer.ts COPY).
  const phrase = PHRASES.find((p) => p.id === entry.id);
  const meaning = toneKnown ? readings[0].text : who && phrase ? phrase.inContext(who.charAt(0).toUpperCase() + who.slice(1)) : entry.general;
  return {
    entry,
    term: entry.term,
    literal: entry.literal,
    meaning,
    readings,
    unclear: entry.unclear,
    reply: entry.reply,
    softer: entry.softer,
    confidence: confidenceOf(entry, situation),
    source: entry.source,
  };
}

export const ALIGN_PHRASE = '跟产品对齐一下，把颗粒度做细一点。';

/** Plain text of a reading, for copying and reports. */
export function readingText(r: Reading): string {
  return [
    r.term,
    '',
    `Literal meaning: ${r.literal}`,
    `What they most likely mean: ${r.meaning}`,
    `Still unclear: ${r.unclear}`,
    `Confidence: ${r.confidence.level}`,
    r.source ? `Source: ${r.source.label} (${r.source.url})` : 'Source: team-written guidance',
  ].join('\n');
}
