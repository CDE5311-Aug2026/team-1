// Moments (PRD §3.2, §7): everything here is worked out from the stores on every render, never stored.
// Stamps come from Nearby check-ins, ink from opened cards, rank and badges from opened cards, stamps and tips.
import { ARTICLE_IMAGES, type ArticleImage } from '../articleImages';
import type { SavedConversation } from '../community/social';
import { lookupSourceLabel, type Insight, type Lookup, type Tip } from '../domain';
import { HUNT_AREAS, HUNT_ONLY_AREAS, SHORT_STOPS, huntVisits, type HuntVisit } from './huntVisits';
import { phraseBank } from '../expressions';
import type { ExplorePersonalData } from '../../features/nearby/domain';
import { AREAS, curatedPlace } from '../../features/nearby/catalogue';
import type { PlaceStories } from '../placeStories';
import { storyPlace } from '../stories/places';
import { PLACE_AREAS, SUBJECTS, cardById, type Card, type Subject } from '../cards';

// ---- Topics -------------------------------------------------------------------------------------------------------

/** Collected filters (ZIP: All · Food · Monument · Festival · History · Ask, plus Phrases). */
export type CollectedFilter = 'all' | 'food' | 'monument' | 'festival' | 'history' | 'ask' | 'community' | 'phrases';
export type CardTopic = 'food' | 'monument' | 'festival' | 'history';

export const TOPIC_LABELS: Record<CardTopic, string> = { food: 'Food', monument: 'Monument', festival: 'Festival', history: 'History' };

/** A card's topic in Moments: Ask's topic (food, monument, festival), or History for the history-trivia cards. */
export function topicOfCard(card: Card): CardTopic | undefined {
  if (card.topic) return card.topic;
  return card.category === 'history' ? 'history' : undefined;
}

/** The area a card belongs to (the first area with cards that lists it), for captions such as "Chinatown · food". */
export function subjectOfCardId(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.cards.some((c) => c.article.id === id));
}

export function imageOf(id: string): ArticleImage | undefined {
  return ARTICLE_IMAGES[id];
}

// ---- Passport stamps -----------------------------------------------------------------------------------------------

/** Nearby place key → its area, from the catalogue's areaId (PLACE_AREAS as a fallback). */
export function areaOfPlace(placeKey: string): string | undefined {
  if (placeKey.startsWith('story:')) return STORY_AREAS[placeKey.slice(6)];
  if (placeKey.startsWith('hunt:')) return HUNT_AREAS[placeKey.split(':')[1]];
  return curatedPlace(placeKey)?.areaId ?? PLACE_AREAS[placeKey];
}

/** Team 1's story places (Home place stories) → the Nearby area they are in. */
export const STORY_AREAS: Readonly<Record<string, string>> = { chinatown: 'sg-chinatown', 'berlin-wall-fragments': 'sg-clementi' };

export interface Stamp {
  subject: Subject;
  /** True once the user checked in at any place in the area. Without it there is no stamp, only an outline. */
  collected: boolean;
  /** Earliest self-reported check-in date in the area (YYYY-MM-DD). */
  checkedInOn?: string;
  /** Latest check-in date, for ordering and the TODAY label. */
  lastCheckIn?: string;
  /** Checked-in place keys in the area. */
  places: string[];
  /** The area's card ids the user has opened. */
  openedIds: string[];
  /** opened ÷ cards, 0–1. */
  ink: number;
  /** The first card not opened yet ("Add ink: …"). */
  next?: Card;
}

/** An area with no culture cards yet, as a Subject with an empty card list (its name comes from the Nearby areas). */
function areaSubject(id: string): Subject | undefined {
  const own = HUNT_ONLY_AREAS.find((a) => a.id === id);
  if (own) return { id, name: own.name, short: own.name, cards: [] };
  const area = AREAS.find((a) => a.id === id && !a.overview);
  if (!area) return undefined;
  return { id, name: area.name, short: area.name.split(/\s*[&,]\s*/)[0], cards: [] };
}

/**
 * My Places, built only from Nearby data: one stamp per area the user checked in at (any catalogue place counts,
 * whether or not the area has culture cards yet), plus an outline for each area with cards that isn't stamped.
 * Stamped first, newest check-in first; then the outlines in SUBJECTS order (most cards first).
 */
export function buildStamps(personal: ExplorePersonalData, opened: readonly string[], stories: PlaceStories = {}, hunt: readonly HuntVisit[] = []): Stamp[] {
  const openedSet = new Set(opened);
  const visits = new Map<string, { keys: string[]; dates: string[] }>();
  const add = (key: string, date: string | undefined) => {
    const area = areaOfPlace(key);
    if (!area) return;
    const entry = visits.get(area) ?? { keys: [], dates: [] };
    entry.keys.push(key);
    if (date) entry.dates.push(date);
    visits.set(area, entry);
  };
  for (const s of personal.places) if (s.visited) add(s.placeKey, s.visitedOn ?? s.updatedAt.slice(0, 10));
  // A check-in (or stamp) on a Home place story counts for its area too.
  for (const [id, st] of Object.entries(stories)) if (st.checkedIn || st.stamped) add(`story:${id}`, st.stampedOn);
  for (const v of hunt) add(`hunt:${v.story}:${v.stop}:${v.on ?? ''}`, v.on);
  const subjects: Subject[] = [...SUBJECTS];
  for (const id of visits.keys()) {
    if (subjects.some((s) => s.id === id)) continue;
    const extra = areaSubject(id);
    if (extra) subjects.push(extra);
  }
  const stamps = subjects.map((subject): Stamp => {
    const visit = visits.get(subject.id);
    const dates = [...(visit?.dates ?? [])].sort();
    const openedIds = subject.cards.map((c) => c.article.id).filter((id) => openedSet.has(id));
    return {
      subject,
      collected: !!visit,
      checkedInOn: dates[0],
      lastCheckIn: dates[dates.length - 1],
      places: visit?.keys ?? [],
      openedIds,
      ink: subject.cards.length === 0 ? 0 : openedIds.length / subject.cards.length,
      next: subject.cards.find((c) => !openedSet.has(c.article.id)),
    };
  });
  const collected = stamps
    .filter((s) => s.collected)
    .sort((a, b) => (b.lastCheckIn ?? '').localeCompare(a.lastCheckIn ?? '') || b.places.length - a.places.length);
  return [...collected, ...stamps.filter((s) => !s.collected && s.subject.cards.length > 0)];
}

/** Every stamp, with the Hunt's on-site stops: one source, so Moments, Passport and Privacy can't disagree. */
export const allStamps = (personal: ExplorePersonalData, opened: readonly string[], stories: PlaceStories = {}): Stamp[] =>
  buildStamps(personal, opened, stories, huntVisits());

/** A Hunt visit's story and stop, from its stamp key. */
export function huntKey(key: string): { story: string; stop: string; on?: string } | null {
  const [kind, story, stop, on] = key.split(':');
  return kind === 'hunt' && story && stop ? { story, stop, on: on || undefined } : null;
}

/**
 * The checked-in places of a stamp, with names from the catalogue and the self-reported dates, newest first. A Hunt
 * stop's name comes from `huntStopName`, because the stop list lives with the game.
 */
export function stampVisits(
  stamp: Pick<Stamp, 'places'>,
  personal: ExplorePersonalData,
  huntStopName: (story: string, stop: string) => string = (_, stop) => stop,
): { key: string; name: string; on?: string }[] {
  return stamp.places
    .map((key) => {
      const hunt = huntKey(key);
      if (hunt) {
        const short = SHORT_STOPS[hunt.stop as keyof typeof SHORT_STOPS];
        return { key, name: short ?? huntStopName(hunt.story, hunt.stop), on: hunt.on };
      }
      if (key.startsWith('story:')) return { key, name: storyPlace(key.slice(6))?.name ?? key, on: undefined as string | undefined };
      const state = personal.places.find((p) => p.placeKey === key);
      return { key, name: curatedPlace(key)?.name ?? key, on: state?.visitedOn ?? state?.updatedAt.slice(0, 10) };
    })
    .sort((a, b) => (b.on ?? '').localeCompare(a.on ?? ''));
}

/** "2 Nov 2026" from YYYY-MM-DD. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

// ---- Rank ----------------------------------------------------------------------------------------------------------

export interface RankStep {
  id: 'visitor' | 'explorer' | 'insider' | 'local';
  label: string;
  /** Opened cards needed. */
  min: number;
}

/** PRD §3.2: Visitor 0–2 · Explorer 3–7 · Insider 8–13 · Local 14+ and at least one local tip. */
export const RANKS: readonly RankStep[] = [
  { id: 'visitor', label: 'Visitor', min: 0 },
  { id: 'explorer', label: 'Explorer', min: 3 },
  { id: 'insider', label: 'Insider', min: 8 },
  { id: 'local', label: 'Local', min: 14 },
];

export interface Rank {
  index: number;
  step: RankStep;
  next?: RankStep;
  /** Cards still to open for the next rank (0 when only the tip is missing). */
  cardsToNext: number;
  /** Local needs a tip as well as 14 cards. */
  needsTip: boolean;
  /** Progress through the current band towards the next rank, 0–1 (1 at the top rank). */
  progress: number;
  /** One short line: "4 more cards to Insider". */
  line: string;
}

export function rankOf(openedCards: number, tips: number): Rank {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (openedCards >= r.min && (r.id !== 'local' || tips > 0)) index = i;
  });
  const step = RANKS[index];
  const next = RANKS[index + 1];
  if (!next) return { index, step, cardsToNext: 0, needsTip: false, progress: 1, line: 'You have the top rank' };
  const cardsToNext = Math.max(0, next.min - openedCards);
  const needsTip = next.id === 'local' && tips === 0;
  const progress = Math.min(1, Math.max(0, (openedCards - step.min) / (next.min - step.min)));
  let line: string;
  if (cardsToNext > 0) line = `${cardsToNext} more ${cardsToNext === 1 ? 'card' : 'cards'} to ${next.label}`;
  else line = `A local tip on any card makes you ${next.label}`;
  return { index, step, next, cardsToNext, needsTip, progress: needsTip && cardsToNext === 0 ? 0.95 : progress, line };
}

// ---- Badges --------------------------------------------------------------------------------------------------------

export interface Badge {
  id: 'first-stamp' | 'local-tip' | 'two-districts' | 'festival-fan' | 'full-set' | 'historian';
  label: string;
  /** How to earn it, for the screen reader and the sheet. */
  hint: string;
  have: number;
  need: number;
  earned: boolean;
}

/** Opened card ids that are real cards (old or unknown ids don't count). */
export function openedCards(opened: readonly string[]): Card[] {
  return [...new Set(opened)].map((id) => cardById(id)).filter((c): c is Card => !!c);
}

/** PRD §3.2 badges. Progress = have ÷ need; for the per-place badges, the best place counts. */
export function badgesOf(stamps: readonly Stamp[], opened: readonly string[], tips: number): Badge[] {
  const openedSet = new Set(opened);
  const stampCount = stamps.filter((s) => s.collected).length;
  const best = (pick: (s: Subject) => Card[]) => {
    let top = { have: 0, need: 0 };
    for (const s of SUBJECTS) {
      const cards = pick(s);
      if (cards.length === 0) continue;
      const have = cards.filter((c) => openedSet.has(c.article.id)).length;
      // the place closest to done: highest ratio, then the bigger set
      if (top.need === 0 || have / cards.length > top.have / top.need || (have / cards.length === top.have / top.need && cards.length > top.need)) {
        top = { have, need: cards.length };
      }
    }
    return top.need === 0 ? { have: 0, need: 1 } : top;
  };
  const festival = best((s) => s.cards.filter((c) => topicOfCard(c) === 'festival'));
  const full = best((s) => s.cards);
  const history = openedCards(opened).filter((c) => c.category === 'history').length;
  const make = (id: Badge['id'], label: string, hint: string, have: number, need: number): Badge => ({
    id,
    label,
    hint,
    have: Math.min(have, need),
    need,
    earned: have >= need,
  });
  return [
    make('first-stamp', 'First stamp', 'Check in at a place in Nearby', stampCount, 1),
    make('local-tip', 'Local tip', 'Get a local’s answer added to a card', tips, 1),
    make('two-districts', 'Two districts', 'Collect stamps in two areas', stampCount, 2),
    make('festival-fan', 'Festival fan', 'Open every festival card of one place', festival.have, festival.need),
    make('full-set', 'Full set', 'Open every card of one place', full.have, full.need),
    make('historian', 'Historian', 'Open a history card', history, 1),
  ];
}

// ---- Collected -----------------------------------------------------------------------------------------------------

export type CollectedItem =
  | { kind: 'card'; key: string; card: Card; topic?: CardTopic; area?: string }
  | { kind: 'tip'; key: string; tip: Tip; card?: Card; topic?: CardTopic }
  | { kind: 'insight'; key: string; insight: Insight; topic?: CardTopic }
  | { kind: 'conversation'; key: string; saved: SavedConversation }
  | { kind: 'phrase'; key: string; word: string; meaning: string; source: string; lookup?: Lookup; example?: string };

export interface CollectedInput {
  opened: readonly string[];
  tips: readonly Tip[];
  insights: readonly Insight[];
  lookups: readonly Lookup[];
  /** Today's-three phrase ids (the v2 passport). */
  todaysThree: readonly string[];
  /** Community conversations saved to Moments (snapshots). */
  conversations?: readonly SavedConversation[];
}

/** Everything collected, newest first within each kind: opened cards, local tips, saved Ask insights, saved Community
 * conversations, phrases. */
export function collectedItems({ opened, tips, insights, lookups, todaysThree, conversations = [] }: CollectedInput): CollectedItem[] {
  const cards: CollectedItem[] = openedCards([...opened].reverse()).map((card) => ({
    kind: 'card',
    key: `card:${card.article.id}`,
    card,
    topic: topicOfCard(card),
    area: subjectOfCardId(card.article.id)?.short,
  }));
  const tipItems: CollectedItem[] = [...tips]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((tip) => {
      const card = cardById(tip.cardId);
      return { kind: 'tip', key: `tip:${tip.id}`, tip, card, topic: card ? topicOfCard(card) : undefined };
    });
  const insightItems: CollectedItem[] = [...insights]
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((insight) => {
      const card = insight.cardId ? cardById(insight.cardId) : undefined;
      return { kind: 'insight', key: `insight:${insight.id}`, insight, topic: card ? topicOfCard(card) : undefined };
    });
  const conversationItems: CollectedItem[] = [...conversations]
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((saved) => ({ kind: 'conversation', key: `conversation:${saved.threadId}`, saved }));
  const words = new Set(lookups.map((l) => l.word.toLowerCase()));
  const phrases: CollectedItem[] = [
    ...lookups.map((lookup): CollectedItem => ({
      kind: 'phrase',
      key: `lookup:${lookup.id}`,
      word: lookup.word,
      meaning: lookup.meaning,
      source: lookupSourceLabel(lookup.source),
      lookup,
      example: lookup.example,
    })),
    ...todaysThree
      .map((id) => phraseBank.find((p) => p.id === id))
      .filter((p): p is (typeof phraseBank)[number] => !!p && !words.has(p.title.toLowerCase()))
      .map((p): CollectedItem => ({
        kind: 'phrase',
        key: `phrase:${p.id}`,
        word: p.title,
        meaning: p.description,
        source: 'From Today’s three',
        example: p.example,
      })),
  ];
  return [...cards, ...tipItems, ...insightItems, ...conversationItems, ...phrases];
}

export function matchesFilter(item: CollectedItem, filter: CollectedFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'ask') return item.kind === 'insight';
  if (filter === 'phrases') return item.kind === 'phrase';
  if (filter === 'community') return item.kind === 'conversation';
  return (item.kind === 'card' || item.kind === 'tip') && item.topic === filter;
}

// ---- Snap ----------------------------------------------------------------------------------------------------------

/** The app's own card photos, for the Snap tray (no recognition: picking a photo opens its own card). */
export function snapTray(): Card[] {
  const inAreas = SUBJECTS.flatMap((s) => s.cards).filter((c) => ARTICLE_IMAGES[c.article.id]);
  const rest = Object.keys(ARTICLE_IMAGES)
    .map((id) => cardById(id))
    .filter((c): c is Card => !!c);
  const seen = new Set<string>();
  return [...inAreas, ...rest].filter((c) => (seen.has(c.article.id) ? false : (seen.add(c.article.id), true)));
}
