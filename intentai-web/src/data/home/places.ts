// Home (Figma 1), the place page (Figma 2 / 7) and the card pages (Figma 3–6 / 8–11), built only from the repo's
// sourced content: places = Nearby areas that have culture cards (SUBJECTS in AskPage/cards.ts), cards = Today
// articles, photos = ARTICLE_IMAGES (or, when an article has none, the Nearby picture of the place it names),
// progress = openedCardsStore, check-ins = Nearby's `visited`. Nothing here invents a fact, date or number.
import { PLACE_AREAS, SUBJECTS, cardById, keyNumberOf, subjectOfCard, topicInfo, type Card, type KeyNumber, type Subject } from '../cards';
import { area, curatedPlace } from '../../features/nearby/catalogue';
import type { ExplorePersonalData, PlaceKey } from '../../features/nearby/domain';
import type { LatLng } from '../../features/nearby/types';
import { THUMB_CREDIT, thumbUrl } from '../../features/nearby/thumbs';
import { ARTICLE_IMAGES, type ArticleImage } from '../articleImages';
import { categoryLabel } from '../culture';
import type { NearbyLink } from '../cultureLinks';
import chinatownStreet from '../../assets/v3/home/chinatown-street.png';
import { V3_PHOTO_CREDITS } from '../../assets/v3/credits';

/** The four card layouts of the Figma (food, monument, festival, history). */
export type CardKind = 'food' | 'monument' | 'festival' | 'history';

/** A card's layout: its Ask topic, else History for history trivia, else the monument layout (e.g. UNESCO sites). */
export function cardKind(card: Card): CardKind {
  if (card.topic) return card.topic;
  return card.category === 'history' ? 'history' : 'monument';
}

/** The label shown in the kicker: "Food", "Monument", "Festival", or the category ("History", "UNESCO", "Heritage"). */
export function kindLabel(card: Card): string {
  return card.topic ? topicInfo(card.topic).label : categoryLabel(card.category);
}

export interface HomePlace {
  /** Nearby area id, e.g. "sg-chinatown" (the place page key). */
  id: string;
  /** "Chinatown & Tanjong Pagar" */
  name: string;
  /** "Chinatown" */
  short: string;
  center: LatLng;
  cards: Card[];
  cover?: PlacePhoto;
}

export interface PlacePhoto {
  src: string;
  alt: string;
  credit: string;
  url?: string;
}

/** The Nearby places in an area that its cards name (a card's own place, or a stall that serves its dish). */
export function cardPlaces(card: Card, areaId?: string): Extract<NearbyLink, { kind: 'place' }>[] {
  return card.links.filter(
    (l): l is Extract<NearbyLink, { kind: 'place' }> => l.kind === 'place' && (!areaId || PLACE_AREAS[l.id] === areaId),
  );
}

/** A card's photo: its article photo, else the Nearby picture of the place it names. */
export function cardPhoto(card: Card): PlacePhoto | undefined {
  const img: ArticleImage | undefined = ARTICLE_IMAGES[card.article.id];
  if (img) return img;
  for (const l of card.links) {
    if (l.kind !== 'place') continue;
    const src = thumbUrl(l.id);
    if (src) return { src, alt: `${l.label}, seen in the EARTH ONLINE 3D map`, credit: THUMB_CREDIT };
  }
  return undefined;
}

/** Place-page hero photos the Figma uses for a real place (credited as the Figma credits them). */
const HERO_PHOTOS: Record<string, PlacePhoto> = {
  'sg-chinatown': {
    src: chinatownStreet,
    alt: 'Shophouses and lanterns along a busy Chinatown street',
    credit: V3_PHOTO_CREDITS.find((c) => c.subject === 'Chinatown street')?.credit ?? 'Photo: kallerna · CC BY-SA 4.0',
  },
};

function toPlace(subject: Subject): HomePlace | undefined {
  const a = area(subject.id);
  if (!a) return undefined;
  const cover = HERO_PHOTOS[subject.id] ?? subject.cards.map(cardPhoto).find(Boolean);
  return { id: subject.id, name: subject.name, short: subject.short, center: a.center, cards: subject.cards, cover };
}

/** Every area with culture cards, most cards first (the order Ask uses). */
export const HOME_PLACES: readonly HomePlace[] = SUBJECTS.map(toPlace).filter((p): p is HomePlace => Boolean(p));

export function homePlace(id: string | undefined): HomePlace | undefined {
  return HOME_PLACES.find((p) => p.id === id);
}

/** How many of a place's cards are in the opened list. */
export function openedCount(place: Pick<HomePlace, 'cards'>, opened: readonly string[]): number {
  return place.cards.filter((c) => opened.includes(c.article.id)).length;
}

/** The Nearby places (catalogue keys) the place's cards name inside it. */
export function placeKeysOf(place: Pick<HomePlace, 'id' | 'cards'>): PlaceKey[] {
  return [...new Set(place.cards.flatMap((c) => cardPlaces(c, place.id).map((l) => l.id)))];
}

/** Checked in = Nearby's `visited` for one of the places the cards name. */
export function visitedKeys(personal: ExplorePersonalData): Set<string> {
  return new Set(personal.places.filter((p) => p.visited).map((p) => p.placeKey as string));
}

/** Checked in = Nearby's `visited` for any catalogue place in the area (the same rule as the Moments stamp). */
export function isCheckedIn(place: Pick<HomePlace, 'id' | 'cards'>, personal: ExplorePersonalData): boolean {
  const visited = visitedKeys(personal);
  if (placeKeysOf(place).some((k) => visited.has(k))) return true;
  return [...visited].some((k) => (curatedPlace(k)?.areaId ?? PLACE_AREAS[k]) === place.id);
}

/** The place a card's Check in is for: its own place in the area (catalogue name). */
export function checkInTarget(card: Card, areaId: string): { key: PlaceKey; name: string } | undefined {
  const link = cardPlaces(card, areaId)[0];
  if (!link) return undefined;
  return { key: link.id, name: curatedPlace(link.id)?.name ?? link.label };
}

export interface CardPosition {
  place?: HomePlace;
  /** 1-based. */
  index: number;
  total: number;
  next?: Card;
}

/** Where a card sits in its place ("2 of 3") and the card after it. */
export function cardPosition(cardId: string, placeId?: string): CardPosition {
  const place = homePlace(placeId) ?? homePlace(subjectOfCard(cardId)?.id);
  if (!place) return { index: 1, total: 1 };
  const i = place.cards.findIndex((c) => c.article.id === cardId);
  if (i < 0) return { index: 1, total: 1 };
  return { place, index: i + 1, total: place.cards.length, next: place.cards[i + 1] ?? (place.cards.length > 1 ? place.cards[0] : undefined) };
}

export { cardById };

/** Sentences of a text. */
export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-Z“"])/).map((s) => s.trim()).filter(Boolean);
}

const KICKER_DATES: Record<string, string> = {
  gazetted: 'gazetted as a national monument',
  inscribed: 'inscribed on the World Heritage List',
  renamed: 'renamed',
};

/** Key numbers a card states: its facts' numbers, then the date in its kicker ("gazetted 1973"). At most `limit`. */
export function keyNumbers(card: Card, limit = 3): KeyNumber[] {
  const out: KeyNumber[] = [];
  for (const s of card.article.facts) {
    const n = keyNumberOf(s);
    // a year ("1932", "1824 to 1826") or a measure ("4 km"); a bare day of the month says little on its own
    if (n && (/^\d{4}/.test(n.value) || /\s[a-z]/.test(n.value)) && !out.some((o) => o.value === n.value)) out.push(n);
  }
  const k = card.article.kicker.match(/\b(gazetted|inscribed|renamed) (\d{4})\b/);
  if (k && !out.some((o) => o.value === k[2])) out.push({ value: k[2], caption: `Year ${KICKER_DATES[k[1]]}` });
  return out.slice(0, limit);
}

/** Facts with no number: things to look for (monuments) or to know. */
export function plainFacts(card: Card): string[] {
  return card.article.facts.filter((f) => !/\d/.test(f));
}

export interface TimelineEvent {
  year: number;
  /** "1819", "1824 to 1826", "Late 16th century". */
  label: string;
  text: string;
}

const YEAR = /\b(1[0-9]{3}|20[0-9]{2})\b(?:\s(?:to|and)\s(1[0-9]{3}|20[0-9]{2}))?/;
const CENTURY = /\b(?:(early|mid|late)[-\s])?(\d{1,2})(?:st|nd|rd|th) century\b/i;

const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** The card's sentences that name a year (or a century), in time order: the history card's timeline. */
export function timelineOf(card: Card): TimelineEvent[] {
  const { summary, facts, deeper } = card.article;
  const seen = new Set<string>();
  const events: TimelineEvent[] = [];
  for (const raw of [summary, ...facts, ...sentences(deeper)]) {
    if (seen.has(raw)) continue;
    seen.add(raw);
    const m = raw.match(YEAR);
    if (m) {
      events.push({ year: Number(m[1]), label: m[2] ? `${m[1]} to ${m[2]}` : m[1], text: capitalise(raw.replace(/^(\d{4}):\s*/, '')) });
      continue;
    }
    const c = raw.match(CENTURY);
    if (c) {
      const century = Number(c[2]);
      const offset = c[1]?.toLowerCase() === 'late' ? 80 : c[1]?.toLowerCase() === 'mid' ? 50 : c[1] ? 10 : 50;
      const label = `${c[1] ? `${c[1][0].toUpperCase()}${c[1].slice(1).toLowerCase()} ` : ''}${c[2]}th century`;
      events.push({ year: (century - 1) * 100 + offset, label, text: capitalise(raw.replace(/^[^:]{0,40}century:\s*/i, '')) });
    }
  }
  return events.sort((a, b) => a.year - b.year);
}

/** "Good morning" / "Good afternoon" / "Good evening" for the local hour. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thu 29 Oct" */
export function dayLabel(date: Date): string {
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Article" or "Article · Video" for a card. */
export function formatsOf(hasVideo: boolean): string {
  return hasVideo ? 'Article · Video' : 'Article';
}
