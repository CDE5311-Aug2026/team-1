import { expect, test } from 'vitest';
import { matchTopic } from './guide';

test('a question about playing remotely gets the Hunt answer, which says you can', () => {
  const topic = matchTopic('How do I play a story remotely?');
  expect(topic?.id).toBe('hunt');
  expect(topic?.a).toMatch(/play remotely from anywhere/);
});

test('"without" alone does not pull a question into Hunt', () => {
  expect(matchTopic('Does the app work without internet?')?.id).not.toBe('hunt');
});
