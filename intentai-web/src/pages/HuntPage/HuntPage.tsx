// Hunt (owner, 1 Nov 2026): story hunts on real streets, in IntentAI's design. Two tabs: Stories is the owner's
// FindSG prototype (the short Beneath the Golden Dome, the story wheel and tickets, the four routes; each stop a tap check-in, an
// observation and a 3D building puzzle, with its paper objects and films), re-dressed in our linen, cards and ink by
// src/findsg/theme*.css; Public is the community challenges and the boards. The URL says which shows: ?tab=public,
// ?board=explore|speed; FindSG keeps its own place in the hash (#home, #story/…; an old #short/… link opens the Golden Dome book).
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import PageBar from '../../components/PageBar/PageBar';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import { paths } from '../../routes';
import { FindSGApp } from '../../findsg';
import { Board } from './Board';
import { huntStops, HuntHeader, HuntTabs, PublicTab, useExplored } from './HuntHome';
import { CHART_BACKDROP } from './notebook/chartBackdrop';
import { FieldNotebook, useShelfBook } from './notebook/FieldNotebook';
import { FilmHost } from './notebook/FilmProjector';
import { ClueLibrary } from './notebook/layers';
import { MATERIALS } from './notebook/Notebook';
import { grain, wood } from './notebook/textures';
import styles from './Hunt.module.css';

/** The dark sea-chart colour under Hunt's backdrop. */
const CHART_BG = '#1d1711';

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

  if (board)
    return (
      <AppShell background={CHART_BG}>
        <div className={`${styles.screen} ${styles.desk} ${styles.deskHome} ${styles.publicDesk} ${styles.boardDesk}`} style={{ '--chart': CHART_BACKDROP } as CSSProperties}>
          <PageBar title="Hunt" tone="dark" className={styles.pageBar} />
          <Board kind={board === 'speed' ? 'speed' : 'explore'} scope={params.get('scope') ?? 'sg'} go={go} openRoute={openRoute} />
        </div>
      </AppShell>
    );

  if (tab === 'public')
    return (
      <AppShell background={CHART_BG}>
        <div className={`${styles.screen} ${styles.desk} ${styles.deskHome} ${styles.publicDesk}`} style={{ '--chart': CHART_BACKDROP } as CSSProperties}>
          <HuntHeader tab={tab} go={go} />
          <HuntTabs tab={tab} go={go} />
          <PublicTab go={go} openRoute={openRoute} />
        </div>
      </AppShell>
    );

  // the Stories tab: the field notebook on the desk; a story or a stop opens FindSG's own game
  if (home) return <Desk tab={tab} go={go} openRoute={openRoute} />;

  // a story or a stop: one big notebook page on the desk
  return (
    <AppShell background={CHART_BG}>
      <div className={`${styles.screen} ${styles.desk}`} style={{ '--wood': wood, '--chart': CHART_BACKDROP } as CSSProperties}>
        {/* the header stays while you play: Help and Settings are one tap away in a story too */}
        <PageBar title="Hunt" tone="dark" className={styles.pageBar} game />
        <div className={`findsg hunt ${styles.stories} ${styles.storyPage}`} style={{ ...MATERIALS, '--hunt-grain': grain } as CSSProperties}>
          <FindSGApp clues={(routeId, onClose) => <ClueLibrary routeId={routeId} onClose={onClose} />} />
        </div>
        <FilmHost />
      </div>
    </AppShell>
  );
}

/** Stories: the shelf of story books against the library wall; a book taken down lies open on the desk. */
function Desk({ tab, go, openRoute }: { tab: 'story' | 'public'; go: HuntGo; openRoute(id: string): void }) {
  const places = useExplored();
  const stops = useMemo(() => huntStops(), []);
  const navigate = useNavigate();
  const [book, setBook] = useShelfBook();
  return (
    <AppShell background={CHART_BG}>
      <div className={`${styles.screen} ${styles.desk} ${styles.deskHome}`} style={{ '--wood': wood, '--chart': CHART_BACKDROP } as CSSProperties}>
        <HuntHeader tab={tab} go={go} />
        <HuntTabs tab={tab} go={go} />
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
