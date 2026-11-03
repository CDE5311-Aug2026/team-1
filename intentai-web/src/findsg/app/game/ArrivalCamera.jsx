// Hunt (3 Nov 2026, owner): on site, the camera is how you play. Checking in photographs the place; looking photographs
// the detail. This is the demo: the viewfinder holds the real photo of the stop (loaded ahead, stop-photos.js), the
// shutter "takes" it, the print develops while it is matched, and a stamp says you are checked in. Nothing is sent.
// The look: a field camera in a leather body; the shot flashes, the blades close, the answer is an inked stamp.
import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './arrival-camera.css';

const Pin = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/></svg>;
export const CameraIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13.2" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>;

const WORDS = {
  place: {stamp: 'Checked in', cta: 'Start exploring', label: 'Check in'},
  detail: {stamp: 'Found it', cta: 'Wake the model', label: 'Photograph the detail'},
};

/** `photo` {src, credit, url, art?}: what the viewfinder holds. `kind` 'place' or 'detail'. */
export default function ArrivalCamera({title, photo, kind = 'place', reducedMotion = false, onDone, onClose}) {
  const [state, setState] = useState('ready'); // ready · checking · here
  const [fired, setFired] = useState(0);
  const timer = useRef(0);
  const words = WORDS[kind];
  useEffect(() => {
    const key = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => {window.removeEventListener('keydown', key); window.clearTimeout(timer.current);};
  }, [onClose]);

  const shoot = () => {
    if (state !== 'ready') return;
    setFired(k => k + 1);
    setState('checking');
    timer.current = window.setTimeout(() => setState('here'), reducedMotion ? 300 : 1700);
  };

  return createPortal(<div className="findsg hunt"><div className={'ac' + (reducedMotion ? ' is-still' : '')} role="dialog" aria-modal="true" aria-label={`${words.label}: ${title}`} data-state={state} data-kind={kind}>
    <header className="ac-top">
      <span className="ac-realm"><Pin/>Real world</span>
      <strong>{title}</strong>
      <button className="ac-close" onClick={onClose} aria-label="Close the camera"><span aria-hidden="true">×</span></button>
    </header>

    <div className="ac-body">
      <i className="ac-screw"/><i className="ac-screw"/><i className="ac-screw"/><i className="ac-screw"/>
      <span className="ac-lamp" aria-hidden="true"/>
      <div className="ac-frame">
        {state === 'ready'
          ? <button className="ac-live" onClick={shoot} aria-label={words.label} style={{backgroundImage: `url(${photo.src})`}}/>
          : <img className="ac-print" src={photo.src} alt={title}/>}
        <span className="ac-grid" aria-hidden="true"/>
        <i className="ac-corner"/><i className="ac-corner"/><i className="ac-corner"/><i className="ac-corner"/>
        <span className="ac-demo" aria-label="Demo: a stored photo stands in for yours">Demo</span>
        {photo.credit && (photo.url
          ? <a className="ac-credit" href={photo.url} target="_blank" rel="noreferrer">{photo.credit}</a>
          : <span className="ac-credit">{photo.credit}</span>)}
        {state === 'checking' && <span className="ac-scan" aria-hidden="true"/>}
        {fired > 0 && <span key={'f' + fired} className="ac-flash" aria-hidden="true"/>}
        {fired > 0 && <span key={'i' + fired} className="ac-iris" aria-hidden="true"/>}
        {state === 'here' && <span className="ac-stamp is-here" aria-hidden="true"><span>{words.stamp}</span></span>}
      </div>
    </div>

    <p className="ac-line is-good" aria-live="polite">{state === 'here' ? `${words.stamp} · ${title}` : state === 'checking' ? <><i className="ac-dots" aria-hidden="true"/>Matching</> : ''}</p>

    <div className="ac-actions">
      {state === 'here'
        ? <button className="ac-go" onClick={() => onDone('photo-demo')}>{words.cta}<span aria-hidden="true">→</span></button>
        : <button className={'ac-shutter' + (state === 'ready' ? ' is-ready' : '')} onClick={shoot} disabled={state !== 'ready'} aria-label={words.label}>
          <span className="ac-shutter-button"><CameraIcon/></span>
        </button>}
    </div>
  </div></div>, document.body);
}
