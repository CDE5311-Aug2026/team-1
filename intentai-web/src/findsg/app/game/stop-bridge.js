/* Hunt (3 Nov 2026): the book's side tabs (Map, Clues, Remote/On site, Check in) belong to the host page, while the stop
 * they act on lives in the game. The game says where it stands (findsg:stop) and takes a tab's command (findsg:command). */
let last = null;

/** What the open stop is showing, or null once no story is open. */
export function publishStop(detail) {
  last = detail;
  window.dispatchEvent(new CustomEvent('findsg:stop', {detail}));
}
export const currentStop = () => last;

/** 'race' | 'decode' | 'mode' | 'checkin' */
export function sendStop(type) {
  window.dispatchEvent(new CustomEvent('findsg:command', {detail: {type}}));
}
