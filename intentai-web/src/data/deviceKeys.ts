// Which keys in this phone's storage are the visitor's own, outside the typed stores. Everything outside the app's
// `intentai:` namespace counts (Hunt saves and notes, place ticks), so a new game key is covered without being listed.
// What stays: the stores in that namespace, and feedback notes still waiting to send.
export const isDeviceDataKey = (key: string) => !key.startsWith('intentai:') && key !== 'findsg-help-feedback';

/** Sent when Hunt saves are removed: the game keeps recent saves in memory and must forget them too. */
export const SAVES_CLEARED = 'findsg:saves-cleared';

export function announceSavesCleared() {
  window.dispatchEvent(new Event(SAVES_CLEARED));
}
