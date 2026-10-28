import type { FormEvent } from 'react';
import Dialog from '../../components/Dialog/Dialog';
import styles from './QuestionDialog.module.css';
import { requireText } from '../../hooks/requireText';

interface QuestionDialogProps {
  title: string;
  /** "Ask a local" also asks where the phrase was heard. */
  askContext?: boolean;
  /** Pre-filled message (e.g. from Moments "Not sure"). */
  defaultMessage?: string;
  /** Answering as a local: an optional name shown with the answer. */
  askName?: boolean;
  onSave: (message: string, context: string, name: string) => void;
  onClose: () => void;
}

/** Anonymous message form used to ask, add context, and answer as a local. */
export default function QuestionDialog({ title, askContext = false, defaultMessage, askName = false, onSave, onClose }: QuestionDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = requireText(event.currentTarget, 'message');
    if (message === null) return;
    const form = new FormData(event.currentTarget);
    onSave(message, String(form.get('context') ?? '').trim(), String(form.get('name') ?? '').trim());
  };

  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <p>Your name is not attached. This prototype saves on this device and does not send to a live community.</p>
        <label>
          Your message
          <textarea name="message" required maxLength={1000} defaultValue={defaultMessage} />
        </label>
        {askName && (
          <label>
            Name shown with your answer (optional)
            <input name="name" maxLength={24} placeholder="e.g. Mei · leave empty for “A local”" />
          </label>
        )}
        {askContext && (
          <label>
            Where did you hear it?
            <input name="context" maxLength={80} placeholder="e.g. Hawker centre · lunch" />
          </label>
        )}
        <div className="dialog-row">
          <button type="submit" className="dialog-primary">
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}
