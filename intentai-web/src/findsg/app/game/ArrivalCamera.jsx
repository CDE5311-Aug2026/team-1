// Hunt (3 Nov 2026, owner): checking in is a photo. At the place, the camera tab opens this viewfinder: photograph the
// place, an AI check (/api/arrive) looks at it against the stop, and "You're here" opens the stop. A photo the check
// does not match can be retaken, or stood by. Without the check (no key on the server, offline) the photo checks you in
// on your word, and the screen says so. The photo is sent once for the check and is not kept.
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

const CameraIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13.2" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>;

export default function ArrivalCamera({place, reducedMotion = false, onArrive, onClose}) {
  const input = useRef(null);
  const ask = useRef(0);
  const [shot, setShot] = useState('');
  const [state, setState] = useState('ready'); // ready · checking · here · not-here · unsure · offline
  const [reason, setReason] = useState('');
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
    setState('checking'); setReason('');
    let small = '';
    try {small = await shrink(f);} catch {small = '';}
    if (n !== ask.current) return;
    if (!small) {setState('unsure'); setReason('That photo could not be read. Try another.'); return;}
    setShot(small);
    let r;
    try {
      const wait = reducedMotion ? 0 : 1400; // the scan is seen even when the answer is quick
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

  return createPortal(<div className="findsg hunt"><div className="ac" role="dialog" aria-modal="true" aria-label={`Check in at ${place.name}`} data-state={state}>
    <header className="ac-top">
      <span className="ac-realm">Real world</span>
      <strong>{place.name}</strong>
      <button className="ac-close" onClick={onClose} aria-label="Close the camera">×</button>
    </header>
    <div className="ac-frame">
      {shot ? <img src={shot} alt="Your check-in photo"/> : <button className="ac-empty" onClick={pick} aria-label="Take a photo of the place">
        <CameraIcon/>
        <span>Photograph {place.name} from where you stand</span>
      </button>}
      <i className="ac-corner"/><i className="ac-corner"/><i className="ac-corner"/><i className="ac-corner"/>
      {state === 'checking' && <span className="ac-scan" aria-hidden="true"/>}
      {result && <span className={'ac-stamp is-' + state} aria-hidden="true">{result.stamp}</span>}
    </div>
    <p className="ac-line" aria-live="polite">
      {state === 'ready' ? 'AI checks the photo shows this place, then the stop opens.'
        : state === 'checking' ? `Checking you are at ${place.name}…`
        : result.line}
    </p>
    <div className="ac-actions">
      {result?.go ? <button className="ac-go" onClick={result.go}>{result.cta} →</button>
        : <button className="ac-shutter" onClick={pick} disabled={state === 'checking'} aria-label={shot ? 'Take another photo' : 'Take a photo'}><CameraIcon/></button>}
      {(state === 'not-here' || state === 'unsure') && <button className="ac-anyway" onClick={() => onArrive('photo-insisted')}>I’m here, carry on</button>}
    </div>
    <small className="ac-fine">The photo is sent once for the check and not kept. Look from public space.</small>
    <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={receive}/>
  </div></div>, document.body);
}
