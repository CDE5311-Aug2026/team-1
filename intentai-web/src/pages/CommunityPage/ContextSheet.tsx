// Add or edit the context of one of my questions (ZIP "Question context"): where I heard it and what happened.
import { useId, type FormEvent } from 'react';
import type { Question } from '../../data/domain';
import { questionsStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { Icon } from './icons';
import Sheet from './Sheet';
import styles from './ContextSheet.module.css';

export function hasContext(question: Question): boolean {
  return Boolean(question.context) || question.detail.trim() !== question.text.trim();
}

export default function ContextSheet({ question, onClose }: { question: Question; onClose: () => void }) {
  const ids = { where: useId(), what: useId() };
  const detail = question.detail.trim() === question.text.trim() ? '' : question.detail;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const context = String(form.get('context') ?? '').trim();
    const what = String(form.get('detail') ?? '').trim();
    questionsStore.set((prev) => prev.map((q) => (q.id === question.id ? { ...q, context, detail: what || q.text } : q)));
    showToast('Context saved');
    onClose();
  };

  return (
    <Sheet title={hasContext(question) ? 'Edit context' : 'Add context'} onClose={onClose}>
      <form className={styles.form} onSubmit={submit}>
        <p className={styles.intro}>A few details help locals read your situation. Leave out names.</p>
        <div className={styles.preview}>
          <Icon name="chat" size={18} />
          <p>{question.text}</p>
        </div>
        <label className={styles.field} htmlFor={ids.where}>
          <span>Where did you hear it?</span>
          <input id={ids.where} name="context" maxLength={80} defaultValue={question.context} placeholder="e.g. At a café, with classmates" />
        </label>
        <label className={styles.field} htmlFor={ids.what}>
          <span>What happened?</span>
          <textarea id={ids.what} name="detail" maxLength={1000} rows={4} defaultValue={detail} placeholder="What led to your question?" />
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.primary}>
            <Icon name="check" size={16} />
            Save context
          </button>
        </div>
      </form>
    </Sheet>
  );
}
