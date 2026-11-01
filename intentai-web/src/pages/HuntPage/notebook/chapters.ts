// The notebook's chapters: each FindSG route as the things you hold in it: the commission letter (its opening films),
// the treasure map (its stops, pinned where they really are), the card box (one discovery card per stop, each with
// the film it unlocks) and the chest (the ending). Progress is FindSG's own: a stop counts once solved, on site or
// in remote play.
import films from '../../../data/hunt/films.json';
import pins from '../../../data/hunt/stopPins.json';
import { findStory, GAME_STORIES, gameSceneImageFor, imageFor, ONSITE_ROUTES, readOnsite, readShort, ROUTES } from '../../../findsg';

export interface Film {
  id: string;
  en: string;
  src: string;
  poster: string;
  seconds: number;
}
const FILMS = films as Record<string, Film & { request: string }>;
const reel = (...ids: string[]) => ids.map((id) => FILMS[id]).filter(Boolean);

/**
 * Which film plays where. The manifests name a story beat, not a stop, so this reads each beat against the chapter it
 * belongs to (e.g. TA "first voice: tell my family I arrived" is the home-county network at Ying Fo Fui Kun, stop 2).
 */
const PLAN: Record<string, { intro: string[]; stops: Record<number, string[]>; ending: string[]; retry?: string }> = {
  'telok-ayer': {
    intro: ['TA-01'],
    stops: { 1: ['TA-09'], 2: ['TA-02'], 3: ['TA-03'], 4: ['TA-04'], 5: ['TA-05'], 6: ['TA-06', 'TA-10'], 7: ['TA-07'], 8: ['TA-08'] },
    ending: ['TA-12'],
    retry: 'TA-11',
  },
  'kampong-gelam': {
    intro: ['KG-01'],
    // 4: the printing house, then Amin's wish to go back to readers waiting; 6: later arrivals, and today's readers
    stops: { 1: ['KG-02'], 2: ['KG-03'], 3: ['KG-04'], 4: ['KG-05', 'KG-10'], 5: ['KG-06'], 6: ['KG-07', 'KG-11'], 7: ['KG-08'] },
    ending: ['KG-12'],
    retry: 'KG-09',
  },
  balestier: {
    intro: ['BA-01'],
    // 1: the wayang stage, heard before seen; 4: two linked builders, where the credits' partnership begins
    stops: { 1: ['BA-09'], 2: ['BA-02'], 3: ['BA-03'], 4: ['BA-04', 'BA-10'], 5: ['BA-05'], 6: ['BA-06'], 7: ['BA-07'] },
    ending: ['BA-08', 'BA-12'],
    retry: 'BA-11',
  },
  'civic-f1': {
    intro: ['CV-01'],
    stops: { 1: ['CV-10'], 2: ['CV-02'], 3: ['CV-03'], 4: ['CV-04'], 5: ['CV-05'], 6: ['CV-06'], 7: ['CV-07'], 8: ['CV-08'] },
    ending: ['CV-12'],
    retry: 'CV-09',
  },
};
/** The short story Beneath the Golden Dome: its opening reel, and what its stops add. */
export const SHORT_FILMS = {
  opening: reel('GS-01', 'GS-02', 'GS-11', 'FX-03'),
  stops: [reel('GS-03', 'GS-04', 'GS-05', 'GS-06'), reel('GS-10', 'GS-07')],
  ending: reel('BR-01', 'GS-08', 'GS-12', 'FX-01'),
};

export const CHAPTER_ORDER = ['telok-ayer', 'kampong-gelam', 'balestier', 'civic-f1'] as const;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export interface ChapterStop {
  id: string;
  n: number;
  name: string;
  address: string;
  title: string;
  objective: string;
  discovery: { title: string; text: string };
  pin: { lat: number; lng: number; approx: boolean } | null;
  done: boolean;
  films: Film[];
}
export interface Chapter {
  routeId: string;
  roman: string;
  area: string;
  en: string;
  title: string;
  kicker: string;
  logline: string;
  mission: string;
  role: string;
  guide: string;
  guideRole: string;
  prologue: { speaker: string; text: string }[];
  goal: string;
  ending: { title: string; text: string; reflection: string };
  image: string;
  scene: string;
  stops: ChapterStop[];
  solved: number;
  complete: boolean;
  intro: Film[];
  endingFilms: Film[];
  /** For a card you are stuck on: the route's retry film, then the general hint. */
  hint: Film[];
}

const PINS = (pins as { stops: Record<string, { lat: number; lng: number; pin: string }> }).stops;

function solvedIds(routeId: string) {
  const stops = ONSITE_ROUTES[routeId].stops;
  return new Set([...readOnsite(routeId, stops, 'manual').completed, ...readOnsite(routeId, stops, 'preview').completed]);
}

export function chapter(routeId: string, i = CHAPTER_ORDER.indexOf(routeId as never)): Chapter {
  const story = GAME_STORIES[routeId];
  const places = findStory(routeId).stops;
  const plan = PLAN[routeId];
  const solved = solvedIds(routeId);
  const stops = story.stops.map((s, k) => {
    const p = PINS[s.id];
    return {
      id: s.id,
      n: k + 1,
      name: places[k]?.name ?? s.chapterTitle,
      address: places[k]?.address ?? '',
      title: s.chapterTitle,
      objective: s.objective,
      discovery: s.discovery,
      pin: p ? { lat: p.lat, lng: p.lng, approx: p.pin === 'approx' } : null,
      done: solved.has(s.id),
      films: reel(...(plan.stops[k + 1] ?? [])),
    };
  });
  const n = stops.filter((s) => s.done).length;
  return {
    routeId,
    // the prologue is Volume I on the shelf, so the routes are II to V: one number for a story everywhere
    roman: ROMAN[i + 1] ?? String(i + 2),
    area: ROUTES[routeId].area,
    en: ROUTES[routeId].en,
    title: story.title,
    kicker: story.kicker,
    logline: story.logline,
    mission: story.mission,
    role: story.playerRole,
    guide: story.guideName,
    guideRole: story.guideRole,
    prologue: story.prologue,
    goal: story.goalLabel,
    ending: story.ending,
    image: imageFor(routeId),
    scene: gameSceneImageFor(routeId),
    stops,
    solved: n,
    complete: n === stops.length,
    intro: reel(...plan.intro),
    // every chest closes on the same reward: the page no longer holds only buildings
    endingFilms: plan.ending.length ? reel(...plan.ending, 'FX-02') : [],
    hint: reel(...(plan.retry ? [plan.retry] : []), 'BR-02'),
  };
}
export const chapters = () => CHAPTER_ORDER.map((id, i) => chapter(id, i));

export function shortProgress() {
  const s = readShort('manual'),
    p = readShort('preview');
  return { book: s.book || p.book, bottle: s.bottle || p.bottle, ending: s.ending || p.ending };
}
export const SHORT_PINS = { press: PINS['short-press'], mosque: PINS['short-mosque'] };

/** What a stop's "go" button says: stops are played in order, so a later stop waits for the next one. */
export function goLabel(ch: Chapter, stop: ChapterStop): string {
  if (stop.done) return 'See its clue card';
  const next = ch.stops.find((s) => !s.done);
  return !next || next.id === stop.id ? 'Go to this stop' : `Go to stop ${next.n} first`;
}
