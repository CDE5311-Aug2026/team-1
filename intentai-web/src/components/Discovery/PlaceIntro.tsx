// A place's introduction on Home (owner, 31 Oct 2026: "like a travel notebook, a sailing log, an explorer's journal";
// "pages you turn"). The live 3D view stays on top (Home's map card, framed on the building); under it a notebook whose
// pages turn with a sideways swipe. Owner, 1 Nov 2026: "too many pages here, always a big block of blank space" — so
// three pages at most, each filling its sheet: the field note (the place's stamp, inked when you have checked in and an
// empty ring before, the planning area's tally, check in / save / share / directions in one row, the key numbers as a
// strip of small tiles), the story (clip or picture, the text, then and now, what to look for, how to order), then the
// visit notes and sources. Swiping the deck below changes the place; the ↩ key in the row under the notebook (it stays
// while the pages turn), Esc or Back bring the map back.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlipBook, type BookControls, type BookPage } from '../Notebook/FlipBook';
import { placeCard } from '../../data/explore/placeCards';
import { areaOfPlace, areaProgress, visitedSet } from '../../data/ura/ura';
import { useExplorePersonal } from '../../features/nearby/actions';
import { area as areaById, curatedPlace, regionName } from '../../features/nearby/catalogue';
import { PlaceSources } from '../../features/nearby/card/PlaceStoryCard';
import { KeyNumbers, storyPages } from '../../features/nearby/card/storyPages';
import PlaceInfo from '../../features/nearby/components/PlaceInfo';
import { TOURISM_INFO, tourismOf } from '../../data/tourism';
import { stateOf } from '../../features/nearby/personal';
import styles from './PlaceIntro.module.css';

interface Props {
  placeId: string;
  distance?: string;
  onClose(): void;
  /** Where the notebook is while its pages turn (Home folds the 3D view away with the first page). */
  onTurn?: (position: number) => void;
  /** Filled with the notebook's page controls (Home's ↵ key turns the page). */
  book?: React.MutableRefObject<BookControls | null>;
  /** The deck this place was opened from (its planning area by default), shown under the pages with its progress. */
  deck?: DeckInfo;
}

export interface DeckInfo {
  /** "Planning area", "Editor's Pick", "Near you". */
  kind: string;
  name: string;
  visited: number;
  total: number;
  status: 'done' | 'exploring' | 'none';
}

export function PlaceIntro({ placeId, distance, onClose, onTurn, book, deck: deckProp }: Props) {
  const reduce = useReducedMotionConfig();
  const place = curatedPlace(placeId);
  const personal = useExplorePersonal();
  const visited = useMemo(() => visitedSet(personal), [personal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // A tall phone (Pixel 7): the field note's few lines left most of the page blank. The notebook is held to what the
  // field note needs (--cap), and Home gives the room left to the 3D print above it. Once the print has turned away
  // with the first page, Home lifts the cap so the later pages get the whole height.
  const bookRef = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLElement>(null);
  const [cap, setCap] = useState<number | null>(null);
  useLayoutEffect(() => {
    setCap(null);
    const note = noteRef.current;
    const book = bookRef.current;
    if (!note || !book || typeof ResizeObserver === 'undefined') return undefined;
    // the page's own scroller (FlipBook's sheet): when the cap is too tight the note overflows it
    let sheet: HTMLElement | null = note.parentElement;
    while (sheet && sheet !== book && !/(auto|scroll)/.test(getComputedStyle(sheet).overflowY)) sheet = sheet.parentElement;
    const fit = () => {
      if (!note.clientHeight || !book.offsetHeight) return;
      const kids = [...note.children] as HTMLElement[];
      const gap = parseFloat(getComputedStyle(note).rowGap) || 0;
      const need = kids.reduce((s, k) => s + k.offsetHeight, 0) + gap * Math.max(0, kids.length - 1);
      // not drawn yet (no heading, no buttons): nothing to go by
      if (need < 80) return;
      const over = sheet && sheet !== book ? sheet.scrollHeight - sheet.clientHeight : 0;
      // > 0: blank paper to give away; < 0: the note does not fit and needs that much more
      // (10 px kept under the buttons, for their shadow)
      const delta = over > 1 ? -over - 10 : note.clientHeight - need - 10;
      // a few pixels either way are not worth a new layout
      if (Math.abs(delta) < 8) return;
      setCap((had) => (delta < 0 && had === null ? null : Math.round(book.offsetHeight - delta)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(note);
    ro.observe(book);
    return () => ro.disconnect();
  }, [placeId]);

  if (!place) return null;
  const card = placeCard(place.id);
  const state = stateOf(personal, place.id);
  const isIn = !!state?.visited;
  const ura = areaOfPlace(place.id);
  const prog = ura ? areaProgress(ura.id, visited) : null;
  // the URA planning area, as the deck and the tally below name it
  const areaName = ura?.name ?? areaById(place.areaId)?.name ?? regionName(place.regionId);

  // the deck it belongs to: the one it was opened from, else its planning area
  const deck: DeckInfo | null =
    deckProp ?? (ura && prog && prog.total > 0 ? { kind: 'Planning area', name: ura.name, visited: prog.visited, total: prog.total, status: prog.status } : null);

  // v2: the Tourism 2040 category (the older landmark / culture / food / nature kinds stay off this screen)
  const tourism = tourismOf(place);
  const kindLabel = tourism ? TOURISM_INFO[tourism].label : place.kind;
  const stampDate = state?.visitedOn ? new Date(`${state.visitedOn}T12:00:00`) : null;

  const fieldNote = (
    <header ref={noteRef} className={styles.head} aria-label="Your progress" data-fill>
      <div className={styles.headTop}>
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
        {/* the area is named in the strip under the pages; only without one does the kicker say where */}
        <p className={styles.kicker}>{`Field note · ${kindLabel}${deck ? '' : ` · ${areaName}`}`}</p>
        <h2 className={styles.name} data-long={(card?.title?.join(' ') ?? place.name).length > 40 || undefined}>
          {card?.title?.join(' ') ?? place.name}
        </h2>
        <p className={styles.sub}>
          {place.nameZh && <span lang="zh-Hans">{place.nameZh} · </span>}
          {card?.subtitle ?? place.kind}
          {distance && ` · ${distance}`}
        </p>
      </div>

      <div className={styles.actions}>
        <PlaceInfo place={place} idPrefix="intro" part="actions" />
      </div>

      {card?.tiles && <KeyNumbers tiles={card.tiles} />}
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
            <PlaceInfo place={place} idPrefix="intro" part="details" storyAbove={storyPages(place).length > 0} />
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
      ref={bookRef}
      className={styles.notebook}
      role="dialog"
      aria-label={place.name}
      data-capped={cap !== null || undefined}
      style={cap !== null ? ({ '--cap': `${cap}px` } as React.CSSProperties) : undefined}
      initial={reduce ? false : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
    >
      <div className={styles.bookWrap} data-testid="place-story-card">
        <FlipBook pages={pages} resetKey={place.id} onTurn={onTurn} controls={book} />
      </div>

      {/* under every page: the deck this place belongs to, and how far along it you are */}
      {deck && (
        <div className={styles.deck}>
          <span className={styles.deckKind}>{deck.kind}</span>
          <span className={styles.areaName}>{deck.name}</span>
          <div
            className={styles.bar}
            role="progressbar"
            aria-label={`${deck.name}: ${deck.visited} of ${deck.total} places checked in`}
            aria-valuemin={0}
            aria-valuemax={deck.total}
            aria-valuenow={deck.visited}
          >
            <span data-status={deck.status} style={{ width: `${deck.total ? (deck.visited / deck.total) * 100 : 0}%` }} />
          </div>
          <span className={styles.areaNum}>
            <strong>{deck.visited}</strong>/{deck.total}
          </span>
        </div>
      )}
    </motion.section>
  );
}
