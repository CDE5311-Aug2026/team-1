// Hunt (3 Nov 2026, owner's sketch): the page a finished story turns to. The verdict under a ✓ wax seal (tap it for the
// full story), the brass medal on the plate (CASE CLOSED · N STOPS · ON SITE, so nothing below repeats it), the case's
// record in a ledger line, and one button back to the shelf.
import React, {Suspense, lazy, useMemo} from 'react';
import {caseRecord, dayOf, tookOf} from './case-record.js';
import './case-closed.css';

const Award3D = lazy(() => import('./Award3D.jsx'));

/** In the Hunt book the host closes the book and goes to the shelf; FindSG on its own goes home. */
export function toShelf(fallback) {
  const ev = new CustomEvent('findsg:shelf', {cancelable: true});
  if (window.dispatchEvent(ev)) fallback?.();
}

export function ClosedBanner({story, onOpen}) {
  return <button className="ogc-closed" onClick={onOpen} aria-label={`Case closed: ${story.ending.title}. The full story`}>
    <i className="ogc-closed-seal" aria-hidden="true">✓</i>
    <h1>{story.ending.title}</h1>
  </button>;
}

export function ClosedAward({meta, config, mode, reducedMotion}) {
  return <div className="ogc-award">
    <Suspense fallback={null}>
      <Award3D no={meta.no} area={meta.area} stops={config.stops.length} mode={mode} reducedMotion={reducedMotion}/>
    </Suspense>
  </div>;
}

export function ClosedRecord({game, config, onShelf}) {
  const r = useMemo(() => caseRecord(game, config.stops), [game, config.stops]);
  const rows = [
    r.started != null && ['Started', dayOf(r.started)],
    r.took != null && ['Took', tookOf(r.took)],
    r.decoded > 0 && ['Decoded', String(r.decoded)],
  ].filter(Boolean);
  return <div className="ogc-card ogc-record">
    {rows.length > 0 && <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
    <button className="ogc-shelf" onClick={onShelf}>Back to the shelf</button>
  </div>;
}
