import { describe, expect, it } from 'vitest';
import { SEED_LOOKUPS, isQuestionList, newQuestion, type Question } from './domain';
import { answerMessage, answerQuestion, markSeen, progressOf } from './localAnswer';

const id = () => 'tip-1';

describe('answerQuestion', () => {
  it('adds the answer to the linked card as a tip, and says so', () => {
    const q = newQuestion('When is the queue shortest?', '', { cardId: 'chicken-rice', areaName: 'Chinatown', topic: 'food' }, 1);
    const r = answerQuestion(q, { text: 'Weekday mornings.', by: 'Mei' }, SEED_LOOKUPS, 5, id);
    expect(r.question).toMatchObject({ status: 'Added', answer: 'Weekday mornings.', answeredBy: 'Mei', answeredAt: 5 });
    expect(r.tip).toEqual({
      id: 'tip-1', cardId: 'chicken-rice', questionId: q.id, text: 'Weekday mornings.', by: 'Mei', areaName: 'Chinatown', createdAt: 5, cited: 0,
    });
    expect(r.lookups).toEqual(SEED_LOOKUPS);
    expect(answerMessage(r.outcome)).toBe('Answer added to the Hainanese chicken rice card as a local tip');
  });

  it('confirms the linked phrase by id', () => {
    const q = newQuestion('Is it rude?', '', { lookupId: 'sabo' });
    const r = answerQuestion(q, { text: 'Just teasing.' }, SEED_LOOKUPS);
    expect(r.question.status).toBe('Added');
    expect(r.question.answeredBy).toBe('A local');
    expect(r.lookups.find((l) => l.id === 'sabo')).toMatchObject({ meaning: 'Just teasing.', source: 'Confirmed by a local' });
    expect(answerMessage(r.outcome)).toBe('Answer added to “sabo” in Moments');
  });

  it('changes nothing else for a question with no link, and says so', () => {
    const q = newQuestion('Where can I buy a SIM card near Chinatown?', '', { areaName: 'Chinatown' });
    const r = answerQuestion(q, { text: 'Any 7-Eleven.' }, SEED_LOOKUPS);
    expect(r.question.status).toBe('Answered');
    expect(r.tip).toBeUndefined();
    expect(r.lookups).toEqual(SEED_LOOKUPS);
    expect(answerMessage(r.outcome)).toBe('Answer saved. It isn’t linked to a card or phrase.');
  });

  it('still finds the phrase an older question names', () => {
    const q: Question = { id: 'q', text: 'Is “chope” rude?', context: '', detail: '', status: 'Pending' };
    expect(answerQuestion(q, { text: 'No.' }, SEED_LOOKUPS).outcome).toEqual({ kind: 'phrase', lookupId: 'chope', word: 'chope' });
  });
});

describe('progress', () => {
  it('shows four steps for a linked question and three for one without a link', () => {
    const q = newQuestion('x', '', { cardId: 'laksa' });
    expect(progressOf(q, true).map((s) => s.state)).toEqual(['done', 'now', 'todo', 'todo']);
    expect(progressOf(markSeen(q, 2), true).map((s) => s.state)).toEqual(['done', 'done', 'now', 'todo']);
    expect(progressOf({ ...q, status: 'Added' }, true).map((s) => s.state)).toEqual(['done', 'done', 'done', 'done']);
    expect(progressOf({ ...q, status: 'Answered' }, false).map((s) => s.title)).toEqual(['Posted', 'Seen by a local', 'Answered']);
  });

  it('marks only a waiting question as seen', () => {
    const q = newQuestion('x', '');
    expect(markSeen(q, 9)).toMatchObject({ status: 'Seen', seenAt: 9 });
    const answered = { ...q, status: 'Answered' as const };
    expect(markSeen(answered)).toBe(answered);
  });
});

describe('stored questions', () => {
  it('accepts old records and new linked ones, and refuses a bad topic', () => {
    const old = { id: 'a', text: 't', context: '', detail: 't', status: 'Pending' };
    expect(isQuestionList([old, newQuestion('t', '', { cardId: 'laksa', topic: 'food', from: 'ask' })])).toBe(true);
    expect(isQuestionList([{ ...old, topic: 'sport' }])).toBe(false);
  });
});
