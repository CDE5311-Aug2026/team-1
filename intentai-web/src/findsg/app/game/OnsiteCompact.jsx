// Hunt (2 Nov 2026): a stop on a phone is one page of the case book that never scrolls (owner: a game you have to
// scroll through is a failure). The model is the page's mounted plate; under it a paper card holds the one thing to do
// now. Everything else the guide says, the photo, the hint and the mode switch sits in the field note, opened from the card.
import React, {useEffect, useRef} from 'react';
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
/** A round projector button: the film of this beat, again. */
const FilmButton = ({id}) => <button className="ogc-film" onClick={() => playFilm([id])} aria-label="Play the film"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M1 0.5 L9.5 6 L1 11.5Z" fill="currentColor"/></svg></button>;

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

  let stage, card, body;
  if (intro) {
    stage = <figure className="ogc-plate-art">
      <img src={imageFor(routeId)} alt={`${meta.area}: story concept art`}/>
      <span className="ogc-stamp is-file" aria-hidden="true">Case {meta.no}</span>
      {films && <FilmButton id={films.intro}/>}
    </figure>;
    card = <Card kicker="The commission" title={`You are the ${role.toLowerCase()}`} lead={story.mission}
      actions={<Primary onClick={takeCase}>Take the case</Primary>} more={`${story.guideName}’s note`} onMore={note}/>;
    body = <><h2>{story.title}</h2><Guide name={story.guideName}>{story.prologue.map(x => x.text).join(' ')}</Guide></>;
  } else if (ending) {
    /* the guide you corrected: pages drop in, the cover slams shut, stamped and sealed (CaseFinale.jsx) */
    stage = <CaseFinale routeId={routeId} story={story} meta={meta} config={config} game={game} mode={mode} onOpen={onOpen} reducedMotion={reducedMotion}/>;
    card = <Card kicker="The verdict" title={story.ending.title} lead={story.ending.reflection}
      actions={<><Primary onClick={onExit}>Choose another street</Primary>{films ? <FilmButton id={films.ending}/> : <Quiet onClick={journal}>Clues</Quiet>}</>}
      more="Full story" onMore={note}/>;
    body = <><h2>{story.ending.title}</h2><Guide name={story.guideName}>{story.ending.text}</Guide></>;
  } else if (reward) {
    stage = celebrated
      ? <div className="ogc-find"><DiscoveryPacket key={`${routeId}:${stop.id}:${mode}`} routeId={routeId} stop={stop} index={game.stopIndex} reducedMotion={reducedMotion} selected bare className="og-reward-packet"/></div>
      : <div className="ogc-model is-awake">{scene}</div>;
    card = <Card kicker="Clue found" title={stop.reward.title} lead={stop.transition.text}
      actions={<><Primary onClick={next}>{stop.transition.cta}</Primary>{stopFilm && <FilmButton id={stopFilm}/>}</>}
      more="Read it" onMore={note}/>;
    body = <><h2>{stop.reward.title}</h2>
      {stop.quest.foundText && <p className="ogc-note-said">{stop.quest.foundText}</p>}
      <p className="ogc-note-lead">{stop.reward.text}</p></>;
  } else {
    stage = <div className={'ogc-model ' + (record.checkin ? 'is-awake' : 'is-sleeping')}>
      {scene}
      {!record.checkin && <span className="ogc-stamp is-sealed" aria-hidden="true">Sealed</span>}
    </div>;
    if (phase === 'arrival') {
      card = <Card kicker={manual ? 'Go to' : 'Remote lead'} title={stop.at || place.address}
        aside={<a className="ogc-map" href={mapSearch(place)} target="_blank" rel="noreferrer">Map ↗︎</a>}
        said={{by: story.guideName, text: stop.sceneLine}}
        actions={<><Primary onClick={() => arrive(mode, !manual)}>{manual ? 'I’m here · check in' : 'Start remotely'}</Primary>
          <Quiet onClick={() => manual ? arrive('preview', true) : changeMode('manual')}>{manual ? 'Play remotely' : 'On site'}</Quiet></>}
        more="Field note" onMore={note}/>;
      body = <><h2>{place.name}</h2>
        <div className="og-destination"><span>Address</span><strong>{place.address}</strong><a href={mapSearch(place)} target="_blank" rel="noreferrer">Open the map ↗︎</a></div>
        <p className="og-fine-print">Check-in is on your word. No location is read. Remote play keeps its own progress.</p></>;
    } else if (phase === 'observe') {
      card = <Card kicker="Look for" title={stop.observation.title} lead={stop.observation.detailToFind}
        actions={<Primary onClick={observe}>{manual ? 'Seen it · wake the model' : 'Studied it · start'}</Primary>}
        more="Photo & hint" onMore={note}/>;
      body = <><h2>{stop.observation.title}</h2><p className="ogc-note-lead">{stop.observation.instruction}</p>
        <PhotoClue key={`${stop.id}:${mode}`} target={{...stop.observation, routeId, stopId: stop.id}} onPhoto={photo} preview={!manual}/>
        <Hint stop={stop} sourceName={sourceName}/>
        <p className="og-fine-print">{manual ? 'Look from public space only. Do not touch the building.' : 'Remote play is not a site visit.'}</p></>;
    } else {
      /* the caption on the model carries the instruction and every answer, so the card only names the task: the
       * puzzle in hand is the thing to do. The night race and a Boost Card are a way out for someone stuck, so they
       * wait at the end of the hint, as quiet lines (owner, 2 Nov 2026: a big button made the race feel required). */
      card = <Card kicker={KIND_NAMES[layer.kind] || KIND_NAMES[layer.type]} title={layer.type === 'prop' ? layer.instruction : layer.title} more="Hint" onMore={note}/>;
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

  return <section className={'ogc' + (sheet ? ' has-sheet' : '')} data-phase={intro ? 'intro' : ending ? 'ending' : phase} aria-label={`${story.title}, stop ${n} of ${total}`}>
    <header className="ogc-top">
      <button onClick={onExit} aria-label="Back to the book">‹ Book</button>
      <button className="ogc-chapter" onClick={route} aria-label={intro || ending ? 'Show the route' : `Stop ${n} of ${total}. Show the route`}>
        {intro ? <>{total} stops</> : ending ? <><b>{total}</b>/{total} found</> : <>Stop <b>{n}</b>/{total}</>}
      </button>
      <button onClick={journal}>Clues <b>{game.completed.length}</b></button>
    </header>
    <div className="ogc-title">
      <h1>{intro || ending ? story.title : name}</h1>
      <span className={'ogc-mode is-' + mode}>{manual ? 'On site' : 'Remote'}</span>
    </div>
    {!ending && <ol className="ogc-steps" aria-label="Progress at this stop">
      {STEPS.map(([id, label], i) => {
        const done = !intro && i < step;
        return <li key={id} className={(done ? 'done ' : '') + (!intro && i === step ? 'active' : '')}><i aria-hidden="true">{done ? '✓' : i + 1}</i>{label}</li>;
      })}
    </ol>}
    <div className="ogc-stage">{stage}</div>
    {card}
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

/** What to look for, the play hint and its sources, as one pasted-in slip. */
function Hint({stop, sourceName}) {
  const o = stop.observation;
  return <div className="og-reference"><strong>{o.detailToFind}</strong><p>{o.referenceNote}</p>
    <div>{(o.sourceUrls || []).slice(0, 2).map(url => <a key={url} href={url} target="_blank" rel="noreferrer">{sourceName(url)} ↗︎</a>)}</div>
    {o.credits?.length > 0 && <p className="ogc-credits">Photos {o.credits.filter((c, i, all) => all.findIndex(d => d.text === c.text) === i).map(c => <a key={c.url} href={c.url} target="_blank" rel="noreferrer">{c.text}</a>)}</p>}</div>;
}

/** The paper card. `said` is a line in the guide's hand; `aside` sits beside the title (a map link, say). */
export function Card({kicker, title, lead, said, aside, actions, more, onMore}) {
  return <article className="ogc-card">
    <header><span>{kicker}</span>{more && <button className="ogc-more" onClick={onMore}>{more} <b aria-hidden="true">›</b></button>}</header>
    <div className="ogc-card-title"><h2>{title}</h2>{aside}</div>
    {said && <p className="ogc-said">{said.text}<span>— {said.by}</span></p>}
    {lead && <p className="ogc-lead">{lead}</p>}
    {actions && <div className="ogc-actions">{actions}</div>}
  </article>;
}
export const Primary = ({onClick, children}) => <button className="ogc-primary" onClick={onClick}><b>{children}</b><span aria-hidden="true">→</span></button>;
export const Quiet = ({onClick, children}) => <button className="ogc-quiet" onClick={onClick}>{children}</button>;

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
