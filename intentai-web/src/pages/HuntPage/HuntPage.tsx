// Hunt (owner, 1 Nov 2026): story hunts on real streets, in IntentAI's design. Two tabs: Stories is the owner's
// FindSG prototype (the short Beneath the Golden Dome, the story wheel and tickets, the four routes; each stop a tap check-in, an
// observation and a 3D building puzzle, with its paper objects and films), re-dressed in our linen, cards and ink by
// src/findsg/theme*.css; Public is the community challenges and the boards. The URL says which shows: ?tab=public,
// ?board=explore|speed; FindSG keeps its own place in the hash (#home, #story/…; an old #short/… link opens the Golden Dome book).
// v2 (board 10): with no book out, Hunt opens on the light field archive (HuntArchive); ?view=shelf is the old shelf.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import PageBar from '../../components/PageBar/PageBar';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import { paths } from '../../routes';
import { FindSGApp } from '../../findsg';
import { useCompactStop } from '../../hooks/useCompactStop';
import { Board } from './Board';
import { HuntArchive, huntStops, HuntHeader, HuntTabs, PublicTab, useExplored } from './HuntHome';
import { CHART_BACKDROP } from './notebook/chartBackdrop';
import { BOOK_TABS, FieldNotebook, openBookAt, reopenBook, useShelfBook } from './notebook/FieldNotebook';
import { bookOf, type BookId } from './notebook/Bookshelf';
import { BOOK_KEY, session } from './notebook/bookSession';
import nb from './notebook/notebook.module.css';
import { ChartPaper } from './notebook/ChartPaper';
import { VolumeBar, VolumeFolio, VolumeHead } from './notebook/VolumeChrome';
import vd from './volumeDesk.module.css';
import bd from './Boards.module.css';
import { FilmHost } from './notebook/FilmProjector';
import { ClueLibrary } from './notebook/layers';
import { MATERIALS } from './notebook/Notebook';
import { grain, wood } from './notebook/textures';
import styles from './Hunt.module.css';

/** The dark sea-chart colour under Hunt's backdrop. */
const CHART_BG = '#1d1711';
/** The light survey chart's paper (v2 board 10), under a volume's pages. */
const PAPER_BG = '#eceae5';

/** FindSG's own place (its hash): its home is the desk with the shelf and tabs; a story or a stop is one notebook page. */
function useFindsgHome() {
  const atHome = () => {
    // an old link to the short story (#short/…): it is the Golden Dome book on the desk now
    if (/^#short/.test(window.location.hash)) {
      try {
        sessionStorage.setItem('hunt-book', 'short');
      } catch {
        /* fine */
      }
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return true;
    }
    return /^#?(home)?$/.test(window.location.hash);
  };
  const [home, setHome] = useState(atHome);
  // the router's own moves (a button here setting #story/…) fire no hashchange, so follow its location too
  // (by key too: back on the book, FindSG has already moved the hash itself, so re-entering the same story looks unchanged)
  const { hash, key } = useLocation();
  useEffect(() => setHome(atHome()), [hash, key]);
  useEffect(() => {
    const on = () => setHome(atHome());
    window.addEventListener('hashchange', on);
    window.addEventListener('findsg:view', on); // sent by FindSG's App (see scripts/hunt/import-findsg.mjs)
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('findsg:view', on);
    };
  }, []);
  return home;
}

export type HuntGo = (next: Record<string, string | null>, replace?: boolean) => void;

export default function HuntPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const home = useFindsgHome();
  const location = useLocation();
  const phone = useCompactStop();
  // the book out on the desk is kept for the visit (a stop's Back writes it before coming home), so read it each time
  const [, bump] = useState(0);
  const shelfBook = bookOf(session.get(BOOK_KEY))?.id ?? null;
  const openBook = (id: BookId) => {
    reopenBook(id);
    bump((n) => n + 1);
    document.documentElement.scrollTop = 0;
  };
  const go: HuntGo = (next, replace = false) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v != null) q.set(k, v);
    setParams(q, { replace });
    document.documentElement.scrollTop = 0;
  };
  /** Into a FindSG story (from a challenge): its route, in the Stories tab. */
  const openRoute = (routeId: string) => {
    navigate({ pathname: '/hunt', search: '', hash: `#story/${routeId}` });
    document.documentElement.scrollTop = 0;
  };
  const board = params.get('board');
  const tab = params.get('tab') === 'public' ? 'public' : 'story';

  // v2 (owner, 8 Nov 2026): the boards and Public sit on the app's chart paper (AppShell) like the field archive
  if (board)
    return (
      <AppShell>
        <div className={bd.page}>
          <PageBar title="Hunt" className={bd.bar} />
          <div className={bd.body}>
            <Board kind={board === 'speed' ? 'speed' : 'explore'} scope={params.get('scope') ?? 'sg'} go={go} openRoute={openRoute} />
          </div>
        </div>
      </AppShell>
    );

  if (tab === 'public')
    return (
      <AppShell>
        <div className={bd.page}>
          <PageBar title="Hunt" className={bd.bar} />
          <div className={bd.body}>
            <HuntTabs tab={tab} go={go} v2 />
            <PublicTab go={go} openRoute={openRoute} />
          </div>
        </div>
      </AppShell>
    );

  // Hunt's first sight (v2, board 10): the field archive. A volume opens its book on the desk (the shelf's own book,
  // with its Story, Map, Clues, Notes and Record tabs); ?view=shelf is the shelf itself; a story or a stop opens
  // FindSG's own game (#story/…), never gated on location.
  if (home && !shelfBook && params.get('view') !== 'shelf')
    return (
      <AppShell>
        <HuntArchive go={go} openBook={openBook} openRoute={openRoute} />
      </AppShell>
    );
  if (home) return <Desk tab={tab} go={go} openRoute={openRoute} onPutBack={() => bump((n) => n + 1)} />;

  // a story or a stop: a page of the same book, with the book's running head and thumb tabs (owner, 3 Nov 2026: every
  // story looks like its book once opened). On a phone the stop page has its own Clues button, which opens over the
  // stop, so its tabs drop Clues. Each tab opens the book at its page; Shelf goes back to the field archive.
  const book = bookOf(/^#story\/([\w-]+)/.exec(location.hash)?.[1] ?? null);
  const toBook = (page: number | null) => {
    openBookAt(page == null ? null : (book?.id ?? null), page ?? 0);
    navigate({ pathname: '/hunt', search: '', hash: '' });
  };

  // board 10 (owner, 8 Nov 2026): the stop's page lies on the same light chart as the book, under "‹ Shelf · Hunt ·
  // Settings" and the volume's head, with the folio under it; the page itself (FindSG's game) is as it was.
  return (
    // On a phone the stop fills the screen over the tab bar, so the bar steps away and the bar's Shelf leads out.
    <AppShell background={book ? PAPER_BG : CHART_BG} chrome={phone && book ? 'status' : 'full'}>
      <div className={`${styles.screen} ${styles.desk} ${book ? vd.volumeDesk : ''}`} style={{ '--wood': wood, '--chart': CHART_BACKDROP } as CSSProperties}>
        {book && <ChartPaper variant="reader" className={vd.fixedPaper} />}
        {/* the header stays while you play: Settings is one tap away in a story too */}
        {book ? <VolumeBar onBack={() => toBook(null)} game className={vd.bar} /> : <PageBar title="Hunt" tone="dark" className={styles.pageBar} game />}
        {book && (
          <>
            <header className={`${styles.bookBar} ${vd.bookBar}`}>
              <VolumeHead roman={book.roman} title={book.title} />
            </header>
            <nav className={`${nb.tabs} ${styles.bookTabs}`} style={MATERIALS} aria-label="Chapters">
              {BOOK_TABS.map((t, i) =>
                phone && t === 'Clues' ? null : (
                  <button key={t} type="button" className={nb.tab} style={{ '--n': i } as CSSProperties} onClick={() => toBook(i)}>
                    <span>{t}</span>
                  </button>
                ),
              )}
              <button type="button" className={`${nb.tab} ${nb.playTab}`} aria-current="page" style={{ '--n': BOOK_TABS.length } as CSSProperties}>
                <span>Play</span>
              </button>
            </nav>
          </>
        )}
        <div className={`findsg hunt ${styles.stories} ${styles.storyPage} ${book ? `${styles.inBook} ${vd.page}` : ''}`} style={{ ...MATERIALS, '--hunt-grain': grain } as CSSProperties}>
          <FindSGApp clues={(routeId, onClose) => <ClueLibrary routeId={routeId} onClose={onClose} />} />
        </div>
        {book && <VolumeFolio n={BOOK_TABS.length + 1} total={BOOK_TABS.length + 1} roman={book.roman} name="Play" className={vd.folio} />}
        <FilmHost />
      </div>
    </AppShell>
  );
}

/** Stories: the shelf of story books against the library wall; a book taken down lies open on the desk. */
function Desk({
  tab,
  go,
  openRoute,
  onPutBack,
}: {
  tab: 'story' | 'public';
  go: HuntGo;
  openRoute(id: string): void;
  /** The book went back on the shelf (Hunt shows the archive again, unless the shelf was asked for). */
  onPutBack(): void;
}) {
  const places = useExplored();
  const stops = useMemo(() => huntStops(), []);
  const navigate = useNavigate();
  const [book, setShelfBook] = useShelfBook();
  const setBook = (id: BookId | null) => {
    setShelfBook(id);
    if (id == null) onPutBack();
  };
  return (
    // the shelf (no book out) lies on the app's chart paper with its turning roses, like the field archive (owner,
    // 9 Nov 2026: only the background changes); a book out keeps its own paper
    <AppShell background={book ? PAPER_BG : undefined}>
      <div className={`${styles.screen} ${styles.desk} ${styles.deskHome} ${book ? '' : styles.deskPaper}`} style={{ '--wood': wood, '--chart': CHART_BACKDROP } as CSSProperties}>
        {/* a book out is read full-screen with its own bar (StoryBook), so the shelf's header steps away */}
        {!book && (
          <>
            <HuntHeader tab={tab} go={go} tone="light" />
            <HuntTabs tab={tab} go={go} />
          </>
        )}
        <FieldNotebook
          explored={places}
          stops={stops}
          book={book}
          onBook={setBook}
          onBoards={() => go({ board: 'explore' })}
          onPassport={() => navigate(paths.mySpace)}
          onRoute={openRoute}
        />
      </div>
    </AppShell>
  );
}
