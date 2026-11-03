// "Order like a local" (owner request 2026-10-29): build an order step by step, then say it or show it to the stall.
// Every term and its meaning comes from the pages in `sources`; a combination no source shows is not offered
// (e.g. "kosong" only with black coffee, as in kopi O kosong).
import type { SourceReference } from '../../features/nearby/domain';

export type OrderKind = 'kopi' | 'chicken-rice';

export interface OrderOption {
  id: string;
  label: string;
  /** Words this choice adds to the order ('' for the default, which needs no word). */
  term: string;
  /** What the choice means, in plain English, for the meaning line. */
  meaning: string;
}

export interface OrderStep {
  id: string;
  question: string;
  options: OrderOption[];
  /** Options to hide given the other choices. */
  unavailable?: (choices: Record<string, string>) => string[];
  /** One line under the step, e.g. where the condiments are. */
  note?: string;
}

export interface OrderGuide {
  kind: OrderKind;
  title: string;
  intro: string;
  /** The words the order starts with, after the greeting. */
  base: string;
  baseMeaning: string;
  steps: OrderStep[];
  sources: SourceReference[];
}

const checked = '2026-10-29';
const KOPI = { title: 'Kopi (drink)', url: 'https://en.wikipedia.org/wiki/Kopi_(drink)', publisher: 'Wikipedia', checkedAt: checked };
const SINGLISH = { title: 'Singlish vocabulary', url: 'https://en.wikipedia.org/wiki/Singlish_vocabulary', publisher: 'Wikipedia', checkedAt: checked };
const CHICKEN_RICE = {
  title: 'Hainanese chicken rice',
  url: 'https://en.wikipedia.org/wiki/Hainanese_chicken_rice',
  publisher: 'Wikipedia',
  checkedAt: checked,
};

/** "Uncle" / "Auntie": how a stallholder you don't know is usually addressed. */
const GREETING: OrderStep = {
  id: 'greet',
  question: 'Who is at the counter?',
  options: [
    { id: 'uncle', label: 'Uncle', term: 'Uncle,', meaning: '' },
    { id: 'auntie', label: 'Auntie', term: 'Auntie,', meaning: '' },
  ],
};

/** "Having here" or "da bao" (takeaway, for cooked food). */
const WHERE: OrderStep = {
  id: 'where',
  question: 'Eat here or take away?',
  options: [
    { id: 'here', label: 'Having here', term: 'having here', meaning: 'to eat here' },
    { id: 'dabao', label: 'Da bao', term: 'da bao', meaning: 'to take away' },
  ],
};

export const ORDER_GUIDES: Record<OrderKind, OrderGuide> = {
  kopi: {
    kind: 'kopi',
    title: 'Order kopi like a local',
    intro: 'Kopi is coffee. Plain “kopi” comes with sugar and condensed milk; each word you add changes one thing.',
    base: 'kopi',
    baseMeaning: 'Coffee',
    steps: [
      GREETING,
      {
        id: 'milk',
        question: 'Milk?',
        options: [
          { id: 'condensed', label: 'Condensed', term: '', meaning: 'with condensed milk' },
          { id: 'o', label: 'O · black', term: 'O', meaning: 'black' },
          { id: 'c', label: 'C · evaporated', term: 'C', meaning: 'with evaporated milk' },
        ],
      },
      {
        id: 'sugar',
        question: 'Sugar?',
        options: [
          { id: 'normal', label: 'Normal', term: '', meaning: 'with sugar' },
          { id: 'less', label: 'Siew dai · less', term: 'siew dai', meaning: 'with less sugar' },
          { id: 'more', label: 'Gah dai · more', term: 'gah dai', meaning: 'with extra sugar' },
          { id: 'none', label: 'Kosong · none', term: 'kosong', meaning: 'without sugar' },
        ],
        unavailable: (c) => (c.milk === 'o' ? [] : ['none']),
        note: '“Kosong” (Malay for “empty”) is shown for black coffee: kopi O kosong.',
      },
      {
        id: 'ice',
        question: 'Hot or iced?',
        options: [
          { id: 'hot', label: 'Hot', term: '', meaning: '' },
          { id: 'peng', label: 'Peng · iced', term: 'peng', meaning: 'iced' },
        ],
      },
      WHERE,
    ],
    sources: [KOPI, SINGLISH],
  },
  'chicken-rice': {
    kind: 'chicken-rice',
    title: 'Order chicken rice',
    intro: 'Chicken rice is chicken with rice cooked in the chicken’s fat and stock, with ginger, garlic and pandan leaves.',
    base: 'one chicken rice',
    baseMeaning: 'One plate of chicken rice',
    steps: [
      GREETING,
      {
        id: 'chicken',
        question: 'Which chicken?',
        options: [
          { id: 'poached', label: 'Poached · white', term: 'white chicken', meaning: 'with poached (white) chicken' },
          { id: 'roasted', label: 'Roasted', term: 'roasted', meaning: 'with roasted chicken' },
        ],
        note: 'Not every stall roasts: check the menu board. It usually comes with chilli sauce, dark soy sauce and ginger.',
      },
      WHERE,
    ],
    sources: [CHICKEN_RICE, SINGLISH],
  },
};

export type OrderChoices = Record<string, string>;

/** The first choice of each step. */
export function defaultChoices(guide: OrderGuide): OrderChoices {
  return Object.fromEntries(guide.steps.map((s) => [s.id, s.options[0].id]));
}

/** Options of a step that the other choices allow. */
export function availableOptions(step: OrderStep, choices: OrderChoices): OrderOption[] {
  const hidden = step.unavailable?.(choices) ?? [];
  return step.options.filter((o) => !hidden.includes(o.id));
}

/** Drop choices that the other choices no longer allow (back to the step's first option). */
export function settle(guide: OrderGuide, choices: OrderChoices): OrderChoices {
  const next = { ...choices };
  for (const s of guide.steps) if (!availableOptions(s, next).some((o) => o.id === next[s.id])) next[s.id] = s.options[0].id;
  return next;
}

const option = (guide: OrderGuide, step: string, choices: OrderChoices) => {
  const s = guide.steps.find((x) => x.id === step)!;
  return s.options.find((o) => o.id === choices[step]) ?? s.options[0];
};

/**
 * The order as said at the counter, and what it means: "Uncle, kopi O kosong peng, da bao." → "Black coffee, without
 * sugar, iced, to take away." The drink's words come in the article's order (kopi O kosong, kopi O peng).
 */
export function orderText(guide: OrderGuide, choices: OrderChoices): { said: string; meaning: string } {
  const c = settle(guide, choices);
  const middle = guide.steps.filter((s) => s.id !== 'greet' && s.id !== 'where');
  const words = [guide.base, ...middle.map((s) => option(guide, s.id, c).term)].filter(Boolean).join(' ');
  const greet = option(guide, 'greet', c).term;
  const where = option(guide, 'where', c);
  const said = `${greet} ${words}, ${where.term}.`;
  const parts = middle.map((s) => option(guide, s.id, c).meaning).filter(Boolean);
  // "black" describes the coffee itself: "Black coffee", not "Coffee, black"
  const black = parts[0] === 'black';
  const head = black ? `Black ${guide.baseMeaning.toLowerCase()}` : guide.baseMeaning;
  const meaning = `${[head, ...(black ? parts.slice(1) : parts)].join(', ')}, ${where.meaning}.`;
  return { said: said.charAt(0).toUpperCase() + said.slice(1), meaning };
}
