/** A touch device (phone, tablet) has its own status bar: the drawn one shrinks to a gap (see tokens.css --status-h). */
export const REAL_DEVICE_QUERY = '(hover: none) and (pointer: coarse)';

export function onRealDevice(): boolean {
  try {
    return window.matchMedia(REAL_DEVICE_QUERY).matches;
  } catch {
    return false;
  }
}

/** Height of the drawn status bar in px: 48 in the Figma frames, 8 on a real device (its own bar sits above the page). */
export function statusBarPx(): number {
  return onRealDevice() ? 8 : 48;
}
