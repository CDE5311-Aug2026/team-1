import {expect, test} from 'vitest';
// @ts-expect-error the game modules are untyped JS
import {ONSITE_ROUTES} from './onsite-content.js';
// @ts-expect-error the game modules are untyped JS
import {beginOnsite, blankOnsite, checkInOnsite, observeOnsite, onsiteStatus, operateOnsite} from './onsite-state.js';
// @ts-expect-error the game modules are untyped JS
import {canRace, solveActions} from './race-boost.js';

// The race win and the Boost Card solve a puzzle by replaying the moves a player would make. Every stop on every
// route must come out solved, or a later stop could be left stuck after a race.
test('the replayed moves solve every stop on every route', () => {
  for (const [routeId, route] of Object.entries(ONSITE_ROUTES as Record<string, {stops: any[]}>)) {
    const stops = route.stops;
    let state = beginOnsite(blankOnsite(routeId, 'manual'));
    for (const stop of stops) {
      state = observeOnsite(checkInOnsite(state, stop.id, stops), stop.id, stops);
      expect(onsiteStatus(state, stop.id, stops), stop.id).toBe('puzzle');
      for (const action of solveActions(stop.quest)) {
        const result = operateOnsite(state, stop.id, action, stops);
        expect(result.ok, `${stop.id} ${JSON.stringify(action)}: ${result.message}`).toBe(true);
        state = result.state;
      }
      expect(onsiteStatus(state, stop.id, stops), stop.id).toBe('reward');
      state = {...state, stopIndex: state.stopIndex + 1};
    }
  }
});

test('every stop on every hunt can be raced for', () => {
  for (const route of Object.values(ONSITE_ROUTES as Record<string, {stops: any[]}>))
    for (const stop of route.stops) expect(canRace(stop), stop.id).toBe(true);
  expect(canRace({quest: {type: 'unknown'}})).toBe(false);
});
