// The quick tour (owner, 3 Nov 2026): the first time a story opens, before its case is taken, each thing on the book is
// lit in turn with one line on what it does. Tap anywhere for the next; Skip ends it. What only turns up later (the way
// you play, Check in, the corner that turns back) is shown as an example while the tour points at it.
import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import styles from './tour.module.css';

const SEEN = 'hunt-tour:v1';
export function tourSeen() {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return true;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN, '1');
  } catch {
    /* private mode: the tour shows again next time */
  }
}

type Step = { target: string; title: string; text: string; ghost?: 'back' };
export const TOUR: Step[] = [
  { target: '[data-tour="map"]', title: 'Map', text: 'Every stop of the story: ✓ found, ✗ still to find.' },
  { target: '[data-tour="clues"]', title: 'Clues', text: 'What you have found, plus decode cards: one completes a stop for you. Win them in the night race.' },
  { target: '[data-tour="mode"]', title: 'On site · Remote', text: 'Play at the real place, or from home. Tap to switch.' },
  { target: '[data-tour="checkin"]', title: 'Check in', text: 'Glows while a stop waits. Tap it once you are there.' },
  { target: 'section.ogc .ogc-card', title: 'The card', text: 'Tap it for the guide’s note and a hint.' },
  { target: 'section.ogc .ogc-turn.is-next', title: 'Next', text: 'The folded corner turns the page. Or swipe the card left.' },
  { target: 'section.ogc .ogc-turn.is-next', title: 'Back', text: 'The bottom left corner turns back to the last clue you found.', ghost: 'back' },
];

type Box = { left: number; top: number; width: number; height: number };

/** Where a step's light falls: the element, or for the back corner the mirror of the next one on the card's left. */
function measure(step: Step): Box | null {
  const el = document.querySelector(step.target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (step.ghost === 'back') {
    const card = document.querySelector('section.ogc .ogc-card')?.getBoundingClientRect();
    if (!card) return null;
    // a square dog-ear in the card's bottom left (the next corner's box also holds its pencilled caption)
    const size = Math.min(r.height, 64);
    return { left: card.left, top: card.bottom - size, width: size, height: size };
  }
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

export function BookTour({ onStep, onDone }: { onStep(i: number): void; onDone(): void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = TOUR[i];
  useEffect(() => onStep(i), [i, onStep]);
  useLayoutEffect(() => {
    let raf = 0;
    const read = () => setBox(measure(step));
    // the example tabs render after the step changes, so read again on the next frames
    const t = window.setTimeout(read, 60);
    raf = requestAnimationFrame(read);
    window.addEventListener('resize', read);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', read);
    };
  }, [step]);
  const finish = () => {
    markSeen();
    onDone();
  };
  const next = () => (i + 1 < TOUR.length ? setI(i + 1) : finish());
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const pad = 6;
  const hole: CSSProperties | undefined = box
    ? { left: box.left - pad, top: box.top - pad, width: box.width + pad * 2, height: box.height + pad * 2 }
    : undefined;
  // the note sits beside what is lit: left of the tabs on the fore-edge, above anything low on the page, else below
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tip: CSSProperties = { left: 16, right: 16, top: vh * 0.4 };
  let side = 'below';
  if (box) {
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    if (cx > vw * 0.75) {
      side = 'left';
      tip = { right: vw - box.left + 16, top: Math.max(16, Math.min(cy - 60, vh - 200)), maxWidth: Math.min(280, box.left - 32) };
    } else if (cy > vh * 0.5) {
      side = 'above';
      tip = { left: 16, right: 16, bottom: vh - box.top + pad + 14 };
    } else {
      tip = { left: 16, right: 16, top: box.top + box.height + pad + 14 };
    }
  }
  const last = i === TOUR.length - 1;
  return (
    <div className={styles.tour} role="dialog" aria-modal="true" aria-label="How the book works" onClick={next}>
      {hole && (
        <div className={styles.hole} style={hole} aria-hidden="true">
          {step.ghost === 'back' && <i className={styles.ghostBack} />}
        </div>
      )}
      <div className={styles.tip} data-side={side} style={tip} aria-live="polite">
        <span className={styles.count} aria-label={`Step ${i + 1} of ${TOUR.length}`}>
          {i + 1}/{TOUR.length}
        </span>
        <strong>{step.title}</strong>
        <p>{step.text}</p>
        <div className={styles.actions}>
          {!last && (
            <button
              type="button"
              className={styles.skip}
              onClick={(e) => {
                e.stopPropagation();
                finish();
              }}
            >
              Skip
            </button>
          )}
          <button
            type="button"
            className={styles.next}
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
          >
            {last ? 'Start' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
