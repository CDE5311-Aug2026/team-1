import { useEffect, useId, useRef, useState } from 'react';
import type { OnbField, Onboarding } from '../../../data/domain';
import { onboardingStore, profileStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import { roleLabel, timeLabel } from '../../Onboarding/options';
import { FIELD_NAME } from '../../Onboarding/PassportCard/passport';
import { STEPS } from '../../Onboarding/steps';
import { TILE } from '../KnowsGrid/KnowsGrid';
import TimeSlider from './TimeSlider';
import styles from './EditSheet.module.css';

const INVALID: Partial<Record<OnbField, string>> = { topics: 'Tap all 4 topics to set the order' };

/**
 * Canvas S1/S4 edit sheet: the onboarding question for one field on a draft copy. Only Save writes,
 * and only the edited field, so changes made elsewhere meanwhile are kept.
 */
export default function EditSheet({ field, onClose }: { field: OnbField; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState<Onboarding>(() => onboardingStore.get());
  const [note, setNote] = useState('');
  const step = STEPS.find((s) => s.id === field)!;
  const name = FIELD_NAME[field];
  const valid = step.answered(draft);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    titleRef.current?.focus();
    const cancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener('cancel', cancel);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      if (dialog.open) dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const update = (patch: Partial<Onboarding>) => {
    setNote('');
    setDraft((d) => ({ ...d, ...patch }));
  };

  const save = () => {
    if (!valid) {
      setNote(INVALID[field] ?? 'Pick one to save');
      return;
    }
    onboardingStore.set((current) => ({ ...current, [field]: draft[field] }));
    const saved = onboardingStore.get();
    profileStore.set((p) => ({
      ...p,
      ...(saved.from ? { from: saved.from } : {}),
      ...(saved.time ? { time: timeLabel(saved.time) } : {}),
      ...(saved.role ? { role: roleLabel(saved.role) } : {}),
    }));
    onClose();
    showToast(`${name} updated`);
  };

  const props = { data: draft, update, toast: setNote, next: () => {}, embedded: true };
  const { Body, Preview } = step;

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> itself.
        if (e.target === ref.current) onClose();
      }}
    >
      {/* Answers are personal: taps in the sheet are never named in usage timings. */}
      <div className={styles.inner} data-no-track>
        <span className={styles.grabber} aria-hidden="true" />
        <header className={styles.header}>
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className={styles.title}>
            {name}
          </h2>
          <p className={styles.used}>{TILE[field].used}</p>
        </header>
        <div className={styles.body}>
          {field === 'time' ? (
            <TimeSlider value={draft.time} onChange={(time) => update({ time })} />
          ) : (
            <>
              <Body {...props} />
              {Preview && <Preview {...props} />}
            </>
          )}
        </div>
        <p role="status" className={styles.note}>
          {note}
        </p>
        <div className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.save} aria-disabled={!valid} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
}
