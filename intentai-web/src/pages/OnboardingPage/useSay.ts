import { useCallback } from 'react';
import useSpeech from '../../hooks/useSpeech';
import { showToast } from '../../hooks/useToast';

/** Reads text aloud, or says so in a toast when the browser has no speech synthesis. */
export default function useSay() {
  const { speak, supported } = useSpeech();
  return useCallback(
    (text: string) => {
      if (supported) speak(text);
      else showToast("Audio isn't available on this device.");
    },
    [speak, supported],
  );
}
