// "Now" (user test UT03-4/5, 10 Nov 2026: "remind me what to do now"): one or two short lines on what to do next, read
// from the hunt as it is (its save, the stop's own words, the photo check). HuntPlay shows it over the dock; the app's
// shell shows a smaller one over the tab bar while a hunt is under way (ShellNow.tsx). Nothing here is invented: the
// place and the detail to photograph are the stop's own.
import { HUNTS, type HuntId } from '../hunts';
import { lastPlayedAt } from '../story/record';
import { loadHunt, type PlayHunt } from './model';

export type NowCheck = 'idle' | 'checking' | 'no-match' | 'unavailable';

export interface NowLine {
  /** The small label: "Now · Stop 1 of 2". */
  label: string;
  /** What to do, in a sentence. */
  text: string;
}

const placeName = (name: string) => name.replace(/ · .*/, '').trim();

/** Where the stop is, as you would say it: its address, else its name. */
function whereOf(hunt: PlayHunt): string {
  const stop = hunt.current == null ? null : hunt.stops[hunt.current];
  if (!stop) return '';
  return stop.address.trim() || placeName(stop.name);
}

export function stepOf(hunt: PlayHunt): string {
  if (!hunt.started) return 'Opening';
  if (hunt.complete || hunt.current == null) return 'Finished';
  return `Stop ${hunt.current + 1} of ${hunt.stops.length}`;
}

/** The line inside a hunt, for its state and the photo check under way. */
export function nowLine(hunt: PlayHunt, check: NowCheck = 'idle'): NowLine {
  const label = `Now · ${stepOf(hunt)}`;
  if (!hunt.started) return { label, text: 'Read the letter, then tap Start the hunt.' };
  const stop = hunt.current == null ? null : hunt.stops[hunt.current];
  if (hunt.complete || !stop) return { label, text: 'Hunt finished — see your medals.' };
  if (check === 'checking') return { label, text: 'Checking your photo…' };
  if (check === 'no-match')
    return { label, text: `Not recognised — reframe the detail and take another photo${stop.hint ? '; tap Hint if stuck' : ''}.` };
  if (check === 'unavailable') return { label, text: 'The photo could not be checked — tap Try again or take a new photo.' };
  const where = whereOf(hunt);
  return { label, text: `${where ? `Go to ${where}, then photograph: ` : 'Photograph: '}${stop.target}` };
}

/** The few words outside the hunt: where to go next. */
export function nextAction(hunt: PlayHunt): string {
  const where = whereOf(hunt);
  return where ? `Go to ${where} and take the photo.` : 'Take the photo of the detail.';
}

export interface HuntUnderWay {
  hunt: PlayHunt;
  /** The stop to play now (its index). */
  stop: number;
}

/** The hunt under way (started, not finished) played most recently; ties go to the first in HUNTS order. */
export function huntUnderWay(): HuntUnderWay | null {
  let best: { hunt: PlayHunt; at: number } | null = null;
  for (const h of HUNTS) {
    const hunt = loadHunt(h.id);
    if (!hunt || !hunt.started || hunt.complete || hunt.current == null) continue;
    const at = lastPlayedAt(h.id as HuntId);
    if (!best || at > best.at) best = { hunt, at };
  }
  return best ? { hunt: best.hunt, stop: best.hunt.current! } : null;
}
