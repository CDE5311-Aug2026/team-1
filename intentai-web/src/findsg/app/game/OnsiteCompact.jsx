// Hunt (2 Nov 2026): a stop on a phone is one page of the case book that never scrolls (owner: a game you have to
// scroll through is a failure). The model is the page's mounted plate; under it a paper card says what to do now.
// 3 Nov 2026 (owner): no word said twice, numbers kept to the corner, no row of buttons. You act on the book itself:
// break the seal, tap the plate, turn the page by its glowing corner; the card opens the field note, which keeps the
// guide's words, the photo, the hint and the films.
// 3 Nov 2026 (owner's sketch): the book's side tabs carry Map, Clues (with the decode cards and the night race), the
// Remote / On site switch and Check in; the page keeps two folded corners, back (bottom left) and next (bottom right).
import React, {useEffect, useRef, useState} from 'react';
import DiscoveryPacket from './DiscoveryPacket.jsx';
import {ClosedBanner, ClosedAward, ClosedRecord, toShelf} from './CaseClosed.jsx';
import {RealmCard, RealmStamp, realmOf} from './Realm.jsx';
import {mapWalk} from '../field/field-storage.js';
import {DistanceMap} from './Nearby.jsx';
import {CameraIcon} from './ArrivalCamera.jsx';
import {pinOf, photoOf} from './stop-photos.js';
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
  const {routeId, config, story, meta, place, stop, layer, record, game, mode, phase, intro, ending, celebrated, saved, reducedMotion, scene, sheet, setSheet, raceLayer,
    onExit, onOpen, begin, arrive, observe, photo, next, journal, placeInfo, restart, changeMode, shoot, shot, Guide, PhotoClue, cleanPlace, mapSearch, sourceName, KIND_NAMES} = p;
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
  // on site, the camera's photos of this stop are loaded ahead, so the shot is there the moment you take it
  useEffect(() => {
    if (!manual || intro || ending) return;
    for (const k of ['place', 'detail']) {const ph = photoOf(stop.id, k); if (ph) new Image().src = ph.src;}
  }, [manual, intro, ending, stop.id]);
  const takeCase = () => {begin(); if (films) playFilm([films.intro]);};
  /** The film of this beat, again: kept in the field note, so the page has one thing to tap for each act. */
  const again = id => id && <button className="sg-text-button ogc-note-film" onClick={() => {setSheet(false); playFilm([id]);}}>▶︎ Watch the film again</button>;

  /* The page turns to what comes next: its folded corner (tap it, or swipe the card to the left) does what the old
   * red button did, and its pencilled caption says where it leads. A puzzle has no corner: solving it turns the page. */
  const turn = intro ? {go: takeCase, label: 'Take the case'}
    : reward ? {go: next, label: stop.transition.cta}
    : phase === 'observe' && !manual ? {go: observe, label: 'Studied it · start'}
    : null;

  /* the corner at the bottom left turns back: to the clue found at the stop before (the story's ending turns back to the
   * last one). The opening page has nothing behind it. */
  const behind = game.completed.map(id => config.stops.findIndex(s => s.id === id)).filter(i => i >= 0 && (ending || i < game.stopIndex));
  const back = !intro && behind.length ? () => onOpen({type: 'collected', routeId, index: Math.max(...behind), state: game, mode}) : null;

  // real or virtual: the page opens on a card saying which, and keeps a stamp in its corner (Realm.jsx)
  const view = intro ? 'intro' : ending ? 'ending' : phase;
  const realm = realmOf({view, mode, place: name, stop});
  const realmId = `${routeId}:${mode}:${stop.id}:${view}`;

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
    /* the closed case (CaseClosed.jsx): the medal on the plate, the record under it and the way back to the shelf */
    stage = <ClosedAward meta={meta} config={config} mode={mode} reducedMotion={reducedMotion}/>;
    card = <ClosedRecord game={game} config={config} onShelf={() => toShelf(onExit)}/>;
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
      {/* the building sleeps under its seal until you check in (the Check in tab breaks it) */}
      {!record.checkin && <span className="ogc-stamp is-sealed" aria-hidden="true">Sealed</span>}
    </div>;
    const pin = pinOf(stop.id), walk = mapWalk(place);
    const camera = kind => ({icon: <CameraIcon/>, label: kind === 'place' ? `Check in at ${name}: photograph it` : `Photograph ${stop.observation.title}`, go: () => {setSheet(false); shoot(kind);}});
    if (phase === 'arrival') {
      /* on site: where it is, how far you are, and the camera. Remote: one button starts the stop. */
      card = manual
        ? <Card kicker="Go to" title={stop.at || place.address} onOpen={note} label="Map" act={camera('place')}>
          {pin && <DistanceMap pin={pin} name={name} walk={walk}/>}
        </Card>
        : <Card kicker="Remote" title={stop.at || place.address} lead={stop.sceneLine} onOpen={note} label="Field note"
          act={{icon: <Play/>, label: `Start ${name} remotely`, go: () => arrive(mode, true)}}/>;
      body = manual
        ? <><h2>{name}</h2>{pin && <DistanceMap pin={pin} name={name} walk={walk} size="sheet"/>}<Shoot {...camera('place')}/></>
        : <><h2>{name}</h2><p className="ogc-note-lead">{stop.sceneLine}</p><Shoot icon={<Play/>} label={`Start ${name} remotely`} go={() => {setSheet(false); arrive(mode, true);}}/></>;
    } else if (phase === 'observe') {
      const o = stop.observation;
      card = <Card kicker="Look for" title={o.title} lead={manual ? null : o.detailToFind} onOpen={note} label="Field note" act={manual ? camera('detail') : null}/>;
      /* remote: the real photo stands in for the street */
      const real = !manual && (photoOf(stop.id, 'detail') || shot?.('detail'));
      body = <><h2>{o.title}</h2><p className="ogc-note-lead">{o.instruction}</p>
        {manual ? <Shoot {...camera('detail')}/> : real && <figure className="ogc-real"><img src={real.src} alt={o.title}/>
          {real.credit && <figcaption>{real.url ? <a href={real.url} target="_blank" rel="noreferrer">{real.credit}</a> : real.credit}</figcaption>}</figure>}
        <Sources stop={stop} sourceName={sourceName}/></>;
    } else {
      /* the caption on the model carries the instruction and every answer, so the card only names the task: the
       * puzzle in hand is the thing to do. Someone stuck finds the night race and the decode cards under the Clues tab. */
      const task = layer.type === 'prop' ? layer.instruction : layer.title, kind = KIND_NAMES[layer.kind] || KIND_NAMES[layer.type];
      // a task that already starts with its kind's name ("Look around. Lift the clasp.") does not say it twice
      card = <Card kicker={kind && !task.toLowerCase().startsWith(kind.toLowerCase()) ? kind : 'The puzzle'} title={task} onOpen={note} label="Hint"/>;
      body = <><h2>{layer.title}</h2><p className="ogc-note-lead">{layer.instruction}</p>
        <Sources stop={stop} sourceName={sourceName}/></>;
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
      <RealmStamp realm={realm}/>
    </div>
  </div>;

  return <section className={'ogc' + (sheet ? ' has-sheet' : '') + (turn ? ' has-turn' : '') + (back ? ' has-back' : '')} data-phase={intro ? 'intro' : ending ? 'ending' : phase} aria-label={`${story.title}, stop ${n} of ${total}`}>
    <header className="ogc-top">
      <button onClick={onExit} aria-label="Back to the book">‹ Book</button>
      <button className="ogc-chapter" onClick={route}>Route</button>
      <button onClick={journal}>Clues <b>{game.completed.length}</b></button>
    </header>
    {ending ? <ClosedBanner story={story} onOpen={note}/> : intro ? <h1 className="ogc-story-title">{story.title}</h1> : head}
    <div className="ogc-stage">{stage}</div>
    {card && (ending ? card : React.cloneElement(card, {onSwipe: turn?.go, onSwipeBack: back}))}
    {back && <PageTurn key={`back:${game.stopIndex}`} go={back} label="Turn back" side="back" reducedMotion={reducedMotion}/>}
    {turn && <PageTurn key={`${phase}:${stop.id}:${intro}:${ending}`} {...turn} reducedMotion={reducedMotion}/>}
    {sheet && <FieldNote onClose={() => setSheet(false)}>
      <span className="ogc-note-kicker">{ending ? 'Case closed' : intro ? 'The commission' : `Field note · stop ${n}`}</span>
      {body}
      {(intro || ending) && <footer className="ogc-note-foot">
        <button onClick={placeInfo}>Place file</button>
        <button onClick={restart}>Start over</button>
        <small>{saved ? 'Progress saved' : 'Not saved'}</small>
      </footer>}
    </FieldNote>}
    <RealmCard key={realmId} realm={realm} id={realmId}/>
    {raceLayer}
  </section>;
}

/** The page's folded bottom corner, with where it leads pencilled beside it. It glows after a moment, like a game's
 * cursor, for anyone who has not tried it yet; tapping it curls the corner and turns the page. */
function PageTurn({go, label, side = 'next', reducedMotion}) {
  const [turning, setTurning] = useState(false);
  const fire = () => {
    if (turning) return;
    if (reducedMotion) {go(); return;}
    setTurning(true);
    window.setTimeout(go, 280);
  };
  return <button className={'ogc-turn is-' + side + (turning ? ' is-turning' : '')} onClick={fire} aria-label={label}>
    {side === 'next' && <em aria-hidden="true">{label}</em>}<i aria-hidden="true"/>
  </button>;
}

const Play = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>;

/** The field note's one button: the camera on site, play when remote. */
function Shoot({icon, label, go}) {
  return <button className="ogc-shoot" onClick={go} aria-label={label}><span>{icon}</span></button>;
}

/** Where the facts on the note come from: the source names, linked. */
function Sources({stop, sourceName}) {
  const urls = (stop.observation.sourceUrls || []).slice(0, 2);
  return urls.length > 0 && <p className="ogc-sources">{urls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer">{sourceName(url)} ↗︎</a>)}</p>;
}

/** The paper card: the whole card opens the field note (a small folded tab says so); swiping it to the left turns
 * the page. `said` is a line in the guide's hand. */
export function Card({kicker, title, lead, said, onOpen, label, onSwipe, onSwipeBack, link, act, children}) {
  const from = useRef(null);
  const down = e => {from.current = {x: e.clientX, y: e.clientY};};
  const up = e => {
    const f = from.current; from.current = null;
    if (!f || e.target.closest?.('a, button')) return;
    const dx = e.clientX - f.x, dy = e.clientY - f.y;
    if (onSwipe && dx < -50 && Math.abs(dy) < 40) {e.preventDefault(); onSwipe(); return;}
    if (onSwipeBack && dx > 50 && Math.abs(dy) < 40) {e.preventDefault(); onSwipeBack(); return;}
    if (Math.hypot(dx, dy) < 10) onOpen?.();
  };
  const key = e => {if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {e.preventDefault(); onOpen?.();}};
  return <article className="ogc-card" role="button" tabIndex={0} aria-label={`${kicker}: ${title}. ${label}`}
    onPointerDown={down} onPointerUp={up} onPointerCancel={() => {from.current = null;}} onKeyDown={key}>
    <header><span>{kicker}</span><i className="ogc-card-tab" aria-hidden="true"/></header>
    <div className="ogc-card-title"><h2>{title}</h2>
      {act && <button className="ogc-act" onClick={act.go} aria-label={act.label}>{act.icon}</button>}</div>
    {said && <p className="ogc-said">{said.text}<span>— {said.by}</span></p>}
    {lead && <p className="ogc-lead">{lead}</p>}
    {link && <a className="ogc-walk" href={link.href} target="_blank" rel="noreferrer"
      onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>{link.label} ↗︎</a>}
    {children && <div className="ogc-card-more">{children}</div>}
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
