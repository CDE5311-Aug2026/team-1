// What the Add context picker offers: worked out from the stores on every open, never stored.
import type { Insight, Lookup, Question, Tip } from '../../data/domain';
import type { CommunitySocial } from '../../data/community/social';
import { SAMPLE_REPLIES, SAMPLE_THREADS, channelName, sampleThread } from '../../data/community/channels';
import { collectedItems } from '../../data/moments/moments';
import type { ContextItem, PickerTab } from './Attachments';
import { SUBJECTS, cardById, subjectOfCard, suggestionFor } from './cards';

export interface ContextInput {
  opened: readonly string[];
  tips: readonly Tip[];
  insights: readonly Insight[];
  lookups: readonly Lookup[];
  questions: readonly Question[];
  social: CommunitySocial;
}

const short = (text: string, n = 90) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);

function cardItem(cardId: string, key = `card:${cardId}`, hint?: string): ContextItem | undefined {
  const card = cardById(cardId);
  const subject = subjectOfCard(cardId);
  if (!card || !subject) return undefined;
  const ask = suggestionFor(card, subject).question;
  return { key, kind: 'card', label: card.article.title, cardId, hint: hint ?? `${subject.short} · ${ask}`, ask };
}

const phraseItem = (word: string, hint?: string, key = `phrase:${word.toLowerCase()}`): ContextItem => ({
  key,
  kind: 'phrase',
  label: word,
  phrase: word,
  hint,
  ask: `What does “${word}” mean?`,
});

function questionItem(q: Question): ContextItem {
  return { key: `question:${q.id}`, kind: 'question', label: q.text, title: q.text, body: [q.context, q.detail].filter(Boolean).join('\n'), hint: q.answer ? `Answered: ${short(q.answer)}` : q.status, ask: q.text };
}

function threadItem(id: string): ContextItem | undefined {
  const t = sampleThread(id);
  if (!t) return undefined;
  return { key: `thread:${t.id}`, kind: 'thread', label: t.title, title: t.title, body: t.body, hint: `${channelName(t.channel)} · ${short(t.body)}`, ask: t.title };
}

const present = <T,>(x: T | undefined): x is T => x !== undefined;

export function contextLists(input: ContextInput): Record<PickerTab, ContextItem[]> {
  const hints = SUBJECTS.flatMap((s) => s.cards.map((c) => c.article.id))
    .filter((id, i, all) => all.indexOf(id) === i)
    .map((id) => cardItem(id))
    .filter(present);

  const moments = collectedItems({ opened: input.opened, tips: input.tips, insights: input.insights, lookups: input.lookups, todaysThree: [], conversations: input.social.saved })
    .map((item): ContextItem | undefined => {
      switch (item.kind) {
        case 'card':
          return cardItem(item.card.article.id);
        case 'tip':
          return cardItem(item.tip.cardId, `tip:${item.tip.id}`, `Tip from ${item.tip.by}: ${short(item.tip.text)}`);
        case 'insight':
          if (item.insight.cardId) return cardItem(item.insight.cardId, `insight:${item.insight.id}`, `Saved answer · ${short(item.insight.summary)}`);
          return phraseItem(item.insight.title, `Saved answer · ${short(item.insight.summary)}`, `insight:${item.insight.id}`);
        case 'conversation':
          return { key: `saved:${item.saved.threadId}`, kind: 'thread', label: item.saved.title, title: item.saved.title, body: item.saved.body, hint: `Saved conversation · ${short(item.saved.body)}`, ask: item.saved.title };
        case 'phrase':
          return phraseItem(item.word, item.meaning);
      }
    })
    .filter(present);

  const mine = input.questions.map(questionItem);
  const community = SAMPLE_THREADS.map((t) => threadItem(t.id)).filter(present);

  const replyThread = (id: string) => SAMPLE_REPLIES.find((r) => r.id === id)?.threadId ?? input.social.replies.find((r) => r.id === id)?.threadId;
  const joinedIds = [...input.social.replies.map((r) => r.threadId), ...input.social.following, ...input.social.likes.map((id) => replyThread(id) ?? id)];
  const joined = [...new Set(joinedIds)]
    .map((id) => {
      const own = input.questions.find((q) => q.id === id);
      return own ? questionItem(own) : threadItem(id);
    })
    .filter(present);

  return { hints, moments, mine, community, joined };
}
