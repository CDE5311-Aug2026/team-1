// Every story hunt, in one order everywhere (Hunt's list, the medals page, Passport, Moments, Search): the demo story
// Only One Missing, the short Beneath the Golden Dome, then the four street routes. Titles and places are the stories'
// own (src/findsg); the colour is each story's (it tints its medal).
import { assetFor, imageFor, ROUTES, SHORT_EPISODE } from '../../findsg';

export type HuntId = 'only-one-missing' | 'short' | 'telok-ayer' | 'kampong-gelam' | 'balestier' | 'civic-f1';

export interface HuntDef {
  id: HuntId;
  /** Its number in the series (on its medal). */
  roman: string;
  title: string;
  /** The small-caps line under the title. */
  en: string;
  tone: string;
  /** Where the story is set. */
  place: string;
  quote: string;
}

type RouteId = Exclude<HuntId, 'short'>;
/** 'CIVIC DISTRICT' → 'Civic District'. */
const placeOf = (id: RouteId) => ROUTES[id].en.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const route = (id: RouteId, roman: string, en: string, tone: string): HuntDef => ({
  id,
  roman,
  title: ROUTES[id].title,
  en,
  tone,
  place: placeOf(id),
  quote: ROUTES[id].quote,
});

export const HUNTS: HuntDef[] = [
  route('only-one-missing', 'I', 'THE BOTTLE BASE', '#1f3a2b'),
  {
    id: 'short',
    roman: 'II',
    title: SHORT_EPISODE.title,
    en: 'THE GLASS BENEATH THE GOLD',
    tone: '#2f4a39',
    place: SHORT_EPISODE.start.area,
    quote: 'An ordinary thing, worth a city remembering.',
  },
  route('telok-ayer', 'III', 'FROM THE OLD COASTLINE', '#6a3624'),
  route('kampong-gelam', 'IV', 'A NEIGHBOURHOOD PAPER, 1938', '#2d4767'),
  route('balestier', 'V', 'THE UNWRITTEN CREDITS', '#4a3a1f'),
  route('civic-f1', 'VI', 'THE CITY BETWEEN THE SECONDS', '#223d58'),
];

export const huntOf = (id: string | null | undefined) => HUNTS.find((h) => h.id === id) ?? null;

/** The hunt's picture: the route's concept art, or the Golden Dome's hero. */
export const huntImage = (id: HuntId) => (id === 'short' ? assetFor(SHORT_EPISODE.hero) : imageFor(id));

/** Where a hunt is played: Hunt's own page, its place in the hash (`#story/<id>`). */
export const huntHash = (id: string) => `#story/${id}`;
