/** Serializable mechanism rules. A renderer can propose actions; only these
 * rules decide progress. There is deliberately no trusted `solved` action. */
export const QUEST_TYPES = Object.freeze(['rotate-find', 'sequence', 'align', 'slide', 'assemble', 'lock', 'jigsaw']);

const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const idsFor = quest => (Array.isArray(quest?.items) ? quest.items : [])
  .filter(item => item && typeof item.id === 'string' && item.id && item.role !== 'decoration')
  .map(item => item.id);
const unique = values => [...new Set(values)];
const itemsFor = quest => (Array.isArray(quest?.items) ? quest.items : []).filter(item => item?.role !== 'decoration');

/* A storey cannot be fitted before the one it stands on: the parts of a stacked building go up from the ground. */
const STACK = Object.freeze({'square-base': 0, arcade: 0, 'octagon-body': 1, roof: 2});
export function assembleBlocker(quest, placed, item) {
  const level = STACK[item?.anchor];
  if (!(level > 0)) return null;
  return itemsFor(quest).find(other => other.id !== item.id && STACK[other.anchor] < level && !placed.includes(other.id)) || null;
}

/* Hunt (2 Nov 2026): a stop can stack mechanisms (owner: "at least two layers"). A chain holds its layers in order;
 * only the open layer takes actions, and the next one opens when it is solved. */
const isChain = quest => quest?.type === 'chain' && Array.isArray(quest.stages) && quest.stages.length > 0;
/** A lock's code as digits: '1831' -> [1, 8, 3, 1]. */
export const lockCode = quest => String(quest?.code ?? '').replace(/\D/g, '').split('').map(Number);
/** Jigsaw pieces start turned by `turn` quarter turns; they read right at 0. */
const startTurns = quest => Object.fromEntries(itemsFor(quest).filter(item => item?.id).map(item => [item.id, ((Number.isInteger(item.turn) ? item.turn : 0) % 4 + 4) % 4]));

export function createQuestState(quest) {
  if (isChain(quest)) return {schema: 1, type: 'chain', stage: 0, stages: quest.stages.map(createQuestState)};
  return {
    schema: 1, type: quest?.type || 'rotate-find',
    found: [], sequence: [], placed: [], selected: null,
    value: 0, opened: false, attempts: 0,
    wheels: lockCode(quest).map(() => 0), cells: {}, turns: quest?.type === 'jigsaw' ? startTurns(quest) : {},
  };
}

/** The layer that is open now: its index, its mechanism and its progress. */
export function questStage(quest, progress) {
  if (!isChain(quest)) return {index: 0, total: 1, quest, progress: readState(quest, progress)};
  const state = readChain(quest, progress);
  return {index: state.stage, total: quest.stages.length, quest: quest.stages[state.stage], progress: state.stages[state.stage]};
}
function readChain(quest, progress) {
  const raw = progress?.type === 'chain' && Array.isArray(progress.stages) ? progress.stages : [];
  const stages = quest.stages.map((stage, n) => readState(stage, raw[n]));
  let stage = 0; while (stage < stages.length - 1 && isQuestSolved(quest.stages[stage], stages[stage])) stage += 1;
  return {schema: 1, type: 'chain', stage, stages};
}

export function questTarget(quest) {
  return quest?.type === 'slide'
    ? clamp(finite(quest.target) ? quest.target : 100, 0, 100)
    : ((finite(quest?.target) ? quest.target : 90) % 360 + 360) % 360;
}

export function questTolerance(quest) {
  return clamp(finite(quest?.tolerance) ? quest.tolerance : 8, 1, quest?.type === 'slide' ? 20 : 30);
}

export function questValueMatches(quest, value) {
  if (!finite(value)) return false;
  const target = questTarget(quest);
  const distance = quest?.type === 'slide'
    ? Math.abs(value - target)
    : Math.abs(((value - target + 540) % 360) - 180);
  return distance <= questTolerance(quest);
}

/** Camera yaw is in radians, normalized to [-PI, PI]. The actual renderer also
 * depth-tests the object; this second gate prevents front-view `find` actions. */
export function isQuestItemFacing(item, yaw) {
  if (!finite(yaw) || Math.abs(yaw) > Math.PI + .0001) return false;
  const normal = Array.isArray(item?.normal) ? item.normal : [0, 0, -1];
  const x = finite(normal[0]) ? normal[0] : 0;
  const z = finite(normal[2]) ? normal[2] : -1;
  const length = Math.hypot(x, z);
  if (length < .001) return false;
  return (Math.sin(yaw) * x + Math.cos(yaw) * z) / length >= .42;
}

function readState(quest, state) {
  const fresh = createQuestState(quest);
  if (!state || state.type !== fresh.type || state.schema !== 1) return fresh;
  const ids = idsFor(quest), known = id => ids.includes(id);
  return {
    ...fresh,
    found: unique(Array.isArray(state.found) ? state.found.filter(known) : []),
    sequence: Array.isArray(state.sequence) ? state.sequence.filter(known) : [],
    placed: unique(Array.isArray(state.placed) ? state.placed.filter(known) : []),
    selected: known(state.selected) ? state.selected : null,
    value: finite(state.value) ? state.value : 0,
    opened: state.opened === true,
    attempts: Number.isInteger(state.attempts) ? clamp(state.attempts, 0, 1000000) : 0,
    wheels: fresh.wheels.map((v, n) => Number.isInteger(state.wheels?.[n]) ? ((state.wheels[n] % 10) + 10) % 10 : v),
    cells: Object.fromEntries(ids.filter(id => Number.isInteger(state.cells?.[id]) && state.cells[id] >= 0 && state.cells[id] < ids.length).map(id => [id, state.cells[id]])),
    turns: {...fresh.turns, ...Object.fromEntries(ids.filter(id => Number.isInteger(state.turns?.[id])).map(id => [id, ((state.turns[id] % 4) + 4) % 4]))},
  };
}
const jigsawRight = (quest, state) => itemsFor(quest).filter(item => state.cells[item.id] === item.cell && !state.turns[item.id]).length;

export function isQuestSolved(quest, progress) {
  if (isChain(quest)) {const state = readChain(quest, progress); return quest.stages.every((stage, n) => isQuestSolved(stage, state.stages[n]));}
  if (!QUEST_TYPES.includes(quest?.type)) return false;
  const state = readState(quest, progress), ids = unique(idsFor(quest));
  if (!ids.length) return false;
  switch (quest.type) {
    case 'rotate-find': return ids.every(id => state.found.includes(id));
    case 'sequence': {
      const order = Array.isArray(quest.sequence) && quest.sequence.length ? quest.sequence : ids;
      return order.length > 0 && state.sequence.length === order.length && order.every((id, index) => state.sequence[index] === id);
    }
    case 'align': return state.opened && questValueMatches(quest, state.value);
    case 'slide': return state.opened && questValueMatches(quest, state.value) && ids.every(id => state.found.includes(id));
    case 'assemble': return ids.every(id => state.placed.includes(id));
    case 'lock': {const code = lockCode(quest); return code.length > 0 && code.every((d, n) => state.wheels[n] === d);}
    case 'jigsaw': return jigsawRight(quest, state) === ids.length;
    default: return false;
  }
}

export function reduceQuest(quest, progress, action) {
  if (isChain(quest)) {
    const chain = readChain(quest, progress), n = chain.stage, layer = quest.stages[n];
    if (isQuestSolved(quest, chain)) return {state: chain, ok: false, message: 'This mechanism is already solved.'};
    const result = reduceQuest(layer, chain.stages[n], action);
    if (!result.ok) return {state: chain, ok: false, message: result.message};
    const stages = chain.stages.map((stage, k) => k === n ? result.state : stage), next = readChain(quest, {type: 'chain', stages});
    const opened = next.stage > n;
    return {state: next, ok: true, message: opened ? layer.foundText || 'Something gives way. There is more underneath.' : result.message};
  }
  const state = readState(quest, progress);
  const reject = message => ({state, ok: false, message});
  const accept = (next, message) => ({state: next, ok: true, message});
  if (!QUEST_TYPES.includes(quest?.type)) return reject('This mechanism is not set up yet.');
  if (!action || typeof action.type !== 'string') return reject('Use a part in the scene.');
  if (isQuestSolved(quest, state)) return reject('This mechanism is already solved.');
  const ids = unique(idsFor(quest));
  if (!ids.length) return reject('This mechanism has no parts to use.');
  const item = itemsFor(quest).find(candidate => candidate.id === action.id);
  const label = item?.label || 'this part';

  if (quest.type === 'rotate-find' && action.type === 'find') {
    if (!item || state.found.includes(action.id)) return reject('Find a clue you have not opened yet.');
    if (!isQuestItemFacing(item, action.yaw)) return reject('The clue is on the other side. Rotate the building to face it, then tap.');
    const next = {...state, found: [...state.found, action.id], attempts: state.attempts + 1};
    return accept(next, isQuestSolved(quest, next) ? quest.foundText || 'The envelope opens and a new clue appears.' : `Found ${label}. Keep looking for the rest.`);
  }

  if (quest.type === 'sequence' && action.type === 'select') {
    if (!item) return reject('Choose a mark on the building.');
    const order = Array.isArray(quest.sequence) && quest.sequence.length ? quest.sequence : ids;
    const correct = order[state.sequence.length] === action.id;
    const next = {...state, sequence: correct ? [...state.sequence, action.id] : [], selected: action.id, attempts: state.attempts + 1};
    return accept(next, correct
      ? isQuestSolved(quest, next) ? quest.foundText || 'Right order. The mechanism is solved.' : `${label} confirmed. On to the next detail.`
      : 'Not quite the right order. The marks have reset; start again from the first one.');
  }

  if (quest.type === 'align' && action.type === 'align') {
    if (!finite(action.value) || action.value < 0 || action.value > 360) return reject('Turn the dial in the scene.');
    const value = action.value % 360, opened = questValueMatches(quest, value);
    return accept({...state, value, opened, attempts: state.attempts + 1}, opened
      ? quest.foundText || 'The marks line up and the latch comes loose.'
      : 'Keep turning until the pointer meets the fixed gold mark.');
  }

  if (quest.type === 'slide' && action.type === 'slide') {
    if (!finite(action.value) || action.value < 0 || action.value > 100) return reject('Slide the panel in the scene.');
    const opened = questValueMatches(quest, action.value);
    return accept({...state, value: action.value, opened, attempts: state.attempts + 1}, opened
      ? 'The panel is open. Tap the clue behind it to collect it.'
      : 'Slide the panel along the track to see what is behind it.');
  }

  if (quest.type === 'slide' && action.type === 'collect') {
    if (!item || state.found.includes(action.id)) return reject('Choose a clue you have not collected.');
    if (!state.opened || !questValueMatches(quest, state.value)) return reject('The clue is still covered. Slide the panel to the mark on the track first.');
    const next = {...state, found: [...state.found, action.id], attempts: state.attempts + 1};
    return accept(next, isQuestSolved(quest, next) ? quest.foundText || 'You took out the hidden clue.' : `Collected ${label}.`);
  }

  if (quest.type === 'assemble' && action.type === 'pick') {
    if (!item || state.placed.includes(action.id)) return reject('Choose a part you have not placed.');
    return accept({...state, selected: action.id}, `${label}: drop it on the outline it fits.`);
  }

  if (quest.type === 'assemble' && action.type === 'place') {
    if (!item || state.selected !== action.id || state.placed.includes(action.id)) return reject('Tap a part to place first.');
    if (action.slotId !== action.id) return accept({...state, attempts: state.attempts + 1}, 'That outline is a different shape. Try another one.');
    const under = assembleBlocker(quest, state.placed, item);
    if (under) return accept({...state, attempts: state.attempts + 1}, `Right outline, but it needs the ${String(under.label).toLowerCase()} under it first.`);
    const next = {...state, placed: [...state.placed, action.id], selected: null, attempts: state.attempts + 1};
    return accept(next, isQuestSolved(quest, next) ? quest.foundText || 'The last part is in place and the clue is complete.' : `${label} is in. ${ids.length - next.placed.length} to go.`);
  }

  if (quest.type === 'lock' && action.type === 'spin') {
    const code = lockCode(quest), wheel = action.wheel;
    if (!Number.isInteger(wheel) || wheel < 0 || wheel >= code.length || !Number.isInteger(action.value)) return reject('Spin one of the number wheels.');
    const wheels = state.wheels.slice(); wheels[wheel] = ((action.value % 10) + 10) % 10;
    const next = {...state, wheels, attempts: state.attempts + 1};
    return accept(next, isQuestSolved(quest, next) ? quest.foundText || 'Click. The shackle springs open.' : '');
  }

  if (quest.type === 'jigsaw' && action.type === 'pick') {
    if (!item) return reject('Pick up one of the torn pieces.');
    return accept({...state, selected: action.id}, '');
  }
  if (quest.type === 'jigsaw' && action.type === 'put') {
    const cell = action.cell;
    if (!item || !Number.isInteger(cell) || cell < -1 || cell >= ids.length) return reject('Lay the piece in a square of the frame.');
    const cells = {...state.cells};
    for (const [id, at] of Object.entries(cells)) if (at === cell && id !== action.id) delete cells[id]; // the piece there goes back to the tray
    if (cell < 0) delete cells[action.id]; else cells[action.id] = cell;
    const next = {...state, cells, selected: null, attempts: state.attempts + 1};
    return accept(next, jigsawVerdict(quest, next));
  }
  if (quest.type === 'jigsaw' && action.type === 'turn') {
    if (!item || !Number.isInteger(state.cells[action.id])) return reject('Turn a piece once it lies in the frame.');
    const next = {...state, turns: {...state.turns, [action.id]: (state.turns[action.id] + 1) % 4}, attempts: state.attempts + 1};
    return accept(next, jigsawVerdict(quest, next));
  }

  return reject('That action does not work on this mechanism.');
}

/* Nothing clicks piece by piece: the page only says how close it is once every square is filled. */
function jigsawVerdict(quest, state) {
  const all = itemsFor(quest).length, laid = Object.keys(state.cells).length;
  if (isQuestSolved(quest, state)) return quest.foundText || 'The torn edges meet. The page reads true.';
  return laid < all ? '' : `${jigsawRight(quest, state)} of ${all} sit right. The edges do not meet yet.`;
}
