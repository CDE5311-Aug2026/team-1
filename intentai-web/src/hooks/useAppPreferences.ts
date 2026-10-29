import { useEffect } from 'react';
import { usePersistentStore } from '../data/persistentStore';
import { TEXT_SCALE } from '../data/preferences';
import { preferencesStore } from '../data/stores';

/** Applies My Space text size (root font scale; the app is sized in rem) and motion to the whole document. */
export function useAppPreferences(): void {
  const [{ textSize, motion }] = usePersistentStore(preferencesStore);

  useEffect(() => {
    const scale = TEXT_SCALE[textSize];
    document.documentElement.style.fontSize = scale === 1 ? '' : `${scale * 100}%`;
  }, [textSize]);

  useEffect(() => {
    const root = document.documentElement;
    if (motion === 'reduced') root.dataset.motion = 'reduced';
    else delete root.dataset.motion;
  }, [motion]);
}
