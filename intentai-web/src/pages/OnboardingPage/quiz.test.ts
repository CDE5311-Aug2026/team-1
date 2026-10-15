import { expect, test } from 'vitest';
import { QUESTION_BANK, QUIZ_LENGTH, quizFor } from './quiz';

test('every topic has enough questions for a full quiz on its own', () => {
  for (const [topic, questions] of Object.entries(QUESTION_BANK)) {
    expect(questions.length, topic).toBeGreaterThanOrEqual(QUIZ_LENGTH);
    for (const q of questions) {
      expect(q.answers).toHaveLength(3);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(3);
    }
  }
});

test('the default topics start with the Figma question and alternate between topics', () => {
  const quiz = quizFor(['Work', 'Food']);
  expect(quiz).toHaveLength(QUIZ_LENGTH);
  expect(quiz.map((q) => q.topic)).toEqual(['Work', 'Food', 'Work']);
  expect(quiz[0].phrase).toBe('“Paiseh ah, can help me check this report?”');
});

test('questions come only from the chosen topics, in topic order', () => {
  expect(quizFor(['Daily life']).map((q) => q.topic)).toEqual(['Daily life', 'Daily life', 'Daily life']);
  expect(quizFor(['Getting around', 'Work', 'Food']).map((q) => q.topic)).toEqual(['Work', 'Food', 'Getting around']);
});

test('no topics falls back to Work so the quiz is never empty', () => {
  expect(quizFor([]).map((q) => q.topic)).toEqual(['Work', 'Work', 'Work']);
});

test('a quiz never repeats a question', () => {
  const ids = quizFor(['Food']).map((q) => q.id);
  expect(new Set(ids).size).toBe(ids.length);
});
