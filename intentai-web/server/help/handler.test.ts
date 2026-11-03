import { describe, expect, test } from 'vitest';
import { matchTopic } from '../../src/data/help/guide.js';
import { FEEDBACK_KEY, handleHelp, readMessages } from './handler.js';
import type { RedisLike } from '../usage/store.js';

const post = (body: unknown) =>
  new Request('http://localhost/api/help', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

function fakeRedis() {
  const lists: Record<string, string[]> = {};
  const redis: RedisLike = {
    rpush: async (key, ...values) => void (lists[key] = [...(lists[key] ?? []), ...values]),
    ltrim: async () => undefined,
    lrange: async (key) => lists[key] ?? [],
    del: async (key) => void delete lists[key],
  };
  return { redis, lists };
}

describe('help', () => {
  test('the guide matches common questions to their topic', () => {
    expect(matchTopic('how do I check in at a temple?')?.id).toBe('checkin');
    expect(matchTopic('Can I post my day to WeChat?')?.id).toBe('share');
    expect(matchTopic('the 3D puzzle in the story')?.id).toBe('hunt');
    expect(matchTopic('banana')).toBeNull();
  });

  test('a conversation starts with the person, alternates and ends with them', () => {
    expect(
      readMessages([
        { role: 'assistant', text: 'hello' },
        { role: 'user', text: 'a' },
        { role: 'user', text: 'b' },
        { role: 'assistant', text: 'c' },
        { role: 'user', text: 'd' },
      ]),
    ).toEqual([
      { role: 'user', content: 'a\nb' },
      { role: 'assistant', content: 'c' },
      { role: 'user', content: 'd' },
    ]);
    expect(readMessages([{ role: 'assistant', text: 'only me' }])).toBeNull();
    expect(readMessages('nope')).toBeNull();
  });

  test('ask without a key says so, so the app answers on the device', async () => {
    const res = await handleHelp(post({ mode: 'ask', messages: [{ role: 'user', text: 'hi' }] }), { redis: null });
    expect(res.status).toBe(503);
  });

  test('feedback is kept in its own list, with only the fields it needs', async () => {
    const { redis, lists } = fakeRedis();
    const res = await handleHelp(post({ mode: 'feedback', kind: 'bug', page: 'Hunt', text: '  The map froze  ', extra: 'x' }), { redis });
    expect(res.status).toBe(200);
    const saved = JSON.parse(lists[FEEDBACK_KEY][0]);
    expect(saved).toMatchObject({ kind: 'bug', page: 'Hunt', text: 'The map froze' });
    expect(saved).not.toHaveProperty('extra');
  });

  test('feedback without a store or without words is refused', async () => {
    expect((await handleHelp(post({ mode: 'feedback', text: 'hi' }), { redis: null })).status).toBe(503);
    expect((await handleHelp(post({ mode: 'feedback', text: '   ' }), fakeRedis())).status).toBe(400);
  });
});
