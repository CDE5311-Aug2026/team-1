// Ask from cards: Ask answers questions about an area from that area's culture cards (Today's articles), and only from
// them. No backend, no LLM: a local, rule-based search over the cards' own sentences, so every answer quotes a card
// that has its sources. Cards belong to an area through src/data/cultureLinks.ts (the places each article names, or a
// stall that serves its dish). cards.test.ts checks PLACE_AREAS against the Nearby catalogue.
import { CATEGORIES, articlesFor, type Article, type CategoryId } from '../../data/culture';
import { ARTICLE_LINKS, type NearbyLink } from '../../data/cultureLinks';
import areasData from '../../data/explore/areas.json';

export type Topic = 'food' | 'monument' | 'festival';

export const TOPICS: readonly { id: Topic; label: string; article: string; card: string }[] = [
  { id: 'food', label: 'Food', article: 'a food', card: 'Food card' },
  { id: 'monument', label: 'Monument', article: 'a monument', card: 'Monument card' },
  { id: 'festival', label: 'Festival', article: 'a festival', card: 'Festival card' },
];

export function topicInfo(topic: Topic) {
  return TOPICS.find((t) => t.id === topic)!;
}

const CATEGORY_TOPIC: Partial<Record<CategoryId, Topic>> = { foods: 'food', monuments: 'monument', holidays: 'festival' };
/** Heritage-list articles that are festivals. */
const ARTICLE_TOPIC: Record<string, Topic> = { thaipusam: 'festival', chingay: 'festival' };

export interface Card {
  article: Article;
  category: CategoryId;
  topic?: Topic;
  links: readonly NearbyLink[];
}

const ALL_CARDS: Card[] = CATEGORIES.flatMap(({ id }) =>
  articlesFor(id).map((article) => ({
    article,
    category: id,
    topic: ARTICLE_TOPIC[article.id] ?? CATEGORY_TOPIC[id],
    links: ARTICLE_LINKS[article.id] ?? [],
  })),
);

export function cardById(id: string): Card | undefined {
  return ALL_CARDS.find((c) => c.article.id === id);
}

/** Catalogue place → its Nearby area (areaId in places.sg.json), for the places cultureLinks names. Checked by cards.test.ts. */
export const PLACE_AREAS: Readonly<Record<string, string>> = {
  'curated:sg-tian-tian-hainanese-chicken-rice': 'sg-chinatown',
  'curated:sg-king-of-laksa': 'sg-katong',
  'curated:sg-sri-mariamman-temple': 'sg-chinatown',
  'curated:sg-thian-hock-keng-temple': 'sg-chinatown',
  'curated:sg-sultan-mosque': 'sg-kampong-glam',
  'curated:sg-raffles-hotel': 'sg-kampong-glam',
  'curated:sg-kong-meng-san-phor-kark-see-monastery': 'sg-ang-mo-kio',
  'curated:sg-singapore-botanic-gardens': 'sg-orchard',
  'curated:sg-sri-srinivasa-perumal-temple': 'sg-little-india',
  'curated:sg-little-india': 'sg-little-india',
  'curated:sg-fort-siloso': 'sg-sentosa',
};

const AREA_NAMES: Record<string, string> = Object.fromEntries(areasData.areas.map((a) => [a.id, a.name]));

/** What Ask is asking about: a Nearby area and the cards that name a place in it. */
export interface Subject {
  id: string;
  /** Full area name, e.g. "Chinatown & Tanjong Pagar". */
  name: string;
  /** The first part, for sentences: "Chinatown". */
  short: string;
  cards: Card[];
}

function areasOf(card: Card): string[] {
  const ids = card.links.flatMap((l) => (l.kind === 'area' ? [l.id] : l.kind === 'place' && PLACE_AREAS[l.id] ? [PLACE_AREAS[l.id]] : []));
  return [...new Set(ids)];
}

/** Every area with at least one card, most cards first (then by name). */
export const SUBJECTS: readonly Subject[] = (() => {
  const byArea = new Map<string, Card[]>();
  for (const card of ALL_CARDS) for (const area of areasOf(card)) byArea.set(area, [...(byArea.get(area) ?? []), card]);
  return [...byArea.entries()]
    .filter(([id]) => AREA_NAMES[id])
    .map(([id, cards]) => ({ id, name: AREA_NAMES[id], short: AREA_NAMES[id].split(/\s*[&,]\s*/)[0], cards }))
    .sort((a, b) => b.cards.length - a.cards.length || a.name.localeCompare(b.name));
})();

export const DEFAULT_SUBJECT = SUBJECTS[0];

export function subjectById(id: string | undefined): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export function topicsIn(subject: Subject): Topic[] {
  return TOPICS.map((t) => t.id).filter((t) => subject.cards.some((c) => c.topic === t));
}

// ---- Topic detection -------------------------------------------------------------------------------------------

const TOPIC_WORDS: Record<Topic, string[]> = {
  food: ['food', 'eat', 'eating', 'dish', 'dishes', 'try', 'taste', 'hungry', 'hawker', 'stall', 'restaurant', 'breakfast',
    'lunch', 'dinner', 'supper', 'cook', 'cooked', 'recipe', 'rice', 'noodles', 'spicy', 'sauce', 'menu', 'order'],
  monument: ['monument', 'monuments', 'temple', 'mosque', 'church', 'hotel', 'building', 'built', 'build', 'architecture',
    'tower', 'dome', 'gopuram', 'founded', 'old', 'oldest', 'visit', 'inside', 'entrance', 'gazetted', 'landmark'],
  festival: ['festival', 'festivals', 'celebrate', 'celebration', 'holiday', 'new year', 'hari raya', 'thaipusam', 'vesak',
    'deepavali', 'procession', 'bazaar', 'lantern', 'when is', 'next'],
};

function containsWord(text: string, word: string) {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
}

/** The topic a question is about, from its words or a card title it names. Undefined when it names none. */
export function detectTopic(text: string): Topic | undefined {
  if (!text.trim()) return undefined;
  for (const card of ALL_CARDS) if (card.topic && containsWord(text, card.article.title)) return card.topic;
  let best: { topic: Topic; hits: number } | undefined;
  for (const { id } of TOPICS) {
    const hits = TOPIC_WORDS[id].filter((w) => containsWord(text, w)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { topic: id, hits };
  }
  return best?.topic;
}

// ---- Search over card sentences --------------------------------------------------------------------------------

const STOP = new Set(
  ('a an the and or of to in on at for from by with about is are was were be been it its this that these those what which who ' +
    'whom whose why how when where can could do does did i me my you your we our they their there here near around some any ' +
    'tell know like would should will much many more most than then so if as into out up down over under after before just ' +
    'also only very really please get got have has had s t').split(' '),
);

function stem(word: string) {
  return word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
}

function tokens(text: string): string[] {
  return (text.toLowerCase().normalize('NFKD').match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP.has(w)).map(stem);
}

function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-Z“"])/).map((s) => s.trim()).filter(Boolean);
}

function overlap(question: Set<string>, text: string) {
  return new Set(tokens(text).filter((w) => question.has(w))).size;
}

const HAS_NUMBER = /\d/;
type Intent = 'where' | 'when' | 'what';

function intentOf(question: string): Intent {
  if (/\bwhere\b/i.test(question)) return 'where';
  if (/\b(when|how old|what year|which year|how long|since)\b/i.test(question)) return 'when';
  return 'what';
}

/** One big number on an answer, with the card sentence it comes from. */
export interface KeyNumber {
  value: string;
  caption: string;
}

const NUMBER = /\b(\d{1,4}(?:\s(?:to|and)\s\d{1,4})?)(?:\s?(km|m|days?|years?|rooms?|tonnes?)\b)?/;

/** The number a card sentence states, written as the sentence writes it ("1839 to 1842", "4 km"). */
export function keyNumberOf(sentence: string): KeyNumber | undefined {
  const match = sentence.match(NUMBER);
  if (!match) return undefined;
  return { value: match[2] ? `${match[1]} ${match[2]}` : match[1], caption: sentence };
}

export type CardAnswer =
  | {
      kind: 'card';
      card: Card;
      topic?: Topic;
      /** Card sentences, verbatim, without numbers. */
      lines: string[];
      /** Card sentences that state a number, shown as big numbers. */
      numbers: KeyNumber[];
      /** Places in Nearby the card names, shown for "where" questions. */
      places: readonly NearbyLink[];
    }
  | {
      kind: 'none';
      /** The topic the question seems to be about, when the area has no card for it. */
      topic?: Topic;
    };

/**
 * Answer a question about a subject from its cards. `cardId` binds the question to one card (a suggested question).
 * Returns 'none' when no card of the subject says anything about it.
 */
export function askFromCards(question: string, subject: Subject, options: { cardId?: string; topic?: Topic } = {}): CardAnswer {
  const topic = options.topic ?? detectTopic(question);
  const q = new Set(tokens(question));
  const intent = intentOf(question);

  let pool = subject.cards;
  if (options.cardId) pool = pool.filter((c) => c.article.id === options.cardId);

  const scored = pool.map((card) => {
    const { article } = card;
    const sentences = [article.summary, ...article.facts, ...sentencesOf(article.deeper)];
    const ranked = sentences
      .map((text, order) => {
        let score = overlap(q, text);
        if (intent === 'when' && HAS_NUMBER.test(text)) score += 1;
        return { text, score, order };
      })
      .sort((a, b) => b.score - a.score || a.order - b.order);
    const titleHits = overlap(q, `${article.title} ${article.kicker}`);
    const best = ranked[0]?.score ?? 0;
    const sameTopic = topic !== undefined && card.topic === topic;
    return { card, ranked, titleHits, best, sameTopic, score: titleHits * 3 + best + (sameTopic ? 2 : 0) };
  });

  // A card answers if the question names it, shares words with it, or asks about its topic; otherwise nothing does.
  const usable = scored.filter((s) => options.cardId || s.titleHits > 0 || s.best > 0 || s.sameTopic);
  if (topic && !options.cardId && !usable.some((s) => s.sameTopic || s.titleHits > 0)) return { kind: 'none', topic };
  usable.sort((a, b) => b.score - a.score);
  const top = usable[0];
  if (!top) return { kind: 'none', topic };

  const { article } = top.card;
  let picked = top.ranked.filter((s) => s.score > 0).slice(0, 3);
  // Nothing matched word for word (a topic or a bound question): the card's own opening.
  if (picked.length === 0 || (options.cardId && top.titleHits > 0 && picked.length < 2)) {
    picked = [article.summary, ...article.facts].slice(0, 3).map((text, order) => ({ text, score: 0, order }));
  }
  const texts = [...new Set(picked.map((p) => p.text))];
  const numbers = texts.flatMap((t) => {
    const n = keyNumberOf(t);
    return n ? [n] : [];
  }).slice(0, 2);
  const lines = texts.filter((t) => !numbers.some((n) => n.caption === t));
  const places = intent === 'where' || top.card.topic === 'food' ? top.card.links.filter((l) => l.kind !== 'list' || intent === 'where') : [];
  return { kind: 'card', card: top.card, topic: top.card.topic, lines, numbers, places };
}

/** Plain text of a card answer, for copying and reports. */
export function cardAnswerText(answer: CardAnswer, subject: Subject): string {
  if (answer.kind === 'none') return `No card about ${subject.short} answers this yet.`;
  const parts = [...answer.lines, ...answer.numbers.map((n) => n.caption)];
  return `${parts.join(' ')}\n\nSource: ${answer.card.article.title} (${answer.card.article.sources.map((s) => s.label).join('; ')})`;
}

// ---- Suggested questions and recommendations ------------------------------------------------------------------

export interface Suggestion {
  cardId: string;
  question: string;
  topic?: Topic;
}

/** One question per card that its text answers. */
export function suggestionFor(card: Card, subject: Subject): Suggestion {
  const { title } = card.article;
  const tryHere = card.links.some((l) => l.kind === 'place' && l.why === 'try' && PLACE_AREAS[l.id] === subject.id);
  const question =
    card.topic === 'food'
      ? tryHere
        ? `Where can I try ${title} in ${subject.short}?`
        : `Where does ${title} come from?`
      : card.topic === 'monument'
        ? `What is the story of ${title}?`
        : card.topic === 'festival'
          ? `When is ${title}, and what happens?`
          : `What should I know about ${title}?`;
  return { cardId: card.article.id, question, topic: card.topic };
}

export interface Recommendation extends Suggestion {
  reason: string;
}

/**
 * Up to `limit` questions from the subject's other cards, each with the reason it was picked: a card you opened,
 * one of your Today topics, or simply another card here. Cards already asked about come last.
 */
export function recommend(
  subject: Subject,
  { opened, interests, exclude = [], limit = 2 }: { opened: readonly string[]; interests: readonly CategoryId[]; exclude?: readonly string[]; limit?: number },
): Recommendation[] {
  const openedCards = opened.map(cardById).filter((c): c is Card => Boolean(c));
  const ranked = subject.cards
    .filter((c) => !exclude.includes(c.article.id))
    .map((card, order) => {
      const s = suggestionFor(card, subject);
      const self = opened.includes(card.article.id);
      const sameTopic = openedCards.find((o) => o.topic && o.topic === card.topic && o.article.id !== card.article.id);
      const interest = interests.includes(card.category);
      const category = CATEGORIES.find((c) => c.id === card.category)!;
      const reason = self
        ? `Because you opened the ${card.article.title} card`
        : sameTopic
          ? `Because you opened the ${sameTopic.article.title} card`
          : interest
            ? `Matches your interest in ${category.label.toLowerCase()}`
            : `Another card about ${subject.short}`;
      const rank = self ? 0 : sameTopic ? 1 : interest ? 2 : 3;
      return { ...s, reason, rank, order };
    })
    .sort((a, b) => a.rank - b.rank || a.order - b.order);
  return ranked.slice(0, limit).map(({ rank: _rank, order: _order, ...r }) => r);
}

/** "near here" → "near Chinatown", so a local knows where the asker means. */
export function rewriteHere(question: string, place: string): string {
  return question
    .replace(/\b(near|around) (here|this place)\b/gi, (_m, prep: string) => `${prep} ${place}`)
    .replace(/\bhere\b/gi, `in ${place}`);
}
