import {expect, test} from 'vitest';
// @ts-expect-error the game modules are untyped JS
import {ONSITE_ROUTES} from './onsite-content.js';
// @ts-expect-error the game modules are untyped JS
import {beginOnsite, blankOnsite, checkInOnsite, normalizeOnsite, observeOnsite, onsiteStatus, operateOnsite} from './onsite-state.js';
// @ts-expect-error the game modules are untyped JS
import {canRace, decodeStop, readCards, solveActions, writeCards} from './race-boost.js';

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

// A decode card (owner, 3 Nov 2026) completes a whole stop: from before check-in straight to its clue, on every stop.
test('a decode card completes every stop from before check-in', () => {
  for (const [routeId, route] of Object.entries(ONSITE_ROUTES as Record<string, {stops: any[]}>)) {
    const stops = route.stops;
    for (const mode of ['manual', 'preview']) {
      let state = blankOnsite(routeId, mode);
      for (const stop of stops) {
        expect(onsiteStatus(state, stop.id, stops), stop.id).not.toBe('reward');
        state = decodeStop(state, stop, stops);
        expect(onsiteStatus(state, stop.id, stops), `${routeId} ${mode} ${stop.id}`).toBe('reward');
        // skipped, not visited: the study's visit count must not include it, even after a reload
        const saved = normalizeOnsite(JSON.parse(JSON.stringify(state)), routeId, stops, mode);
        expect(saved.stops[stop.id].checkin).toMatchObject({method: 'decode-card', countsAsVisit: false});
        state = {...state, stopIndex: state.stopIndex + 1};
      }
    }
  }
});

test('decode cards are counted per route and mode, and an old Boost Card counts as one', () => {
  localStorage.clear();
  expect(readCards('r', 'manual')).toBe(0);
  writeCards('r', 'manual', 2);
  expect(readCards('r', 'manual')).toBe(2);
  expect(readCards('r', 'preview')).toBe(0);
  localStorage.setItem('findsg-boost:r:preview', 'ready');
  expect(readCards('r', 'preview')).toBe(1);
  localStorage.setItem('findsg-boost:r:preview', 'used');
  expect(readCards('r', 'preview')).toBe(0);
  writeCards('r', 'manual', 0);
  expect(localStorage.getItem('findsg-boost:r:manual')).toBeNull();
});
