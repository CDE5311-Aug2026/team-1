// Hunt (3 Nov 2026, owner): every page says whether it is played in the real world or on the phone. When a page opens,
// a card says which and what to do (tap to begin); after that a small stamp in the page's corner keeps saying it.
// On site: going to the place and looking at the building are REAL; the mechanism is VIRTUAL. Remote: all VIRTUAL.
import React, {useEffect, useState} from 'react';
import './realm.css';

const Pin = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/></svg>;
const Phone = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.8" width="10" height="18.4" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M10.5 18h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;

/** What this page asks of you: real or virtual, a title and one line. Null for pages that are only story. */
export function realmOf({view, mode, place, stop}) {
  const onSite = mode === 'manual';
  if (view === 'arrival') return onSite
    ? {kind: 'real', title: `Go to ${place}`, line: 'Map shows the way. There, tap the camera tab to check in.'}
    : {kind: 'virtual', title: 'Play from home', line: 'No visit needed: tap Start on the blue tab to open this stop.'};
  if (view === 'observe') return onSite
    ? {kind: 'real', title: 'Look at the building', line: `Find it on the building itself: ${stop.observation.detailToFind}`}
    : {kind: 'virtual', title: 'Study the photo', line: 'Find the detail in the reference photo on this page.'};
  if (view === 'puzzle') return {kind: 'virtual', title: 'Solve it on your phone', line: 'Work the 3D mechanism with what you found.'};
  return null;
}

const shown = new Set();
const seenKey = k => `findsg-realm:${k}`;
function seen(k) {
  if (shown.has(k)) return true;
  try {return sessionStorage.getItem(seenKey(k)) === '1';} catch {return false;}
}
function markSeen(k) {
  shown.add(k);
  try {sessionStorage.setItem(seenKey(k), '1');} catch { /* private mode */ }
}

export function RealmStamp({realm}) {
  if (!realm) return null;
  return <span className={'realm-stamp is-' + realm.kind} aria-label={realm.kind === 'real' ? 'Real world' : 'Virtual'}>
    {realm.kind === 'real' ? <Pin/> : <Phone/>}{realm.kind === 'real' ? 'Real' : 'Virtual'}
  </span>;
}

/** The card a page opens with; `id` names the page (route, mode, stop, phase), so each shows once a visit. */
export function RealmCard({realm, id}) {
  const [open, setOpen] = useState(() => !!realm && !seen(id));
  useEffect(() => {setOpen(!!realm && !seen(id));}, [id, realm]);
  if (!open || !realm) return null;
  const close = () => {markSeen(id); setOpen(false);};
  return <button className={'realm-card is-' + realm.kind} onClick={close} aria-label={`${realm.kind === 'real' ? 'Real world' : 'Virtual'}: ${realm.title}. ${realm.line} Tap to begin.`}>
    <span className="realm-kind">{realm.kind === 'real' ? <Pin/> : <Phone/>}{realm.kind === 'real' ? 'Real world' : 'Virtual'}</span>
    <strong>{realm.title}</strong>
    <p>{realm.line}</p>
    <em>Tap to begin</em>
  </button>;
}
