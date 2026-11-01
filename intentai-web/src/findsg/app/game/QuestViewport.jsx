import React, {useEffect, useRef, useState} from 'react';
import {createQuestState, isQuestSolved} from './quest-logic.js';
import './quest-viewport.css';

const NAMES = {'rotate-find': 'Turn and find', sequence: 'Tap in order', align: 'Line up the mark', slide: 'Slide the cover', assemble: 'Fit the parts'};
const HINTS = {
  'rotate-find': 'Drag empty space to rotate the building, then tap the hidden object.',
  sequence: 'Tap the raised details on the building in the order the clue gives.',
  align: 'Hold the brass dial and turn it until the pointer meets the fixed orange mark.',
  slide: 'Hold the panel by its handle and slide it along the track, then take the clue behind it.',
  assemble: 'Drag each part from the tray onto the outline it fits, from the ground up. Tapping a part, then its outline, works too.',
};

/** Parent owns verified location gates, persistent actions and rewards.
 * This component owns only the tangible, replayable model interaction. */
export default function QuestViewport({
  routeId, stopId, modelKind = 'shophouse', quest, enabled = false, progress,
  reducedMotion = false, onAction, onComplete, onStatus,
}) {
  const host = useRef(null), engine = useRef(null);
  const callbacks = useRef({onAction, onComplete, onStatus}); callbacks.current = {onAction, onComplete, onStatus};
  const current = useRef({enabled, progress, reducedMotion}); current.current = {enabled, progress, reducedMotion};
  const [phase, setPhase] = useState('loading'), [renderer, setRenderer] = useState('loading'), [retry, setRetry] = useState(0);
  const [snapshot, setSnapshot] = useState({status: 'locked', message: '', visibleIds: [], value: progress?.value || 0, selectedId: null});
  const [view, setView] = useState('overview');
  const configKey = JSON.stringify(quest || {});
  const state = progress || createQuestState(quest), solved = isQuestSolved(quest, state);

  useEffect(() => {
    let alive = true, instance = null, surface = null;
    setPhase('loading'); setRenderer('loading'); setView('overview');
    setSnapshot({status: 'locked', message: '', visibleIds: [], value: current.current.progress?.value || 0, selectedId: null});
    async function open() {
      try {
        const module = await import('./quest-engine.js');
        if (!alive || !host.current) return;
        surface = host.current.ownerDocument.createElement('div'); surface.className = 'quest-render-surface'; host.current.append(surface);
        instance = module.createQuestWorld(surface, {
          routeId, stopId, modelKind, quest, ...current.current,
          onAction: action => {if (alive) callbacks.current.onAction?.(action);},
          onComplete: () => {if (alive) callbacks.current.onComplete?.();},
          onStatus: value => {if (!alive) return; setSnapshot(value); callbacks.current.onStatus?.(value);},
          onReady: result => {if (!alive) return; setPhase(result?.ok === false ? 'error' : 'ready'); setRenderer(result?.engine || 'unavailable');},
        });
        if (!alive) {instance.dispose(); surface.remove(); return;}
        engine.current = instance; instance.setProgress(current.current.progress || createQuestState(quest)); instance.setEnabled(current.current.enabled); instance.getStatus();
      } catch (error) {
        if (!alive) return;
        instance?.dispose(); surface?.remove(); engine.current = null; setPhase('error'); setRenderer('unavailable');
        callbacks.current.onStatus?.({engine: 'unavailable', status: 'error', message: error?.message || 'The mechanism model did not load.', visibleIds: []});
      }
    }
    void open();
    return () => {alive = false; if (engine.current === instance) engine.current = null; instance?.dispose(); surface?.remove();};
  }, [routeId, stopId, modelKind, configKey, retry]);

  useEffect(() => {engine.current?.setProgress(progress || createQuestState(quest));}, [progress]);
  useEffect(() => {engine.current?.setEnabled(enabled);}, [enabled]);
  useEffect(() => {engine.current?.setMotion(reducedMotion);}, [reducedMotion]);

  const available = id => phase === 'ready' && enabled && !solved && snapshot.visibleIds.includes(id);
  const chooseView = id => {setView(id); engine.current?.setView(id);};
  const canOperate = phase === 'ready' && enabled && !solved;
  const pieces = (quest?.items || []).filter(item => item?.id && item.role !== 'decoration');
  const count = quest?.type === 'sequence' ? state.sequence.length : quest?.type === 'assemble' ? state.placed.length : state.found.length;
  const total = quest?.type === 'sequence' ? (quest.sequence || pieces).length : pieces.length;
  const statusMessage = snapshot.message || (enabled ? HINTS[quest?.type] : 'The mechanism lights up once you check in and observe the site.');

  return <section className={'quest-viewport is-' + phase + (enabled ? ' is-enabled' : ' is-locked') + (solved ? ' is-solved' : '')} data-renderer={renderer} data-quest-type={quest?.type} aria-label={quest?.title || 'Place mechanism'}>
    <div className="quest-stage">
      <div className="quest-host" ref={host}/>
      <div className="quest-stage-top">
        <span className="quest-mechanism-name"><i aria-hidden="true"/>{NAMES[quest?.type] || 'Place mechanism'}</span>
        <div className="quest-camera-controls" role="group" aria-label="Camera view">
          <button type="button" aria-pressed={view === 'overview'} disabled={phase !== 'ready'} onClick={() => chooseView('overview')}>Overview</button>
          <button type="button" aria-pressed={view === 'detail'} disabled={phase !== 'ready'} onClick={() => chooseView('detail')}>Close up</button>
        </div>
      </div>
      <div className="quest-turn-controls" role="group" aria-label="Rotate the building">
        <button type="button" disabled={phase !== 'ready'} aria-label="Rotate the building 45 degrees left" onClick={() => {setView('custom'); engine.current?.rotate(Math.PI / 4);}}>↶</button>
        <button type="button" disabled={phase !== 'ready'} aria-label="Rotate the building 45 degrees right" onClick={() => {setView('custom'); engine.current?.rotate(-Math.PI / 4);}}>↷</button>
      </div>
      {!enabled && phase === 'ready' && <div className="quest-locked-label">Finish observing to start this mechanism</div>}
      {snapshot.status === 'opening' && <div className="quest-opening-label" role="status"><span aria-hidden="true"/>The clue is appearing</div>}
      {phase === 'loading' && <div className="quest-system-message" role="status"><span className="quest-loading-object" aria-hidden="true"/><strong>Setting up the mechanism</strong><p>Placing the building and the clue</p></div>}
      {phase === 'error' && <div className="quest-system-message" role="alert"><strong>The mechanism did not load</strong><p>Reload the model to carry on from your saved progress.</p><button type="button" onClick={() => setRetry(value => value + 1)}>Reload the model</button></div>}
      <span className="quest-stage-caption">Drag to rotate · pinch or scroll to zoom</span>
    </div>
    <div className="quest-response">
      <div className="quest-response-heading"><span>{solved ? 'Clue unlocked' : enabled ? 'Touch the scene to go on' : 'Mechanism not started'}</span>{!['align', 'slide'].includes(quest?.type) && <small>{count} / {total}</small>}</div>
      <p role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
    </div>
    {canOperate && <details className="quest-access-controls">
      <summary>Touch and keyboard controls</summary>
      <p>Turn to the side where the part is visible. These buttons work the same mechanism.</p>
      <div className="quest-assist-camera">
        <button type="button" onClick={() => engine.current?.rotate(Math.PI / 4)}>Turn left 45°</button>
        <button type="button" onClick={() => engine.current?.rotate(-Math.PI / 4)}>Turn right 45°</button>
        <button type="button" onClick={() => engine.current?.zoom(.86)}>Zoom in</button>
        <button type="button" onClick={() => engine.current?.zoom(1.15)}>Zoom out</button>
      </div>
      {quest.type === 'align' && <div className="quest-assist-action" role="group" aria-label="Turn the dial">
        <button type="button" disabled={!available('$dial')} onClick={() => engine.current?.adjust(snapshot.value - 15)}>Counter-clockwise 15°</button>
        <output>{snapshot.value}°</output>
        <button type="button" disabled={!available('$dial')} onClick={() => engine.current?.adjust(snapshot.value + 15)}>Clockwise 15°</button>
      </div>}
      {quest.type === 'slide' && <div className="quest-assist-action" role="group" aria-label="Move the panel">
        <button type="button" disabled={!available('$slider')} onClick={() => engine.current?.adjust(snapshot.value - 20)}>Slide back a little</button>
        <output>{snapshot.value}%</output>
        <button type="button" disabled={!available('$slider')} onClick={() => engine.current?.adjust(snapshot.value + 20)}>Slide open a little</button>
      </div>}
      {!['align'].includes(quest.type) && <div className="quest-assist-parts" role="group" aria-label="Parts you can use in the scene">
        {pieces.map(item => <button key={item.id} type="button" disabled={!available(item.id)} aria-pressed={quest.type === 'assemble' ? state.selected === item.id : undefined} onClick={() => engine.current?.activateTarget(item.id)}>{quest.type === 'assemble' ? 'Pick up' : quest.type === 'sequence' ? 'Tap' : 'Open'} {item.label}</button>)}
      </div>}
      {quest.type === 'assemble' && state.selected && <div className="quest-assist-slots" role="group" aria-label="Outline slots for building parts">
        {pieces.filter(item => !state.placed.includes(item.id)).map(item => <button key={item.id} type="button" disabled={!available('slot:' + item.id)} onClick={() => engine.current?.activateTarget('slot:' + item.id)}>Fit into the {item.label} outline</button>)}
      </div>}
    </details>}
    <p className="quest-concept-caption">Building details are simplified · props are fiction · trust the site and the sources</p>
  </section>;
}
