// Hunt's Stories tab: the story shelf, and the book you take down from it. Each book is one story's field notebook:
// the prologue's is its two-building ticket; a route's has three pages (the sealed commission, the folded treasure map,
// the card box and the chest). Playing a stop opens FindSG's own 3D game; coming back opens the same book at the same
// page.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DisplayCase } from './Cabinet';
import { NotesPage, RecordPage } from './BackPages';
import { recordOf, routeRows } from './record';
import { BookCover, bookOf, Bookshelf, type BookId, type ShelfProgress } from './Bookshelf';
import { chapters as readChapters, shortProgress, type Chapter } from './chapters';
import { ChapterLayers, type Layer } from './layers';
import { Notebook, type NotebookPage } from './Notebook';
import nb from './notebook.module.css';
import { Overlay } from './Overlay';
import { ChapterCardsPage, ChapterLetterPage, ChapterMapPage, placeOf } from './pages';
import { PrologueBook } from './PrologueBook';
import { StoryBook } from './StoryBook';
import styles from './props.module.css';
import shelf from './shelf.module.css';

const session = {
  get(k: string) {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v == null) sessionStorage.removeItem(k);
      else sessionStorage.setItem(k, v);
    } catch {
      /* fine */
    }
  },
};
const BOOK_KEY = 'hunt-book';
const SHELF_KEY = 'hunt-shelf';
const pageKey = (id: string) => `hunt-page-${id}`;

/** Which book is out, kept for the visit (a stop's game sends you back to it). */
export function useShelfBook() {
  const [book, setBookState] = useState<BookId | null>(() => bookOf(session.get(BOOK_KEY))?.id ?? null);
  const setBook = useCallback((id: BookId | null) => {
    setBookState(id);
    session.set(BOOK_KEY, id);
  }, []);
  return [book, setBook] as const;
}


export function FieldNotebook({
  book,
  onBook,
  onPassport,
  onRoute,
}: {
  /** Places you have explored (the boards count these). */
  explored: number;
  /** Stops solved on site. */
  stops: number;
  book: BookId | null;
  onBook(id: BookId | null): void;
  onBoards(): void;
  onPassport(): void;
  onRoute(routeId: string): void;
}) {
  // read again each time a book comes off or goes back on the shelf, so the shelf shows what was just played
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chs = useMemo(() => readChapters(), [book]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const short = useMemo(() => shortProgress(), [book]);
  const [selected, setSelectedState] = useState<BookId>(() => bookOf(session.get(SHELF_KEY))?.id ?? book ?? 'short');
  const setSelected = (id: BookId) => {
    setSelectedState(id);
    session.set(SHELF_KEY, id);
  };
  const progress = useMemo(() => {
    const p = { short: { done: Number(short.deduce) + Number(short.bottle), total: 2 } } as Record<BookId, ShelfProgress>;
    for (const c of chs) p[c.routeId as BookId] = { done: c.solved, total: c.stops.length };
    return p;
  }, [chs, short]);

  // taking a book down: where it was on the shelf (it flies from there), and whether its cover is open yet
  const [from, setFrom] = useState<DOMRect | null>(null);
  const [open, setOpen] = useState(() => book != null);
  const [closing, setClosing] = useState(false);

  function take(id: BookId, rect: DOMRect) {
    setFrom(rect);
    setOpen(false);
    onBook(id);
    setTimeout(() => setOpen(true), 700);
  }
  function putBack() {
    setOpen(false);
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setFrom(null);
      onBook(null);
    }, 900);
  }

  if (!book)
    return (
      <>
        <Bookshelf chapters={chs} short={short} progress={progress} selected={selected} onSelect={setSelected} onOpen={take} />
        <DisplayCase selected={selected} onSelect={setSelected}
          onPassport={onPassport}
          onPick={(id) => {
            setSelected(id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </>
    );

  const def = bookOf(book)!;
  const cover = <BookCover book={def} />;
  return (
    <StoryBook title={def.title} kicker={book === 'short' ? 'Prologue' : `Volume ${def.roman}`} closing={closing} onClose={putBack}>
      <FlyIn from={from}>
        {book === 'short' ? (
          <PrologueBook open={open} onOpen={() => setOpen(true)} cover={cover} />
        ) : (
          <Book key={book} id={book} def={def} chs={chs} open={open} onOpen={() => setOpen(true)} onRoute={onRoute} />
        )}
      </FlyIn>
    </StoryBook>
  );
}

/** The book flies from its spot on the shelf to the middle of the screen (it is drawn there; this undoes the move). */
function FlyIn({ from, children }: { from: DOMRect | null; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    const target = el?.querySelector(`.${nb.book}`)?.getBoundingClientRect();
    if (!el || !from || !target || !target.width) return;
    const s = from.width / target.width;
    el.style.transformOrigin = `${target.left - el.getBoundingClientRect().left}px ${target.top - el.getBoundingClientRect().top}px`;
    el.style.transform = `translate(${from.left - target.left}px, ${from.top - target.top}px) scale(${s})`;
    el.style.transition = 'none';
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.62s cubic-bezier(0.25, 0.9, 0.3, 1)';
        el.style.transform = '';
      }),
    );
    return () => cancelAnimationFrame(raf);
    // only when the book first comes out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={box} className={shelf.fly}>
      {children}
    </div>
  );
}

function Book({
  id,
  def,
  chs,
  open,
  onOpen,
  onRoute,
}: {
  id: BookId;
  def: NonNullable<ReturnType<typeof bookOf>>;
  chs: Chapter[];
  open: boolean;
  onOpen(): void;
  onRoute(routeId: string): void;
}) {
  const [index, setIndexState] = useState(() => Number(session.get(pageKey(id))) || 0);
  const setIndex = useCallback(
    (i: number) => {
      setIndexState(i);
      session.set(pageKey(id), String(i));
    },
    [id],
  );
  const [layer, setLayer] = useState<Layer | null>(null);
  const [reading, setReading] = useState(false);
  useEffect(() => {
    setLayer(null);
    setReading(false);
  }, [id]);

  const ch = chs.find((c) => c.routeId === id);
  const pages: NotebookPage[] = ch
    ? [
        {
          id: `${ch.routeId}-letter`,
          tab: 'Story',
          label: `Vol. ${def.roman} · The letter`,
          render: () => <ChapterLetterPage ch={ch} onRead={() => setReading(true)} onSetOut={() => onRoute(ch.routeId)} />,
        },
        {
          id: `${ch.routeId}-map`,
          tab: 'Map',
          label: `Vol. ${def.roman} · The map`,
          render: () => <ChapterMapPage ch={ch} onUnfold={() => setLayer({ kind: 'map' })} />,
        },
        {
          id: `${ch.routeId}-cards`,
          tab: 'Clues',
          label: `Vol. ${def.roman} · The clue cards`,
          render: () => <ChapterCardsPage ch={ch} onCards={() => setLayer({ kind: 'cards' })} onChest={() => setLayer({ kind: 'ending' })} />,
        },
        {
          id: `${ch.routeId}-notes`,
          tab: 'Notes',
          label: `Vol. ${def.roman} · Field notes`,
          render: () => <NotesPage story={id} stops={ch.stops.map((st) => ({ id: st.id, name: st.name }))} />,
        },
        {
          id: `${ch.routeId}-record`,
          tab: 'Record',
          label: `Vol. ${def.roman} · The record`,
          render: () => <RecordPage record={recordOf(id)} rows={routeRows(ch.routeId, ch.stops)} />,
        },
      ]
    : [];
  const at = Math.min(index, pages.length - 1);

  return (
    <>
      <Notebook
        pages={pages}
        index={at}
        onIndex={setIndex}
        open={open}
        onOpen={onOpen}
        cover={<BookCover book={def} />}
        tone={def.tone}
        strap={false}
        held
        fit
        coverLabel={`Open ${def.title}`}
      />

      {reading && ch && (
        <LetterReader
          ch={ch}
          onClose={() => setReading(false)}
          onFilm={() => {
            setReading(false);
            setLayer({ kind: 'film', reel: ch.intro, title: `Vol. ${def.roman} · The letter` });
          }}
          onSetOut={() => onRoute(ch.routeId)}
        />
      )}
      {/* FindSG plays a route's stops in order, so going out always resumes at the next stop */}
      {ch && <ChapterLayers ch={ch} layer={layer} setLayer={setLayer} onGo={() => onRoute(ch.routeId)} />}
    </>
  );
}

function LetterReader({ ch, onClose, onFilm, onSetOut }: { ch: Chapter; onClose(): void; onFilm(): void; onSetOut(): void }) {
  return (
    <Overlay label={`Commission: ${ch.title}`} onClose={onClose}>
      <article className={styles.readLetter}>
        <p className={styles.readDate}>{placeOf(ch)} · The letter</p>
        <p className={styles.readSalute}>Dear {ch.role.replace(/\s*[(\uFF08].*?[)\uFF09]/, '')},</p>
        {ch.prologue.map((l, i) => (
          <p key={i} className={styles.readLine}>
            {l.text}
          </p>
        ))}
        <p className={styles.readLine}>{ch.mission}</p>
        <p className={styles.readSign}>
          {ch.guide}
          <small>{ch.guideRole}</small>
        </p>
        {ch.intro.length > 0 && (
          <button type="button" className={styles.clippedPhoto} onClick={onFilm}>
            <span className={styles.paperClip} aria-hidden="true" />
            <img src={ch.intro[0].poster} alt="" />
            <span>▶ Film sent with the letter</span>
          </button>
        )}
        <button type="button" className={styles.waxButton} onClick={onSetOut}>
          <span>{ch.solved ? 'Keep looking' : 'Take it on and set out'}</span>
        </button>
      </article>
    </Overlay>
  );
}
