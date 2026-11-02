import React, {useEffect, useRef, useState} from 'react';
import {createQuestState, isQuestSolved, questStage} from './quest-logic.js';
import './quest-viewport.css';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** Parent owns verified location gates, persistent actions and rewards.
 * This component owns only the tangible, replayable model interaction.
 * Hunt (2 Nov 2026, owner: "let people use their hands, not buttons and text"): the stage is the model and nothing
 * else. Drag turns it, pinch zooms; when the view comes near a part the hand can use, a small mark on the part says
 * what to do. A stop with layers plays them in order, each in its own scene. */
export default function QuestViewport({
  routeId, stopId, modelKind = 'shophouse', quest, enabled = false, progress,
  reducedMotion = false, onAction, onComplete, onStatus,
}) {
  const host = useRef(null), engine = useRef(null);
  const chain = quest?.type === 'chain';
  const open = questStage(quest, progress), total = open.total;
  // the layer on show: it stays on a solved layer until that layer has played its opening, then moves on
  const [shown, setShown] = useState(open.index), [turning, setTurning] = useState(false);
  // a layer that was already solved when it came on show (a race win, a Boost Card) is passed straight over
  const sawOpen = useRef(false), allSolved = isQuestSolved(quest, progress);
  useEffect(() => {sawOpen.current = false;}, [shown]);
  useEffect(() => {
    const goal = allSolved ? total - 1 : open.index;
    if (goal < shown || (chain && goal > shown && !sawOpen.current && !turning)) setShown(goal);
  }, [open.index, shown, allSolved, total, chain, turning]);
  const layer = chain ? {...quest.stages[shown], ...(shown < total - 1 ? {rewardLabel: 'ANOTHER LAYER'} : {})} : quest;
  const layerProgress = chain ? progress?.stages?.[shown] || createQuestState(layer) : progress;

  const callbacks = useRef({}); callbacks.current = {
    onAction, onStatus,
    onComplete: () => {
      if (chain && shown < total - 1) {setTurning(true); window.setTimeout(() => {setShown(n => Math.min(total - 1, n + 1)); setTurning(false);}, reducedMotion ? 0 : 900);}
      else onComplete?.();
    },
  };
  const current = useRef({enabled, progress: layerProgress, reducedMotion}); current.current = {enabled, progress: layerProgress, reducedMotion};
  const [phase, setPhase] = useState('loading'), [renderer, setRenderer] = useState('loading'), [retry, setRetry] = useState(0);
  const [snapshot, setSnapshot] = useState({status: 'locked', message: '', visibleIds: [], value: 0, selectedId: null, hint: null});
  const [note, setNote] = useState(null);
  const configKey = JSON.stringify(layer || {}) + ':' + shown;
  const state = layerProgress || createQuestState(layer), solved = isQuestSolved(layer, state);

  useEffect(() => {
    let alive = true, instance = null, surface = null;
    setPhase('loading'); setRenderer('loading'); setNote(null);
    setSnapshot({status: 'locked', message: '', visibleIds: [], value: current.current.progress?.value || 0, selectedId: null, hint: null});
    async function start() {
      try {
        const module = await import('./quest-engine.js');
        if (!alive || !host.current) return;
        surface = host.current.ownerDocument.createElement('div'); surface.className = 'quest-render-surface'; host.current.append(surface);
        instance = module.createQuestWorld(surface, {
          routeId, stopId, modelKind, quest: layer, ...current.current,
          onAction: action => {if (alive) callbacks.current.onAction?.(action);},
          onComplete: () => {if (alive) callbacks.current.onComplete?.();},
          onStatus: value => {if (!alive) return; if (value.status === 'ready') sawOpen.current = true; setSnapshot(value); callbacks.current.onStatus?.(value);},
          onReady: result => {if (!alive) return; setPhase(result?.ok === false ? 'error' : 'ready'); setRenderer(result?.engine || 'unavailable');},
        });
        if (!alive) {instance.dispose(); surface.remove(); return;}
        engine.current = instance; instance.setProgress(current.current.progress || createQuestState(layer)); instance.setEnabled(current.current.enabled); instance.getStatus();
      } catch (error) {
        if (!alive) return;
        instance?.dispose(); surface?.remove(); engine.current = null; setPhase('error'); setRenderer('unavailable');
        callbacks.current.onStatus?.({engine: 'unavailable', status: 'error', message: error?.message || 'The mechanism model did not load.', visibleIds: []});
      }
    }
    void start();
    return () => {alive = false; if (engine.current === instance) engine.current = null; instance?.dispose(); surface?.remove();};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, stopId, modelKind, configKey, retry]);

  useEffect(() => {engine.current?.setProgress(layerProgress || createQuestState(layer));}, [layerProgress]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {engine.current?.setEnabled(enabled);}, [enabled]);
  useEffect(() => {engine.current?.setMotion(reducedMotion);}, [reducedMotion]);

  // what the mechanism answers a hand with, on a slip of paper that fades (not the standing instruction)
  const message = snapshot.message;
  useEffect(() => {
    if (!message || snapshot.status !== 'ready' || message === layer?.instruction) return undefined;
    setNote({text: message, key: Date.now()});
    const t = window.setTimeout(() => setNote(null), 2800);
    return () => window.clearTimeout(t);
  }, [message]); // eslint-disable-line react-hooks/exhaustive-deps

  const available = id => phase === 'ready' && enabled && !solved && snapshot.visibleIds.includes(id);
  const canOperate = phase === 'ready' && enabled && !solved;
  const pieces = (layer?.items || []).filter(item => item?.id && item.role !== 'decoration');
  const hint = canOperate && !turning ? snapshot.hint : null;

  return <section className={'quest-viewport is-' + phase + (enabled ? ' is-enabled' : ' is-locked') + (solved ? ' is-solved' : '')} data-renderer={renderer} data-quest-type={layer?.type} aria-label={layer?.title || 'Place mechanism'}>
    <div className="quest-stage">
      <div className="quest-host" ref={host}/>
      {chain && <span className="quest-layer" aria-label={`Layer ${shown + 1} of ${total}`}>{ROMAN.slice(0, total).map((r, n) => <b key={r} data-done={n < shown || (n === shown && solved) ? 'true' : undefined} data-here={n === shown ? 'true' : undefined}>{r}</b>)}</span>}
      {hint && <span key={hint.id} className="quest-touch" style={{left: hint.x, top: hint.y}} aria-hidden="true"><i/><b>{hint.verb}</b></span>}
      {note && <p key={note.key} className="quest-note" role="status">{note.text}</p>}
      {turning && <div className="quest-turning" aria-hidden="true"><b>{ROMAN[shown + 1]}</b></div>}
      {!enabled && phase === 'ready' && <div className="quest-locked-label">Observe the site to wake it</div>}
      {phase === 'loading' && <div className="quest-system-message" role="status"><span className="quest-loading-object" aria-hidden="true"/></div>}
      {phase === 'error' && <div className="quest-system-message" role="alert"><strong>The model did not load</strong><button type="button" onClick={() => setRetry(value => value + 1)}>Reload</button></div>}
    </div>
    {/* keyboard and screen-reader controls for the same mechanism: out of sight until focused */}
    {canOperate && <details className="quest-access-controls">
      <summary>Keyboard controls</summary>
      <div className="quest-assist-camera">
        <button type="button" onClick={() => engine.current?.rotate(Math.PI / 4)}>Turn left</button>
        <button type="button" onClick={() => engine.current?.rotate(-Math.PI / 4)}>Turn right</button>
        <button type="button" onClick={() => engine.current?.setView('detail')}>Close up</button>
        <button type="button" onClick={() => engine.current?.setView('overview')}>Whole view</button>
      </div>
      {['align', 'slide'].includes(layer.type) && <div className="quest-assist-action" role="group" aria-label="Move the part">
        <button type="button" disabled={!available(layer.type === 'align' ? '$dial' : '$slider')} onClick={() => engine.current?.adjust(snapshot.value - (layer.type === 'align' ? 15 : 20))}>Back</button>
        <output>{snapshot.value}{layer.type === 'align' ? '°' : '%'}</output>
        <button type="button" disabled={!available(layer.type === 'align' ? '$dial' : '$slider')} onClick={() => engine.current?.adjust(snapshot.value + (layer.type === 'align' ? 15 : 20))}>On</button>
      </div>}
      {layer.type === 'lock' && <div className="quest-assist-action" role="group" aria-label="Number wheels">
        {(state.wheels || []).map((v, n) => <button key={n} type="button" disabled={!available('wheel:' + n)} onClick={() => engine.current?.activateTarget('wheel:' + n)} aria-label={`Wheel ${n + 1}, showing ${v}. Turn on one`}>{v}</button>)}
      </div>}
      {!['align', 'lock'].includes(layer.type) && <div className="quest-assist-parts" role="group" aria-label="Parts">
        {pieces.map(item => <button key={item.id} type="button" disabled={!available(item.id)} onClick={() => engine.current?.activateTarget(item.id)}>{item.label || item.text}</button>)}
      </div>}
      {layer.type === 'jigsaw' && state.selected && <div className="quest-assist-slots" role="group" aria-label="Squares of the frame">
        {pieces.map((_, n) => <button key={n} type="button" disabled={!available('cell:' + n)} onClick={() => engine.current?.activateTarget('cell:' + n)}>Square {n + 1}</button>)}
      </div>}
      {layer.type === 'assemble' && state.selected && <div className="quest-assist-slots" role="group" aria-label="Outlines">
        {pieces.filter(item => !state.placed.includes(item.id)).map(item => <button key={item.id} type="button" disabled={!available('slot:' + item.id)} onClick={() => engine.current?.activateTarget('slot:' + item.id)}>{item.label} outline</button>)}
      </div>}
    </details>}
  </section>;
}
