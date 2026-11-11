export interface FindSGRoute {
  area: string;
  en: string;
  title: string;
  tag: string;
  asset: string;
  no: string;
  quote: string;
}

export const ROUTES: Record<string, FindSGRoute>;
export function assetFor(path: string): string;
export function imageFor(routeId: string): string;
/** The route's concept triptych (crop to its left third for an outdoor scene). */
export function gameSceneImageFor(routeId: string): string;
export function findStory(routeId: string): { title: string; stops: { name: string; address?: string }[] };
export interface FindSGStoryStop {
  id: string;
  chapterTitle: string;
  objective: string;
  scene: { speaker: string; text: string };
  discovery: { title: string; text: string };
  transition: { text: string; cta: string };
}
export const GAME_STORIES: Record<
  string,
  {
    title: string;
    kicker: string;
    logline: string;
    goalLabel: string;
    mission: string;
    playerRole: string;
    guideName: string;
    guideRole: string;
    prologue: { speaker: string; text: string }[];
    ending: { title: string; text: string; reflection: string };
    stops: FindSGStoryStop[];
  }
>;
export interface OnsiteStop {
  id: string;
  sceneLine: string;
  objective: string;
  quest: unknown;
  observation: {
    title: string;
    instruction: string;
    photoTarget: string;
    detailToFind: string;
    referenceNote: string;
    sourceUrls?: string[];
  };
  reward: { id: string; title: string; text: string };
  transition: { text: string; cta: string };
}
export const ONSITE_ROUTES: Record<string, { stops: OnsiteStop[] }>;
/** A route's save. Only on-site ('manual') play exists now; the old remote saves are never read. */
export interface OnsiteState {
  version: 1;
  routeId: string;
  mode: 'manual';
  started: boolean;
  stopIndex: number;
  completed: string[];
  endingSeen: boolean;
  stops: Record<string, { checkin: { confirmedAt?: string | null; countsAsVisit?: boolean } | null; observation: { confirmed: boolean; confirmedAt?: string | null } }>;
}
export function readOnsite(routeId: string, stops: { id: string }[], mode?: 'manual'): OnsiteState;
export function saveOnsite(state: OnsiteState): boolean;
export function emitOnsiteEvent(type: string, state: OnsiteState, stopId: string): void;
export function beginOnsite(state: OnsiteState): OnsiteState;
export function checkInOnsite(state: OnsiteState, stopId: string, stops: OnsiteStop[], options?: { mode?: 'manual'; confirmedAt?: string }): OnsiteState;
export function addOnsitePhoto(state: OnsiteState, stopId: string, metadata: { id: string; name: string; type: string; size: number; lastModified?: number; addedAt?: string }, stops: OnsiteStop[]): OnsiteState;
export function observeOnsite(state: OnsiteState, stopId: string, stops: OnsiteStop[], options?: { confirmedAt?: string }): OnsiteState;
export function operateOnsite(state: OnsiteState, stopId: string, action: unknown, stops: OnsiteStop[]): { state: OnsiteState; ok: boolean; message: string };
export function advanceOnsite(state: OnsiteState, stops: OnsiteStop[]): OnsiteState;
export function solveActions(quest: unknown): unknown[];
export function sourceName(url: string): string;

/* Beneath the Golden Dome (app/short) */
export interface ShortPlace {
  id: 'press' | 'mosque';
  name: string;
  english: string;
  address: string;
  prompt: string;
  /** What to frame in the viewfinder. */
  frame: string;
  hint: string;
  view: string;
  fact: string;
  today: string;
  sourceIds: string[];
}
export interface ShortLandmark {
  id: string;
  label: string;
  /** Position on the sketch, in percent. */
  x: number;
  y: number;
  /** Said when it is the wrong guess (the right one has none). */
  miss?: string;
}
export const SHORT_EPISODE: {
  title: string;
  hero: string;
  premise: string;
  start: { address: string; area: string; radius: string };
  letter: string;
  access: string;
  distinction: string;
  places: ShortPlace[];
  parcel: { id: string; name: string; text: string }[];
  mirrorLines: string[];
  landmarks: ShortLandmark[];
  pressAt: { x: number; y: number };
  lastLine: { malay: string; english: string };
  reply: string;
  sources: { id: string; label: string; url: string; note: string }[];
};
export function shortMap(place: ShortPlace): string;
export function shortDirections(): string;

export type ShortMode = 'manual' | 'preview';
export type ShortStep =
  | 'ticket'
  | 'letter'
  | 'arrival1'
  | 'photo1'
  | 'shutter'
  | 'parcel'
  | 'mirror'
  | 'deduce'
  | 'arrival2'
  | 'photo2'
  | 'bottle'
  | 'ending';
export type ShortState = { version: 2; episodeId: string; mode: ShortMode } & Record<ShortStep, boolean>;
export type ShortAction = Exclude<ShortStep, 'arrival1' | 'arrival2'> | 'checkin1' | 'checkin2' | 'reset';
export function readShort(mode?: ShortMode): ShortState;
export function saveShort(state: ShortState): boolean;
export function shortTransition(state: ShortState, action: ShortAction): ShortState;
export function emptyShort(mode?: ShortMode): ShortState;
export function shortCount(state: { deduce: boolean; bottle: boolean }): number;

