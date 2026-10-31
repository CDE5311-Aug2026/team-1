// Home › Nearby: a strip of small cards, one per real Nearby place, over the map. Swipe (touch), drag (mouse) or
// scroll (trackpad); the card in the middle is the selected pin on the map, and a tapped pin brings its card in.
// A tap on a card opens that place in Nearby. Only cards near the visible ones load their picture.
import { homePlaceHref } from '../../data/homeLinks';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotionConfig } from 'motion/react';
import groundUrl from '../../assets/nearby/sg-ground.webp';
import { groundCrop, placePicture } from '../../data/home/nearbyCards';
import type { CuratedPlace } from '../../features/nearby/domain';
import HomeIcon from './shared/HomeIcon';
import styles from './NearbyStrip.module.css';

export interface StripItem {
  place: CuratedPlace;
  checkedIn: boolean;
  saved: boolean;
  distance?: string;
}

interface Props {
  items: StripItem[];
  active: number;
  onActive: (index: number) => void;
}

const CATEGORY: Record<string, string> = { landmark: 'Landmark', food: 'Food', culture: 'Culture', nature: 'Nature' };
/** Pictures load for the cards within this many of the centre one. */
const NEAR = 4;

export default function NearbyStrip({ items, active, onActive }: Props) {
  const navigate = useNavigate();
  const reduce = useReducedMotionConfig();
  const scroller = useRef<HTMLDivElement>(null);
  const current = useRef(active);
  const programmatic = useRef(false);
  const settle = useRef<number>();
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [centre, setCentre] = useState(active);

  const cards = () => Array.from(scroller.current?.querySelectorAll<HTMLElement>('[data-card]') ?? []);

  const nearest = useCallback(() => {
    const el = scroller.current;
    if (!el) return 0;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let gap = Infinity;
    cards().forEach((card, i) => {
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - mid);
      if (d < gap) {
        gap = d;
        best = i;
      }
    });
    return best;
  }, []);

  const onScroll = () => {
    const i = nearest();
    setCentre(i);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      if (programmatic.current) {
        programmatic.current = false;
        return;
      }
      if (i !== current.current) {
        current.current = i;
        onActive(i);
      }
    }, 140);
  };

  useEffect(() => () => window.clearTimeout(settle.current), []);

  // A tapped pin (or a new order) brings its card to the middle.
  useEffect(() => {
    if (active === current.current) return;
    current.current = active;
    setCentre(active);
    const el = scroller.current;
    const card = cards()[active];
    if (!el || !card) return;
    programmatic.current = true;
    const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
    if (typeof el.scrollTo === 'function') el.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
    else el.scrollLeft = left;
  }, [active, reduce]);

  // Mouse drag (touch already swipes natively). A drag never opens a card.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !scroller.current) return;
    drag.current = { x: e.clientX, left: scroller.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = scroller.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = '';
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = scroller.current;
    drag.current = null;
    if (!d?.moved || !el) return;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    delete el.dataset.dragging;
    // Snap to the nearest card, then swallow the click that ends the drag.
    const card = cards()[nearest()];
    if (card) el.scrollTo?.({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    const swallow = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    el.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
  };

  return (
    <div
      ref={scroller}
      className={styles.strip}
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="list"
      aria-label={`${items.length} places nearby`}
      data-allow-bleed
    >
      {items.map(({ place, checkedIn, saved, distance }, i) => {
        const picture = placePicture(place);
        const load = Math.abs(i - centre) <= NEAR;
        return (
          <div key={place.id} role="listitem" data-card className={i === active ? `${styles.card} ${styles.on}` : styles.card}>
            <button
              type="button"
              className={styles.hit}
              onClick={() => navigate(homePlaceHref(place.id))}
              onFocus={() => {
                if (current.current !== i) {
                  current.current = i;
                  setCentre(i);
                  onActive(i);
                }
              }}
              aria-label={`${place.name}, ${CATEGORY[place.category] ?? place.kind}${distance ? `, ${distance}` : ''}${checkedIn ? ', checked in' : ''}. Open in Nearby`}
            >
              <span
                className={picture.kind === '2d' ? `${styles.pic} ${styles.ground}` : styles.pic}
                style={picture.kind === '2d' && load ? { backgroundImage: `url("${groundUrl}")`, ...groundCrop(place.coordinates) } : undefined}
                aria-hidden="true"
              >
                {picture.src && load && <img src={picture.src} alt="" loading="lazy" decoding="async" draggable={false} />}
                {picture.kind === '2d' && <i className={styles.dot} />}
                {(checkedIn || saved) && (
                  <span className={styles.badge}>
                    <HomeIcon name={checkedIn ? 'check' : 'pin'} size={11} stroke={2.4} />
                    {checkedIn ? 'Checked in' : 'Saved'}
                  </span>
                )}
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{place.name}</span>
                <span className={styles.meta}>
                  {CATEGORY[place.category] ?? place.kind}
                  {distance ? ` · ${distance}` : ''}
                </span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
