// Nearby content (Figma 11:1414 heads-up, 11:1571 place list). Places, emoji and phrase counts are
// Figma copy; which phrase leads at which place follows v0 (food places → Chope, transport → Paiseh,
// everywhere else → Can or not?). Demo content: there is no real place database.
import { phraseBank, staticCopy } from '../../data/expressions';
import type { Place } from '../../data/domain';
import type { IconName } from '../../types';

export interface PlaceInfo {
  emoji: string;
  /** "6 phrases" on the place tile and in the Show button (Figma 11:1895…11:1938). */
  phraseCount: number;
}

export const PLACE_INFO: Record<Place, PlaceInfo> = {
  'Hawker centre': { emoji: '🍜', phraseCount: 6 },
  'MRT · bus': { emoji: '🚇', phraseCount: 5 },
  Kopitiam: { emoji: '☕', phraseCount: 4 },
  School: { emoji: '🎒', phraseCount: 7 },
  Office: { emoji: '💼', phraseCount: 4 },
  'Wet market': { emoji: '🐟', phraseCount: 3 },
  'Grab · taxi': { emoji: '🚕', phraseCount: 3 },
  'Void deck': { emoji: '🏢', phraseCount: 2 },
  Mall: { emoji: '🛍️', phraseCount: 5 },
};

/** The phrase you will likely meet at the place (the heads-up card). */
export interface HeadsUp {
  id: string;
  icon: IconName;
  title: string;
  phonetic?: string;
  meaning: string;
  tip: string;
}

/** A row under "Also heard here". */
export interface AlsoHeard {
  id: string;
  emoji: string;
  title: string;
  phonetic?: string;
  meaning: string;
}

export interface NearbyContent {
  /** Place name on the map chip. */
  mapLabel: string;
  /** Context chip on the heads-up card. */
  chipIcon: IconName;
  chipLabel: string;
  headsUp: HeadsUp;
  alsoHeard: [AlsoHeard, AlsoHeard];
  /** Pin on the map: the bowl icon for food places, otherwise the place emoji. */
  pinEmoji?: string;
}

function expression(id: string) {
  const found = phraseBank.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown expression ${id}`);
  return found;
}

const chope = expression('chope');
const canOrNot = expression('can-or-not');
const paiseh = expression('paiseh');

const HEADS_UP = {
  chope: {
    id: chope.id,
    icon: chope.icon,
    title: chope.title,
    phonetic: chope.phonetic,
    meaning: chope.description,
    tip: 'Tissue packet on a table = seat taken. Look for an empty table instead.',
  },
  canOrNot: {
    id: canOrNot.id,
    icon: canOrNot.icon,
    title: canOrNot.title,
    phonetic: canOrNot.phonetic,
    meaning: canOrNot.description,
    tip: canOrNot.example ?? '',
  },
  paiseh: {
    id: paiseh.id,
    icon: paiseh.icon,
    title: paiseh.title,
    phonetic: paiseh.phonetic,
    meaning: paiseh.description,
    tip: paiseh.example ?? '',
  },
} satisfies Record<string, HeadsUp>;

const ALSO = {
  tapau: { id: 'tapau', emoji: '🥡', title: 'Tapau', phonetic: '/tah-pow/', meaning: 'Take away: pack food to go' },
  kosong: { id: 'kosong', emoji: '🥤', title: 'Kosong', phonetic: '/koh-song/', meaning: 'Plain: nothing added, e.g. no sugar' },
  chope: { id: chope.id, emoji: '🪑', title: chope.title, phonetic: chope.phonetic, meaning: 'Save a seat with a tissue packet' },
  canOrNot: { id: canOrNot.id, emoji: '🤔', title: canOrNot.title, meaning: 'Is it possible or OK?' },
  paiseh: { id: paiseh.id, emoji: '😬', title: paiseh.title, phonetic: paiseh.phonetic, meaning: 'A soft, polite apology' },
} satisfies Record<string, AlsoHeard>;

const FOOD_PLACES: readonly Place[] = ['Hawker centre', 'Kopitiam', 'Wet market'];
const TRANSPORT_PLACES: readonly Place[] = ['MRT · bus', 'Grab · taxi'];

export function nearbyContent(place: Place): NearbyContent {
  const mapLabel = place === 'Hawker centre' ? staticCopy.nearYou.place : place;
  if (FOOD_PLACES.includes(place)) {
    return {
      mapLabel,
      chipIcon: chope.context.icon,
      chipLabel: place === 'Hawker centre' ? chope.context.label : place,
      headsUp: HEADS_UP.chope,
      alsoHeard: [ALSO.tapau, ALSO.kosong],
    };
  }
  const transport = TRANSPORT_PLACES.includes(place);
  return {
    mapLabel,
    chipIcon: transport ? paiseh.context.icon : canOrNot.context.icon,
    chipLabel: place,
    headsUp: transport ? HEADS_UP.paiseh : HEADS_UP.canOrNot,
    alsoHeard: transport ? [ALSO.canOrNot, ALSO.chope] : [ALSO.paiseh, ALSO.chope],
    pinEmoji: PLACE_INFO[place].emoji,
  };
}

/** Line under the Show button, e.g. "Chope, tapau, kosong and 3 more" (Figma 11:1945). */
export function phrasePreview(place: Place): string {
  const { headsUp, alsoHeard } = nearbyContent(place);
  const names = [headsUp.title, ...alsoHeard.map((item) => item.title.toLowerCase())];
  const more = PLACE_INFO[place].phraseCount - names.length;
  return more > 0 ? `${names.join(', ')} and ${more} more` : names.join(', ');
}
