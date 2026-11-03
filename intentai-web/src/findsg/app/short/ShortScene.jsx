import React, {useEffect, useId, useRef, useState} from 'react';
import {createShortSceneWorld} from './short-scene-world.js';
import './short-scene.css';

/** A scene is presentation and deliberate input only. Arrival, collected
 * evidence and the right to place the bottle always belong to the parent. */
export default function ShortScene({kind = 'press', enabled = false, inspected = false, canPlace = false, placed = false, reducedMotion = false, onInspect, onPlace, onReady}) {
  const mount = useRef(null), world = useRef(null), callbacks = useRef({}), deferred = useRef({observer: null, frame: 0, view: null}), id = useId();
  const [status, setStatus] = useState({ready: false, renderer: '', selected: false, message: ''});
  const [error, setError] = useState('');
  callbacks.current = {onInspect, onPlace, onReady};
  const mosque = kind === 'mosque';
  const cancelDeferred = () => {
    deferred.current.observer?.disconnect();
    if (deferred.current.frame) deferred.current.view?.cancelAnimationFrame(deferred.current.frame);
    deferred.current = {observer: null, frame: 0, view: null};
  };

  useEffect(() => {
    let active = true, session;
    setStatus({ready: false, renderer: '', selected: false, message: ''}); setError('');
    try {
      session = createShortSceneWorld(mount.current, {kind, enabled, inspected, canPlace, placed, reducedMotion,
        onInspect: feature => {if (active) callbacks.current.onInspect?.(feature);},
        onPlace: () => {if (active) callbacks.current.onPlace?.();},
        onStatus: next => {if (active) setStatus(previous => Object.keys(next).every(key => next[key] === previous[key]) ? previous : next);},
        onReady: result => {if (!active) return; if (!result.ok) setError('The building model could not be shown. Please reopen this stop.'); callbacks.current.onReady?.(result);},
      }); world.current = session;
    } catch (failure) {setError('The building model could not be shown. Please reopen this stop.'); callbacks.current.onReady?.({ok: false, ready: false, renderer: '', message: failure?.message});}
    return () => {active = false; cancelDeferred(); session?.dispose(); if (world.current === session) world.current = null;};
    // Changing route kind creates a new exterior; progress updates use setState.
  }, [kind]);
  useEffect(() => {world.current?.setState({enabled, inspected, canPlace, placed, reducedMotion});}, [enabled, inspected, canPlace, placed, reducedMotion]);

  const invoke = (method, value) => {
    cancelDeferred();
    const session = world.current, viewport = mount.current?.parentElement, view = viewport?.ownerDocument.defaultView;
    if (!session || !viewport || !view) return;
    // Mobile controls can be below a fully scrolled-away canvas. Bring the
    // actual scene back first; then use the unchanged camera/ray-checked action.
    // "instant" overrides the page's global smooth scrolling during this step.
    viewport.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'instant'});
    const job = {observer: null, frame: 0, view}; deferred.current = job;
    const run = () => {
      if (deferred.current !== job) return;
      job.observer?.disconnect(); job.observer = null;
      job.frame = view.requestAnimationFrame(() => {
        job.frame = 0;
        if (deferred.current === job && world.current === session) session[method]?.(value);
      });
    };
    if (view.IntersectionObserver) {
      const observer = new view.IntersectionObserver(entries => {if (entries.some(entry => entry.isIntersecting)) run();});
      job.observer = observer; observer.observe(viewport);
    } else job.frame = view.requestAnimationFrame(run);
  };
  const available = status.ready && !error;
  return <section className={`short-scene ss-${mosque ? 'mosque' : 'press'}`} data-renderer={status.renderer} data-enabled={enabled ? 'true' : 'false'} data-inspected={inspected ? 'true' : 'false'} data-placed={placed ? 'true' : 'false'} aria-label={mosque ? 'Sultan Mosque building study' : 'Former Al-Ahmadiah Press building study'}>
    <div className="ss-viewport">
      <div ref={mount} className="ss-world" />
      <div className="ss-topline">
        <div className="ss-observation-label"><span className="ss-led" aria-hidden="true" /><span>{mosque ? '02 / Below the gold' : '01 / Trace the outline'}</span></div>
        <button type="button" className="ss-focus" disabled={!available} onClick={() => invoke('focus')}>{mosque ? 'Closer to the dome' : 'Closer to the arch'}<span aria-hidden="true">↗︎</span></button>
      </div>
      {!available && !error && <p className="ss-loading" role="status">Unfolding the building…</p>}
      {error && <p className="ss-error" role="status">{error}</p>}
      {available && <div className="ss-stage-footer" aria-hidden="true"><span>{placed ? 'Glass ring lit' : inspected ? mosque ? 'Glass band observed' : 'Arch outline traced' : 'Drag to rotate · pinch to zoom'}</span><span>FINDSG / FIELD NOTES</span></div>}
      {mosque && canPlace && !placed && available && <span className={`ss-bottle-label${status.selected ? ' is-selected' : ''}`} aria-hidden="true">{status.dragging ? 'Move to the dark band' : status.selected ? 'Bottle end picked up' : 'Drag this bottle end'}</span>}
    </div>

    <div className="ss-tools" role="group" aria-label="Adjust the building view">
      <div className="ss-orbit-tools">
        <button type="button" disabled={!available} aria-label="Rotate building left" onClick={() => invoke('rotate', .3)}>↶</button>
        <button type="button" disabled={!available} aria-label="Rotate building right" onClick={() => invoke('rotate', -.3)}>↷</button>
        <span className="ss-tool-divider" aria-hidden="true" />
        <button type="button" disabled={!available} aria-label="Zoom in" onClick={() => invoke('zoom', .84)}>＋</button>
        <button type="button" disabled={!available} aria-label="Zoom out" onClick={() => invoke('zoom', 1.18)}>−</button>
      </div>
      <button type="button" className="ss-overview" disabled={!available} onClick={() => invoke('overview')}>Whole building</button>
    </div>

    <p id={`${id}-status`} className={`ss-instruction${status.cue || error ? ' is-cue' : ''}`} role="status" aria-live="polite">{error || status.message || (enabled ? 'Turn the building to find this stop’s detail.' : 'Arrive first and check in at this stop.')}</p>
    <div className="ss-actions">
      {!inspected ? <button type="button" className="ss-primary-action" disabled={!available || !enabled} onClick={() => invoke('inspect')} aria-describedby={`${id}-status`}><span>{mosque ? 'Look at the dark glass band' : 'Touch the curved upper window arch'}</span><span aria-hidden="true">{enabled ? '↗︎' : '○'}</span></button> : mosque && canPlace && !placed ? <>
        <button type="button" className={`ss-select-bottle${status.selected ? ' is-selected' : ''}`} disabled={!available || !enabled} aria-pressed={status.selected} onClick={() => invoke('selectBottle')}><span className="ss-bottle-token" aria-hidden="true" /><span>{status.selected ? 'Put it back' : 'Pick up the glass bottle end'}</span></button>
        <button type="button" className="ss-primary-action ss-place-action" disabled={!available || !enabled || !status.selected} onClick={() => invoke('place')} aria-describedby={`${id}-status`}><span>Set it in the band</span><span aria-hidden="true">↗︎</span></button>
      </> : <div className="ss-confirmed"><span aria-hidden="true">✓</span>{placed ? 'The virtual bottle end is set and the band lights up' : mosque ? 'Glass detail below the dome recorded' : 'Traced arch outline recorded'}</div>}
    </div>
    <p className="ss-model-note">An illustrative building study, not a surveyed reconstruction. {mosque ? 'Setting the bottle end is a story interaction on your phone.' : 'The tracing happens only in the model.'}</p>
  </section>;
}
