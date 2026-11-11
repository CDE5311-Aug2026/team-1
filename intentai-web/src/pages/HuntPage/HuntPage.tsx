// Hunt (owner, 1 Nov 2026; flat since batch 3, 10 Nov 2026): story hunts on real streets. Three screens on one page:
// - the landing (no hash): what Hunt is, the public hunts to swipe through, your rank, the public board, your medals
//   and every hunt (landing/HuntLanding.tsx);
// - a board (?board=explore|speed): the leaderboards (Board.tsx);
// - an opened hunt (#story/<id>): its step screen (play/HuntPlay.tsx). An old #short link opens the Golden Dome.
// Old links to the retired parts (?tab=public, ?view=shelf) land on the landing.
import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import PageBar from '../../components/PageBar/PageBar';
import { paths } from '../../routes';
import { Board } from './Board';
import { huntHash, huntOf, type HuntId } from './hunts';
import { HuntLanding } from './landing/HuntLanding';
import { HuntPlay } from './play/HuntPlay';
import bd from './Boards.module.css';

export type HuntGo = (next: Record<string, string | null>, replace?: boolean) => void;

/** Set on the history step of a hunt opened from inside Hunt, so its 〈 steps back instead of replacing. */
interface HuntHistory {
  fromHunt?: boolean;
}

export default function HuntPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // an old link to the Golden Dome (#short/…) is its hunt now
  useEffect(() => {
    if (/^#short/.test(location.hash)) navigate({ pathname: paths.hunt, hash: huntHash('short') }, { replace: true });
  }, [location.hash, navigate]);

  const go: HuntGo = (next, replace = false) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v != null) q.set(k, v);
    setParams(q, { replace });
    document.documentElement.scrollTop = 0;
  };
  const openHunt = (id: HuntId | string) => {
    navigate({ pathname: paths.hunt, search: '', hash: huntHash(id) }, { state: { fromHunt: true } satisfies HuntHistory });
    document.documentElement.scrollTop = 0;
  };

  const playing = huntOf(/^#story\/([\w-]+)/.exec(location.hash)?.[1]);
  if (playing) {
    const fromHunt = (location.state as HuntHistory | null)?.fromHunt;
    // back where you came from in Hunt; opened from elsewhere (Home, Search, a link), back to Hunt's landing
    const back = () => (fromHunt ? navigate(-1) : navigate({ pathname: paths.hunt, search: '', hash: '' }, { replace: true }));
    return (
      <AppShell chrome="status">
        <HuntPlay key={playing.id} id={playing.id} onBack={back} />
      </AppShell>
    );
  }

  const board = params.get('board');
  if (board)
    return (
      <AppShell>
        <div className={bd.page}>
          <PageBar title="Hunt" className={bd.bar} />
          <div className={bd.body}>
            <Board kind={board === 'speed' ? 'speed' : 'explore'} scope={params.get('scope') ?? 'sg'} go={go} openRoute={openHunt} />
          </div>
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <HuntLanding go={go} openHunt={openHunt} />
    </AppShell>
  );
}
