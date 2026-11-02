import {expect, test} from 'vitest';
import gameplay from '../../gameplay-data.json';
// @ts-expect-error the game modules are untyped JS
import {ONSITE_ROUTES} from './onsite-content.js';
// @ts-expect-error the game modules are untyped JS
import {LAYERS} from './quest-layers.js';
// @ts-expect-error the game modules are untyped JS
import {createQuestState, isQuestSolved, lockCode, questStage, reduceQuest} from './quest-logic.js';
// @ts-expect-error the game modules are untyped JS
import {solveActions} from './race-boost.js';

type Quest = {type: string; code?: string; items?: {id: string; text: string; cell: number; turn: number}[]; stages?: Quest[]};
const routes = Object.values(ONSITE_ROUTES as Record<string, {stops: {id: string; quest: Quest}[]}>);
const cards = Object.fromEntries((gameplay as any).routes.flatMap((r: any) => r.level_plan).map((s: any) => [s.stop_id, JSON.stringify(s)]));
const run = (quest: Quest, actions: object[]) => actions.reduce((state, action) => {
  const result = reduceQuest(quest, state, action);
  expect(result.ok, `${JSON.stringify(action)}: ${result.message}`).toBe(true);
  return result.state;
}, createQuestState(quest));

test('every stop has at least two layers, and the last stop of each hunt has three', () => {
  for (const {stops} of routes) stops.forEach((stop, n) => {
    expect(stop.quest.type, stop.id).toBe('chain');
    expect(stop.quest.stages!.length, stop.id).toBe(n === stops.length - 1 ? 3 : 2);
  });
});

test('the numbers in the locks and torn pages come from the stop’s own info card', () => {
  for (const [id, {add}] of Object.entries(LAYERS as Record<string, {add: Quest[]}>)) for (const layer of add) {
    const derived = add.length > 1 && layer.type === 'lock'; // a third-layer lock reads the page just mended
    if (layer.type === 'lock' && !derived) {
      const code = layer.code!, dayMonth = code.length === 4 && /reopened on 25 April/.test(cards[id]);
      expect(cards[id].includes(code) || dayMonth, `${id} ${code}`).toBe(true);
    }
    for (const item of layer.items || []) for (const n of item.text?.match(/\d[\d,]*/g) || []) expect(cards[id], `${id} ${n}`).toContain(n);
  }
});

test('every torn page starts scrambled: a tray order, with at least one piece turned', () => {
  for (const {add} of Object.values(LAYERS as Record<string, {add: Quest[]}>)) for (const layer of add.filter(l => l.type === 'jigsaw')) {
    const cells = layer.items!.map(item => item.cell).sort((a, b) => a - b);
    expect(cells).toEqual(layer.items!.map((_, n) => n));
    expect(layer.items!.some((item, n) => item.cell !== n)).toBe(true);
    expect(layer.items!.some(item => item.turn % 4 !== 0)).toBe(true);
  }
});

test('a torn page does not open when the pieces are only laid in the right squares', () => {
  const page = (LAYERS as any)['civic-f1-02'].add[0] as Quest;
  const laid = run(page, page.items!.map(item => ({type: 'put', id: item.id, cell: item.cell})));
  expect(isQuestSolved(page, laid)).toBe(false);
  const last = reduceQuest(page, laid, {type: 'turn', id: page.items!.find(item => item.turn)!.id});
  expect(last.message).toMatch(/of 4 sit right/);
  const turned = run(page, page.items!.flatMap(item => [{type: 'put', id: item.id, cell: item.cell}, ...Array((4 - item.turn) % 4).fill({type: 'turn', id: item.id})]));
  expect(isQuestSolved(page, turned)).toBe(true);
});

test('a piece laid on a full square sends the one there back to the tray; only laid pieces turn', () => {
  const page = (LAYERS as any)['telok-ayer-02'].add[0] as Quest, [a, b] = page.items!;
  expect(reduceQuest(page, createQuestState(page), {type: 'turn', id: a.id}).ok).toBe(false);
  const state = run(page, [{type: 'put', id: a.id, cell: 0}, {type: 'put', id: b.id, cell: 0}]);
  expect(state.cells[b.id]).toBe(0);
  expect(Number.isInteger(state.cells[a.id])).toBe(false);
});

test('a lock opens only on its number', () => {
  const lock = {type: 'lock', code: '1854', items: [{id: 'strongbox'}]} as unknown as Quest;
  expect(lockCode(lock)).toEqual([1, 8, 5, 4]);
  const near = run(lock, [1, 8, 5, 3].map((value, wheel) => ({type: 'spin', wheel, value})));
  expect(isQuestSolved(lock, near)).toBe(false);
  expect(isQuestSolved(lock, run(lock, [1, 8, 5, 4].map((value, wheel) => ({type: 'spin', wheel, value}))))).toBe(true);
});

test('a chain plays its layers in order and is solved only by the last', () => {
  const stop = routes[0].stops[0], [first, second] = stop.quest.stages!;
  let state = createQuestState(stop.quest);
  expect(questStage(stop.quest, state).index).toBe(0);
  // the lock of layer II does not answer while layer I is still shut
  expect(reduceQuest(stop.quest, state, {type: 'spin', wheel: 0, value: 1}).ok).toBe(false);
  for (const action of solveActions(first)) state = reduceQuest(stop.quest, state, action).state;
  expect(questStage(stop.quest, state).index).toBe(1);
  expect(isQuestSolved(stop.quest, state)).toBe(false);
  for (const [wheel, value] of lockCode(second).entries()) state = reduceQuest(stop.quest, state, {type: 'spin', wheel, value}).state;
  expect(isQuestSolved(stop.quest, state)).toBe(true);
});
