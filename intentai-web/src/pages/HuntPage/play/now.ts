// "Now" (user test UT03-4/5, 10 Nov 2026: "remind me what to do now"): one or two short lines on what to do next, read
// from the hunt as it is (its save, the stop's own words, the photo check). HuntPlay shows it over the dock. Nothing here
// is invented: the place and the detail to photograph are the stop's own.
import type { PlayHunt } from './model';

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
