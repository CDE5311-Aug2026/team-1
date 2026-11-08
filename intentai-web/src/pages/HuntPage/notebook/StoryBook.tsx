// Reading a story: the book you took down fills the phone. v2 board 10 (owner, 8 Nov 2026): it lies on the light survey
// chart (ChartPaper) under "‹ Shelf · Hunt · Settings" and its volume's name; the book itself is as it was. Nothing on
// this screen scrolls: you move through the story by turning pages.
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll } from '../../../hooks/scrollLock';
import { ChartPaper } from './ChartPaper';
import { VolumeBar, VolumeHead } from './VolumeChrome';
import styles from './storyBook.module.css';

export function StoryBook({
  title,
  roman,
  closing = false,
  onClose,
  children,
}: {
  title: string;
  /** The volume's number, "I". */
  roman: string;
  closing?: boolean;
  onClose(): void;
  children: ReactNode;
}) {
  // the page under the book must not scroll while it is open
  useEffect(() => {
    const unlock = lockScroll();
    document.documentElement.classList.add('hunt-reading');
    return () => {
      unlock();
      document.documentElement.classList.remove('hunt-reading');
    };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('dialog[open]') && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  return createPortal(
    <div className={`${styles.reader} ${closing ? styles.closing : ''}`} role="dialog" aria-modal="true" aria-label={title} data-volume-reader="">
      <ChartPaper variant="reader" />
      <VolumeBar onBack={onClose} />
      <VolumeHead roman={roman} title={title} className={styles.head} />
      <div className={styles.stage}>{children}</div>
    </div>,
    document.body,
  );
}
