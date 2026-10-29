// Bottom sheet on the native <dialog> (focus trap, Escape, focus return), styled like the ZIP's cf-sheet.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './icons';
import styles from './Sheet.module.css';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Shown left of the close button (e.g. a filter). */
  wide?: boolean;
  /** A map or photo above the title, edge to edge. */
  hero?: ReactNode;
}

export default function Sheet({ title, onClose, children, wide = false, hero }: SheetProps) {
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
    // A click on the backdrop (outside the panel) closes the sheet.
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
      else document.querySelector<HTMLElement>('main')?.focus();
    };
  }, []);

  return (
    <dialog ref={ref} className={wide ? `${styles.sheet} ${styles.wide}` : styles.sheet} aria-labelledby={titleId}>
      <div className={styles.panel}>
        {hero}
        <span className={styles.handle} aria-hidden="true" />
        <div className={styles.heading}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
