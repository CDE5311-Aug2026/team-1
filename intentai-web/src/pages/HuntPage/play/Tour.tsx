// The in-game tour (owner, batch 3): on the first hunt you open, each key control is lit in turn with a line on what it
// does: Next moves on, Skip (or Esc) ends it. It is remembered on this phone (huntTourStore, under the app's storage
// prefix); the "?" in the hunt's header plays it again. A step whose control is not on screen now is passed over.
// With motion reduced, nothing slides or fades.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tour.module.css';

export interface TourStep {
  /** The control's `data-tour` name. */
  target: string;
  title: string;
  text: string;
}

const PAD = 6;
const find = (target: string) => document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
const reduced = () =>
  document.documentElement.classList.contains('reduce-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Tour({ steps, onDone }: { steps: TourStep[]; onDone(): void }) {
  // only the steps whose control is on screen when the tour starts
  const [list] = useState(() => steps.filter((s) => find(s.target)));
  const [at, setAt] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const step = list[at];

  const measure = useCallback(() => {
    const el = step && find(step.target);
    setBox(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    const el = step && find(step.target);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    measure();
    // a smooth scroll moves it after the first measure
    const t = window.setTimeout(measure, reduced() ? 0 : 350);
    return () => window.clearTimeout(t);
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  useEffect(() => {
    next.current?.focus({ preventScroll: true });
  }, [at]);

  useEffect(() => {
    if (!list.length) onDone();
  }, [list.length, onDone]);

  if (!step) return null;
  const last = at === list.length - 1;
  const forward = () => (last ? onDone() : setAt((n) => n + 1));
  // the card sits under the control, or over it when the control is low on the screen
  const below = !box || box.top + box.height / 2 < window.innerHeight / 2;
  const cardStyle = box
    ? below
      ? { top: Math.min(box.bottom + PAD + 10, window.innerHeight - 200) }
      : { bottom: Math.max(window.innerHeight - box.top + PAD + 10, 16) }
    : { top: '40%' };

  return createPortal(
    <div
      className={`${styles.layer} ${reduced() ? styles.still : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-text"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onDone();
        }
      }}
    >
      {box ? (
        <div
          className={styles.spot}
          aria-hidden="true"
          style={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
        />
      ) : (
        <div className={styles.dim} aria-hidden="true" />
      )}
      <div className={styles.card} style={cardStyle}>
        <p className={styles.count}>
          {at + 1} / {list.length}
        </p>
        <h2 id="tour-title" className={styles.title}>
          {step.title}
        </h2>
        <p id="tour-text" className={styles.text}>
          {step.text}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.skip} onClick={onDone}>
            {last ? 'Close' : 'Skip'}
          </button>
          <button ref={next} type="button" className={styles.next} onClick={forward}>
            {last ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
