// The thumb tabs on an open story's fore-edge (owner's sketch, 3 Nov 2026). Story is the page you are playing; Map
// unfolds the treasure map, every stop marked ✓ or ✗; Clues fans the clue cards with the decode cards and the night
// race. Under them, in blue, how you play: Remote or On site, and Check in, which is there only while the stop waits.
import { useEffect, useState, type CSSProperties } from 'react';
import { currentStop, sendStop, type FindSGStop } from '../../../findsg';
import { PlayLayer } from './layers';
import { MATERIALS } from './Notebook';
import nb from './notebook.module.css';

/** The open stop, as the game reports it. */
export function useStop(): FindSGStop | null {
  const [stop, setStop] = useState<FindSGStop | null>(currentStop);
  useEffect(() => {
    const on = (e: Event) => setStop((e as CustomEvent<FindSGStop | null>).detail);
    window.addEventListener('findsg:stop', on);
    setStop(currentStop());
    return () => window.removeEventListener('findsg:stop', on);
  }, []);
  return stop;
}

export function PlayTabs({ routeId, className = '' }: { routeId: string; className?: string }) {
  const found = useStop();
  const stop = found?.routeId === routeId ? found : null;
  const [open, setOpen] = useState<'map' | 'clues' | null>(null);
  const atStop = stop && stop.phase !== 'intro' && stop.phase !== 'ending';
  const n = (i: number) => ({ '--n': i }) as CSSProperties;
  return (
    <>
      <nav className={`${nb.tabs} ${className}`} style={MATERIALS} aria-label="Story book">
        <button type="button" className={nb.tab} style={n(0)} aria-current="page">
          <span>Story</span>
        </button>
        <button type="button" className={nb.tab} style={n(1)} onClick={() => setOpen('map')}>
          <span>Map</span>
        </button>
        <button type="button" className={nb.tab} style={n(2)} onClick={() => setOpen('clues')} aria-label={stop?.cards ? `Clues, ${stop.cards} decode card${stop.cards > 1 ? 's' : ''}` : 'Clues'}>
          <span>Clues</span>
          {stop?.cards ? (
            <b className={nb.tabCount} aria-hidden="true">
              {stop.cards}
            </b>
          ) : null}
        </button>
        {atStop && (
          <button
            type="button"
            className={`${nb.tab} ${nb.wayTab}`}
            style={n(0)}
            onClick={() => sendStop('mode')}
            aria-label={stop.mode === 'manual' ? 'On site. Switch to remote play' : 'Remote. Switch to on site'}
          >
            <span>{stop.mode === 'manual' ? 'On site' : 'Remote'}</span>
          </button>
        )}
        {stop?.phase === 'arrival' && (
          <button type="button" className={`${nb.tab} ${nb.wayTab} ${nb.checkTab}`} style={n(1)} onClick={() => sendStop('checkin')}>
            <span>{stop.mode === 'manual' ? 'Check in' : 'Start'}</span>
          </button>
        )}
      </nav>
      {open && <PlayLayer routeId={routeId} kind={open} stop={stop} onClose={() => setOpen(null)} />}
    </>
  );
}
