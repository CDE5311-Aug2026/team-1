// "Ask a local" (Figma C3, without the map for now): the question, the place it is about, a topic picked automatically
// from the text (the user can change it), and what a local's answer will be added to. Nothing is linked silently:
// the sheet says whether the answer goes to a card, a phrase, or only to My questions.
import { useId, useState, type FormEvent } from 'react';
import Dialog from '../../components/Dialog/Dialog';
import type { QuestionLink, QuestionTopic } from '../../data/domain';
import { cardTitle } from '../../data/localAnswer';
import { usePersistentStore } from '../../data/persistentStore';
import { lookupsStore } from '../../data/stores';
import { detectTopic } from '../AskPage/cards';
import styles from './AskLocalSheet.module.css';

export const PRIVACY_LINE = 'Locals see your question and place, never your name or location.';
const MAX = 300;

const TOPICS: { id: QuestionTopic; label: string }[] = [
  { id: 'food', label: 'Food' },
  { id: 'monument', label: 'Monument' },
  { id: 'festival', label: 'Festival' },
  { id: 'other', label: 'Other' },
];

interface AskLocalSheetProps {
  defaultMessage?: string;
  defaultContext?: string;
  link?: QuestionLink;
  onPost: (message: string, context: string, link: QuestionLink) => void;
  onClose: () => void;
}

export default function AskLocalSheet({ defaultMessage = '', defaultContext = '', link = {}, onPost, onClose }: AskLocalSheetProps) {
  const [message, setMessage] = useState(defaultMessage.slice(0, MAX));
  const [picked, setPicked] = useState<QuestionTopic | undefined>(link.topic);
  const [lookups] = usePersistentStore(lookupsStore);
  const auto: QuestionTopic = detectTopic(message) ?? 'other';
  const topic = picked ?? auto;
  const ids = { msg: useId(), topic: useId(), ctx: useId() };

  const card = link.cardId ? cardTitle(link.cardId) : undefined;
  const phrase = link.lookupId ? lookups.find((l) => l.id === link.lookupId) : undefined;
  const target = card
    ? `Linked to your ${card} card. A local’s answer will be added to it as a tip.`
    : phrase
      ? `Linked to “${phrase.word}” in Moments. A local’s answer will be added to it.`
      : 'Not linked to a card. A local’s answer will stay in My questions.';

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    const context = String(new FormData(event.currentTarget).get('context') ?? '').trim();
    onPost(text, context || (link.areaName ? `near ${link.areaName}` : ''), {
      ...link,
      topic,
      cardId: card ? link.cardId : undefined,
      lookupId: phrase ? link.lookupId : undefined,
    });
  };

  return (
    <Dialog title="Ask a local" onClose={onClose}>
      <form className={styles.form} onSubmit={submit}>
        {link.from === 'ask' && <p className={styles.eyebrow}>From Ask</p>}
        {link.areaName && (
          <p className={styles.place}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11ZM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
            </svg>
            Near {link.areaName}
          </p>
        )}

        <label htmlFor={ids.msg} className={styles.label}>
          Your message
        </label>
        <textarea
          id={ids.msg}
          name="message"
          className={styles.message}
          value={message}
          maxLength={MAX}
          required
          onChange={(event) => setMessage(event.target.value)}
        />
        <p className={styles.counter} aria-live="polite">
          {message.length}/{MAX}
        </p>

        <fieldset className={styles.topics}>
          <legend id={ids.topic} className={styles.label}>
            Topic
          </legend>
          {TOPICS.map((t) => (
            <label key={t.id} className={styles.topic}>
              <input type="radio" name="topic" value={t.id} checked={topic === t.id} onChange={() => setPicked(t.id)} />
              <span>{t.label}</span>
              {picked === undefined && auto === t.id && <span className={styles.auto}>Auto</span>}
            </label>
          ))}
        </fieldset>

        {!link.areaName && (
          <>
            <label htmlFor={ids.ctx} className={styles.label}>
              Where did you hear it?
            </label>
            <input id={ids.ctx} name="context" className={styles.input} maxLength={80} defaultValue={defaultContext} placeholder="e.g. Hawker centre · lunch" />
          </>
        )}

        <p className={styles.target}>{target}</p>
        <p className={styles.privacy}>{PRIVACY_LINE} Answers arrive in My questions.</p>
        <p className={styles.demo}>This prototype keeps questions on this device; it does not send them to a live community.</p>

        <div className="dialog-row">
          <button type="button" className="dialog-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="dialog-primary">
            Post to locals
          </button>
        </div>
      </form>
    </Dialog>
  );
}
