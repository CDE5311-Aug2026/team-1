import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Modal built on the native <dialog>: focus is trapped by the browser, Escape closes it, and focus
 * returns to the element that opened it. Render it only while open.
 */
export default function Dialog({ title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) dialog.close();
      // The opener may have unmounted (e.g. the lesson's Next button); fall back to the page.
      if (previous && previous !== document.body && previous.isConnected) previous.focus();
      else document.querySelector<HTMLElement>('main')?.focus();
    };
  }, []);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}>
      <button type="button" className={styles.close} aria-label="Close dialog" onClick={onClose}>
        ×
      </button>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
