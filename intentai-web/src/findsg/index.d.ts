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
export function FindSGApp(props: { top?: ReactNode }): ReactNode;
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
export const ONSITE_ROUTES: Record<string, { stops: { id: string }[] }>;
export function readOnsite(routeId: string, stops: { id: string }[], mode?: 'manual' | 'preview'): { completed: string[]; mode: string };
export function readShort(mode?: 'manual' | 'preview'): { ending: boolean; book: boolean; bottle: boolean };
export function shortCount(state: { book: boolean; bottle: boolean }): number;
