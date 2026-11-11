// The public hunts, right on Hunt's first screen (owner, batch 3): a row of cards you swipe left and right. Each card
// snaps into place with the next one peeking in; the dots under it say where you are and jump to a card. Touch swipes
// natively, a mouse can drag or use the arrows, and the keyboard moves with ← and → on the row (or Tab through the cards).
// The hunts are Hunt's public challenges (data/hunt/challenges.ts); their dates and stops are real, the players are not
// shown here.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CHALLENGES, type Challenge } from '../../../data/hunt/challenges';
import { dateRange } from '../../../data/search/hunt';
import { localToday } from '../../../features/nearby/personal';
import CategoryBadge from '../../../components/Category/CategoryBadge';
import Icon from '../../OnboardingPage/v3/icons';
import { huntImage, type HuntId } from '../hunts';
import styles from './PublicCarousel.module.css';

const dayDiff = (from: string, to: string) => Math.round((Date.parse(from) - Date.parse(to)) / 86400000);

function status(c: Challenge, today: string): { label: string; live: boolean; over: boolean } {
  if (c.to < today) return { label: 'Ended', live: false, over: true };
  if (c.from <= today) return { label: 'On now', live: true, over: false };
  const d = dayDiff(c.from, today);
  return { label: `Starts in ${d} day${d === 1 ? '' : 's'}`, live: false, over: false };
}

export function PublicCarousel({ onOpen, today = localToday() }: { onOpen(routeId: HuntId): void; today?: string }) {
  // running and coming first, then the ones that are over
  const list = [...CHALLENGES].sort((a, b) => Number(a.to < today) - Number(b.to < today) || a.from.localeCompare(b.from));
  const row = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState(0);

  const cards = () => Array.from(row.current?.children ?? []) as HTMLElement[];
  const go = useCallback((i: number) => {
    const el = row.current;
    const card = cards()[Math.max(0, Math.min(i, list.length - 1))];
    if (!el || !card) return;
    const reduce = document.documentElement.dataset.motion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || '0'), behavior: reduce ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  // the dot follows the card that sits most in view
  useEffect(() => {
    const el = row.current;
    if (!el) return undefined;
    const on = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let dist = Infinity;
      cards().forEach((c, i) => {
        const d = Math.abs(c.offsetLeft - el.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < dist) [best, dist] = [i, d];
      });
      // the last card can't reach the middle: at the end of the row it is the one shown
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) best = list.length - 1;
      setAt(best);
    };
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [list.length]);

  // a mouse drags the row (touch and pens scroll it themselves)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const down = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !row.current) return;
    drag.current = { x: e.clientX, left: row.current.scrollLeft, moved: false };
  };
  const move = (e: PointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    if (!d || !row.current) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4 && !d.moved) {
      d.moved = true;
      row.current.setPointerCapture(e.pointerId);
      row.current.dataset.dragging = '';
    }
    if (d.moved) row.current.scrollLeft = d.left - dx;
  };
  const up = (e: PointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved || !row.current) return;
    delete row.current.dataset.dragging;
    row.current.releasePointerCapture?.(e.pointerId);
    // settle on the nearest card, and swallow the click that ends a drag
    go(at);
    const stop = (ev: Event) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    row.current.addEventListener('click', stop, { capture: true, once: true });
    window.setTimeout(() => row.current?.removeEventListener('click', stop, { capture: true }), 0);
  };
  const keys = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = at + (e.key === 'ArrowRight' ? 1 : -1);
      go(next);
      const card = cards()[Math.max(0, Math.min(next, list.length - 1))];
      card?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    }
  };

  if (!list.length) return null;
  return (
    <section className={styles.wrap} aria-roledescription="carousel" aria-labelledby="public-hunts-h">
      <div className={styles.head}>
        <h2 id="public-hunts-h">Public hunts</h2>
        <span className={styles.count} aria-live="polite">
          {at + 1} / {list.length}
        </span>
        <span className={styles.arrows}>
          <button type="button" className={styles.arrow} aria-label="Previous hunt" disabled={at === 0} onClick={() => go(at - 1)}>
            <Icon name="back" size={18} />
          </button>
          <button type="button" className={styles.arrow} aria-label="Next hunt" disabled={at >= list.length - 1} onClick={() => go(at + 1)}>
            <Icon name="chevron" size={18} />
          </button>
        </span>
      </div>
      <ul ref={row} className={styles.row} onKeyDown={keys} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {list.map((c, i) => {
          const st = status(c, today);
          return (
            <li key={c.id} className={styles.slide} aria-roledescription="slide" aria-label={`${i + 1} of ${list.length}`}>
              <button
                type="button"
                className={styles.card}
                onClick={() => onOpen(c.routeId)}
                onFocus={() => i !== at && go(i)}
                aria-label={`${c.title}, ${c.kind} hunt, ${dateRange(c.from, c.to)}, ${c.stops.length} stops. ${st.label}. ${st.live ? 'Join' : 'Open'}`}
              >
                <img className={styles.img} src={huntImage(c.routeId)} alt="" draggable={false} />
                <span className={styles.shade} aria-hidden="true" />
                <span className={`${styles.pill} ${st.live ? styles.live : ''}`}>{st.label}</span>
                <span className={styles.body}>
                  {c.category ? <CategoryBadge category={c.category} variant="pill" suffix={c.kind} className={styles.badge} /> : <span className={styles.kicker}>{c.kind}</span>}
                  <b className={styles.title}>{c.title}</b>
                  <span className={styles.meta}>
                    {dateRange(c.from, c.to)} · {c.stops.length} stops
                  </span>
                </span>
                <span className={styles.cta} aria-hidden="true">
                  {st.live ? 'Join' : st.over ? 'Play' : 'Preview'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className={styles.dots} role="group" aria-label="Choose a public hunt">
        {list.map((c, i) => (
          <button key={c.id} type="button" className={styles.dot} aria-label={`Hunt ${i + 1}: ${c.title}`} aria-current={i === at ? 'true' : undefined} onClick={() => go(i)} />
        ))}
      </div>
    </section>
  );
}
