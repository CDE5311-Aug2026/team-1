import { newQuestion, type Question, type QuestionLink } from '../../data/domain';
import { communitySocialStore } from '../../data/community/social';
import { placeFor, type PlaceOption } from '../../data/community/map';
import { questionsStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';

/** Posts a question from the Ask a local sheet: it joins My questions (top) and, if pinned, the Locals map. */
export function postQuestion(text: string, context: string, link: QuestionLink, place?: PlaceOption): Question {
  const question = newQuestion(text, context, { from: 'community', ...link });
  questionsStore.set((prev) => [question, ...prev]);
  if (place) {
    communitySocialStore.set((prev) => ({ ...prev, places: [...prev.places.filter((p) => p.questionId !== question.id), placeFor(question.id, place)] }));
  }
  showToast('Posted. Answers arrive in My questions.');
  return question;
}

/**
 * Withdraws one of my questions, with Undo. A conversation already saved to Moments keeps its snapshot, and a tip
 * already added to a card stays (withdrawing never deletes what an answer added).
 */
export function withdrawQuestion(question: Question) {
  const list = questionsStore.get();
  const index = list.findIndex((q) => q.id === question.id);
  questionsStore.set((prev) => prev.filter((q) => q.id !== question.id));
  showToast('Question withdrawn', {
    undo: () =>
      questionsStore.set((prev) =>
        prev.some((q) => q.id === question.id) ? prev : [...prev.slice(0, Math.max(0, index)), question, ...prev.slice(Math.max(0, index))],
      ),
  });
}
