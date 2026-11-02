// POST /api/help: the Help Center. { mode: "ask", messages } gets an answer from Claude about using FindSG;
// { mode: "feedback", text, kind, page } keeps the note in a Redis list for the team. Without ANTHROPIC_API_KEY
// (ask) or a Redis store (feedback) it answers 503 and the app answers or keeps the note on the device.
import Anthropic from '@anthropic-ai/sdk';
import { APP_GUIDE } from '../../src/data/help/guide.js';
import type { RedisLike } from '../usage/store.js';

export interface HelpConfig {
  apiKey?: string;
  redis: RedisLike | null;
}

export const FEEDBACK_KEY = 'intentai:feedback';
const MAX_FEEDBACK = 5_000;
const KINDS = ['idea', 'confusing', 'bug', 'love'] as const;
type Kind = (typeof KINDS)[number];

const SYSTEM =
  'You are the Help Center inside FindSG. Answer questions about using the app in English, in two to four short ' +
  'sentences, warm and plain. Name the tab and the button to tap. Use only what the guide below says; if the app ' +
  'cannot do something or you are not sure, say so and suggest sending it as feedback from the Feedback tab here. ' +
  'For questions about Singapore itself, answer briefly and point to where the app covers it. No markdown, no lists.\n\n' +
  'The guide:\n' +
  APP_GUIDE;

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.trim().slice(0, n) : '');

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** The conversation as the app sent it: alternating turns ending with the person, short and plain. */
export function readMessages(value: unknown): { role: 'user' | 'assistant'; content: string }[] | null {
  if (!Array.isArray(value)) return null;
  const turns = value
    .slice(-12)
    .flatMap((m) => {
      if (!m || typeof m !== 'object') return [];
      const { role, text } = m as { role?: unknown; text?: unknown };
      const content = clip(text, 600);
      if (!content || (role !== 'user' && role !== 'assistant')) return [];
      return [{ role, content } as { role: 'user' | 'assistant'; content: string }];
    });
  // the API wants the first turn from the person and turns that alternate
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const merged: typeof turns = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.content += `\n${t.content}`;
    else merged.push({ ...t });
  }
  return merged.length && merged[merged.length - 1].role === 'user' ? merged : null;
}

export async function handleHelp(request: Request, cfg: HelpConfig): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const text = await request.text();
  if (text.length > 16_000) return json({ error: 'too_large' }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  if (body.mode === 'feedback') {
    const note = clip(body.text, 2_000);
    if (!note) return json({ error: 'bad_request' }, 400);
    if (!cfg.redis) return json({ error: 'not_configured' }, 503);
    const kind: Kind = KINDS.includes(body.kind as Kind) ? (body.kind as Kind) : 'idea';
    const item = { at: Date.now(), kind, page: clip(body.page, 80), text: note };
    try {
      await cfg.redis.rpush(FEEDBACK_KEY, JSON.stringify(item));
      await cfg.redis.ltrim(FEEDBACK_KEY, -MAX_FEEDBACK, -1);
      return json({ ok: true });
    } catch {
      return json({ error: 'store' }, 502);
    }
  }

  if (body.mode !== 'ask') return json({ error: 'bad_request' }, 400);
  const messages = readMessages(body.messages);
  if (!messages) return json({ error: 'bad_request' }, 400);
  if (!cfg.apiKey) return json({ error: 'not_configured' }, 503);
  const page = clip(body.page, 40);

  const client = new Anthropic({ apiKey: cfg.apiKey, timeout: 25_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2048,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system:
        (page ? `${SYSTEM}\n\nThe person is on the ${page} tab.` : SYSTEM) +
        // Version A of the user test has no Hunt tab: don't send people looking for it.
        (body.version === 'A' ? '\n\nThis copy of the app has no Hunt tab and no story hunts. Never mention them.' : ''),
      messages,
    });
    if (response.stop_reason === 'refusal')
      return json({ answer: 'I can’t help with that one. Ask me anything about using FindSG.' });
    const answer = response.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    if (!answer) return json({ error: 'empty' }, 502);
    return json({ answer: answer.slice(0, 1_200) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: 'upstream' }, 502);
    return json({ error: 'failed' }, 500);
  }
}
