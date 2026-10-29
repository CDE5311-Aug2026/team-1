// Figma 2 / 7 "Album Rail": one sleeve per card of the place, fanned with tilt, turn and depth. Drag the rail, use
// the arrows or a tick on the ruler to move; the front sleeve is the card described below the rail. It plays (moves
// on by itself) until the user touches it; it never plays with reduced motion.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotionConfig } from 'motion/react';
import type { Card } from '../AskPage/cards';
import { cardPhoto, kindLabel } from '../../data/home/places';
import HomeIcon from '../TodayPage/shared/HomeIcon';
import styles from './PlacePage.module.css';

interface Props {
  cards: Card[];
  opened: readonly string[];
  active: number;
  onActive: (index: number) => void;
}

const AUTOPLAY_MS = 3400;

export default function AlbumRail({ cards, opened, active, onActive }: Props) {
  const reduce = useReducedMotionConfig();
  const [playing, setPlaying] = useState(!reduce && cards.length > 1);
  const [drag, setDrag] = useState(0);
  const dragging = useRef<{ x: number; id: number; moved: boolean } | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const n = cards.length;

  useEffect(() => {
    if (reduce) setPlaying(false);
  }, [reduce]);

  useEffect(() => {
    if (!playing || n < 2) return;
    const t = window.setTimeout(() => onActive((active + 1) % n), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, active, n, onActive]);

  const go = (i: number) => {
    setPlaying(false);
    onActive(Math.max(0, Math.min(n - 1, i)));
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setPlaying(false);
    dragging.current = { x: e.clientX, id: e.pointerId, moved: false };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      e.currentTarget.setPointerCapture?.(d.id);
    }
    if (d.moved) setDrag(-dx / Math.max(120, (rail.current?.clientWidth ?? 300) * 0.42));
  };
  const onUp = () => {
    const d = dragging.current;
    dragging.current = null;
    if (!d?.moved) return;
    const target = Math.round(active + drag);
    setDrag(0);
    go(target);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(active - 1);
    }
  };

  const pos = Math.max(-0.4, Math.min(n - 0.6, active + drag));

  return (
    <div className={styles.railBlock}>
      <div
        ref={rail}
        className={styles.rail}
        data-dragging={drag !== 0 || undefined}
        role="listbox"
        aria-label="Cards of this place. Use the arrow keys to move."
        aria-activedescendant={`sleeve-${cards[active]?.article.id}`}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {cards.map((card, i) => {
          const d = i - pos;
          const ad = Math.abs(d);
          const photo = cardPhoto(card);
          const isOpened = opened.includes(card.article.id);
          return (
            <div
              key={card.article.id}
              id={`sleeve-${card.article.id}`}
              role="option"
              aria-selected={i === active}
              aria-label={`${kindLabel(card)}: ${card.article.title}${isOpened ? ', opened' : ''}`}
              className={styles.sleeve}
              style={{
                zIndex: 100 - Math.round(ad * 10),
                opacity: ad > 2.6 ? 0 : 1,
                transform: reduce
                  ? `translateX(${d * 64}%) scale(${1 - Math.min(ad, 2) * 0.1})`
                  : `translateX(${d * 58}%) translateZ(${-ad * 90}px) rotateY(${-d * 26}deg) rotateZ(${d * 3.5}deg) scale(${1 - Math.min(ad, 2) * 0.04})`,
              }}
              onClick={() => {
                if (i !== active) go(i);
              }}
            >
              {photo ? <img src={photo.src} alt="" draggable={false} /> : <span className={styles.sleeveBlank} />}
              <span className={styles.sleeveGlare} aria-hidden="true" style={{ opacity: Math.max(0, 0.5 - ad * 0.35) }} />
              {isOpened && (
                <span className={styles.sleeveTick} aria-hidden="true">
                  <HomeIcon name="check" size={14} stroke={2.6} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.arrow} onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous card">
          <HomeIcon name="back" size={20} stroke={2.2} />
        </button>
        <div className={styles.ruler}>
          {cards.map((card, i) => (
            <span key={card.article.id} className={styles.tickSlot} style={{ order: i < Math.ceil(n / 2) ? 0 : 2 }}>
              <button
                type="button"
                className={i === active ? `${styles.tick} ${styles.tickOn}` : styles.tick}
                onClick={() => go(i)}
                aria-label={`Card ${i + 1}: ${card.article.title}`}
                aria-current={i === active || undefined}
              />
            </span>
          ))}
          <button
            type="button"
            className={styles.play}
            style={{ order: 1 }}
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Stop moving through the cards' : 'Move through the cards'}
            aria-pressed={playing}
            disabled={n < 2}
          >
            <HomeIcon name={playing ? 'pause' : 'play'} size={18} stroke={2.6} />
          </button>
        </div>
        <button type="button" className={styles.arrow} onClick={() => go(active + 1)} disabled={active === n - 1} aria-label="Next card">
          <HomeIcon name="next" size={20} stroke={2.2} />
        </button>
      </div>
    </div>
  );
}
