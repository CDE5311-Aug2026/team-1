import type { ReactNode } from 'react';

export interface FindSGRoute {
  area: string;
  en: string;
  title: string;
  tag: string;
  asset: string;
  no: string;
  quote: string;
}

/** The whole prototype: home (short story, story wheel, tickets), the stories and the 3D stops. `top` sits under its header. */
export function FindSGApp(props: {
  top?: ReactNode;
  /** A story's clue cards, opened by the game's Clues button (the same cards as the story's book). */
  clues?: (routeId: string, onClose: () => void) => ReactNode;
}): ReactNode;
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
export const ONSITE_ROUTES: Record<string, { stops: { id: string; reward: { title: string; text: string } }[] }>;
export function readOnsite(routeId: string, stops: { id: string }[], mode?: 'manual' | 'preview'): { completed: string[]; mode: string };
export function readShort(mode?: 'manual' | 'preview'): { ending: boolean; deduce: boolean; bottle: boolean; ticket: boolean; arrival1: boolean; arrival2: boolean };
export function shortCount(state: { deduce: boolean; bottle: boolean }): number;

/** Where the open stop stands, as the game reports it to the book's side tabs (event 'findsg:stop'). */
export interface FindSGStop {
  routeId: string;
  mode: 'manual' | 'preview';
  /** 'intro' | 'arrival' | 'observe' | 'puzzle' | 'reward' | 'ending' */
  phase: string;
  stopName: string;
  /** Decode cards in hand for this story and mode. */
  cards: number;
  /** A card can complete the stop now. */
  canDecode: boolean;
}
export function currentStop(): FindSGStop | null;
/** A side tab's command to the open stop. */
export function sendStop(type: 'race' | 'decode' | 'mode' | 'checkin'): void;
