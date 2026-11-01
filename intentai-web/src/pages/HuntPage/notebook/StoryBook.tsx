// Reading a story: the book you took down fills the phone, lying on the dark chart desk under the lamp. Nothing on this
// screen scrolls: you move through the story by turning pages. A slim bar above the book takes you back to the shelf.
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CHART_BACKDROP } from './chartBackdrop';
import styles from './storyBook.module.css';

export function StoryBook({
  title,
  kicker,
  closing = false,
  onClose,
  children,
}: {
  title: string;
  kicker: string;
  closing?: boolean;
  onClose(): void;
  children: ReactNode;
}) {
  // the page under the book must not scroll while it is open
  useEffect(() => {
    const els = [document.documentElement, document.body];
    const before = els.map((el) => el.style.overflow);
    els.forEach((el) => (el.style.overflow = 'hidden'));
    document.documentElement.classList.add('hunt-reading');
    return () => {
      els.forEach((el, i) => (el.style.overflow = before[i]));
      document.documentElement.classList.remove('hunt-reading');
    };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('dialog[open]') && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  return createPortal(
    <div
      className={`${styles.reader} ${closing ? styles.closing : ''}`}
      style={{ '--chart': CHART_BACKDROP } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className={styles.bar}>
        <button type="button" className={styles.back} onClick={onClose}>
          <span aria-hidden="true">‹</span> Shelf
        </button>
        <p className={styles.running}>
          <small>{kicker}</small>
          <span>{title}</span>
        </p>
      </header>
      <div className={styles.stage}>{children}</div>
    </div>,
    document.body,
  );
}
