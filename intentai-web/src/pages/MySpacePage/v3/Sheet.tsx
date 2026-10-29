// Bottom sheet on the native <dialog> (focus trap, Escape) for My Space editors (Figma S4).
import { motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './MySpace.module.css';

interface SheetProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Sheet({ title, subtitle, icon, onClose, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reduce = useReducedMotionConfig();
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
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClick={(e) => {
        // A tap on the backdrop (the dialog itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className={styles.sheetPanel}
        initial={reduce ? false : { y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
      >
        <span className={styles.grabber} aria-hidden="true" />
        <div className={styles.sheetHead}>
          {icon && <span className={styles.sheetIcon}>{icon}</span>}
          <div>
            <h2 id={titleId} className={styles.sheetTitle}>
              {title}
            </h2>
            {subtitle && <p className={styles.sheetSub}>{subtitle}</p>}
          </div>
        </div>
        <div className={styles.sheetBody}>{children}</div>
        {footer && <div className={styles.sheetFooter}>{footer}</div>}
      </motion.div>
    </dialog>
  );
}
