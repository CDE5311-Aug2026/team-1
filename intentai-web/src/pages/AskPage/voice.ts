// Web Speech API recognition, which TypeScript's DOM lib does not type. Only what Ask uses is declared.
interface Recognition {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}

type RecognitionConstructor = new () => Recognition;

interface SpeechWindow {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
}

/** Listens for one phrase. Returns false (and does nothing) when the browser has no speech recognition. */
export function startVoiceInput(onText: (text: string) => void, onError: () => void): boolean {
  const speechWindow = window as unknown as SpeechWindow;
  const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  if (!Constructor) return false;
  const recognition = new Constructor();
  recognition.lang = 'en-SG';
  recognition.onresult = (event) => onText(event.results[0][0].transcript);
  recognition.onerror = onError;
  recognition.start();
  return true;
}
