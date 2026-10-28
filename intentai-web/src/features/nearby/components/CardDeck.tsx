// A loose pile of cards (a place's culture facts and phrases): drag or flick the top card away to see the next,
// or use the arrows / arrow keys. The cards behind peek out a little, each at its own slight angle, like cards
// dropped on a table. Only the top card can be read or pressed; the others are hidden from assistive tech.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { isReducedMotion } from '../../../hooks/useReducedMotion';
import { GESTURE_EVENT } from '../../../usage/gesture';
import styles from './CardDeck.module.css';

export interface DeckCard {
  id: string;
  tone: 'culture' | 'language';
  /** Small label at the top of the card ("Culture", "Language"). */
  kicker: string;
  body: ReactNode;
}

/** How far (px) a drag must go, or how fast (px/ms) a flick, to send the card away. */
const AWAY_PX = 80;
const AWAY_SPEED = 0.45;
/** A drag starts after this much sideways movement (so taps and vertical scrolls stay what they are). */
const SLOP_PX = 8;
const FLY_MS = 240;
const BEHIND = 3;

/** A steady little angle and nudge for each card, from its id (the pile looks the same every time). */
export function jitter(id: string): { rot: number; dx: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const a = ((h >>> 0) % 1000) / 1000;
  const b = ((h >>> 10) % 1000) / 1000;
  return { rot: Math.round((a * 7 - 3.5) * 10) / 10, dx: Math.round(b * 18 - 9) };
}

export default function CardDeck({ cards, label }: { cards: DeckCard[]; label: string }) {
  const n = cards.length;
  const [top, setTop] = useState(0);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [leaving, setLeaving] = useState<{ id: string; dir: 1 | -1 } | null>(null);
  // the card that just went to the back jumps there without a transition (it does not fly across the pile)
  const [instant, setInstant] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number; t: number; id: number; on: boolean } | null>(null);
  const moved = useRef(false);
  const cardEls = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (top >= n) setTop(0);
  }, [n, top]);

  // inactive cards: out of the tab order too (aria-hidden alone leaves their buttons focusable)
  useEffect(() => {
    cardEls.current.forEach((el, id) => {
      (el as HTMLDivElement & { inert: boolean }).inert = id !== cards[top % n]?.id;
    });
  });

  useEffect(() => {
    if (!instant) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setInstant(null)));
    return () => cancelAnimationFrame(raf);
  }, [instant]);

  if (n === 0) return null;
  const current = cards[top % n];

  const go = (step: 1 | -1) => setTop((t) => (t + step + n) % n);

  // the top card leaves to one side, then goes to the bottom of the pile
  const away = (dir: 1 | -1, swiped = false) => {
    if (n < 2 || leaving) return;
    // a swipe is no click, so it is counted for the user test here (the arrow buttons count as presses)
    if (swiped) document.dispatchEvent(new CustomEvent(GESTURE_EVENT, { detail: 'Swipe card' }));
    if (isReducedMotion()) {
      go(1);
      return;
    }
    setLeaving({ id: current.id, dir });
    window.setTimeout(() => {
      setInstant(current.id);
      setLeaving(null);
      setDrag(null);
      go(1);
    }, FLY_MS);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (n < 2 || leaving || (e.pointerType === 'mouse' && e.button !== 0)) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, on: false };
    moved.current = false;
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.on) {
      if (Math.abs(dy) > SLOP_PX && Math.abs(dy) > Math.abs(dx)) {
        start.current = null; // a vertical scroll: leave it to the page
        return;
      }
      if (Math.abs(dx) < SLOP_PX) return;
      s.on = true;
      moved.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture is optional
      }
    }
    e.stopPropagation();
    setDrag({ dx, dy: dy * 0.25 });
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.on) return;
    const dx = e.clientX - s.x;
    const speed = Math.abs(dx) / Math.max(1, performance.now() - s.t);
    if (Math.abs(dx) > AWAY_PX || (speed > AWAY_SPEED && Math.abs(dx) > SLOP_PX * 2)) away(dx > 0 ? 1 : -1, true);
    else setDrag(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (n < 2) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      away(-1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.pile} role="group" aria-roledescription="card stack" aria-label={label} onKeyDown={onKeyDown}>
        {cards.map((card, i) => {
          const depth = (i - (top % n) + n) % n;
          const isTop = depth === 0;
          const j = jitter(card.id);
          let transform: string;
          let opacity = depth > BEHIND ? 0 : 1;
          if (isTop && leaving?.id === card.id) {
            transform = `translate(${leaving.dir * 130}%, -2%) rotate(${leaving.dir * 16}deg)`;
            opacity = 0;
          } else if (isTop && drag) {
            transform = `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 18 + j.rot * 0.3}deg)`;
          } else if (isTop) {
            transform = `rotate(${j.rot * 0.3}deg)`;
          } else {
            const d = Math.min(depth, BEHIND);
            transform = `translate(${j.dx * 0.6}px, ${d * 7}px) rotate(${j.rot * (0.6 + d * 0.25)}deg) scale(${1 - d * 0.035})`;
          }
          const still = (isTop && drag && !leaving) || instant === card.id;
          return (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardEls.current.set(card.id, el);
                else cardEls.current.delete(card.id);
              }}
              className={`${styles.card} ${card.tone === 'language' ? styles.language : styles.culture}`}
              style={{ transform, opacity, zIndex: n - depth, transition: still ? 'none' : undefined }}
              aria-hidden={isTop ? undefined : true}
              data-top={isTop || undefined}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerEnd : undefined}
              onPointerCancel={isTop ? onPointerEnd : undefined}
              onClickCapture={(e) => {
                // the click that ends a drag is not a press on what was under the finger
                if (moved.current) {
                  e.preventDefault();
                  e.stopPropagation();
                  moved.current = false;
                }
              }}
            >
              <p className={styles.kicker}>{card.kicker}</p>
              {card.body}
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <div className={styles.controls}>
          <button type="button" className={styles.arrow} onClick={() => go(-1)} aria-label="Previous card">
            ‹
          </button>
          <span className={styles.count} aria-live="polite">
            {(top % n) + 1} / {n}
          </span>
          <button type="button" className={styles.arrow} onClick={() => away(-1)} aria-label="Next card">
            ›
          </button>
          <span className={styles.hint}>Swipe the card for the next one</span>
        </div>
      )}
    </div>
  );
}
