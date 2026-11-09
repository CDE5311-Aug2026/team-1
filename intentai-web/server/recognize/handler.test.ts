import { expect, test } from 'vitest';
import { handleRecognize, readRequest } from './handler.js';

const body = { feature: 'The arch above the tall window', place: 'The old press, 101 Jalan Sultan', mediaType: 'image/jpeg', data: 'aGVsbG8=' };

test('reads a check-in photo request and refuses anything else', () => {
  expect(readRequest(body)).toEqual(body);
  expect(readRequest({ ...body, feature: '' })).toBeNull();
  expect(readRequest({ ...body, mediaType: 'image/gif' })).toBeNull();
  expect(readRequest({ ...body, data: 'not base64!' })).toBeNull();
  expect(readRequest(null)).toBeNull();
});

test('without a key the service says it is not configured (the game then asks to try again, never passes)', async () => {
  const res = await handleRecognize(new Request('http://x/api/recognize', { method: 'POST', body: JSON.stringify(body) }), undefined);
  expect(res.status).toBe(503);
});

test('a bad body is a 400', async () => {
  const res = await handleRecognize(new Request('http://x/api/recognize', { method: 'POST', body: '{"feature":""}' }), 'key');
  expect(res.status).toBe(400);
});
