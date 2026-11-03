import { useEffect } from 'react';
import { usePersistentStore } from './persistentStore';
import { TEXT_SCALE, mySpacePrefsStore } from './profile/profile';

/** Sets <html>'s font size for a text size step: rem-sized text across the app follows it. Default leaves it unset. */
export function applyTextSize(scale: number, root: HTMLElement = document.documentElement) {
  root.style.fontSize = scale === 1 ? '' : `${scale * 100}%`;
}

/** My Space › Settings › Text size, applied to the whole document. Mount once (App). */
export function useTextSizeSetting(): void {
  const [{ textSize }] = usePersistentStore(mySpacePrefsStore);
  useEffect(() => applyTextSize(TEXT_SCALE[textSize]), [textSize]);
}
