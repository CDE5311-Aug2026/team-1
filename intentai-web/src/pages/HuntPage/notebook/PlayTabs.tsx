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

const ICONS = {
  camera: 'M4 8h3l1.6-2.2h6.8L17 8h3v11H4z M12 9.6a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z',
  play: 'M8 5.5v13l10.5-6.5z',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z M12 7.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z',
  phone: 'M8.8 2.8h6.4a1.8 1.8 0 0 1 1.8 1.8v14.8a1.8 1.8 0 0 1-1.8 1.8H8.8A1.8 1.8 0 0 1 7 19.4V4.6a1.8 1.8 0 0 1 1.8-1.8z M10.5 18h3',
};
function TabIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className={nb.tabIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} fill={name === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
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
            <TabIcon name={stop?.mode === 'manual' ? 'pin' : 'phone'} />
            <span>{stop?.mode === 'manual' ? 'On site' : 'Remote'}</span>
          </button>
        )}
        {(stop?.phase === 'arrival' || showing('checkin')) && (
          <button
            type="button"
            className={`${nb.tab} ${nb.wayTab} ${nb.checkTab}`}
            style={n(1)}
            onClick={() => sendStop('checkin')}
            data-tour="checkin"
            aria-label={stop?.mode === 'manual' || !stop ? 'Check in: photograph the place' : 'Start this stop remotely'}
          >
            <TabIcon name={stop?.mode === 'manual' || !stop ? 'camera' : 'play'} />
            <span>{stop?.mode === 'manual' || !stop ? 'Check in' : 'Start'}</span>
          </button>
        )}
      </nav>
      {tour && <BookTour onStep={onStep} onDone={() => setTour(false)} />}
      {open && <PlayLayer routeId={routeId} kind={open} stop={stop} onClose={() => setOpen(null)} />}
    </>
  );
}
