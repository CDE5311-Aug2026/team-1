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
export function Bottle(props: { small?: boolean }): ReactNode;

export interface ShortPlace {
  id: 'press' | 'mosque';
  name: string;
  english: string;
  address: string;
  prompt: string;
  hint: string;
  view: string;
  fact: string;
  today: string;
  sourceIds: string[];
}
export const SHORT_EPISODE: {
  title: string;
  hero: string;
  premise: string;
  letter: string;
  access: string;
  distinction: string;
  pages: FieldBookPage[];
  places: ShortPlace[];
  sources: { id: string; label: string; url: string; note: string }[];
};
export function shortMap(place: ShortPlace): string;
export function shortDirections(): string;

export type ShortMode = 'manual' | 'preview';
export interface ShortState {
  version: 1;
  episodeId: string;
  mode: ShortMode;
  ticket: boolean;
  letter: boolean;
  arrival1: boolean;
  arch: boolean;
  book: boolean;
  travel: boolean;
  arrival2: boolean;
  band: boolean;
  parcel: boolean;
  bottle: boolean;
  ending: boolean;
}
export type ShortAction = 'ticket' | 'letter' | 'checkin1' | 'arch' | 'book' | 'travel' | 'checkin2' | 'band' | 'parcel' | 'bottle' | 'ending' | 'reset';
export function readShort(mode?: ShortMode): ShortState;
export function saveShort(state: ShortState): boolean;
export function shortTransition(state: ShortState, action: ShortAction): ShortState;
export function emptyShort(mode?: ShortMode): ShortState;
export function assetFor(path: string): string;
