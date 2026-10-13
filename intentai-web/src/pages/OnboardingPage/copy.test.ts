import { expect, test } from 'vitest';
import { focusLabel, parseScore, planHint, resultSummary, timeHint, topicsHint } from './copy';

test('topics hint matches Figma for the default selection', () => {
  expect(topicsHint('3 months – 1 year', ['Work', 'Food'])).toBe(
    "Since you've been here under a year, I'll start with Work and Food basics.",
  );
});

test('topics hint follows the stay length and lists three or more topics naturally', () => {
  expect(topicsHint('Less than 3 months', ['Work', 'Food', 'Daily life'])).toBe(
    "Since you've been here under 3 months, I'll start with Work, Food and Daily life basics.",
  );
  expect(topicsHint('1 – 3 years', ['Getting around'])).toBe(
    "Since you've been here a few years, I'll start with Getting around basics.",
  );
  expect(topicsHint('1 – 3 years', [])).toBe('Pick at least one topic so I know where to start.');
});

test('time hint matches Figma for the default stay length and changes with the choice', () => {
  expect(timeHint('3 months – 1 year')).toBe(
    'Nice — at this stage most people learn fastest with phrases they hear every day.',
  );
  expect(timeHint('Less than 3 months')).not.toBe(timeHint('1 – 3 years'));
});

test('result summary matches Figma at 2 of 3 and covers every score', () => {
  expect(resultSummary(2)).toBe("2 of 3 correct — you get the gist. Now let's make it sound natural.");
  expect(resultSummary(3)).toMatch(/^3 of 3 correct — /);
  expect(resultSummary(1)).toMatch(/^1 of 3 correct — /);
  expect(resultSummary(0)).toMatch(/^0 of 3 correct — /);
});

test('plan focus and hint match Figma for Work and Food', () => {
  expect(focusLabel(['Work', 'Food'])).toBe('Focus: Work & Food');
  expect(focusLabel(['Work', 'Food', 'Daily life'])).toBe('Focus: Work, Food & Daily life');
  expect(planHint(['Work', 'Food'])).toBe(
    "I'll start with office and hawker phrases, then add more slang as you level up.",
  );
  expect(planHint(['Getting around'])).toBe(
    "I'll start with MRT and bus phrases, then add more slang as you level up.",
  );
});

test('score from the URL is clamped to a whole number between 0 and 3', () => {
  expect(parseScore('2')).toBe(2);
  expect(parseScore(null)).toBe(0);
  expect(parseScore('7')).toBe(3);
  expect(parseScore('-1')).toBe(0);
  expect(parseScore('abc')).toBe(0);
  expect(parseScore('1.5')).toBe(1);
});
