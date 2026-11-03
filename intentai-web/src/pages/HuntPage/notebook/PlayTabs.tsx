// The thumb tabs on an open story's fore-edge (owner's sketch, 3 Nov 2026). Story is the page you are playing; Map
// unfolds the treasure map, every stop marked ✓ or ✗; Clues fans the clue cards with the decode cards and the night
// race. Under them, in blue, how you play: Remote or On site, and Check in, which is there only while the stop waits.
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { currentStop, sendStop, type FindSGStop } from '../../../findsg';
import { BookTour, TOUR, tourSeen } from './BookTour';
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
  // the first story opened: a quick tour of the book before the case is taken (BookTour.tsx)
  const [tour, setTour] = useState(false);
  const [tourAt, setTourAt] = useState(-1);
  useEffect(() => {
    if (stop?.phase !== 'intro' || tourSeen()) return;
    const t = setTimeout(() => setTour(true), 900);
    return () => clearTimeout(t);
  }, [stop?.phase]);
  const onStep = useCallback((i: number) => setTourAt(i), []);
  const showing = (target: string) => tour && TOUR.slice(0, tourAt + 1).some((s) => s.target.includes(`"${target}"`));
  // the tour starts over each time (its first step lights the Map)
  useEffect(() => {
    if (!tour) setTourAt(-1);
  }, [tour]);
  const atStop = (stop && stop.phase !== 'intro' && stop.phase !== 'ending') || showing('mode');
  const n = (i: number) => ({ '--n': i }) as CSSProperties;
  return (
    <>
      <nav className={`${nb.tabs} ${className}`} style={MATERIALS} aria-label="Story book">
        <button type="button" className={nb.tab} style={n(0)} aria-current="page" data-tour="story" onClick={() => setTour(true)} aria-label="Story. Show how the book works">
          <span>Story</span>
        </button>
        <button type="button" className={nb.tab} style={n(1)} onClick={() => setOpen('map')} data-tour="map">
          <span>Map</span>
        </button>
        <button type="button" className={nb.tab} style={n(2)} onClick={() => setOpen('clues')} data-tour="clues" aria-label={stop?.cards ? `Clues, ${stop.cards} decode card${stop.cards > 1 ? 's' : ''}` : 'Clues'}>
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
            data-tour="mode"
            aria-label={stop?.mode === 'manual' ? 'On site. Switch to remote play' : 'Remote. Switch to on site'}
          >
            <span>{stop?.mode === 'manual' ? 'On site' : 'Remote'}</span>
          </button>
        )}
        {(stop?.phase === 'arrival' || showing('checkin')) && (
          <button type="button" className={`${nb.tab} ${nb.wayTab} ${nb.checkTab}`} style={n(1)} onClick={() => sendStop('checkin')} data-tour="checkin">
            <span>{stop?.mode === 'manual' || !stop ? 'Check in' : 'Start'}</span>
          </button>
        )}
      </nav>
      {tour && <BookTour onStep={onStep} onDone={() => setTour(false)} />}
      {open && <PlayLayer routeId={routeId} kind={open} stop={stop} onClose={() => setOpen(null)} />}
    </>
  );
}
