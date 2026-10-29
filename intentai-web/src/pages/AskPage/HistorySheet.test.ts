import { describe, expect, it } from 'vitest';
import type { AskThread } from '../../data/domain';
import { groupThreads, matches } from './HistorySheet';

const at = (id: string, updatedAt: number, q = id): AskThread => ({ id, title: q, turns: [{ kind: 'meaning', question: q }], createdAt: updatedAt, updatedAt });

describe('History', () => {
  it('groups by Today / Yesterday / Previous 7 days / Earlier, newest first', () => {
    const now = new Date(2026, 9, 29, 12);
    const day = 86_400_000;
    const groups = groupThreads([at('a', now.getTime() - 1000), at('b', now.getTime() - day), at('c', now.getTime() - 3 * day), at('d', now.getTime() - 30 * day), at('e', now.getTime())], now);
    expect(groups.map(([label, list]) => [label, list.map((t) => t.id)])).toEqual([
      ['Today', ['e', 'a']],
      ['Yesterday', ['b']],
      ['Previous 7 days', ['c']],
      ['Earlier chats', ['d']],
    ]);
  });

  it('searches every question in a chat', () => {
    const t: AskThread = { ...at('x', 1, 'first'), turns: [{ kind: 'meaning', question: 'first' }, { kind: 'card', question: 'Thian Hock Keng?' }] };
    expect(matches(t, 'hock')).toBe(true);
    expect(matches(t, 'laksa')).toBe(false);
    expect(matches(t, '  ')).toBe(true);
  });
});
