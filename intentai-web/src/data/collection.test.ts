import { expect, test } from 'vitest';
import { collect, passportStats, topicProgress } from './collection';
import type { Lookup } from './domain';
import { collectedStore, deleteAllData } from './stores';

const lookup = (word: string, got?: boolean): Lookup => ({ id: word, word, meaning: 'm', source: 'Confirmed by a local', got });

test('collect adds a phrase once', () => {
  expect(collect([], 'chope')).toEqual(['chope']);
  expect(collect(['chope'], 'chope')).toEqual(['chope']);
});

test('passport counts collected phrases plus Got it lookups, once per word', () => {
  const lookups = [lookup('sabo', true), lookup('chope', true), lookup('wah, finally ah')];
  // "chope" is both a collected phrase and a Got it lookup: it counts once.
  expect(passportStats(['chope', 'tapau'], lookups, ['Work', 'Food'], 5)).toEqual({ phrases: 3, topics: 2, days: 5 });
  // Un-marking Got it takes it off again.
  expect(passportStats(['chope', 'tapau'], [lookup('sabo', false)], ['Work'], 1).phrases).toBe(2);
});

test('no onboarding topics means all four', () => {
  expect(passportStats([], [], [], 0).topics).toBe(4);
  expect(topicProgress([], ['chope']).map((t) => [t.topic, t.collected, t.total])).toEqual([
    ['Work', 0, 3],
    ['Food', 0, 3],
    ['Daily life', 1, 3],
    ['Getting around', 0, 3],
  ]);
});

test('topic progress follows the picked topics in the usual order', () => {
  expect(topicProgress(['Food', 'Work'], ['tapau', 'shiok', 'steady']).map((t) => [t.topic, t.collected])).toEqual([
    ['Work', 1],
    ['Food', 2],
  ]);
});

test('Delete all my data clears the collection', () => {
  collectedStore.set(['chope']);
  deleteAllData();
  expect(collectedStore.get()).toEqual([]);
});
