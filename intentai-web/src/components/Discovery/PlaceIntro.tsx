// A place's introduction on Home (owner, 31 Oct 2026: "like a travel notebook, a sailing log, an explorer's journal";
// "pages you turn; small cards you can move about like sticky notes"). The live 3D view stays on top (Home's map card,
// framed on the building); under it a notebook whose pages turn with a sideways swipe: first the field note (the
// place's stamp, inked when you have checked in and an empty ring before, the planning area's tally, check in / save /
// share / directions), then one page for each part of its story (a print you can lift, the key numbers as sticky
// notes, then and now, the story, what to look for), then the visit notes and sources. Swiping the deck below changes
// the place; the close button on the 3D view (or Esc, or Back) brings the map back.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { FlipBook, type BookPage } from '../Notebook/FlipBook';
import { placeCard } from '../../data/explore/placeCards';
import { areaOfPlace, areaProgress, visitedSet } from '../../data/ura/ura';
import { useExplorePersonal } from '../../features/nearby/actions';
import { area as areaById, curatedPlace, regionName } from '../../features/nearby/catalogue';
import { PlaceSources } from '../../features/nearby/card/PlaceStoryCard';
import { storyPages } from '../../features/nearby/card/storyPages';
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!place) return null;
  const card = placeCard(place.id);
  const state = stateOf(personal, place.id);
  const isIn = !!state?.visited;
  const ura = areaOfPlace(place.id);
  const prog = ura ? areaProgress(ura.id, visited) : null;
  const areaName = areaById(place.areaId)?.name ?? regionName(place.regionId);

  const stampDate = state?.visitedOn ? new Date(`${state.visitedOn}T12:00:00`) : null;

  const fieldNote = (
    <header className={styles.head} aria-label="Your progress">
      {/* checked in: the place's stamp in your notebook; not yet: an empty ring waiting for it */}
      <span className={styles.stamp} data-in={isIn} role="img" aria-label={isIn ? 'Checked in' : 'Not checked in yet'}>
        {isIn ? (
          <>
            <small>Visited</small>
            <b>{stampDate ? stampDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase() : 'YES'}</b>
            <small>{stampDate ? stampDate.getFullYear() : 'Singapore'}</small>
          </>
        ) : (
          <>
            <small>Not yet</small>
            <b>·</b>
            <small>stamped</small>
          </>
        )}
      </span>
      <p className={styles.kicker}>{`Field note · ${CATEGORY_INFO[place.category].label} · ${areaName}`}</p>
      <h2 className={styles.name}>{card?.title?.join(' ') ?? place.name}</h2>
      <p className={styles.sub}>
        {place.nameZh && <span lang="zh-Hans">{place.nameZh} · </span>}
        {card?.subtitle ?? place.kind}
        {distance && ` · ${distance}`}
      </p>
      <p className={styles.me}>
        {isIn
          ? state?.visitedOn
            ? `You checked in on ${shortDate(state.visitedOn)}.`
            : 'You have been here.'
          : 'Check in when you visit, and it is stamped here.'}
      </p>

      {ura && prog && prog.total > 0 && (
        <div className={styles.area}>
          <div className={styles.areaHead}>
            <span className={styles.areaName}>{ura.name}</span>
            <span className={styles.areaNum}>
              <strong>{prog.visited}</strong> of {prog.total} places · {STATUS_TEXT[prog.status]}
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
    </header>
  );

  const pages: BookPage[] = [
    { key: 'field-note', label: 'Field note', node: fieldNote },
    ...storyPages(place),
    {
      key: 'notes',
      label: 'Visit notes',
      node: (
        <>
          <div className={styles.notes}>
            <PlaceInfo place={place} idPrefix="intro" part="details" />
          </div>
          <div className={styles.sources}>
            <PlaceSources place={place} />
          </div>
          <p className={styles.end} aria-hidden="true">
            ✦
          </p>
        </>
      ),
    },
  ];

  return (
    <motion.section
      className={styles.notebook}
      role="dialog"
      aria-label={place.name}
      initial={reduce ? false : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
    >
      <span className={styles.strap} aria-hidden="true" />

      <div className={styles.bookWrap} data-testid="place-story-card">
        <FlipBook pages={pages} resetKey={place.id} />
      </div>
    </motion.section>
  );
}
