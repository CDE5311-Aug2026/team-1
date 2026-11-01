// Hunt (2 Nov 2026): the two-stop short story on a phone, one page that never scrolls, laid out like a street stop
// (OnsiteCompact): top line, title, the steps, the picture, and a paper card with the one thing to do now.
// The cover keeps the tear ticket; each stop keeps its building model; the ending folds into one page.
import React, {useEffect, useState} from 'react';
import TearTicket from '../game/TearTicket.jsx';
import {Card, FieldNote, Primary, Quiet} from '../game/OnsiteCompact.jsx';
import ShortScene from './ShortScene.jsx';
import {SHORT_EPISODE as EP, shortDirections, shortMap} from './short-content.js';
import '../game/onsite-compact.css';
import './short-compact.css';

const Q = '(max-width: 760px)';
export function useShortCompact() {
  const [m, setM] = useState(() => window.matchMedia(Q).matches);
  useEffect(() => {
    const mm = window.matchMedia(Q), on = () => setM(mm.matches);
    mm.addEventListener('change', on);
    return () => mm.removeEventListener('change', on);
  }, []);
  return m;
}
const pad = n => String(n).padStart(2, '0');

/** The dome drawn in gold on the shelf book's board (the hunt desk's Bookshelf), so the cover is that same book. */
const DomeArt = () => <svg className="sgc-board-art" viewBox="0 0 120 100" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M44 50 Q44 27 60 22 Q76 27 76 50"/><path d="M48 50 Q50 33 60 28" opacity=".5"/><path d="M60 22 V14"/>
  <path d="M62.5 9.5 a3 3 0 1 0 0 4.5 a2.3 2.3 0 1 1 0 -4.5"/><rect x="42" y="50" width="36" height="7"/><rect x="32" y="57" width="56" height="27"/>
  {[38, 47, 56, 65, 74].map(x => <path key={x} d={`M${x} 84 V70 a4 4 0 0 1 8 0 V84`}/>)}
  <path d="M20 84 V46 l3 -6 l3 6 V84 M23 40 V35"/><path d="M94 84 V46 l3 -6 l3 6 V84 M97 40 V35"/><path d="M12 84 H108"/>
  <path d="M30 95 Q45 88 60 94 Q75 88 90 95"/><path d="M30 95 V91 Q45 84 60 90 Q75 84 90 91 V95 M60 90 V94"/>
  {[0, 1, 2].map(i => <path key={i} d={`M${35 + i * 6} ${91 - i * .6} Q${42 + i * 4} ${88 - i} 55 ${90 - i * .4}`} opacity=".55"/>)}
  <circle cx="101" cy="92" r="5"/><circle cx="101" cy="92" r="2.6" opacity=".6"/>
</svg>;

/** The green story book's front board, as it stands on the desk's shelf: the cover of this story on phone and desktop. */
export const StoryBoard = () => <div className="sgc-board" role="img" aria-label={`${EP.title}, the story book from the shelf`}>
  <span className="sgc-board-frame" aria-hidden="true"><i/><i/><i/><i/></span>
  <span className="sgc-board-series">FIND SG · FIELD ARCHIVE</span>
  <strong className="sgc-board-title">{EP.title}</strong>
  <span className="sgc-board-en">{EP.english}</span>
  <DomeArt/>
  <span className="sgc-board-quote">{EP.subtitle}</span>
  <span className="sgc-board-roman">I</span>
</div>;

export default function ShortCompact(p) {
  const {state, mode, position, phase, place, placeIndex, second, checked, inspected, reducedMotion, sceneVersion, setSceneVersion,
    ticket, ticketHost, ticketWidth, heading, photos, choosePhoto, PhotoNote, Facts, SceneBoundary,
    onExit, act, openTicket, inspect, travel, placeBottle, go, switchMode, setSheet, downloadRecord, restart} = p;
  const [note, setNote] = useState(false);
  const manual = mode === 'manual';
  const isCover = position === 'cover', isEnding = position === 'ending';

  // the page itself: nothing under it scrolls while it is open
  useEffect(() => {
    const root = document.documentElement, before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {root.style.overflow = before;};
  }, []);

  const open = kind => {setNote(false); setSheet(kind);};
  const modeChip = <button className={'ogc-mode is-' + (manual ? 'manual' : 'preview')} onClick={() => switchMode(manual ? 'preview' : 'manual')}
    aria-label={manual ? 'On site. Switch to remote play' : 'Remote play. Switch to on site'}>{manual ? 'On site' : 'Remote'}</button>;
  const noteFoot = <footer className="ogc-note-foot">
    <button onClick={() => switchMode(manual ? 'preview' : 'manual')}>{manual ? 'Switch to remote play' : 'Switch to on site'}</button>
    <button onClick={() => open('play')}>Paper study</button>
    <button onClick={() => setNote('restart')}>Start over</button>
  </footer>;

  let top, title, strip, stage, card, body, cardKind = '';
  if (isCover) {
    top = 'Short story';
    // the cover is the green book from the shelf, opened in your hands: the same gold-blocked board
    title = <><h1 ref={heading} tabIndex={-1} className="sgc-sr">{EP.title}</h1>
      <p className="sgc-meta">Kampong Gelam <i>·</i> 2 buildings <i>·</i> 20–30 min</p></>;
    stage = <StoryBoard/>;
    cardKind = 'ticket';
    card = <article className="ogc-card sgc-ticket-card">
      <header><span>Your field pass</span><button className="ogc-more" onClick={() => open('letter')}>The commission <b aria-hidden="true">›</b></button></header>
      <div ref={ticketHost} className="sgc-ticket">
        <TearTicket ref={ticket} width={ticketWidth} height={150} stubSize={Math.max(76, Math.min(96, ticketWidth * .25))} radius={6} holes={11} holeSize={4} roughness={1.8} tearAngle={28} stretch={28} resistance={.45} rotate={-.8} tiltMax={4}
          background="#eee0bf" color="#2a3d31" stubBackground="#cf804a" borderColor="#ad9369" reducedMotion={reducedMotion} onTear={openTicket} ariaLabel="Tear the entry ticket to open the story"
          stub={<div className="short-ticket-stub"><small>ADMIT ONE</small><b>Tear to<br/>enter</b><span>↘︎</span></div>}>
          <div className="short-ticket-copy sgc-ticket-copy"><span>FINDSG / FIELD PASS 001</span><h3>Two buildings, one blank line</h3><p>101 Jalan Sultan → 3 Muscat Street</p><div><b>02 BUILDINGS</b><span>{manual ? 'On-site pass' : 'Remote play pass'}</span></div></div>
        </TearTicket>
      </div>
    </article>;
  } else if (isEnding) {
    top = 'Final chapter';
    title = <h1 ref={heading} tabIndex={-1}>The last line is complete</h1>;
    // the case file: the two pieces of evidence, the editor's reply and the stamp that closes the case
    stage = <article className="sgc-folio">
      <header><span>Case file · Kampong Gelam</span><b>{EP.title}</b></header>
      <ol>
        <li><div className="short-folio-arch" aria-hidden="true"><i/><i/><i/></div>
          <section><span>Evidence 01 · The old press</span><strong>Names in the small print</strong><p>“Di-chetak oleh” HARMY Press · <i>Fesyen</i>, 1959</p></section></li>
        <li><div className="short-folio-discs" aria-hidden="true">{Array.from({length: 9}, (_, i) => <i key={i}/>)}</div>
          <section><span>Evidence 02 · Sultan Mosque</span><strong>Glass beneath the dome</strong><p>Bottle ends given by those who had little to give</p></section></li>
      </ol>
      <footer><p>“Next time you see a building, look a little longer: who else left something of themselves here?”</p><small>Ah Ning · {manual ? 'field notes, self-reported' : 'preview edition, no site visit'}</small></footer>
      <span className="sgc-stamp" aria-label="Case closed">Case<br/>closed</span>
    </article>;
    card = <Card kicker={`✓ ${manual ? 'Both stops on site' : 'Both stops played'} · 2/2`} title="This line is for ordinary people."
      actions={<><Primary onClick={onExit}>Back to the story box</Primary><Quiet onClick={() => go('second')}>Look again</Quiet></>}
      more="The full page" onMore={() => setNote(true)}/>;
    body = <><h2>Beneath the Golden Dome</h2>
      <div className="og-real-connection"><span>01 / The people in print</span><strong>101 Jalan Sultan</strong><p>{EP.places[0].fact}</p></div>
      <div className="og-real-connection"><span>02 / The people in glass</span><strong>3 Muscat Street</strong><p>{EP.places[1].fact}</p></div>
      <p className="ogc-note-lead">“Thank you for filling in this line. Next time you see a building, perhaps you will look a little longer: beyond its brightest part, who else left something of themselves here?”</p>
      <button className="sg-text-button" onClick={downloadRecord}>Save this exploration record ↓</button><Facts/></>;
  } else {
    const steps = [['Check in', checked], ['Observe', inspected], [second ? 'Place the glass' : 'Find the way', second ? state.bottle : state.book]];
    const activeAt = steps.findIndex(s => !s[1]);
    top = <><b>{pad(placeIndex + 1)}</b>/02<i aria-hidden="true">·</i>{second ? 'Below the gold' : 'Trace the arch'}</>;
    title = <h1 ref={heading} tabIndex={-1}>{place.name}</h1>;
    strip = <ol className="ogc-steps sgc-steps" aria-label="Steps at this stop">{steps.map(([label, done], i) =>
      <li key={label} className={(done ? 'done ' : '') + (i === activeAt ? 'active' : '')}><i aria-hidden="true">{done ? '✓' : i + 1}</i>{label}</li>)}</ol>;
    stage = <div className={'ogc-model sgc-model ' + (checked ? 'is-awake' : 'is-sleeping')}>
      <SceneBoundary key={`${place.id}:${mode}:${sceneVersion}`} onRetry={() => setSceneVersion(v => v + 1)}>
        <ShortScene kind={place.id} enabled={checked} inspected={inspected} canPlace={second && state.parcel} placed={second && state.bottle} reducedMotion={reducedMotion} onInspect={inspect} onPlace={placeBottle}/>
      </SceneBoundary>
      {!checked && <p className="ogc-stage-note">Check in to wake the building</p>}
    </div>;
    const n = `Stop ${pad(placeIndex + 1)}`;
    if (phase === 'arrival') {
      card = <Card kicker={`${n} · Check in`} title={second ? 'The next place in the letter is right here.' : 'First, stand in front of this building.'}
        lead={<>{place.address} · <a href={shortMap(place)} target="_blank" rel="noreferrer">Map ↗︎</a></>}
        actions={<><Primary onClick={() => act(second ? 'checkin2' : 'checkin1')}>{manual ? 'I’m here · check in' : 'Play it remotely'}</Primary>
          <Quiet onClick={() => switchMode(manual ? 'preview' : 'manual')}>{manual ? 'Play remotely' : 'On site'}</Quiet></>}
        more="The commission" onMore={() => open('letter')}/>;
    } else if (phase === 'observe') {
      cardKind = 'bare';
      card = <Card kicker={`${n} · Observe`} title={second ? 'What lies below the gold?' : 'Add this curve to the proof book.'} lead={place.prompt} more="Hint & photo" onMore={() => setNote(true)}/>;
    } else if (phase === 'book') {
      card = <Card kicker="✓ Window arch recorded" title="Names live on in the small type." lead="Open the proof book. Its last page gives the next building and where the parcel goes."
        actions={<Primary onClick={() => open('book')}>Open the proof book</Primary>} more="Hint & photo" onMore={() => setNote(true)}/>;
    } else if (phase === 'parcel') {
      card = <Card kicker="✓ Dark band found" title="Now, open the parcel." lead="You carried it all the way here. Pull out the band and unfold the wrapping."
        actions={<Primary onClick={() => open('parcel')}>Unwrap the parcel</Primary>} more="Hint & photo" onMore={() => setNote(true)}/>;
    } else if (phase === 'place') {
      cardKind = 'bare';
      card = <Card kicker="✓ Parcel opened" title="Help ordinary glass find its place." more="The parcel" onMore={() => open('parcel')}/>;
    } else if (second) {
      card = <Card kicker="✓ Both finds are linked" title="The last line has its answer." lead="The small type keeps the printers; the glass keeps the givers."
        actions={<Primary onClick={() => {act('ending'); go('ending');}}>Unfold the finished page</Primary>} more="Films" onMore={() => open('films')}/>;
    } else {
      card = <Card kicker="✓ First stop filed" title="Look for the next line below the golden dome." lead={<>Next address: 3 Muscat Street · <a href={shortDirections()} target="_blank" rel="noreferrer">Walk there ↗︎</a></>}
        actions={<Primary onClick={travel}>Take the proof book to stop two</Primary>} more="Proof book" onMore={() => open('book')}/>;
    }
    body = <><h2>{place.name}</h2><p className="ogc-note-lead">{place.prompt}</p>
      <div className="og-destination"><span>Real place</span><strong>{place.english}</strong><p>{place.address}</p><a href={shortMap(place)} target="_blank" rel="noreferrer">View on map ↗︎</a></div>
      <div className="og-real-connection"><span>{manual ? 'Need a hint?' : 'Remote play hint'}</span><p>{place.hint}</p><p>{place.view}</p></div>
      <PhotoNote index={placeIndex} photo={photos[placeIndex]} onChoose={choosePhoto}/>
      <div className="sgc-objects">
        <button onClick={() => open('letter')}>Commission letter</button>
        <button disabled={!state.arch} onClick={() => open('book')}>Proof book</button>
        <button disabled={!state.band} onClick={() => open('parcel')}>{state.parcel ? 'Glass sample' : 'Paper parcel'}</button>
      </div>
      <Facts place={place}/></>;
  }

  return <section className={'ogc sgc' + (note ? ' has-sheet' : '')} data-phase={isCover ? 'cover' : isEnding ? 'ending' : phase} data-card={cardKind}
    aria-label={`${EP.title}${isCover || isEnding ? '' : `, stop ${placeIndex + 1} of 2`}`}>
    <header className="ogc-top">
      <button onClick={onExit} aria-label="Back to the story box">‹ Story box</button>
      <button className="ogc-chapter" onClick={() => setNote('route')} aria-label="Show the route">{top}</button>
      <button onClick={() => open('films')}>Films</button>
    </header>
    <div className="ogc-title">{title}{modeChip}</div>
    {strip}
    <div className="ogc-stage">{stage}</div>
    {card}
    {note === 'route' ? <FieldNote onClose={() => setNote(false)}>
      <span className="ogc-note-kicker">The route · 2 buildings</span>
      <h2>One street, two ways of being remembered.</h2>
      <div className="sgc-route is-walk">{EP.places.map((x, i) => {
        const done = i === 0 ? state.book : state.bottle;
        const here = !isCover && !isEnding && placeIndex === i;
        const can = state.ticket && (i === 0 || state.travel);
        return <button key={x.id} className={(done ? 'is-done' : '') + (here ? ' is-here' : '')} disabled={!can || here}
          onClick={() => {setNote(false); go(i ? 'second' : 'first');}}>
          <b aria-hidden="true">{done ? '✓' : pad(i + 1)}</b>
          <section><strong>{x.name}</strong><small>{x.address}</small></section>
          <i aria-hidden="true">{here ? 'Here' : can ? '›' : ''}</i>
        </button>;
      })}</div>
      <p className="og-fine-print">The map gives real walking directions. Follow conditions on the ground.</p>
      <footer className="ogc-note-foot">
        <a href={shortDirections()} target="_blank" rel="noreferrer">Walking route ↗︎</a>
        <button onClick={() => setNote('restart')}>Start over</button>
      </footer>
    </FieldNote> : note === 'restart' ? <FieldNote onClose={() => setNote(false)}>
      <span className="ogc-note-kicker">Start over</span>
      <h2>Start this story over?</h2>
      <p className="ogc-note-lead">This only resets your {manual ? 'on-site' : 'remote play'} record for this story. The other mode and the four original routes are kept.</p>
      <div className="ogc-actions"><Primary onClick={() => {setNote(false); restart();}}>Start again from the ticket</Primary><Quiet onClick={() => setNote(false)}>Keep playing</Quiet></div>
    </FieldNote> : note && <FieldNote onClose={() => setNote(false)}>
      <span className="ogc-note-kicker">{isCover ? 'The commission' : isEnding ? 'Your field edition' : `Field note · stop ${pad(placeIndex + 1)}`}</span>
      {body}
      {noteFoot}
    </FieldNote>}
  </section>;
}
