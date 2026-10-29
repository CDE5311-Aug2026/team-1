import { STORY_IMAGES, type StoryImage } from '../../assets/stories';
import { FACETS, type Facet } from '../placeStories';

/** One culture card as the place page's Album Rail shows it (sleeve + info panel). */
export interface PlaceCardEntry {
  facet: Facet;
  /** Info panel kicker, upper case (the panel adds " · OPENED" once the card is opened). */
  kicker: string;
  title: string;
  blurb: string;
  /** Format line beside "Open card", e.g. "Article · Video". */
  format: string;
  /** Sleeve cover (and record label). */
  image: StoryImage;
  /** Sleeve name for screen readers, e.g. "Food card: The Spread". */
  label: string;
}

export interface StoryPlace {
  id: string;
  name: string;
  /** Line under the name, beside the pin icon. */
  location: string;
  hero: StoryImage;
  /** In FACETS order: food, monument, festival, history. */
  cards: readonly [PlaceCardEntry, PlaceCardEntry, PlaceCardEntry, PlaceCardEntry];
}

const PLACES: readonly StoryPlace[] = [
  {
    id: 'berlin-wall-fragments',
    name: 'Berlin Wall Fragments',
    location: 'Tembusu College, NUS University Town',
    hero: STORY_IMAGES.wallPanels,
    cards: [
      {
        facet: 'food',
        kicker: 'FOOD · POPULAR ON CAMPUS · 1 OF 4',
        title: 'Lunch nearby: The Spread',
        blurb: 'A café NUS students and staff favour for lunch, about 1.5 km from the Wall.',
        format: 'Article · Photos',
        image: STORY_IMAGES.spreadWindow,
        label: 'Food card: The Spread',
      },
      {
        facet: 'monument',
        kicker: 'MONUMENT · 2 OF 4',
        title: 'The Wall panels',
        blurb: 'Two 3.6 m slabs of the Berlin Wall, a gift for 50 years of German–Singapore ties.',
        format: 'Article · Video',
        image: STORY_IMAGES.wallPanels,
        label: 'Monument card: the Wall panels',
      },
      {
        facet: 'festival',
        kicker: 'FESTIVAL · 3 OF 4',
        title: 'Fall of the Wall · 9 Nov',
        blurb: 'The night the border opened in 1989, and how Berlin remembers it each year.',
        format: 'Article · Video',
        image: STORY_IMAGES.balloons2014,
        label: 'Festival card: Fall of the Wall',
      },
      {
        facet: 'history',
        kicker: 'HISTORY · 4 OF 4',
        title: 'From 1961 to a Singapore garden',
        blurb: '28 years of a divided Berlin, and how two pieces of it reached NUS.',
        format: 'Timeline · Video',
        image: STORY_IMAGES.wall1989,
        label: 'History card: 1961 to 2016',
      },
    ],
  },
  {
    id: 'chinatown',
    name: 'Chinatown',
    location: 'Chinatown & Tanjong Pagar · Niu Che Shui',
    hero: STORY_IMAGES.pagodaStreet,
    cards: [
      {
        facet: 'food',
        kicker: 'FOOD · 1 OF 4',
        title: 'Bak kwa',
        blurb: 'Sweet, smoky grilled pork slices. Chinatown queues for it for hours before Lunar New Year.',
        format: 'Article · Video',
        image: STORY_IMAGES.bakKwa,
        label: 'Food card: bak kwa',
      },
      {
        facet: 'monument',
        kicker: 'MONUMENT · 2 OF 4',
        title: 'Thian Hock Keng Temple',
        blurb: 'A Hokkien temple to Mazu, the sea goddess, on Telok Ayer Street. Built 1839 to 1842.',
        format: 'Article · Video',
        image: STORY_IMAGES.thianHockKeng,
        label: 'Monument card: Thian Hock Keng Temple',
      },
      {
        facet: 'festival',
        kicker: 'FESTIVAL · 3 OF 4',
        title: 'Lunar New Year',
        blurb: 'Fifteen days of family visits and feasting. Chinatown lights up for weeks before.',
        format: 'Article · Video',
        image: STORY_IMAGES.lanterns,
        label: 'Festival card: Lunar New Year',
      },
      {
        facet: 'history',
        kicker: 'HISTORY · 4 OF 4',
        title: 'From 1822 to today',
        blurb: 'How a plot on the 1822 town plan became Niu Che Shui, and why its shophouses survive.',
        format: 'Timeline · Video',
        image: STORY_IMAGES.plan1822,
        label: 'History card: from 1822 to today',
      },
    ],
  },
];

/** The places that have culture cards (Home "Open"), or undefined for any other id. */
export function storyPlace(id: string): StoryPlace | undefined {
  return PLACES.find((p) => p.id === id);
}

export function isFacet(value: string): value is Facet {
  return (FACETS as readonly string[]).includes(value);
}

export const STORY_PLACE_IDS: readonly string[] = PLACES.map((p) => p.id);

/** Credit strings of the given photos, each once, in first-seen order. */
export function uniqueCredits(images: readonly StoryImage[]): string[] {
  return [...new Set(images.map((i) => i.credit))];
}

/** Every photo a place page shows (hero + the four rail covers), as one deduplicated list of credits. */
export function placePhotoCredits(place: StoryPlace): string[] {
  return uniqueCredits([place.hero, ...place.cards.map((c) => c.image)]);
}

/** A card's source line plus the NEXT thumbnail's credit, unless the line already carries it. */
export function withNextCredit(source: string, credit: string): string {
  return source.includes(credit) ? source : `${source} · ${credit}`;
}
