import type { Question } from '../../data/domain';
import type { PlaceStories } from '../../data/placeStories';

/** Passport stats: stamped places, opened culture cards, and questions a local answered (tips). */
export function passportStats(stories: PlaceStories, questions: readonly Question[]): { stamps: number; cards: number; tips: number } {
  const places = Object.values(stories);
  return {
    stamps: places.filter((p) => p.stamped).length,
    cards: places.reduce((n, p) => n + p.opened.length, 0),
    tips: questions.filter((q) => q.answer !== undefined && q.answer !== '').length,
  };
}
