// Hunt (2 Nov 2026): the last page of a story. The guide you have been correcting lies open on the desk; the eight
// corrected pages drop into it one by one, the heavy leather cover swings shut with a thud and a puff of paper dust,
// the CASE CLOSED stamp comes down on it and a wax seal fixes the ribbon. Tap the cover to open the guide again and
// reread any page. Reduced motion shows the closed, stamped book at once.
import React, {useEffect, useState} from 'react';
import './case-finale.css';

const pad = n => String(n).padStart(2, '0');
/** When each beat lands, in ms from the page opening: pages drop, cover shuts, stamp, seal. */
const BEATS = [['shut', 1500], ['stamp', 2600], ['seal', 3200], ['done', 3900]];

export default function CaseFinale({routeId, story, meta, config, game, mode, onOpen, reducedMotion = false}) {
  const [beat, setBeat] = useState(reducedMotion ? 'done' : 'fill');
  const [open, setOpen] = useState(false);
  const total = config.stops.length;

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timers = BEATS.map(([name, at]) => setTimeout(() => setBeat(name), at));
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  const settled = beat === 'done';
  const shown = beat === 'fill' || open;
  const read = i => onOpen({type: 'collected', routeId, index: i, state: game, mode});

  return <div className={'cf' + (reducedMotion ? ' is-still' : '')} data-beat={beat} data-open={shown ? 'true' : 'false'}>
    <div className="cf-book">
      <div className="cf-board" aria-hidden="true"/>
      <div className="cf-block" aria-hidden="true"/>
      <section className="cf-page" aria-label="The corrected guide" aria-hidden={!shown}>
        <header><span>{story.title}</span><b>{pad(total)} / {pad(total)}</b></header>
        <ol>{config.stops.map((s, i) => <li key={s.id} style={{'--i': i, '--tilt': `${((i * 37) % 9) - 4}deg`}}>
          <button onClick={() => read(i)} tabIndex={shown && settled ? 0 : -1}>
            <i>{pad(i + 1)}</i><strong>{s.reward.title.replace(/^[^·]*·\s*/, '')}</strong><b aria-hidden="true">✓</b>
          </button>
        </li>)}</ol>
      </section>
      <button className="cf-cover" onClick={() => settled && setOpen(v => !v)} disabled={!settled}
        aria-label={open ? 'Close the guide' : 'Open the guide'} aria-expanded={open}>
        <span className="cf-cover-front" aria-hidden="true">
          <i className="cf-corner"/><i className="cf-corner"/>
          <small>FindSG · Case {meta?.no}</small>
          <strong>{story.title}</strong>
          <em>{total} pages corrected</em>
          <b className="cf-stamp">Case closed</b>
        </span>
        <span className="cf-cover-back" aria-hidden="true"><small>Ex libris</small><strong>{story.guideName}</strong></span>
      </button>
      <span className="cf-ribbon" aria-hidden="true"><i className="cf-seal">✦</i></span>
    </div>
    {settled && !open && <span className="cf-hint" aria-hidden="true">Tap to open</span>}
    <span className="cf-dust" aria-hidden="true">{Array.from({length: 10}, (_, i) => <i key={i} style={{'--i': i}}/>)}</span>
  </div>;
}
