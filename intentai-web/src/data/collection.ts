import { TOPICS, type Lookup, type Topic } from './domain';
import { phraseBank } from './expressions';

// The Singlish passport on Moments: what the user has collected so far.
// A bank phrase is collected when its Today's-three card is opened; a lookup counts once marked Got it.

export function collect(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? [...ids] : [...ids, id];
}

/** Onboarding topics, or all four when none were picked. */
const topicsOrAll = (topics: readonly Topic[]): readonly Topic[] => (topics.length > 0 ? topics : TOPICS);

export interface PassportStats {
  phrases: number;
  topics: number;
  days: number;
}

export function passportStats(collected: readonly string[], lookups: readonly Lookup[], topics: readonly Topic[], streak: number): PassportStats {
  const words = new Set(
    phraseBank.filter((phrase) => collected.includes(phrase.id)).map((phrase) => phrase.title.toLowerCase()),
  );
  for (const item of lookups) if (item.got === true) words.add(item.word.toLowerCase());
  return { phrases: words.size, topics: topicsOrAll(topics).length, days: streak };
}

export interface TopicProgress {
  topic: Topic;
  collected: number;
  total: number;
}

export function topicProgress(topics: readonly Topic[], collected: readonly string[]): TopicProgress[] {
  const picked = topicsOrAll(topics);
  return TOPICS.filter((topic) => picked.includes(topic)).map((topic) => {
    const inTopic = phraseBank.filter((phrase) => phrase.topic === topic);
    return { topic, collected: inTopic.filter((phrase) => collected.includes(phrase.id)).length, total: inTopic.length };
  });
}
