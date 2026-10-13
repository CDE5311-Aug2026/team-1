import { useState } from 'react';
import Dialog from '../../../components/Dialog/Dialog';
import type { Lookup } from '../../../data/domain';
import useSpeech from '../../../hooks/useSpeech';
import { showToast } from '../../../hooks/useToast';

interface PractiseDialogProps {
  lookup: Lookup;
  onClose: () => void;
  /** Called with the trimmed example when the user wrote one. */
  onSaveExample: (example: string) => void;
}

/** v0 extra: hear the phrase, then try it in a sentence of your own. */
export default function PractiseDialog({ lookup, onClose, onSaveExample }: PractiseDialogProps) {
  const { speak, supported } = useSpeech();
  const [example, setExample] = useState(lookup.example ?? '');

  const hear = () => {
    if (!supported) {
      showToast('Audio isn’t available on this device');
      return;
    }
    speak(lookup.word);
  };

  const done = () => {
    const written = example.trim();
    if (written) onSaveExample(written);
    onClose();
    showToast(written ? 'Example saved' : 'Practice complete');
  };

  return (
    <Dialog title={`Practise ${lookup.word}`} onClose={onClose}>
      <p>{lookup.meaning}</p>
      <div className="dialog-row">
        <button type="button" className="dialog-secondary" onClick={hear}>
          Hear it
        </button>
      </div>
      <label>
        Your example
        <textarea
          value={example}
          onChange={(event) => setExample(event.target.value)}
          placeholder="Try the phrase in a sentence…"
        />
      </label>
      <div className="dialog-row">
        <button type="button" className="dialog-primary" onClick={done}>
          Done
        </button>
      </div>
    </Dialog>
  );
}
