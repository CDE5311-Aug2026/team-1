// A lamp-lit layer over the desk for the things you pick up: the unfolded map, the fanned cards, the projector.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MATERIALS } from './Notebook';
import styles from './props.module.css';

export function Overlay({ label, onClose, children, tone = 'lamp' }: { label: string; onClose(): void; children: ReactNode; tone?: 'lamp' | 'dark' }) {
  const close = useRef<HTMLButtonElement>(null);
  const last = useRef(onClose);
  last.current = onClose;
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => e.key === 'Escape' && last.current();
    window.addEventListener('keydown', key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      back?.focus?.({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div
      className={`${styles.overlay} ${tone === 'dark' ? styles.overlayDark : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      style={MATERIALS as CSSProperties}
    >
      <button type="button" className={styles.overlayClose} ref={close} onClick={onClose} aria-label="Close">
        <span aria-hidden="true">×</span>
      </button>
      {children}
    </div>,
    document.body,
  );
}
