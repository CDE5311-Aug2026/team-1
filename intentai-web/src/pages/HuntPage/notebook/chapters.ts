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

/**
 * What each clip says on screen, where the imported line was too vague to follow. A clip is cut to one beat: who is
 * speaking, and what it means for the stop it plays at. Lines from the guide carry the guide's name; the people in the
 * letter, the paper or the film are named by their place in the story.
 */
const CAPTION: Record<string, string> = {
  // Beneath the Golden Dome
  'GS-01': 'Ah Ning: I make a one-page paper about this street. One line in it was never printed.',
  'GS-02': 'Ah Ning: Take this book. It starts at No. 101. The rest you work out on the street.',
  'GS-03': 'Look up: the arch above the tall window.',
  'GS-05': 'The 1950s: Yusof set type at this press. His last line stayed hidden.',
  'FX-04': 'Beneath the gold: follow the dome.',
  'FX-01': 'The same dark glass as the disc in your parcel.',
  'GS-10': '1928 to 1932: people with little money gave glass bottles for the rebuilt mosque.',
  'GS-07': 'Ah Ning: Everyone sees the gold. The glass is everyone who gave.',
  'GS-08': 'Ah Ning: Yusof’s line, printed at last. By the many.',
  // A Letter in Three Hands
  'TA-01': 'Lan: This family letter is in three hands, and its pages are jumbled.',
  'TA-09': 'Lan: The address is the same. It is the sea that has moved.',
  'TA-02': 'The first hand: “Tell my family I have arrived.”',
  'TA-03': 'The first hand: more than one family helped this letter travel.',
  'TA-04': 'Lan: Someone else can help you keep a page.',
  'TA-05': 'The first hand: “Only after arriving could I say I was safe.”',
  'TA-06': 'The second hand: “This time, I will write it myself.”',
  'TA-07': 'The third hand: “Someone gave us shelter, and this page survived.”',
  'TA-08': 'Lan: Three hands, each in its own time. Now the letter reads.',
  'TA-12': 'Lan: Now we can help someone else keep a page.',
  'TA-11': 'Lan: Keep the evidence. Look again at what kind of time it describes.',
  // Finish the Street Paper
  'KG-01': 'Ming, 1938: My little paper still has seven blank slots.',
  'KG-02': 'Ming: The travellers have gone. The street still remembers them.',
  'KG-03': 'Ming: A second homecoming deserves a place on the page.',
  'KG-04': 'Ming: The half you read is the half I was missing.',
  'KG-05': 'Ming: The building has a new use. Its stories are still here.',
  'KG-06': 'Ming: Print lets one person’s words reach another.',
  'KG-07': 'Ming: The date isn’t wrong. My story just hadn’t reached this place.',
  'KG-08': 'Ming: This time, the front page belongs to everyone who shaped the street.',
  'KG-12': 'Ming: I’ll take this edition back to 1938. Keep looking for me.',
  'KG-09': 'Ming: We can set that line again. Take your time.',
  // Write Them Back into the Credits
  'BA-01': 'Mariam: My film’s credits list only buildings. Help me add the people.',
  'BA-09': 'Mariam: Before the building, listen for the people who were here.',
  'BA-02': 'Mariam: The building has a name. The people who made it deserve theirs.',
  'BA-03': 'Mariam: A small shop is rarely built by one person alone.',
  'BA-04': 'Mariam: Frame it a little wider, and another person enters the story.',
  'BA-05': 'Mariam: Some things that keep a street alive have no price.',
  'BA-06': 'Mariam: The evidence was not wrong. I assumed it was one story.',
  'BA-07': 'Mariam turns the camera on her own crew: the people behind it stay in the frame.',
  'BA-08': 'Mariam: The credits have people at last.',
  'BA-11': 'Mariam: First ask: the institution, the move, or this building?',
  // The Missing Line
  'CV-01': 'Heng: The buildings remain. The guidebook lost the people.',
  'CV-02': 'Heng: One label cannot hold a whole home.',
  'CV-03': 'Heng: Its place changed. Its story still belongs here.',
  'CV-04': 'Heng: Find a shared reference before judging the difference.',
  'CV-05': 'Heng: The gift came before the memorial.',
  'CV-06': 'Heng: A new name does not erase an earlier life.',
  'CV-07': 'A stranger hands Heng the last card: a person, not just a date.',
  'CV-08': 'Heng: Time belongs to those who helped this city, too.',
  'CV-12': 'Heng: The guide is whole again. The next thing worth keeping is yours to find.',
  'CV-09': 'Heng: Perhaps two different events were mistaken for one.',
};
const reel = (...ids: string[]) => ids.flatMap((id) => (FILMS[id] ? [{ ...FILMS[id], en: CAPTION[id] ?? FILMS[id].en }] : []));

/**
 * Which film plays where. The manifests name a story beat, not a stop, so this reads each beat against the chapter it
 * belongs to (e.g. TA "first voice: tell my family I arrived" is the home-county network at Ying Fo Fui Kun, stop 2).
 * One clip a beat: a second clip that only repeated the first, or brought in someone the story never introduces, is cut.
 */
const PLAN: Record<string, { intro: string[]; stops: Record<number, string[]>; ending: string[]; retry?: string }> = {
  'telok-ayer': {
    intro: ['TA-01'],
    stops: { 1: ['TA-09'], 2: ['TA-02'], 3: ['TA-03'], 4: ['TA-04'], 5: ['TA-05'], 6: ['TA-06'], 7: ['TA-07'], 8: ['TA-08'] },
    ending: ['TA-12'],
    retry: 'TA-11',
  },
  'kampong-gelam': {
    intro: ['KG-01'],
    stops: { 1: ['KG-02'], 2: ['KG-03'], 3: ['KG-04'], 4: ['KG-05'], 5: ['KG-06'], 6: ['KG-07'], 7: ['KG-08'] },
    ending: ['KG-12'],
    retry: 'KG-09',
  },
  balestier: {
    intro: ['BA-01'],
    stops: { 1: ['BA-09'], 2: ['BA-02'], 3: ['BA-03'], 4: ['BA-04'], 5: ['BA-05'], 6: ['BA-06'], 7: ['BA-07'] },
    ending: ['BA-08'],
    retry: 'BA-11',
  },
  'civic-f1': {
    intro: ['CV-01'],
    stops: { 2: ['CV-02'], 3: ['CV-03'], 4: ['CV-04'], 5: ['CV-05'], 6: ['CV-06'], 7: ['CV-07'], 8: ['CV-08'] },
    ending: ['CV-12'],
    retry: 'CV-09',
  },
};
/** Beneath the Golden Dome: one short film at each turn of the story, never one that gives away what comes next. */
export const SHORT_FILMS = {
  /** After the pass is torn: who Ah Ning is, and that the book is yours. */
  opening: reel('GS-01', 'GS-02'),
  /** Stamped at No. 101: look up, at the arch. */
  arrival: reel('GS-03'),
  /** The parcel found behind the shutter: who hid it, and when. */
  found: reel('GS-05'),
  /** The clue worked out: the walk to the dome. */
  passage: reel('FX-04'),
  /** The band photographed: the disc in the parcel is the same glass. */
  glass: reel('FX-01'),
  /** The glass set: who gave the bottles, and the line printed at last. */
  ending: reel('GS-10', 'GS-07', 'GS-08'),
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
    endingFilms: reel(...plan.ending),
    hint: reel(...(plan.retry ? [plan.retry] : [])),
  };
}
export const chapters = () => CHAPTER_ORDER.map((id, i) => chapter(id, i));

export function shortProgress() {
  const s = readShort('manual'),
    p = readShort('preview');
  // deduce: the first stop's clue is worked out, which is also when the second building may be shown
  return { deduce: s.deduce || p.deduce, bottle: s.bottle || p.bottle, ending: s.ending || p.ending };
}
export const SHORT_PINS = { press: PINS['short-press'], mosque: PINS['short-mosque'] };

/** What a stop's "go" button says: stops are played in order, so a later stop waits for the next one. */
export function goLabel(ch: Chapter, stop: ChapterStop): string {
  if (stop.done) return 'See its clue card';
  const next = ch.stops.find((s) => !s.done);
  return !next || next.id === stop.id ? 'Go to this stop' : `Go to stop ${next.n} first`;
}
