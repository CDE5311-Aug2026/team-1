// The swipeable card row for Home's region and planning-area levels (Discovery redesign, 31 Oct 2026). The card in
// the middle is the selected one: it shows the progress bar and its "explore" action; the smaller cards beside it
// show only their status dot (green: all checked in, yellow: some, red: none).
import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { UnlockProgress } from '../../data/ura/ura';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { nearestCardIndex } from '../PlaceCarousel/PlaceCarousel';
import { useMouseDrag } from '../PlaceCarousel/useMouseDrag';
import styles from './LevelDeck.module.css';

export interface LevelCard {
  id: string;
  name: string;
  kicker: string;
  progress: UnlockProgress;
}

interface Props {
  label: string;
  cards: readonly LevelCard[];
  selectedId: string;
  /** "Explore West", "See 11 places". */
  actionLabel: (card: LevelCard) => string;
  onSelect(id: string): void;
  onEnter(id: string): void;
}

export const STATUS_LABEL = { done: 'all checked in', exploring: 'exploring', none: 'not visited yet' } as const;

const SETTLE_MS = 140;

export function progressLine(p: UnlockProgress): string {
  if (p.total === 0) return 'No places yet';
  return `${p.visited} of ${p.total} ${p.total === 1 ? 'place' : 'places'} checked in`;
}

export function LevelDeck({ label, cards, selectedId, actionLabel, onSelect, onEnter }: Props) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  useMouseDrag(trackRef);
  const selectedIndex = Math.max(
    0,
    cards.findIndex((c) => c.id === selectedId),
  );
  const latest = useRef({ cards, selectedId, onSelect });
  latest.current = { cards, selectedId, onSelect };
  /** scrollLeft of a scroll we started ourselves; its settle is not a user choice. */
  const programmatic = useRef(false);

  const centreOf = (el: HTMLElement) => el.offsetLeft + el.offsetWidth / 2;

  // Cards shrink with their distance from the middle (the "thumbnail" look), every frame while scrolling.
  const shape = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const middle = track.scrollLeft + track.clientWidth / 2;
    for (const card of cardRefs.current) {
      if (!card) continue;
      const d = Math.min(1, Math.abs(centreOf(card) - middle) / Math.max(1, card.offsetWidth));
      card.style.transform = reduced ? '' : `scale(${1 - 0.1 * d})`;
      // at most 10 % fainter: side cards' grey text stays above 4.5:1 (25 % took it to 3.6:1)
      card.style.opacity = String(1 - 0.1 * d);
    }
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      if (programmatic.current) {
        programmatic.current = false;
        return;
      }
      const list = cardRefs.current.slice(0, latest.current.cards.length).filter((c): c is HTMLDivElement => !!c);
      if (!list.length || track.clientWidth === 0) return;
      const i = nearestCardIndex(track.scrollLeft, list.map(centreOf), track.clientWidth);
      const id = latest.current.cards[i]?.id;
      if (id && id !== latest.current.selectedId) latest.current.onSelect(id);
    };
    const onScroll = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          shape();
        });
      clearTimeout(timer);
      timer = setTimeout(settle, SETTLE_MS);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    shape();
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // An outside selection (a pin, Back, the URL) brings its card to the middle.
  const first = useRef(true);
  useEffect(() => {
    const track = trackRef.current;
    const card = cardRefs.current[selectedIndex];
    if (!track || !card || track.clientWidth === 0) return;
    const left = centreOf(card) - track.clientWidth / 2;
    if (Math.abs(track.scrollLeft - left) < 2) {
      shape();
      return;
    }
    programmatic.current = true;
    track.scrollTo({ left, behavior: first.current || reduced ? 'auto' : 'smooth' });
    first.current = false;
    shape();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, cards.length]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if ((e.target as HTMLElement).tagName === 'BUTTON' && (e.target as HTMLElement).dataset.action) return;
    e.preventDefault();
    const next = selectedIndex + (e.key === 'ArrowRight' ? 1 : -1);
    if (next < 0 || next >= cards.length) return;
    onSelect(cards[next].id);
    cardRefs.current[next]?.focus({ preventScroll: true });
  };

  const selected = cards[selectedIndex];
  return (
    <section className={styles.deck} aria-label={label} onKeyDown={onKeyDown}>
      <div ref={trackRef} className={styles.track}>
        {cards.map((card, i) => {
          const isSel = i === selectedIndex;
          const p = card.progress;
          const pct = p.total ? Math.round((p.visited / p.total) * 100) : 0;
          return (
            <div
              key={card.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              role="group"
              aria-roledescription="card"
              aria-label={card.name}
              aria-current={isSel ? 'true' : undefined}
              tabIndex={isSel ? 0 : -1}
              className={`${styles.card} ${isSel ? styles.selected : ''}`}
              data-status={p.status}
              onClick={() => (isSel ? onEnter(card.id) : onSelect(card.id))}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onEnter(card.id);
                }
              }}
            >
              <span className={styles.top}>
                <span className={styles.dot} data-status={p.status} role="img" aria-label={STATUS_LABEL[p.status]} />
                <span className={styles.kicker}>{card.kicker}</span>
                {p.status === 'done' && (
                  <span className={styles.check} aria-hidden="true">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12.5 10 17.5 19 7" />
                    </svg>
                  </span>
                )}
              </span>
              <span className={styles.name}>{card.name}</span>
              <span className={styles.line}>{progressLine(p)}</span>
              {isSel && (
                <>
                  <span
                    className={styles.bar}
                    role="progressbar"
                    aria-label={`${card.name} unlocked`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                  >
                    <span className={styles.fill} style={{ width: `${pct}%` }} />
                  </span>
                  <button type="button" className={styles.action} data-action="enter" onClick={(e) => (e.stopPropagation(), onEnter(card.id))}>
                    {actionLabel(card)}
                    <span aria-hidden="true">→</span>
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className={styles.live} aria-live="polite">
        {selected ? `${selected.name}, ${selectedIndex + 1} of ${cards.length}, ${progressLine(selected.progress)}` : ''}
      </p>
    </section>
  );
}
