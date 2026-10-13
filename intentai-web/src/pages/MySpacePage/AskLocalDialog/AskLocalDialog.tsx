import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../../components/Dialog/Dialog';
import { newQuestion } from '../../../data/domain';
import { usePersistentStore } from '../../../data/persistentStore';
import { noticesStore, questionsStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import { paths } from '../../../routes';
import styles from './AskLocalDialog.module.css';
import { requireText } from '../../../hooks/requireText';

/** "Ask a local": saves an anonymous Community question about the occasion (v0 behaviour). */
export default function AskLocalDialog({ onClose }: { onClose: () => void }) {
  const [notices] = usePersistentStore(noticesStore);
  const navigate = useNavigate();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = requireText(event.currentTarget, 'question');
    if (text === null) return;
    const form = new FormData(event.currentTarget);
    const context = String(form.get('context') ?? '').trim() || notices.occasion;
    questionsStore.set((previous) => [
      newQuestion(text, context),
      ...previous,
    ]);
    onClose();
    showToast('Saved on this device');
    navigate(paths.community);
  };

  return (
    <Dialog title="Ask a local" onClose={onClose}>
      <form onSubmit={submit} className={styles.form}>
        <p>Your name is not attached. This prototype saves on this device and does not send to a live community.</p>
        <label>
          Your question
          <textarea name="question" required maxLength={1000} />
        </label>
        <label>
          Where did you hear it?
          <input name="context" defaultValue={`${notices.occasion} · ${notices.with}`} maxLength={120} />
        </label>
        <div className="dialog-row">
          <button type="button" className="dialog-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="dialog-primary">
            Send
          </button>
        </div>
      </form>
    </Dialog>
  );
}
