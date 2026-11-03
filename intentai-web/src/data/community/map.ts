// Locals map (Figma C5) and the place picker in "Ask a local" (Figma C3): which questions and people sit where.
// Places are Nearby's areas and published places (read-only); people are shown at area level, never at a point.
import { isAnswered, type Lookup, type Question, type Tip } from '../domain';
import { AREAS, curatedPlace } from '../../features/nearby/catalogue';
import type { ExplorePersonalData } from '../../features/nearby/domain';
import type { LatLng } from '../../features/nearby/types';
import { SAMPLE_PEOPLE, SAMPLE_REPLIES, SAMPLE_THREADS, channelName, type SamplePerson } from './channels';
import { ownPhoto, ownTopic, type CommunitySocial, type QuestionPlace } from './social';

/** Areas a question can be pinned to (the country overview is not a place). */
export const MAP_AREAS = AREAS.filter((a) => a.id !== 'sg-overview');

export function areaById(id: string | undefined) {
  return MAP_AREAS.find((a) => a.id === id);
}

/** Short area name for sentences and labels: "Chinatown & Tanjong Pagar" → "Chinatown". */
export function shortArea(name: string): string {
  return name.split(/\s*[&,]\s*/)[0];
}

const dist2 = (a: LatLng, b: LatLng) => (a.lat - b.lat) ** 2 + ((a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)) ** 2;

/** The area whose centre is nearest a point: a dropped pin snaps to it. */
export function nearestArea(point: LatLng) {
  return MAP_AREAS.reduce((best, a) => (dist2(a.center, point) < dist2(best.center, point) ? a : best), MAP_AREAS[0]);
}

/** How far a question reaches: locals who answer in this area (the reach circle). */
export const REACH_M = 1200;

export interface PlaceOption {
  id: string;
  areaId: string;
  name: string;
  placeKey?: string;
  location: LatLng;
  /** Why it is in my list. */
  why: 'cards' | 'checked-in' | 'saved';
}

/** My places: areas I have culture cards for, then Nearby places I checked in to or saved. */
export function myPlaces(subjectIds: readonly string[], personal: ExplorePersonalData): PlaceOption[] {
  const out: PlaceOption[] = [];
  for (const id of subjectIds) {
    const a = areaById(id);
    if (a) out.push({ id: a.id, areaId: a.id, name: shortArea(a.name), location: a.center, why: 'cards' });
  }
  for (const state of personal.places) {
    if (!state.visited && !state.saved) continue;
    const place = curatedPlace(state.placeKey);
    if (!place || out.some((o) => o.placeKey === place.id)) continue;
    out.push({
      id: place.id,
      areaId: place.areaId,
      name: place.name,
      placeKey: place.id,
      location: { lat: place.coordinates.lat, lng: place.coordinates.lng },
      why: state.visited ? 'checked-in' : 'saved',
    });
  }
  return out;
}

export function placeFor(questionId: string, option: PlaceOption): QuestionPlace {
  return {
    questionId,
    areaId: option.areaId,
    name: option.name,
    lat: option.location.lat,
    lng: option.location.lng,
    ...(option.placeKey ? { placeKey: option.placeKey } : {}),
  };
}

/* ---------- Pins ---------- */

export type PinStatus = 'answered' | 'waiting' | 'needs';

export const PIN_STATUS_LABEL: Record<PinStatus, string> = {
  answered: 'Answered',
  waiting: 'Waiting',
  needs: 'Needs a local',
};

export interface MapQuestion {
  id: string;
  title: string;
  topic: string;
  areaName: string;
  photo?: string;
  location: LatLng;
  status: PinStatus;
  own: boolean;
  sample: boolean;
  author: string;
  /** Own questions: local tips added from the answer. Example threads: their replies. */
  added: number;
  addedLabel: string;
}

/** Pending → needs a local; Seen → waiting (a local has it); Answered / Added → answered. */
export function pinStatus(question: Question): PinStatus {
  if (isAnswered(question)) return 'answered';
  return question.status === 'Seen' ? 'waiting' : 'needs';
}

/** Several pins in one area sit side by side instead of on top of each other. */
function spread(list: MapQuestion[]): MapQuestion[] {
  const seen = new Map<string, number>();
  return list.map((q) => {
    const key = `${q.location.lat.toFixed(4)},${q.location.lng.toFixed(4)}`;
    const k = seen.get(key) ?? 0;
    seen.set(key, k + 1);
    return k === 0 ? q : { ...q, location: { lat: q.location.lat + 0.0022 * k, lng: q.location.lng + 0.0032 * k } };
  });
}

export function mapQuestions(
  questions: readonly Question[],
  social: CommunitySocial,
  lookups: readonly Lookup[],
  tips: readonly Tip[],
): MapQuestion[] {
  const own: MapQuestion[] = [];
  for (const q of questions) {
    const pinned = social.places.find((p) => p.questionId === q.id);
    const a = pinned ? undefined : areaById(q.areaId);
    const location = pinned ? { lat: pinned.lat, lng: pinned.lng } : a?.center;
    if (!location) continue;
    const added = tips.filter((t) => t.questionId === q.id).length;
    own.push({
      id: q.id,
      title: q.text,
      topic: ownTopic({ ...q, areaName: undefined }, lookups),
      areaName: pinned?.name ?? q.areaName ?? shortArea(a!.name),
      photo: ownPhoto(q, lookups),
      location,
      status: pinStatus(q),
      own: true,
      sample: Boolean(q.sample),
      author: 'You',
      added,
      addedLabel: `${added} local ${added === 1 ? 'tip' : 'tips'} added`,
    });
  }
  const examples: MapQuestion[] = [];
  for (const t of SAMPLE_THREADS) {
    const a = areaById(t.areaId);
    if (!a) continue;
    const replies = SAMPLE_REPLIES.filter((r) => r.threadId === t.id).length + social.replies.filter((r) => r.threadId === t.id).length;
    examples.push({
      id: t.id,
      title: t.title,
      topic: channelName(t.channel),
      areaName: shortArea(a.name),
      photo: t.photo,
      location: a.center,
      status: replies > 0 ? 'answered' : 'needs',
      own: false,
      sample: true,
      author: t.author,
      added: replies,
      addedLabel: `${replies} ${replies === 1 ? 'reply' : 'replies'}`,
    });
  }
  return spread([...own, ...examples]);
}

export function statusCounts(list: readonly MapQuestion[]): Record<PinStatus | 'all', number> {
  return {
    all: list.length,
    answered: list.filter((q) => q.status === 'answered').length,
    waiting: list.filter((q) => q.status === 'waiting').length,
    needs: list.filter((q) => q.status === 'needs').length,
  };
}

/* ---------- People ---------- */

export interface MapPerson {
  id: string;
  name: string;
  about: string;
  areaId: string;
  areaName: string;
  helpsWith: string[];
  location: LatLng;
  me: boolean;
  sample: boolean;
}


/** People sit at their area's centre (the map draws them beside the question pins): area level, never a point. */
export function mapPeople(social: CommunitySocial, local: boolean, people: readonly SamplePerson[] = SAMPLE_PEOPLE): MapPerson[] {
  const out: MapPerson[] = [];
  const me = local && social.profile.shown ? areaById(social.profile.areaId) : undefined;
  if (me) {
    out.push({
      id: 'me',
      name: 'You',
      about: 'Answering as a local',
      areaId: me.id,
      areaName: shortArea(me.name),
      helpsWith: [],
      location: me.center,
      me: true,
      sample: false,
    });
  }
  for (const p of people) {
    const a = areaById(p.areaId);
    if (!a) continue;
    out.push({
      id: p.id,
      name: p.name,
      about: p.about,
      areaId: a.id,
      areaName: shortArea(a.name),
      helpsWith: p.helpsWith.map(channelName),
      location: a.center,
      me: false,
      sample: true,
    });
  }
  return out;
}

/** What a person has written in Community, counted from the stored threads (example content for example people). */
export function personReplies(name: string): number {
  return SAMPLE_REPLIES.filter((r) => r.author === name).length;
}
