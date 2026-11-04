// Whether the first-visit How to play card is still up. The 3D shelf behind it waits: building it blocks the page for
// seconds on a slow graphics chip, and while it does a tap on the card looks dead.
const HOW_SEEN = 'findsg-hunt-how-seen';
const CLOSED = 'findsg:how-closed';
/** Closed in this visit, whether or not the phone could save that. */
let closed = false;

export function howToPlayPending(): boolean {
  if (closed) return false;
  try {
    return !localStorage.getItem(HOW_SEEN);
  } catch {
    return false; // private mode: the card can't remember, so nothing should wait on it
  }
}

export function markHowToPlaySeen() {
  closed = true;
  try {
    localStorage.setItem(HOW_SEEN, '1');
  } catch {
    /* private mode: it shows again next time */
  }
  window.dispatchEvent(new Event(CLOSED));
}

export function onHowToPlayClosed(run: () => void): () => void {
  window.addEventListener(CLOSED, run);
  return () => window.removeEventListener(CLOSED, run);
}
