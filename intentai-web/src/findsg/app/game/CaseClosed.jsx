// Hunt (3 Nov 2026, owner's sketch): the page a finished story turns to. The verdict under a ✓ wax seal (tap it for the
// full story); the brass medal (CASE CLOSED · N STOPS · ON SITE, so nothing below repeats it) hung in a velvet-lined
// shadow box behind glass, with a light that finds it and gold dust in the air; the case's record on a strip of
// certificate paper (every stop stamped, the decoded ones marked with the cipher wheel, a foil seal); and a brass plate
// that takes you back to the shelf.
import React, {Suspense, lazy, useMemo} from 'react';
import {caseRecord, dayOf, tookOf} from './case-record.js';
import './case-closed.css';

const Award3D = lazy(() => import('./Award3D.jsx'));
const pad = n => String(n).padStart(2, '0');

/** In the Hunt book the host closes the book and goes to the shelf; FindSG on its own goes home. */
export function toShelf(fallback) {
  const ev = new CustomEvent('findsg:shelf', {cancelable: true});
  if (window.dispatchEvent(ev)) fallback?.();
}

/** A blob of sealing wax pressed with a ✓: an uneven edge, two drips, a pressed rim and a glossy top. */
function WaxSeal() {
  return <svg className="cc-wax" viewBox="0 0 64 70" aria-hidden="true">
    <defs>
      <radialGradient id="cc-wax-g" cx="38%" cy="32%" r="70%">
        <stop offset="0" stopColor="#e0614a"/><stop offset="0.45" stopColor="#a8291a"/><stop offset="1" stopColor="#5e120a"/>
      </radialGradient>
      <radialGradient id="cc-wax-p" cx="50%" cy="50%" r="50%">
        <stop offset="0.7" stopColor="#8f2014"/><stop offset="1" stopColor="#c7432f"/>
      </radialGradient>
    </defs>
    <path fill="url(#cc-wax-g)" d="M32 4c6 0 9 3 14 4s10 5 11 11 3 9 2 14-1 9-5 13c-2 2-3 4-3 8 0 4-2 6-3 6s-2-2-2-5c0-2-2-2-4-1-3 1-6 3-10 2-2 0-3 2-3 5 0 5-2 7-3 7s-2-3-2-7c0-3-2-5-5-6-5-2-9-6-11-11S3 32 5 26s3-10 8-14 13-8 19-8z"/>
    <circle cx="32" cy="31" r="17.5" fill="url(#cc-wax-p)"/>
    <circle cx="32" cy="31" r="17.5" fill="none" stroke="#5e120a" strokeOpacity="0.55" strokeWidth="1.2"/>
    <circle cx="32" cy="31" r="14.5" fill="none" stroke="#f4a08a" strokeOpacity="0.28" strokeWidth="0.8" strokeDasharray="1.2 2.4"/>
    {/* the ✓, pressed in: a dark lower edge and a lit upper edge */}
    <path d="M23.5 31.5l6 6 11.5-13" fill="none" stroke="#4a0d07" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0.6 0.9)"/>
    <path d="M23.5 31.5l6 6 11.5-13" fill="none" stroke="#f7c2b0" strokeOpacity="0.85" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
    <ellipse cx="22" cy="15" rx="9" ry="4.5" fill="#fff" fillOpacity="0.28" transform="rotate(-28 22 15)"/>
  </svg>;
}

export function ClosedBanner({story, onOpen}) {
  return <button className="ogc-closed" onClick={onOpen} aria-label={`Case closed: ${story.ending.title}. The full story`}>
    <WaxSeal/>
    <h1>{story.ending.title}</h1>
  </button>;
}

export function ClosedAward({meta, config, mode, reducedMotion}) {
  return <div className={'ogc-award cc-case' + (reducedMotion ? ' is-still' : '')}>
    <div className="cc-box">
      <span className="cc-wall" aria-hidden="true"/>
      <span className="cc-ribbon" aria-hidden="true"><i/><i/></span>
      <span className="cc-spot" aria-hidden="true"/>
      <div className="cc-medal">
        <Suspense fallback={null}>
          <Award3D no={meta.no} area={meta.area} stops={config.stops.length} mode={mode} reducedMotion={reducedMotion}/>
        </Suspense>
      </div>
      <span className="cc-dust" aria-hidden="true">{Array.from({length: 14}, (_, i) => <i key={i} style={{'--i': i}}/>)}</span>
      <span className="cc-glass" aria-hidden="true"/>
    </div>
  </div>;
}

/** The cipher wheel a decode card carries, small enough for a stop's stamp. */
// a gold foil seal: a 24-point starburst, an engraved ring and fine rays
const Foil = () => {
  const pts = Array.from({length: 48}, (_, i) => { const a = (i * Math.PI) / 24, r = i % 2 ? 15.2 : 17.5; return `${(18 + r * Math.sin(a)).toFixed(2)},${(18 - r * Math.cos(a)).toFixed(2)}`; }).join(' ');
  return <svg className="cc-foil" viewBox="0 0 36 36" aria-hidden="true">
    <defs><radialGradient id="cc-foil-g" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stopColor="#fff3c4"/><stop offset="0.45" stopColor="#ddb24f"/><stop offset="1" stopColor="#8f6219"/></radialGradient></defs>
    <polygon points={pts} fill="url(#cc-foil-g)" stroke="#7a5216" strokeWidth="0.5"/>
    <circle cx="18" cy="18" r="11.5" fill="none" stroke="#7a5216" strokeWidth="0.7" opacity="0.7"/>
    <circle cx="18" cy="18" r="10.2" fill="none" stroke="#fff1c0" strokeWidth="0.5" opacity="0.8"/>
    {Array.from({length: 16}, (_, i) => <path key={i} d="M18 10.5v3" stroke="#7a5216" strokeWidth="0.6" opacity="0.55" transform={`rotate(${i * 22.5} 18 18)`}/>)}
    <circle cx="18" cy="18" r="3.2" fill="#c99a3e" stroke="#7a5216" strokeWidth="0.6"/>
  </svg>;
};
const Cipher = () => <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="10" r="2" fill="currentColor"/>{Array.from({length: 8}, (_, i) => <path key={i} d="M10 3.6v2.2" stroke="currentColor" strokeWidth="1.4" transform={`rotate(${i * 45} 10 10)`}/>)}</svg>;

export function ClosedRecord({game, config, onShelf}) {
  const r = useMemo(() => caseRecord(game, config.stops), [game, config.stops]);
  const rows = [
    r.started != null && ['Started', dayOf(r.started)],
    r.took != null && ['Took', tookOf(r.took)],
    r.decoded > 0 && ['Decoded', String(r.decoded)],
  ].filter(Boolean);
  return <div className="ogc-card ogc-record">
    <ol className="cc-stops" aria-label="Stops">
      {config.stops.map((s, i) => {
        const found = game.completed.includes(s.id), decoded = game.stops?.[s.id]?.checkin?.method === 'decode-card';
        return <li key={s.id} className={found ? (decoded ? 'is-decoded' : 'is-found') : ''} style={{'--tilt': `${((i * 37) % 11) - 5}deg`}}
          aria-label={`Stop ${i + 1}: ${found ? (decoded ? 'decoded' : 'found') : 'not found'}`}>
          <b aria-hidden="true">{pad(i + 1)}</b>
          <span aria-hidden="true">{found ? (decoded ? <Cipher/> : '✓') : ''}</span>
        </li>;
      })}
    </ol>
    <div className="cc-ledger">
        {rows.length > 0 && <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
        <Foil/>
      </div>
    <button className="ogc-shelf" onClick={onShelf}><i aria-hidden="true"/>Back to the shelf<i aria-hidden="true"/></button>
  </div>;
}
