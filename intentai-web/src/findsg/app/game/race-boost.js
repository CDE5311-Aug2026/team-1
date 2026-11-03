/* Hunt (2 Nov 2026): the Marina Bay night race. On every hunt the race can stand in for any puzzle (owner: "every hunt
 * can run the race as a boost"). 3 Nov 2026 (owner): the race now wins a decode card (解密卡), and a card completes a whole
 * stop for you: check-in, the look around and the mechanism, straight to the clue. Cards are kept per route and mode.
 * A card goes through the ordinary actions (quest-logic has no trusted "solved" action), so saved progress replays
 * exactly as if the player had done it by hand. The cards themselves live outside the replayed state. */
import {questTarget, lockCode} from './quest-logic.js';
import {beginOnsite, checkInOnsite, observeOnsite, operateOnsite, onsiteStatus} from './onsite-state.js';

/** Whether the race can stand in for this stop's puzzle: any puzzle a win can solve by replaying the player's moves. */
export const canRace = stop => solveActions(stop?.quest).length > 0;

const STACK = {'square-base': 0, arcade: 0, 'octagon-body': 1, roof: 2};
const key = (routeId, mode) => `findsg-boost:${routeId}:${mode}`;

/** How many decode cards are in hand. (The old single Boost Card was 'ready' or 'used': a ready one counts as one.) */
export function readCards(routeId, mode) {
  try {
    const v = localStorage.getItem(key(routeId, mode));
    if (v === 'ready') return 1;
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? Math.min(n, 99) : 0;
  } catch {return 0;}
}
export function writeCards(routeId, mode, n) {
  try {if (n > 0) localStorage.setItem(key(routeId, mode), String(n)); else localStorage.removeItem(key(routeId, mode));} catch { /* private mode */ }
}

/** The actions a player would take to solve this quest by hand, in an order the rules accept. */
export function solveActions(quest) {
  if (quest?.type === 'chain') return (quest.stages || []).flatMap(solveActions);
  const items = (quest?.items || []).filter(item => item?.id && item.role !== 'decoration');
  switch (quest?.type) {
    case 'assemble':
      return [...items].sort((a, b) => (STACK[a.anchor] ?? 0) - (STACK[b.anchor] ?? 0))
        .flatMap(item => [{type: 'pick', id: item.id}, {type: 'place', id: item.id, slotId: item.id}]);
    case 'slide': return [{type: 'slide', value: questTarget(quest)}, ...items.map(item => ({type: 'collect', id: item.id}))];
    case 'align': return [{type: 'align', value: questTarget(quest)}];
    case 'sequence': return (quest.sequence?.length ? quest.sequence : items.map(item => item.id)).map(id => ({type: 'select', id}));
    case 'rotate-find': return items.map(item => {const [x = 0, , z = -1] = item.normal || [0, 0, -1]; return {type: 'find', id: item.id, yaw: Math.atan2(x, z)};});
    case 'lock': return lockCode(quest).map((value, wheel) => ({type: 'spin', wheel, value}));
    case 'prop': return [{type: 'answer', id: quest.answer}];
    case 'jigsaw': return items.flatMap(item => [{type: 'put', id: item.id, cell: item.cell},
      ...Array.from({length: ((4 - (item.turn || 0)) % 4 + 4) % 4}, () => ({type: 'turn', id: item.id}))]);
    default: return [];
  }
}

/** A decode card on this stop: from wherever it stands (not checked in, looking around, mid-puzzle) to its clue, through
 * the same check-in, observation and moves a player would make. Returns the state unchanged if the stop is not open. */
export function decodeStop(state, stop, stops) {
  let q = state.started ? state : beginOnsite(state);
  const at = new Date().toISOString(), status = onsiteStatus(q, stop.id, stops);
  if (!['arrival', 'observe', 'puzzle'].includes(status)) return state;
  if (!q.stops[stop.id]?.checkin) q = checkInOnsite(q, stop.id, stops, {mode: q.mode, confirmedAt: at, method: 'decode-card'});
  if (!q.stops[stop.id]?.observation?.confirmed) q = observeOnsite(q, stop.id, stops, {confirmedAt: at});
  for (const a of solveActions(stop.quest)) {const r = operateOnsite(q, stop.id, a, stops); if (!r.ok) break; q = r.state;}
  return onsiteStatus(q, stop.id, stops) === 'reward' ? q : state;
}
