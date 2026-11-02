/* Hunt (2 Nov 2026): the Marina Bay night race. At the waterfront stop of the Civic route the race can stand in for
 * the puzzle: winning it hands over that stop's clue cards and a Boost Card, which solves one later puzzle for you.
 * Both go through the ordinary puzzle actions (quest-logic has no trusted "solved" action), so saved progress replays
 * exactly as if the player had done it by hand. The card itself lives outside the replayed state, per route and mode. */
import {questTarget} from './quest-logic.js';

/** Stops where the race can stand in for the puzzle: the Esplanade waterfront faces the Marina Bay street circuit. */
export const RACE_STOPS = Object.freeze({'civic-f1-07': true});

const STACK = {'square-base': 0, arcade: 0, 'octagon-body': 1, roof: 2};
const key = (routeId, mode) => `findsg-boost:${routeId}:${mode}`;

/** 'none' | 'ready' (won, not yet used) | 'used' */
export function readBoost(routeId, mode) {
  try {return ['ready', 'used'].includes(localStorage.getItem(key(routeId, mode))) ? localStorage.getItem(key(routeId, mode)) : 'none';}
  catch {return 'none';}
}
export function writeBoost(routeId, mode, value) {
  try {if (value === 'none') localStorage.removeItem(key(routeId, mode)); else localStorage.setItem(key(routeId, mode), value);} catch { /* private mode */ }
}

/** The actions a player would take to solve this quest by hand, in an order the rules accept. */
export function solveActions(quest) {
  const items = (quest?.items || []).filter(item => item?.id && item.role !== 'decoration');
  switch (quest?.type) {
    case 'assemble':
      return [...items].sort((a, b) => (STACK[a.anchor] ?? 0) - (STACK[b.anchor] ?? 0))
        .flatMap(item => [{type: 'pick', id: item.id}, {type: 'place', id: item.id, slotId: item.id}]);
    case 'slide': return [{type: 'slide', value: questTarget(quest)}, ...items.map(item => ({type: 'collect', id: item.id}))];
    case 'align': return [{type: 'align', value: questTarget(quest)}];
    case 'sequence': return (quest.sequence?.length ? quest.sequence : items.map(item => item.id)).map(id => ({type: 'select', id}));
    case 'rotate-find': return items.map(item => {const [x = 0, , z = -1] = item.normal || [0, 0, -1]; return {type: 'find', id: item.id, yaw: Math.atan2(x, z)};});
    default: return [];
  }
}
