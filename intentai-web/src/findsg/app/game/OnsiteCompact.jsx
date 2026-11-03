// Hunt (2 Nov 2026): a stop on a phone is one page of the case book that never scrolls (owner: a game you have to
// scroll through is a failure). The model is the page's mounted plate; under it a paper card says what to do now.
// 3 Nov 2026 (owner): no word said twice, numbers kept to the corner, no row of buttons. You act on the book itself:
// break the seal, tap the plate, turn the page by its glowing corner; the card opens the field note, which keeps the
// guide's words, the photo, the hint, the films and the mode switch.
import React, {useEffect, useRef, useState} from 'react';
import DiscoveryPacket from './DiscoveryPacket.jsx';
import CaseFinale from './CaseFinale.jsx';
import {lockScroll} from '../../../hooks/scrollLock';
import {imageFor} from '../data.js';
import './onsite-compact.css';
import {OM_ID, OM_FILMS} from '../om/om-content.js';
import {playFilm} from '../om/films.js';

/** Play a film the first time a beat is reached in this visit (a reload does not replay it). */
function once(key, play) {
  try {if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1');} catch { /* private mode: play anyway */ }
  play();
}
/** The three things you do at every stop; the find that follows is the card, not a fourth step. */
const STEPS = [['arrival', 'Check in'], ['observe', 'Observe'], ['puzzle', 'Solve']];
const pad = n => String(n).padStart(2, '0');

export default function OnsiteCompact(p) {
  const {routeId, config, story, meta, place, stop, layer, record, game, mode, phase, intro, ending, celebrated, saved, reducedMotion, scene, sheet, setSheet, race, boostHere, raceLayer,
    onExit, onOpen, begin, arrive, observe, photo, next, journal, placeInfo, restart, changeMode, Guide, PhotoClue, cleanPlace, mapSearch, sourceName, KIND_NAMES} = p;
  const n = pad(game.stopIndex + 1), total = pad(config.stops.length);
  const reward = !intro && !ending && phase === 'reward';
  const manual = mode === 'manual';
  const route = () => onOpen({type: 'route', routeId, state: game, mode});
  const name = stop.name || cleanPlace(place.name);
  const role = story.playerRole.replace(/\s*\(.*?\)\s*$/, '');
  const step = reward ? STEPS.length : STEPS.findIndex(([id]) => id === phase);
  const note = () => setSheet(true);

  // the page itself: nothing under it scrolls while it is open
  useEffect(() => lockScroll(), []);

  // Only One Missing: its films play at the story's turns (the clue found at a stop, the verdict)
  const films = routeId === OM_ID ? OM_FILMS : null, stopFilm = films?.stops[game.stopIndex + 1];
  useEffect(() => {if (stopFilm && reward && celebrated) once(`om-film:${mode}:${stop.id}`, () => playFilm([stopFilm]));}, [stopFilm, reward, celebrated, mode, stop.id]);
  useEffect(() => {
    if (!films || !ending) return undefined;
    const t = window.setTimeout(() => once(`om-film:${mode}:ending`, () => playFilm([films.ending])), 2400);
    return () => window.clearTimeout(t);
  }, [films, ending, mode]);
  const takeCase = () => {begin(); if (films) playFilm([films.intro]);};
  const checkIn = () => arrive(mode, !manual);
  /** The film of this beat, again: kept in the field note, so the page has one thing to tap for each act. */
  const again = id => id && <button className="sg-text-button ogc-note-film" onClick={() => {setSheet(false); playFilm([id]);}}>▶︎ Watch the film again</button>;

  /* The page turns to what comes next: its folded corner (tap it, or swipe the card to the left) does what the old
   * red button did, and its pencilled caption says where it leads. A puzzle has no corner: solving it turns the page. */
  const turn = intro ? {go: takeCase, label: 'Take the case'}
    : ending ? {go: onExit, label: 'Choose another street'}
    : reward ? {go: next, label: stop.transition.cta}
    : phase === 'arrival' ? {go: checkIn, label: manual ? 'I’m here · check in' : 'Start remotely'}
    : phase === 'observe' ? {go: observe, label: manual ? 'Seen it · wake the model' : 'Studied it · start'}
    : null;

  let stage, card, body;
  if (intro) {
    /* the commission's plate is the case file itself: tap it to take the case */
    stage = <button className="ogc-plate-art ogc-plate-button" onClick={takeCase} aria-label="Take the case">
      <img src={imageFor(routeId)} alt={`${meta.area}: story concept art`}/>
      <span className="ogc-stamp is-file ogc-glow" aria-hidden="true">Case {meta.no}</span>
    </button>;
    card = <Card kicker="The commission" title={`You are the ${role.toLowerCase()}`} lead={story.mission} onOpen={note} label={`${story.guideName}’s note`}/>;
    body = <><h2>{story.title}</h2><Guide name={story.guideName}>{story.prologue.map(x => x.text).join(' ')}</Guide>{films && again(films.intro)}</>;
  } else if (ending) {
    /* the guide you corrected: pages drop in, the cover slams shut, stamped and sealed (CaseFinale.jsx) */
    stage = <CaseFinale routeId={routeId} story={story} meta={meta} config={config} game={game} mode={mode} onOpen={onOpen} reducedMotion={reducedMotion}/>;
    card = <Card kicker="The verdict" title={story.ending.title} lead={story.ending.reflection} onOpen={note} label="The full story"/>;
    body = <><h2>{story.ending.title}</h2><Guide name={story.guideName}>{story.ending.text}</Guide>
      {films ? again(films.ending) : <button className="sg-text-button" onClick={() => {setSheet(false); journal();}}>Open the clues</button>}</>;
  } else if (reward) {
    stage = celebrated
      ? <div className="ogc-find"><DiscoveryPacket key={`${routeId}:${stop.id}:${mode}`} routeId={routeId} stop={stop} index={game.stopIndex} reducedMotion={reducedMotion} selected bare className="og-reward-packet"/></div>
      : <div className="ogc-model is-awake">{scene}</div>;
    card = <Card kicker="Clue found" title={stop.reward.title} lead={stop.transition.text} onOpen={note} label="Read the clue"/>;
    body = <><h2>{stop.reward.title}</h2>
      {stop.quest.foundText && <p className="ogc-note-said">{stop.quest.foundText}</p>}
      <p className="ogc-note-lead">{stop.reward.text}</p>{again(stopFilm)}</>;
  } else {
    stage = <div className={'ogc-model ' + (record.checkin ? 'is-awake' : 'is-sleeping')}>
      {scene}
      {/* the seal on a sleeping building is what you break to check in */}
      {!record.checkin && <button className="ogc-stamp is-sealed ogc-glow" onClick={checkIn} aria-label={turn?.label}>Sealed</button>}
    </div>;
    if (phase === 'arrival') {
      card = <Card kicker={manual ? 'Go to' : 'Remote lead'} title={stop.at || place.address}
        said={{by: story.guideName, text: stop.sceneLine}} onOpen={note} label="Field note"/>;
      body = <><h2>{place.name}</h2>
        <div className="og-destination"><span>Address</span><strong>{place.address}</strong><a href={mapSearch(place)} target="_blank" rel="noreferrer">Open the map ↗︎</a></div>
        <p className="og-fine-print">Check-in is on your word. No location is read. Remote play keeps its own progress.</p></>;
    } else if (phase === 'observe') {
      card = <Card kicker="Look for" title={stop.observation.title} lead={stop.observation.detailToFind} onOpen={note} label="Photo and hint"/>;
      body = <><h2>{stop.observation.title}</h2><p className="ogc-note-lead">{stop.observation.instruction}</p>
        <PhotoClue key={`${stop.id}:${mode}`} target={{...stop.observation, routeId, stopId: stop.id}} onPhoto={photo} preview={!manual}/>
        <Hint stop={stop} sourceName={sourceName}/>
        <p className="og-fine-print">{manual ? 'Look from public space only. Do not touch the building.' : 'Remote play is not a site visit.'}</p></>;
    } else {
      /* the caption on the model carries the instruction and every answer, so the card only names the task: the
       * puzzle in hand is the thing to do. The night race and a Boost Card are a way out for someone stuck, so they
       * wait at the end of the hint, as quiet lines (owner, 2 Nov 2026: a big button made the race feel required). */
      const task = layer.type === 'prop' ? layer.instruction : layer.title, kind = KIND_NAMES[layer.kind] || KIND_NAMES[layer.type];
      // a task that already starts with its kind's name ("Look around. Lift the clasp.") does not say it twice
      card = <Card kicker={kind && !task.toLowerCase().startsWith(kind.toLowerCase()) ? kind : 'The puzzle'} title={task} onOpen={note} label="Hint"/>;
      const away = go => () => {setSheet(false); go();};
      body = <><h2>{layer.title}</h2><p className="ogc-note-lead">{layer.instruction}</p>
        <Hint stop={stop} sourceName={sourceName}/>
        <button className="sg-text-button" onClick={placeInfo}>Open the place file ↗︎</button>
        {(boostHere || race) && <div className="ogc-stuck">
          <span>Still stuck?</span>
          {boostHere && <button className="sg-text-button" onClick={away(boostHere)}>Spend your Boost Card on it</button>}
          {race && <button className="sg-text-button" onClick={away(race)}>Win the night race for these clues</button>}
        </div>}</>;
    }
  }

  /* The running head of the book names the story, so the page only names what is new: the stop. Where you are sits in
   * the page's top corner, as a folio and three pips, so the plate gets the height. */
  const head = !intro && !ending && <div className="ogc-head">
    <h1>{name}</h1>
    <div className="ogc-folio" aria-label={`Stop ${n} of ${total}`}>
      <span aria-hidden="true"><b>{n}</b>/{total}</span>
      <ol className="ogc-pips" aria-label="Progress at this stop">
        {STEPS.map(([id, label], i) => <li key={id} className={i < step ? 'done' : i === step ? 'active' : ''}><span>{label}{i < step ? ', done' : i === step ? ', now' : ''}</span></li>)}
      </ol>
      {/* before you check in, the stamp turns over to the other way to play */}
      {phase === 'arrival' && !reward
        ? <button className={'ogc-mode is-' + mode} onClick={() => manual ? arrive('preview', true) : changeMode('manual')} aria-label={manual ? 'On site. Switch to remote play' : 'Remote. Switch to on site'}>{manual ? 'On site' : 'Remote'}</button>
        : <span className={'ogc-mode is-' + mode}>{manual ? 'On site' : 'Remote'}</span>}
    </div>
  </div>;

  return <section className={'ogc' + (sheet ? ' has-sheet' : '') + (turn ? ' has-turn' : '')} data-phase={intro ? 'intro' : ending ? 'ending' : phase} aria-label={`${story.title}, stop ${n} of ${total}`}>
    <header className="ogc-top">
      <button onClick={onExit} aria-label="Back to the book">‹ Book</button>
      <button className="ogc-chapter" onClick={route}>Route</button>
      <button onClick={journal}>Clues <b>{game.completed.length}</b></button>
    </header>
    {intro || ending ? <h1 className="ogc-story-title">{story.title}</h1> : head}
    <div className="ogc-stage">{stage}</div>
    {card && React.cloneElement(card, {onSwipe: turn?.go})}
    {turn && <PageTurn key={`${phase}:${stop.id}:${intro}:${ending}`} {...turn} reducedMotion={reducedMotion}/>}
    {sheet && <FieldNote onClose={() => setSheet(false)}>
      <span className="ogc-note-kicker">{ending ? 'Case closed' : intro ? 'The commission' : `Field note · stop ${n}`}</span>
      {body}
      <footer className="ogc-note-foot">
        <button onClick={() => changeMode(manual ? 'preview' : 'manual')}>{manual ? 'Switch to remote play' : 'Switch to on site'}</button>
        <button onClick={placeInfo}>Place file</button>
        <button onClick={restart}>Start over</button>
        <small>{saved ? 'Progress saved' : 'Not saved'}</small>
      </footer>
    </FieldNote>}
    {raceLayer}
  </section>;
}

/** The page's folded bottom corner, with where it leads pencilled beside it. It glows after a moment, like a game's
 * cursor, for anyone who has not tried it yet; tapping it curls the corner and turns the page. */
function PageTurn({go, label, reducedMotion}) {
  const [turning, setTurning] = useState(false);
  const fire = () => {
    if (turning) return;
    if (reducedMotion) {go(); return;}
    setTurning(true);
    window.setTimeout(go, 280);
  };
  return <button className={'ogc-turn' + (turning ? ' is-turning' : '')} onClick={fire} aria-label={label}>
    <em aria-hidden="true">{label}</em><i aria-hidden="true"/>
  </button>;
}

/** What to look for, the play hint and its sources, as one pasted-in slip. */
function Hint({stop, sourceName}) {
  const o = stop.observation;
  return <div className="og-reference"><strong>{o.detailToFind}</strong><p>{o.referenceNote}</p>
    <div>{(o.sourceUrls || []).slice(0, 2).map(url => <a key={url} href={url} target="_blank" rel="noreferrer">{sourceName(url)} ↗︎</a>)}</div>
    {o.credits?.length > 0 && <p className="ogc-credits">Photos {o.credits.filter((c, i, all) => all.findIndex(d => d.text === c.text) === i).map(c => <a key={c.url} href={c.url} target="_blank" rel="noreferrer">{c.text}</a>)}</p>}</div>;
}

/** The paper card: the whole card opens the field note (a small folded tab says so); swiping it to the left turns
 * the page. `said` is a line in the guide's hand. */
export function Card({kicker, title, lead, said, onOpen, label, onSwipe}) {
  const from = useRef(null);
  const down = e => {from.current = {x: e.clientX, y: e.clientY};};
  const up = e => {
    const f = from.current; from.current = null;
    if (!f) return;
    const dx = e.clientX - f.x, dy = e.clientY - f.y;
    if (onSwipe && dx < -50 && Math.abs(dy) < 40) {e.preventDefault(); onSwipe(); return;}
    if (Math.hypot(dx, dy) < 10) onOpen?.();
  };
  const key = e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); onOpen?.();}};
  return <article className="ogc-card" role="button" tabIndex={0} aria-label={`${kicker}: ${title}. ${label}`}
    onPointerDown={down} onPointerUp={up} onPointerCancel={() => {from.current = null;}} onKeyDown={key}>
    <header><span>{kicker}</span><i className="ogc-card-tab" aria-hidden="true"/></header>
    <div className="ogc-card-title"><h2>{title}</h2></div>
    {said && <p className="ogc-said">{said.text}<span>— {said.by}</span></p>}
    {lead && <p className="ogc-lead">{lead}</p>}
  </article>;
}

/** The field note: a sheet of paper laid over the page, closed by its corner or Escape. */
export function FieldNote({onClose, children}) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const key = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return <div className="ogc-sheet" role="dialog" aria-modal="true" aria-label="Field note" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="ogc-sheet-paper" ref={ref} tabIndex={-1}>
      <button className="ogc-sheet-close" onClick={onClose} aria-label="Close the field note">×</button>
      {children}
    </div>
  </div>;
}
