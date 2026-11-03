// Hunt (3 Nov 2026, owner): checking in is a photo. At the place, the camera tab opens this viewfinder: photograph the
// place, an AI check (/api/arrive) looks at it against the stop, and "You're here" opens the stop. A photo the check
// does not match can be retaken, or stood by. Without the check (no key on the server, offline) the photo checks you in
// on your word, and the screen says so. The photo is sent once for the check and is not kept.
// The look (3 Nov 2026): a field camera in a leather body; the shot flashes, the blades close, the print develops while
// the scan runs, and the answer comes down as an inked rubber stamp.
import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './arrival-camera.css';

/** A phone photo, made small enough to send: longest side 1280px, JPEG. */
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, fail) => {const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url;});
    const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  } finally {URL.revokeObjectURL(url);}
}

async function check(dataUrl, place) {
  const res = await fetch('/api/arrive', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({image: {mediaType: 'image/jpeg', data: dataUrl.split(',')[1]}, place}),
  });
  if (!res.ok) return {decision: 'offline'};
  const r = await res.json();
  return r?.decision ? r : {decision: 'offline'};
}

const Pin = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/></svg>;
const CameraIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13.2" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>;

export default function ArrivalCamera({place, reducedMotion = false, onArrive, onClose}) {
  const input = useRef(null);
  const ask = useRef(0);
  const [shot, setShot] = useState('');
  const [state, setState] = useState('ready'); // ready · checking · here · not-here · unsure · offline
  const [reason, setReason] = useState('');
  const [fired, setFired] = useState(0); // each shot: the flash and the shutter blades
  useEffect(() => {
    const key = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => {window.removeEventListener('keydown', key); ask.current++;};
  }, [onClose]);

  const pick = () => input.current?.click();
  async function receive(e) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f || !/^image\//.test(f.type || 'image/')) return;
    const n = ++ask.current;
    setFired(k => k + 1);
    setState('checking'); setReason('');
    let small = '';
    try {small = await shrink(f);} catch {small = '';}
    if (n !== ask.current) return;
    if (!small) {setState('unsure'); setReason('That photo could not be read. Try another.'); return;}
    setShot(small);
    let r;
    try {
      const wait = reducedMotion ? 0 : 1600; // the print develops and the scan is seen even when the answer is quick
      [r] = await Promise.all([check(small, place), new Promise(ok => setTimeout(ok, wait))]);
    } catch {r = {decision: 'offline'};}
    if (n !== ask.current) return;
    const here = r.decision === 'here' && (r.confidence ?? 0) >= 0.6;
    setState(here ? 'here' : r.decision === 'here' ? 'unsure' : r.decision);
    setReason(r.reason || '');
  }

  const result = {
    here: {stamp: 'You’re here', line: reason || `This is ${place.name}.`, go: () => onArrive('photo-ai'), cta: 'Start exploring'},
    offline: {stamp: 'Checked in', line: 'The AI check isn’t connected, so you’re checked in on your word.', go: () => onArrive('photo-unchecked'), cta: 'Start exploring'},
    'not-here': {stamp: 'Not here yet', line: reason || `This doesn’t look like ${place.name}.`},
    unsure: {stamp: 'Can’t tell', line: reason || 'The photo is too dark or too close. Step back and try again.'},
  }[state];
  const good = state === 'here' || state === 'offline';

  return createPortal(<div className="findsg hunt"><div className={'ac' + (reducedMotion ? ' is-still' : '')} role="dialog" aria-modal="true" aria-label={`Check in at ${place.name}`} data-state={state}>
    <header className="ac-top">
      <span className="ac-realm"><Pin/>Real world</span>
      <strong>{place.name}</strong>
      <button className="ac-close" onClick={onClose} aria-label="Close the camera"><span aria-hidden="true">×</span></button>
    </header>

    {/* the camera: a leather body, brass screws, the ready lamp and the viewfinder */}
    <div className="ac-body">
      <i className="ac-screw"/><i className="ac-screw"/><i className="ac-screw"/><i className="ac-screw"/>
      <span className="ac-lamp" aria-hidden="true"/>
      <div className="ac-frame">
        {shot ? <img key={shot} className="ac-print" src={shot} alt="Your check-in photo"/> : <button className="ac-empty" onClick={pick} aria-label="Take a photo of the place">
          <span className="ac-patch" aria-hidden="true"/>
        </button>}
        <span className="ac-grid" aria-hidden="true"/>
        <i className="ac-corner"/><i className="ac-corner"/><i className="ac-corner"/><i className="ac-corner"/>
        {state === 'checking' && <span className="ac-scan" aria-hidden="true"/>}
        {fired > 0 && <span key={'f' + fired} className="ac-flash" aria-hidden="true"/>}
        {fired > 0 && <span key={'i' + fired} className="ac-iris" aria-hidden="true"/>}
        {result && <span className={'ac-stamp is-' + state} aria-hidden="true"><span>{result.stamp}</span></span>}
      </div>
    </div>

    {state === 'ready'
      ? <p className="ac-slip"><b>Frame</b>{place.address || place.name}</p>
      : <p className={'ac-line' + (good ? ' is-good' : state === 'checking' ? '' : ' is-bad')} aria-live="polite">
        {state === 'checking' ? <><i className="ac-dots" aria-hidden="true"/>Checking you are at {place.name}</> : result.line}
      </p>}

    <div className="ac-actions">
      {result?.go ? <button className="ac-go" onClick={result.go}>{result.cta}<span aria-hidden="true">→</span></button>
        : <button className={'ac-shutter' + (state === 'ready' ? ' is-ready' : '')} onClick={pick} disabled={state === 'checking'} aria-label={shot ? 'Take another photo' : 'Take a photo'}>
          <span className="ac-shutter-button"><CameraIcon/></span>
        </button>}
      {(state === 'not-here' || state === 'unsure') && <button className="ac-anyway" onClick={() => onArrive('photo-insisted')}>I’m here, carry on</button>}
    </div>
    <small className="ac-fine">The photo is sent once for the check and not kept. Look from public space.</small>
    <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={receive}/>
  </div></div>, document.body);
}
