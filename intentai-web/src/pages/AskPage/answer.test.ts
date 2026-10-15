import { describe, expect, test } from 'vitest';
import { PLACES } from '../../data/domain';
import {
  ASK_CONTEXTS,
  DEFAULT_CONTEXT,
  answerText,
  askContextForPlace,
  contextFor,
  explain,
  findPhrase,
  inSentence,
} from './answer';

test('every Nearby place maps to an Ask context, so the handoff never falls back silently', () => {
  const labels = ASK_CONTEXTS.map((context) => context.label);
  for (const place of PLACES) expect(labels).toContain(askContextForPlace(place));
  expect(contextFor(askContextForPlace('Office')).who).toBe('Your colleague');
  expect(askContextForPlace('Kopitiam')).toBe('Hawker centre · lunch');
  expect(askContextForPlace('Grab · taxi')).toBe('MRT · commute');
});

describe('findPhrase', () => {
  test.each([
    ['What does chope mean?', 'chope'],
    ['My boss said "can or not?"', 'can-or-not'],
    ['What does PAISEH mean?', 'paiseh'],
    ['kena sabo lah', 'sabo'],
  ])('recognises %s', (text, id) => {
    expect(findPhrase(text)?.id).toBe(id);
  });

  test('picks the phrase mentioned first', () => {
    expect(findPhrase('paiseh, can I chope this seat?')?.id).toBe('paiseh');
  });

  test('returns undefined for a phrase it does not know', () => {
    expect(findPhrase('What does shiok mean?')).toBeUndefined();
  });
});

describe('explain', () => {
  test('reproduces the Figma answer for chope in a classmates group chat', () => {
    const answer = explain('My classmates said “can help me chope a seat?” What does chope mean?', DEFAULT_CONTEXT);
    expect(answer.phraseId).toBe('chope');
    expect(answerText(answer)).toBe(
      '“Chope” is Singlish for reserving a seat — usually at a hawker centre, by leaving a tissue packet on the table.\n\n' +
        'Your classmate is asking you to save a seat for them.',
    );
  });

  test('explains the phrase in the setting where it was heard', () => {
    expect(answerText(explain('What does paiseh mean?', 'Office · work'))).toMatch(/Your colleague/);
    expect(answerText(explain('What does paiseh mean?', 'MRT · commute'))).toMatch(/other commuter/);
  });

  test('covers sabo with a tone warning', () => {
    const text = answerText(explain('Did she sabo me?', 'Office · work'));
    expect(text).toMatch(/^“Sabo” is Singlish/);
    expect(text).toMatch(/tone/i);
  });

  test('says honestly when it cannot explain a phrase', () => {
    const answer = explain('What does shiok mean?', DEFAULT_CONTEXT);
    expect(answer.phraseId).toBeUndefined();
    expect(answerText(answer)).toMatch(/chope, can or not, paiseh and sabo/);
  });
});

test('inSentence gives the phrase example', () => {
  const answer = inSentence(findPhrase('chope')!);
  expect(answerText(answer)).toBe('“Chope” in a sentence:\n\n“I chope a table first, you go order.”');
});

test('contextFor falls back to the default context and every context has an icon and a speaker', () => {
  expect(contextFor('nowhere').label).toBe(DEFAULT_CONTEXT);
  for (const context of ASK_CONTEXTS) {
    expect(context.icon).not.toBe('');
    expect(context.who).toMatch(/^[A-Z]/);
  }
});
