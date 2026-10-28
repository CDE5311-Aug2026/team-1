import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { FACETS, openedCount, type HomePlace, type PlaceProgress } from '../../data/homePlaces';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { showToast } from '../../hooks/useToast';
import styles from './PlaceCarousel.module.css';

/** A photo moves this fraction of its card's distance from the centre, against the card's motion. */
export const PARALLAX = 0.25;
/** Settle fallback for browsers without `scrollend`. */
const SETTLE_MS = 150;

/** Index of the card whose centre is nearest the centre of the visible strip. */
export function nearestCardIndex(scrollLeft: number, cardCentres: number[], viewportWidth: number): number {
  const centre = scrollLeft + viewportWidth / 2;
  let best = 0;
  cardCentres.forEach((c, i) => {
    if (Math.abs(c - centre) < Math.abs(cardCentres[best] - centre)) best = i;
  });
  return best;
}

interface Props {
  places: readonly HomePlace[];
  selectedId: string;
  progress: PlaceProgress;
  onSelect(id: string): void;
  onActivate(id: string): void;
  onOpen(id: string): void;
}

const cardCentre = (card: HTMLElement) => card.offsetLeft + card.offsetWidth / 2;

export function PlaceCarousel({ places, selectedId, progress, onSelect, onActivate, onOpen }: Props) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  /** scrollLeft we are scrolling to for an outside selection; settles are ignored while set. */
  const programmaticTarget = useRef<number | null>(null);
  const mounted = useRef(false);
  const latest = useRef({ places, selectedId, onSelect, reduced });
  latest.current = { places, selectedId, onSelect, reduced };

  const selectedIndex = Math.max(0, places.findIndex((p) => p.id === selectedId));
  const selected = places[selectedIndex];

  const cards = () => cardRefs.current.slice(0, latest.current.places.length).filter((c): c is HTMLDivElement => c !== null);

  const applyParallax = () => {
    const track = trackRef.current;
    if (!track) return;
    const centre = track.scrollLeft + track.clientWidth / 2;
    cardRefs.current.forEach((card, i) => {
      const photo = photoRefs.current[i];
      if (!card || !photo) return;
      if (latest.current.reduced || track.clientWidth === 0) {
        photo.style.transform = '';
        return;
      }
      const w = card.offsetWidth;
      const offset = Math.max(-w, Math.min(w, cardCentre(card) - centre));
      photo.style.transform = `translateX(${-offset * PARALLAX}px)`;
    });
  };

  // Scroll settle → selection, and the rAF-throttled parallax.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;

    const settle = () => {
      clearTimeout(timer);
      timer = undefined;
      if (programmaticTarget.current !== null) {
        programmaticTarget.current = null;
        return;
      }
      const list = cards();
      if (list.length === 0 || track.clientWidth === 0) return;
      const i = nearestCardIndex(track.scrollLeft, list.map(cardCentre), track.clientWidth);
      const { places: current, selectedId: sel, onSelect: select } = latest.current;
      const id = current[i]?.id;
      if (id && id !== sel) select(id);
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, SETTLE_MS);
      if (!latest.current.reduced && frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          applyParallax();
        });
      }
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    track.addEventListener('scrollend', settle);
    window.addEventListener('resize', applyParallax);
    return () => {
      clearTimeout(timer);
      if (frame !== 0) cancelAnimationFrame(frame);
      track.removeEventListener('scroll', onScroll);
      track.removeEventListener('scrollend', settle);
      window.removeEventListener('resize', applyParallax);
    };
    // Mount-only: props are read through `latest`.
  }, []);

  // Turning reduced motion on drops the photo offsets; turning it off restores them.
  useEffect(applyParallax, [reduced]);

  // An outside selection (pin, arrows, Locate) scrolls the carousel itself, never the page.
  useEffect(() => {
    const track = trackRef.current;
    const card = cardRefs.current[selectedIndex];
    const first = !mounted.current;
    mounted.current = true;
    if (!track || !card) return;
    const left = cardCentre(card) - track.clientWidth / 2;
    if (Math.abs(left - track.scrollLeft) < 2) return;
    programmaticTarget.current = left;
    track.scrollTo({ left, behavior: first || latest.current.reduced ? 'auto' : 'smooth' });
  }, [selectedIndex, selectedId]);

  /** Any user input on the strip means the user owns the scroll again. */
  const handBack = () => {
    programmaticTarget.current = null;
  };

  const onSectionKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const next = selectedIndex + (e.key === 'ArrowRight' ? 1 : -1);
    if (next < 0 || next >= places.length) return;
    onSelect(places[next].id);
    cardRefs.current[next]?.focus({ preventScroll: true });
  };

  const onCardKeyDown = (e: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onActivate(id);
  };

  const open = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    onOpen(id);
  };

  const soon = (e: MouseEvent, name: string) => {
    e.stopPropagation();
    showToast(`Culture cards for ${name} are coming soon`);
  };

  return (
    <section
      className={styles.root}
      aria-roledescription="carousel"
      aria-label="Nearby places"
      onKeyDown={onSectionKeyDown}
    >
      <div
        ref={trackRef}
        className={styles.track}
        onPointerDown={handBack}
        onWheel={handBack}
        onTouchStart={handBack}
        onKeyDown={handBack}
      >
        {places.map((place, i) => {
          const isSelected = i === selectedIndex;
          const opened = openedCount(progress, place.id);
          return (
            <div
              key={place.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              role="group"
              aria-label={place.name}
              aria-current={isSelected ? 'true' : undefined}
              tabIndex={isSelected ? 0 : -1}
              className={styles.card}
              onClick={() => onActivate(place.id)}
              onKeyDown={(e) => onCardKeyDown(e, place.id)}
            >
              <div
                ref={(el) => {
                  photoRefs.current[i] = el;
                }}
                className={place.photo ? styles.photo : `${styles.photo} ${styles.noPhoto}`}
                data-parallax=""
              >
                {place.photo && <img src={place.photo} alt={place.photoAlt} draggable={false} />}
              </div>
              <div className={styles.content}>
                <span className={styles.chip}>
                  <PinIcon />
                  {place.distance}
                </span>
                <div className={styles.text}>
                  <p className={styles.name}>{place.name}</p>
                  <p className={styles.area}>{place.area}</p>
                </div>
                <div className={styles.footer}>
                  <div className={styles.bar} aria-hidden="true">
                    {FACETS.map((f, k) => (
                      <span key={f} className={styles.segment} data-filled={k < opened ? 'true' : 'false'} />
                    ))}
                  </div>
                  <p className={styles.count}>
                    {opened} of {FACETS.length}{' '}
                    <span className={styles.countLabel}>opened</span>
                  </p>
                  {place.hasCards ? (
                    <button type="button" className={styles.open} onClick={(e) => open(e, place.id)}>
                      Open <span className={styles.arrow} aria-hidden="true">→</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.soon}
                      aria-disabled="true"
                      onClick={(e) => soon(e, place.name)}
                    >
                      <LockIcon />
                      Cards soon
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.dots} aria-hidden="true">
        {places.map((p, i) => (
          <span key={p.id} className={i === selectedIndex ? `${styles.dot} ${styles.dotOn}` : styles.dot} />
        ))}
      </div>
      <p aria-live="polite" className={styles.visuallyHidden}>
        {selected ? `${selected.name}, ${selectedIndex + 1} of ${places.length}, ${selected.distance}` : ''}
      </p>
    </section>
  );
}

function PinIcon() {
  return (
    <svg className={styles.pin} viewBox="0 0 12 16" width="9" height="12" aria-hidden="true" focusable="false">
      <path d="M6 0a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6Zm0 8.5A2.5 2.5 0 1 1 6 3.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className={styles.lock} viewBox="0 0 12 14" width="10" height="12" aria-hidden="true" focusable="false">
      <path d="M3 6V4a3 3 0 0 1 6 0v2h.5A1.5 1.5 0 0 1 11 7.5v5A1.5 1.5 0 0 1 9.5 14h-7A1.5 1.5 0 0 1 1 12.5v-5A1.5 1.5 0 0 1 2.5 6H3Zm1.5 0h3V4a1.5 1.5 0 0 0-3 0v2Z" />
    </svg>
  );
}
