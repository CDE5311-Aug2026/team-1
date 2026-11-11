// A hunt as Hunt plays it (owner, 10 Nov 2026: one flat step at a time, no book): the opening, then one stop after
// another, then the ending. Each stop is passed by one photo of the detail it asks for, recognised by AI (recognize.ts).
// Nothing new is written here: the words are the stories' own (src/findsg, through chapters.ts), and a pass is saved in
// the game's own save (the route's `findsg-onsite-v1:<route>:manual`, the Golden Dome's `findsg-short-v2`), so the
// medals, Passport, Moments and Home read it as before.
import {
  addOnsitePhoto,
  advanceOnsite,
  beginOnsite,
  checkInOnsite,
  emitOnsiteEvent,
  GAME_STORIES,
  ONSITE_ROUTES,
  observeOnsite,
  operateOnsite,
  readOnsite,
  readShort,
  saveOnsite,
  saveShort,
  SHORT_EPISODE,
  shortMap,
  shortTransition,
  solveActions,
  type OnsiteState,
  type ShortAction,
} from '../../../findsg';
import { huntOf, type HuntId } from '../hunts';
import { chapter, shortChapter, type Film } from '../story/chapters';
import { markStory } from '../story/record';

export interface PlayStop {
  id: string;
  n: number;
  name: string;
  address: string;
  /** The guide's line as you arrive. */
  story: string;
  /** What to look for, and where to stand. */
  look: string;
  /** What the photo must show (also what the AI is asked to find). */
  target: string;
  /** Shown on request. */
  hint?: string;
  /** The clue this stop gives. */
  found: { title: string; text: string };
  /** Why the clue leads on (none after the last stop). */
  next?: string;
  map: string;
  done: boolean;
  /** Films about this stop: played only when you tap them. */
  films: Film[];
}

export interface PlayHunt {
  id: HuntId;
  title: string;
  place: string;
  kicker: string;
  logline: string;
  mission: string;
  guide: string;
  /** The opening, as lines of text. */
  opening: string[];
  ending: { title: string; text: string; reflection: string };
  stops: PlayStop[];
  started: boolean;
  /** The stop to play now (the first not passed); null when all are passed. */
  current: number | null;
  complete: boolean;
  introFilms: Film[];
  endingFilms: Film[];
}

const mapsSearch = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
/** Notes written for the old remote play ("Remote: the archive photo stands in…") are left out. */
const onSite = (s?: string) => (s && !/^remote\b/i.test(s.trim()) ? s : undefined);

function routeHunt(id: Exclude<HuntId, 'short'>): PlayHunt {
  const ch = chapter(id);
  const story = GAME_STORIES[id];
  const field = ONSITE_ROUTES[id].stops;
  const save = readOnsite(id, field, 'manual');
  const stops = ch.stops.map((s, i): PlayStop => {
    const f = field[i];
    return {
      id: s.id,
      n: s.n,
      name: s.name,
      address: s.address,
      story: f.sceneLine,
      look: f.observation.instruction,
      target: f.observation.photoTarget,
      hint: [f.observation.detailToFind, onSite(f.observation.referenceNote)].filter(Boolean).join(' '),
      found: s.discovery,
      next: i < field.length - 1 ? f.transition.text : undefined,
      map: mapsSearch(`${s.name.replace(/ · .*/, '')} ${s.address}`),
      done: save.completed.includes(s.id),
      films: s.films,
    };
  });
  const current = stops.findIndex((s) => !s.done);
  return {
    id,
    title: ch.title,
    place: huntOf(id)?.place ?? ch.area,
    kicker: ch.kicker,
    logline: ch.logline,
    mission: ch.mission,
    guide: ch.guide,
    opening: story.prologue.map((p) => p.text),
    ending: ch.ending,
    stops,
    started: save.started || save.completed.length > 0,
    current: current < 0 ? null : current,
    complete: current < 0,
    introFilms: ch.intro,
    endingFilms: ch.endingFilms,
  };
}

function shortHunt(): PlayHunt {
  const ch = shortChapter();
  const save = readShort('manual');
  const places = SHORT_EPISODE.places;
  const stops = ch.stops.map((s, i): PlayStop => {
    const p = places[i];
    // the second building stays hidden until the first clue is found (the story's own rule)
    const shown = i === 0 || save.deduce;
    return {
      id: s.id,
      n: s.n,
      name: shown ? p.name : s.name,
      address: shown ? p.address : '',
      story: shown ? p.prompt : s.objective,
      look: `${p.view}`,
      target: p.frame,
      hint: p.hint,
      found: s.discovery,
      next: i === 0 ? `In a mirror the type reads “${SHORT_EPISODE.mirrorLines.join(' / ')}”. Beneath the gold: the golden dome of ${places[1].name}.` : undefined,
      map: shortMap(p),
      done: s.done,
      films: s.films,
    };
  });
  const current = stops.findIndex((s) => !s.done);
  return {
    id: 'short',
    title: ch.title,
    place: ch.area,
    kicker: 'Short hunt',
    logline: SHORT_EPISODE.premise,
    mission: SHORT_EPISODE.premise,
    guide: ch.guide,
    opening: SHORT_EPISODE.letter.split(/\n\n+/),
    ending: ch.ending,
    stops,
    started: save.ticket,
    current: current < 0 ? null : current,
    complete: current < 0,
    introFilms: ch.intro,
    endingFilms: ch.endingFilms,
  };
}

/** The hunt to play, read fresh from its save; null for an unknown id. */
export function loadHunt(id: string): PlayHunt | null {
  const h = huntOf(id);
  if (!h) return null;
  return h.id === 'short' ? shortHunt() : routeHunt(h.id);
}

/** Begin the hunt (after its opening). */
export function startHunt(id: HuntId) {
  markStory(id, 'start');
  if (id === 'short') {
    let s = readShort('manual');
    for (const step of ['ticket', 'letter'] as const) s = shortTransition(s, step);
    saveShort(s);
    return;
  }
  const field = ONSITE_ROUTES[id].stops;
  const next = beginOnsite(readOnsite(id, field, 'manual'));
  saveOnsite(next);
  emitOnsiteEvent('story-started', next, field[next.stopIndex]?.id ?? field[0].id);
}

/** What a photo is kept as in the save: its name, type and size only (the picture itself never leaves the page). */
export interface PhotoNote {
  name: string;
  type: string;
  size: number;
  lastModified?: number;
}

/**
 * The stop's photo was recognised: check in, keep the photo's note, and solve the stop the way the game's own solver
 * does (the save replays these steps, so the stop counts everywhere). Returns the hunt as it is now.
 */
export function passStop(id: HuntId, stopId: string, photo: PhotoNote, at = new Date()): PlayHunt {
  const iso = at.toISOString();
  if (id === 'short') {
    const steps: ShortAction[] =
      stopId === 'short-press'
        ? ['checkin1', 'photo1', 'shutter', 'parcel', 'mirror', 'deduce']
        : ['checkin2', 'photo2', 'bottle', 'ending'];
    let s = readShort('manual');
    for (const step of ['ticket', 'letter', ...steps] as ShortAction[]) s = shortTransition(s, step);
    saveShort(s);
    // the Golden Dome's save keeps no check-in times, so note this one for "the hunt played last" (ShellNow)
    markStory('short', 'play', at.getTime());
    if (s.bottle) markStory('short', 'finish', at.getTime());
    return shortHunt();
  }
  const field = ONSITE_ROUTES[id].stops;
  const stop = field.find((s) => s.id === stopId);
  if (!stop) return routeHunt(id);
  let q: OnsiteState = beginOnsite(readOnsite(id, field, 'manual'));
  q = checkInOnsite(q, stopId, field, { mode: 'manual', confirmedAt: iso });
  q = addOnsitePhoto(q, stopId, { id: `photo-${at.getTime()}`, ...photo, addedAt: iso }, field);
  q = observeOnsite(q, stopId, field, { confirmedAt: iso });
  for (const action of solveActions(stop.quest)) {
    const r = operateOnsite(q, stopId, action, field);
    if (!r.ok) break;
    q = r.state;
  }
  q = advanceOnsite(q, field);
  saveOnsite(q);
  emitOnsiteEvent('checkin', q, stopId);
  const hunt = routeHunt(id);
  if (hunt.complete) markStory(id, 'finish', at.getTime());
  return hunt;
}
