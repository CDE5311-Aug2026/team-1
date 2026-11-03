// "Order like a local" on a place card: pick each part of the order, see the words to say and what they mean, then
// hear them (the browser's own speech, nothing sent), show them full screen to the stall, or save them to Moments.
import { useEffect, useId, useRef, useState } from 'react';
import { addLookup } from '../../../data/domain';
import { availableOptions, defaultChoices, orderText, settle, type OrderChoices, type OrderGuide } from '../../../data/explore/orders';
import { usePersistentStore } from '../../../data/persistentStore';
import { lookupsStore } from '../../../data/stores';
import useSpeech from '../../../hooks/useSpeech';
import { showToast } from '../../../hooks/useToast';
import styles from './OrderBuilder.module.css';

export default function OrderBuilder({ guide }: { guide: OrderGuide }) {
  const [choices, setChoices] = useState<OrderChoices>(() => defaultChoices(guide));
  const [showing, setShowing] = useState(false);
  const [, setLookups] = usePersistentStore(lookupsStore);
  const { speak, speaking, supported } = useSpeech();
  const uid = useId();
  const { said, meaning } = orderText(guide, choices);

  const choose = (step: string, option: string) => setChoices((prev) => settle(guide, { ...prev, [step]: option }));

  const save = () => {
    let added = false;
    setLookups((prev) => {
      const next = addLookup(prev, { word: said, meaning, source: 'IntentAI editorial' });
      added = next !== prev;
      return next;
    });
    showToast(added ? 'Order saved to Moments' : 'This order is already in Moments');
  };

  return (
    <section className={`a-up ${styles.card}`} aria-labelledby={`${uid}-title`} style={{ animationDelay: '.5s' }}>
      <p className={styles.kicker}>ORDER LIKE A LOCAL</p>
      <h3 id={`${uid}-title`} className={styles.title}>
        {guide.title}
      </h3>
      <p className={styles.intro}>{guide.intro}</p>

      {guide.steps.map((step) => (
        <fieldset key={step.id} className={styles.step}>
          <legend className={styles.question}>{step.question}</legend>
          <div className={styles.options}>
            {availableOptions(step, choices).map((o) => (
              <button
                key={o.id}
                type="button"
                className={styles.option}
                aria-pressed={choices[step.id] === o.id}
                onClick={() => choose(step.id, o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
          {step.note && <p className={styles.note}>{step.note}</p>}
        </fieldset>
      ))}

      <div className={styles.result} aria-live="polite">
        <p className={styles.saidLabel}>Say</p>
        <p className={styles.said} lang="en-SG">
          {said}
        </p>
        <p className={styles.meaning}>{meaning}</p>
      </div>
      <div className={styles.actions}>
        {supported && (
          <button type="button" className={styles.action} onClick={() => speak(said)} aria-pressed={speaking}>
            {speaking ? 'Speaking…' : 'Hear it'}
          </button>
        )}
        <button type="button" className={`${styles.action} ${styles.primary}`} onClick={() => setShowing(true)} aria-haspopup="dialog">
          Show the stall
        </button>
        <button type="button" className={styles.action} onClick={save}>
          Save this order
        </button>
      </div>
      <p className={styles.sources}>
        Words and meanings:{' '}
        {guide.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && '; '}
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.publisher}, “{s.title}”<span className={styles.srOnly}> (opens in a new tab)</span>
            </a>
          </span>
        ))}
      </p>
      {showing && <ShowStall said={said} meaning={meaning} onClose={() => setShowing(false)} />}
    </section>
  );
}

/** The order in large type for the stallholder to read, in a modal dialog (Esc, the button or the backdrop closes it). */
function ShowStall({ said, meaning, onClose }: { said: string; meaning: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    const backdrop = (event: MouseEvent) => {
      if (event.target === dialog) onCloseRef.current();
    };
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('click', backdrop);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      dialog.removeEventListener('click', backdrop);
      if (dialog.open) dialog.close();
      if (previous && previous !== document.body && previous.isConnected) previous.focus();
    };
  }, []);

  return (
    <dialog ref={ref} className={styles.stall} aria-labelledby={titleId}>
      <div className={styles.stallPanel}>
        <p id={titleId} className={styles.stallLabel}>
          My order
        </p>
        <p className={styles.stallSaid} lang="en-SG">
          {said}
        </p>
        <p className={styles.stallMeaning}>{meaning}</p>
        <button type="button" className={`${styles.action} ${styles.primary}`} onClick={onClose} autoFocus>
          Done
        </button>
      </div>
    </dialog>
  );
}
