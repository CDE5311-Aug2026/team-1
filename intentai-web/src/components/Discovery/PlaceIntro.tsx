// A place's introduction on Home (owner, 31 Oct 2026). The live 3D view stays on top (Home's map card, framed on the
// building), and under it a column of cards that scrolls: first the status card (checked in or not as a big dot,
// the planning area's progress, check in / save / share / directions), then the story in its own cards (clip, key
// numbers, then and now, the article, "Look for"), then the visit details. Swiping the deck below changes the place;
// the close button on the 3D view (or Esc, or Back) brings the map back.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { placeCard } from '../../data/explore/placeCards';
import { areaOfPlace, areaProgress, visitedSet } from '../../data/ura/ura';
import { useExplorePersonal } from '../../features/nearby/actions';
import { area as areaById, curatedPlace, regionName } from '../../features/nearby/catalogue';
import PlaceStoryCard from '../../features/nearby/card/PlaceStoryCard';
import PlaceInfo from '../../features/nearby/components/PlaceInfo';
import { CATEGORY_INFO } from '../../features/nearby/domain';
import { shortDate, stateOf } from '../../features/nearby/personal';
import styles from './PlaceIntro.module.css';

interface Props {
  placeId: string;
  distance?: string;
  onClose(): void;
}

const STATUS_TEXT = { done: 'unlocked', exploring: 'exploring', none: 'not started' } as const;

export function PlaceIntro({ placeId, distance, onClose }: Props) {
  const reduce = useReducedMotionConfig();
  const place = curatedPlace(placeId);
  const personal = useExplorePersonal();
  const visited = useMemo(() => visitedSet(personal), [personal]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // a new place from the deck: back to its top
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [placeId]);

  if (!place) return null;
  const card = placeCard(place.id);
  const state = stateOf(personal, place.id);
  const isIn = !!state?.visited;
  const ura = areaOfPlace(place.id);
  const prog = ura ? areaProgress(ura.id, visited) : null;
  const areaName = areaById(place.areaId)?.name ?? regionName(place.regionId);

  return (
    <motion.section
      className={styles.intro}
      role="dialog"
      aria-label={place.name}
      initial={reduce ? false : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
    >
      <div ref={scroller} className={styles.scroll}>
        <section className={styles.status} aria-label="Your progress">
          <p className={styles.kicker}>{`${CATEGORY_INFO[place.category].label} · ${areaName}`}</p>
          <h2 className={styles.name}>{card?.title?.join(' ') ?? place.name}</h2>
          <p className={styles.sub}>
            {place.nameZh && <span lang="zh-Hans">{place.nameZh} · </span>}
            {card?.subtitle ?? place.kind}
            {distance && ` · ${distance}`}
          </p>

          <div className={styles.me} data-in={isIn}>
            <span className={styles.bigDot} role="img" aria-label={isIn ? 'Checked in' : 'Not checked in yet'}>
              {isIn && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </span>
            <div>
              <p className={styles.meLine}>{isIn ? 'You have been here' : 'Not checked in yet'}</p>
              <p className={styles.meSub}>{isIn ? (state?.visitedOn ? `Checked in on ${shortDate(state.visitedOn)}` : 'Checked in') : 'Check in when you visit to count it'}</p>
            </div>
          </div>

          {ura && prog && prog.total > 0 && (
            <div className={styles.area}>
              <div className={styles.areaHead}>
                <span className={styles.areaDot} data-status={prog.status} aria-hidden="true" />
                <span className={styles.areaName}>{ura.name}</span>
                <span className={styles.areaNum}>
                  <strong>{prog.visited}</strong> / {prog.total} · {STATUS_TEXT[prog.status]}
                </span>
              </div>
              <div
                className={styles.bar}
                role="progressbar"
                aria-label={`${ura.name}: ${prog.visited} of ${prog.total} places checked in`}
                aria-valuemin={0}
                aria-valuemax={prog.total}
                aria-valuenow={prog.visited}
              >
                <span data-status={prog.status} style={{ width: `${(prog.visited / prog.total) * 100}%` }} />
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <PlaceInfo place={place} idPrefix="intro" part="actions" />
          </div>
        </section>

        <PlaceStoryCard key={place.id} place={place} framed hideHeader />

        <div className={styles.details}>
          <PlaceInfo place={place} idPrefix="intro" part="details" />
        </div>
      </div>
    </motion.section>
  );
}
