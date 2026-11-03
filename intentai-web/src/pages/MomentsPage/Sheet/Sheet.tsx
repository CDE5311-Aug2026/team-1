import { useEffect, useId, useRef, type ReactNode } from 'react';
import closeIcon from '../../../assets/v3/moments/close.svg';
import styles from './Sheet.module.css';

interface SheetProps {
  /** Accessible name; shown as the heading unless `hideTitle`. */
  title: string;
  hideTitle?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** full: a whole-screen layer (Recap). */
  variant?: 'sheet' | 'full';
  className?: string;
}

/**
 * Bottom sheet on the native modal <dialog> (focus trapped, Escape closes, focus goes back to the opener). Slides up
 * with CSS, which the app's Reduce motion (html.reduce-motion) and prefers-reduced-motion turn off.
 */
export default function Sheet({ title, hideTitle, onClose, children, variant = 'sheet', className }: SheetProps) {
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
    dialog.addEventListener('cancel', cancel);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      if (dialog.open) dialog.close();
      if (previous && previous !== document.body && previous.isConnected) previous.focus();
      else document.querySelector<HTMLElement>('main')?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`${variant === 'full' ? styles.full : styles.sheet} ${className ?? ''}`}
      aria-labelledby={titleId}
      // a click on the backdrop (the dialog box itself, outside the panel) closes the sheet
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        {variant === 'sheet' && <span className={styles.handle} aria-hidden="true" />}
        <div className={hideTitle ? styles.srHead : styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {variant === 'sheet' && (
            <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
              <img src={closeIcon} alt="" width={18} height={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
