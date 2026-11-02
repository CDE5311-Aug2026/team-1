// The prepared profile for task T4 (find a saved clue): the same for every participant and in both versions.
// Onboarding is done with a fixed profile, and one remote clue is saved: Balestier's first stop, played in remote
// mode. The save is written in the story engine's own format, which UI1 (/ui1) and UI2 both read.
// Lazy-loaded from /t4 only, so the story content stays out of the main bundle.
// @ts-expect-error the game modules are untyped JS
import { ONSITE_ROUTES } from '../../findsg/app/game/onsite-content.js';
// @ts-expect-error the game modules are untyped JS
import { beginOnsite, blankOnsite, checkInOnsite, observeOnsite, onsiteStorageKey, operateOnsite } from '../../findsg/app/game/onsite-state.js';
// @ts-expect-error the game modules are untyped JS
import { solveActions } from '../../findsg/app/game/race-boost.js';
import { finishOnboarding, profileV3Store, DEFAULT_PROFILE_V3 } from '../../data/profile/profile';
import { T4_CLUE } from './abTest';

type Stop = { id: string; quest: unknown; reward?: { title?: string } };
type Onsite = { completed: string[]; [k: string]: unknown };

/** Balestier stop 1, completed in remote mode by the engine's own solver. */
export function remoteRecord(at = new Date().toISOString()): Onsite {
  const stops = (ONSITE_ROUTES as Record<string, { stops: Stop[] }>)[T4_CLUE.route].stops;
  const stop = stops[0];
  let state = checkInOnsite(beginOnsite(blankOnsite(T4_CLUE.route, 'preview')), stop.id, stops, { mode: 'preview', confirmedAt: at });
  state = observeOnsite(state, stop.id, stops, { confirmedAt: at });
  for (const action of solveActions(stop.quest)) state = operateOnsite(state, stop.id, action, stops).state;
  return { ...state, feedback: '' } as Onsite;
}

/** The saved clue's title, read from the story content (so the facilitator's script names it exactly). */
export const clueTitle = () =>
  (ONSITE_ROUTES as Record<string, { stops: Stop[] }>)[T4_CLUE.route].stops[0].reward?.title ?? '';

/** Writes the prepared profile into a phone that was just cleared. */
export function seedT4() {
  profileV3Store.set({ ...DEFAULT_PROFILE_V3, topics: ['culture', 'landmark', 'food'] });
  finishOnboarding();
  const record = remoteRecord();
  localStorage.setItem(onsiteStorageKey(T4_CLUE.route, 'preview'), JSON.stringify(record));
  localStorage.setItem('findsg-onsite-mode:' + T4_CLUE.route, 'preview');
}
