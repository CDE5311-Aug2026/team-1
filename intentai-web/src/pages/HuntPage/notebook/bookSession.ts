// Which book is out and where it's open, kept for the visit. No shelf code here, so other pages can open a book.
export const session = {
  get(k: string) {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v == null) sessionStorage.removeItem(k);
      else sessionStorage.setItem(k, v);
    } catch {
      /* fine */
    }
  },
};
export const BOOK_KEY = 'hunt-book';
export const SHELF_KEY = 'hunt-shelf';
export const pageKey = (id: string) => `hunt-page-${id}`;

/** A route book's pages, in order (their thumb tabs). A stop's page shows the same tabs; each opens the book there. */
export const BOOK_TABS = ['Story', 'Map', 'Clues', 'Notes', 'Record'] as const;

/** Leave a stop for its book, open at one of its pages (or put it back on the shelf with null). */
export function openBookAt(id: string | null, page = 0) {
  session.set(BOOK_KEY, id);
  if (id) {
    session.set(SHELF_KEY, id);
    session.set(pageKey(id), String(page));
  }
}

/** Leave a stop for this book, at the page it was last open on (a stop's one-level back). */
export function reopenBook(id: string) {
  session.set(BOOK_KEY, id);
  session.set(SHELF_KEY, id);
}
