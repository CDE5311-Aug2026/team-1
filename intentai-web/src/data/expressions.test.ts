import { TOPICS } from './domain';
import { dailyExpressions, phraseBank, staticCopy } from './expressions';

test('with every topic (or none) Today shows the Figma three, numbered, with verbatim content', () => {
  for (const topics of [[...TOPICS], []]) {
    const three = dailyExpressions(topics);
    expect(three.map((e) => e.title)).toEqual(['Chope', 'Can or not?', 'Paiseh']);
    expect(three.map((e) => e.number)).toEqual(['01', '02', '03']);
    expect(three.map((e) => e.nodeId)).toEqual(['1:120', '1:185', '1:252']);
  }
  const [chope, canOrNot, paiseh] = dailyExpressions([]);
  expect(chope.context.label).toBe('Hawker centre · lunch');
  expect(chope.phonetic).toBe('/chohp/');
  expect(canOrNot.phonetic).toBeUndefined();
  expect(paiseh.phonetic).toBe('/pie-seh/');
});

test('every phrase has its own photo', () => {
  for (const phrase of phraseBank) expect(phrase.photo, phrase.id).toContain(`${phrase.id}-photo`);
});

test('every topic has three phrases, and ids are unique', () => {
  for (const topic of TOPICS) expect(phraseBank.filter((p) => p.topic === topic)).toHaveLength(3);
  expect(new Set(phraseBank.map((p) => p.id)).size).toBe(phraseBank.length);
});

test('a single topic fills all three slots from that topic', () => {
  for (const topic of TOPICS) {
    const three = dailyExpressions([topic]);
    expect(three).toHaveLength(3);
    expect(three.every((e) => e.topic === topic)).toBe(true);
  }
});

test('several topics are each covered before any repeats', () => {
  expect(dailyExpressions(['Work', 'Food']).map((e) => e.title)).toEqual(['Can or not?', 'Tapau', 'Steady']);
  expect(dailyExpressions(['Food', 'Getting around', 'Work']).map((e) => e.topic).sort()).toEqual([
    'Food',
    'Getting around',
    'Work',
  ]);
});

test('static copy matches the Figma content verbatim', () => {
  expect(staticCopy.greeting).toBe('Good Morning, W');
  expect(staticCopy.title).toBe("Today's three expressions, Can or cannot learn?");
  expect(staticCopy.progressLabel(0)).toBe('0 of 3 learned today');
  expect(staticCopy.progressLabel(3)).toBe('3 of 3 learned today');
  expect(staticCopy.nearYou.place).toBe('Old Airport Rd Food Centre');
  expect(staticCopy.nearYou.subtitle).toBe('3 phrases you might hear here');
  expect(staticCopy.tabs.map((t) => t.label)).toEqual(['Home', 'Ask', 'Community', 'Moments', 'My Space']);
});
