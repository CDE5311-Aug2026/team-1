import { openedCardsStore } from './stores';

/** Remember that a culture card was opened (newest last, no repeats). */
export function markCardOpened(id: string) {
  openedCardsStore.set((list) => [...list.filter((x) => x !== id), id]);
}
