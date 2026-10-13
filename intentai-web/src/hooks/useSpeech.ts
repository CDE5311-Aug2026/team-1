import { useCallback, useRef, useState } from 'react';

interface UseSpeechResult {
  speak: (text: string) => void;
  speaking: boolean;
  supported: boolean;
}

export default function useSpeech(): UseSpeechResult {
  const [speaking, setSpeaking] = useState(false);
  const supportedRef = useRef(typeof window !== 'undefined' && !!window.speechSynthesis);

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  }, []);

  return { speak, speaking, supported: supportedRef.current };
}
