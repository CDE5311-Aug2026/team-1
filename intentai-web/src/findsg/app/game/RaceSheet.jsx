// Hunt (2 Nov 2026): the night race at the Esplanade stop is the EARTH ONLINE F1 drive on the real Marina Bay Street Circuit
// (public/earth-online/sg/f1.html, built by scripts/sync-earth-online.mjs), opened over the stop as one full phone screen.
// The page starts a one-lap race and reports it (earth-online-lite.py: the race bridge); the flag hands the stop its clues.
import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {lockScroll} from '../../../hooks/scrollLock';
import './race-sheet.css';

const SRC = `${import.meta.env.BASE_URL}earth-online/sg/f1.html#at=1.2905,103.8575&f1=race&laps=1&pin=0&cards=0`;

export default function RaceSheet({reducedMotion = false, onWin, onClose}) {
  const frame = useRef(null), ref = useRef(null), won = useRef(false);
  const calls = useRef({onWin, onClose}); calls.current = {onWin, onClose};
  const [race, setRace] = useState(null), [finish, setFinish] = useState(null), [error, setError] = useState(false);

  useEffect(() => {
    const unlock = lockScroll();
    ref.current?.focus();
    const key = e => e.key === 'Escape' && calls.current.onClose();
    const message = e => {
      const d = e.data;
      if (e.source !== frame.current?.contentWindow || !d || d.source !== 'earth-online-lite') return;
      if (d.type === 'f1') {setRace(d); if (d.race !== 'done') setFinish(null);}
      else if (d.type === 'f1-finish') {
        setFinish(d);
        if (!won.current) {won.current = true; calls.current.onWin?.(d);}
      } else if (d.type === 'f1-exit') calls.current.onClose();
      else if (d.type === 'f1-error') setError(true);
    };
    window.addEventListener('keydown', key);
    window.addEventListener('message', message);
    return () => {unlock(); window.removeEventListener('keydown', key); window.removeEventListener('message', message);};
  }, []);

  const again = () => {setFinish(null); frame.current?.contentWindow?.postMessage({source: 'intentai', type: 'f1-again'}, '*');};
  const time = t => t ? `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}` : '–';
  const status = !race ? 'Loading' : race.race === 'grid' || race.race === 'lights' ? 'On the grid' : race.race === 'done' ? 'Chequered flag' : `Lap ${race.lap}/${race.laps}${race.pos ? ` · P${race.pos}` : ''}`;

  // over the app's own bar: the stop page is a stacking context of its own, so the sheet goes to <body>, in the theme's scope
  return createPortal(<div className="findsg hunt race-portal"><div className={'race-sheet' + (reducedMotion ? ' is-still' : '')} role="dialog" aria-modal="true" aria-label="Marina Bay night race" ref={ref} tabIndex={-1}>
    <header className="race-sheet-top">
      <div><span>Marina Bay Street Circuit</span><h2>Night Race</h2></div>
      <b className="race-sheet-status" aria-live="polite">{status}</b>
      <button className="race-sheet-close" onClick={onClose} aria-label="Leave the race">×</button>
    </header>
    <div className="race-sheet-track">
      <iframe ref={frame} src={SRC} title="F1 night race on the Marina Bay Street Circuit" allow="autoplay; fullscreen; gamepad"/>
      {!race && <div className="race-sheet-brief" role="status">
        <i className="race-sheet-lights" aria-hidden="true"><b/><b/><b/><b/><b/></i>
        <h3>{error ? 'The circuit did not load' : 'Lights out soon'}</h3>
        <p>{error ? 'Close the race and fit the postcard by hand instead.' : 'One lap of the street circuit against ten cars. Cross the line and the three clue cards are yours, with a Boost Card for the next stop.'}</p>
        {!error && <ul><li><b>Steer</b>drag the pad</li><li><b>Throttle</b>and <b>Brake</b>right thumb</li></ul>}
      </div>}
      {finish && <div className="race-sheet-finish" role="status">
        <span>Chequered flag · P{finish.pos} of {finish.of} · {time(finish.time)}</span>
        <h3>Clues unlocked</h3>
        <p>Water, the donor and the fountain: the postcard is complete. A Boost Card is in your clue bag.</p>
        <div><button className="race-sheet-go" onClick={onClose}><b>Take the clues</b><i aria-hidden="true">→</i></button><button className="race-sheet-again" onClick={again}>Race again</button></div>
      </div>}
    </div>
  </div></div>, document.body);
}
