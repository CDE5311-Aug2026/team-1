import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';

export interface TearTicketHandle {
  tear(): void;
}
export const TearTicket: ForwardRefExoticComponent<
  {
    width?: number;
    height?: number;
    stubSize?: number;
    radius?: number;
    holes?: number;
    holeSize?: number;
    roughness?: number;
    tearAngle?: number;
    stretch?: number;
    resistance?: number;
    rotate?: number;
    tiltMax?: number;
    background?: string;
    color?: string;
    stubBackground?: string;
    borderColor?: string;
    reducedMotion?: boolean;
    onTear?(): void;
    ariaLabel?: string;
    stub?: ReactNode;
    children?: ReactNode;
  } & RefAttributes<TearTicketHandle>
>;
export function PaperObject(props: {
  kind?: 'envelope' | 'book' | 'parcel' | 'tear';
  title?: string;
  subtitle?: string;
  folio?: string;
  reducedMotion?: boolean;
  initialOpen?: boolean;
  onOpen?(): void;
  children?: ReactNode;
}): ReactNode;
export interface FieldBookPage {
  label: string;
  title: string;
  body: string;
}
export function FieldBook(props: {
  pages?: FieldBookPage[];
  title?: string;
  subtitle?: string;
  folio?: string;
  reducedMotion?: boolean;
  initialOpen?: boolean;
  onOpen?(): void;
  onPageChange?(i: number): void;
  onFinish?(): void;
}): ReactNode;
export function ShortScene(props: {
  kind?: 'press' | 'mosque';
  enabled?: boolean;
  inspected?: boolean;
  canPlace?: boolean;
  placed?: boolean;
  reducedMotion?: boolean;
  onInspect?(feature: string): void;
  onPlace?(): void;
  onReady?(): void;
}): ReactNode;

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
export function assetFor(path: string): string;
