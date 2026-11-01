import React,{useCallback,useEffect,useRef,useState} from 'react';
import TearTicket from '../game/TearTicket.jsx';
import {assetFor} from '../data.js';
import PaperObject,{FieldBook} from './PaperObjects.jsx';
import ShortScene from './ShortScene.jsx';
import StoryFilm from './StoryFilm.jsx';
import {SHORT_FILMS} from './short-films.js';
import {SHORT_EPISODE as EP,shortDirections,shortMap} from './short-content.js';
import {readShort,saveShort,shortTransition,shortPosition,shortCount} from './short-state.js';
import ShortCompact,{StoryBoard,useShortCompact} from './ShortCompact.jsx';
import './short-story.css';

const MODE_KEY='findsg-short-mode-v1';
function readMode(){try{return localStorage.getItem(MODE_KEY)==='preview'?'preview':'manual';}catch{return 'manual';}}
const zeroPad=n=>String(n).padStart(2,'0');

export function ShortStoryTeaser({onOpen,compact=false}){
 return <section className={'short-teaser'+(compact?' is-compact':'')} aria-label="New two-stop story">
  <div className="short-teaser-image"><img src={assetFor(EP.hero)} alt="Concept art of a paper parcel, glass bottles and two buildings"/></div>
  <div className="short-teaser-copy"><span className="short-eyebrow">NEW / TWO BUILDINGS, ONE STORY</span><h2>Beneath the Golden Dome<span>A two-stop short story</span></h2><p>Set out from an old press and look for the gifts ordinary people left beneath the golden dome.</p></div>
  <button className="short-button" onClick={onOpen}>Open the story <span aria-hidden="true">↗︎</span></button>
 </section>;
}

export function Bottle({small=false}){
 return <span className={'short-bottle'+(small?' is-small':'')} aria-hidden="true"><i className="short-bottle-lip"/><i className="short-bottle-neck"/><i className="short-bottle-body"><b/><em>GLASS<br/>STUDY 02</em></i><i className="short-bottle-shadow"/></span>;
}

function Facts({place}){
 const sources=place?EP.sources.filter(x=>place.sourceIds.includes(x.id)):EP.sources;
 return <details className="short-facts"><summary>Sources, oral history and fiction <span>＋</span></summary><div>
  {place?<p>{place.fact}</p>:<><p>This short story draws on Kampong Gelam’s publishing history and on records of the glass bottles the community gave when Sultan Mosque was rebuilt.</p><p>Rebuilding was proposed in 1924, begun in 1928, opened in 1929 and completed in 1932, following NLB’s phased research; the simplified dates in shorter histories are not used as answers.</p></>}
  <ul>{sources.map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗︎</a><small>{source.note}</small></li>)}</ul>
  <p className="short-source-boundary">{EP.distinction}</p>
 </div></details>;
}

function RouteSlip({state,onVisit,onWalk}){
 return <nav className="short-route-slip" aria-label="Two-stop walking route"><span className="short-eyebrow">YOUR TWO-STOP WALK</span>
  {EP.places.map((p,i)=><button key={p.id} className={(i===0?state.book:state.bottle)?'is-done':''} disabled={!state.ticket||(i===1&&!state.travel)} onClick={()=>onVisit(i?'second':'first')}><span>{(i===0?state.book:state.bottle)?'✓':zeroPad(i+1)}</span><div><strong>{p.name}</strong><small>{i===0?'101 Jalan Sultan':'3 Muscat Street'}</small></div><b aria-hidden="true">↗︎</b></button>)}
  <a href={shortDirections()} target="_blank" rel="noreferrer" onClick={onWalk}>See the walking route <span>↗︎</span></a>
  <small className="short-route-note">The map gives real walking directions. Follow conditions on the ground.</small>
 </nav>;
}

function PhotoNote({index,photo,onChoose}){
 const input=useRef(null);
 return <div className="short-photo-note"><input ref={input} type="file" accept="image/*" capture="environment" onChange={onChoose} aria-label={`Add an observation photo for stop ${index+1}`} hidden/>
  <button onClick={()=>input.current?.click()}>{photo?'Change photo':'Photograph the detail you see'} <span aria-hidden="true">⌑</span></button>
  {photo&&<figure><img src={photo.url} alt={`Your observation photo for stop ${index+1}`}/><figcaption>Your observation · not checked by AI</figcaption></figure>}
  <small>Optional · the photo stays on this page and does not confirm a visit or solve the puzzle.</small>
 </div>;
}

class SceneBoundary extends React.Component{
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="short-scene-error"><h3>The building model did not open</h3><p>Your progress is kept. You can try loading it again.</p><button className="short-button" onClick={()=>{this.setState({failed:false});this.props.onRetry?.();}}>Reopen the model</button></div>:this.props.children;}
}

function PaperPlay({reducedMotion}){
 const [kind,setKind]=useState('envelope'),[version,setVersion]=useState(0);
 const options=[['envelope','Open the envelope','Lift the flap, then pull out the letter'],['book','Open the book','Turn the cover and pages along the spine'],['parcel','Unwrap the parcel','Pull out the band, then unfold both sides'],['tear','Tear along the line','Pull along the perforation for a soft torn edge']];
 const info=options.find(x=>x[0]===kind);
 return <div className="short-paper-play"><div className="short-paper-tabs" role="group" aria-label="Choose a paper object">{options.map(x=><button key={x[0]} aria-pressed={kind===x[0]} onClick={()=>{setKind(x[0]);setVersion(v=>v+1);}}>{x[1]}</button>)}</div>
  {kind==='book'?<FieldBook key={`${kind}:${version}`} title="City field notebook" subtitle="PAPER STUDY / SAMPLE" folio="STUDY 02" reducedMotion={reducedMotion} pages={[{label:'PAGE 01',title:'Paper has a direction too',body:'Gently turn the right page corner. The cover, the paper and the spine each have their own weight.'},{label:'PAGE 02',title:'Keep your finds here',body:'The real proof book leads you to the next building. This one is just for practice.'}]}/>:<PaperObject key={`${kind}:${version}`} kind={kind} title={info[1]} subtitle={info[2]} folio="PAPER STUDY" reducedMotion={reducedMotion}><div className="short-paper-sample"><span>FINDSG / MATERIAL STUDY</span><h3>The other side of a sheet</h3><p>A flap, a band and a perforation each let you reach what is inside in a different way.</p></div></PaperObject>}
  <button className="short-text-button" onClick={()=>setVersion(v=>v+1)}>Reset this object ↶</button>
 </div>;
}

export default function ShortStoryGame({onExit,reducedMotion=false}){
 const [mode,setMode]=useState(readMode),[state,setState]=useState(()=>readShort(readMode()));
 const [position,setPosition]=useState(()=>shortPosition(readShort(readMode()))),[sheet,setSheet]=useState(null),[toast,setToast]=useState(''),[storageNotice,setStorageNotice]=useState(false),[sceneVersion,setSceneVersion]=useState(0),[photos,setPhotos]=useState({}),[film,setFilm]=useState(null);
 const compact=useShortCompact();
 const ticket=useRef(null),ticketHost=useRef(null),dialog=useRef(null),returnFocus=useRef(null),heading=useRef(null),delay=useRef(null),photoUrls=useRef([]),[ticketWidth,setTicketWidth]=useState(440);
 const modeIsManual=mode==='manual',second=position==='second',placeIndex=second?1:0,place=EP.places[placeIndex];
 const act=useCallback(type=>setState(current=>shortTransition(current,type)),[]);

 useEffect(()=>{setStorageNotice(!saveShort(state));},[state]);
 useEffect(()=>()=>{clearTimeout(delay.current);photoUrls.current.forEach(url=>URL.revokeObjectURL(url));},[]);
 useEffect(()=>{if(!sheet||!dialog.current)return;returnFocus.current=document.activeElement;dialog.current.showModal();return()=>{dialog.current?.close();returnFocus.current?.focus?.({preventScroll:true});};},[sheet]);
 useEffect(()=>{if(!ticketHost.current)return;const node=ticketHost.current,measure=()=>setTicketWidth(Math.max(230,Math.min(460,Math.floor(node.getBoundingClientRect().width))));measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[position]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[position]);
 // a toast says one thing and goes; on a phone it lies over the picture
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(t);},[toast]);

 function go(next){setSheet(null);setPosition(next);setToast('');window.scrollTo({top:0,behavior:reducedMotion?'instant':'smooth'});}
 function switchMode(next){if(next===mode)return;clearTimeout(delay.current);setFilm(null);setSheet(null);const fresh=readShort(next);setMode(next);setState(fresh);setPosition(shortPosition(fresh));setToast('');photoUrls.current.forEach(url=>URL.revokeObjectURL(url));photoUrls.current=[];setPhotos({});try{localStorage.setItem(MODE_KEY,next);}catch{}}
 function openTicket(){act('ticket');go('first');setFilm({id:'opening',replay:false});}
 // on a phone the card under the picture turns to the next step itself, so a toast would only say it twice
 function inspect(feature){if(feature==='arch'&&!state.arch){act('arch');if(!compact)setToast('The arch is in the proof book. Turn to the last page to find the next stop.');}if(feature==='bottle-band'&&!state.band){act('band');if(!compact)setToast('That is the dark band. Now you can open the parcel you brought.');}}
 function travel(){if(!state.book)return;act('travel');go('second');if(!state.travel)setFilm({id:'passage',replay:false});}
 function placeBottle(){if(!state.parcel||state.bottle)return;act('bottle');if(!compact)setToast('The glass is in place. The last line of the folded paper has its answer.');setFilm({id:'reward',replay:false});}
 function choosePhoto(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;if(!file.type.startsWith('image/')||file.size>20*1024*1024){setToast('Please choose an image under 20 MB.');return;}const url=URL.createObjectURL(file);photoUrls.current.push(url);setPhotos(p=>({...p,[placeIndex]:{url,name:file.name}}));setToast('Observation photo added to this page.');}
 function restart(){setState(current=>shortTransition(current,'reset'));setFilm(null);setSheet(null);setPosition('cover');setToast('');photoUrls.current.forEach(url=>URL.revokeObjectURL(url));photoUrls.current=[];setPhotos({});}
 const filmUnlocked={opening:state.ticket,passage:state.travel,reward:state.bottle};
 function replayFilm(id){if(!filmUnlocked[id])return;setSheet(null);setFilm({id,replay:true});}
 function closeFilm(){if(film?.replay)setSheet('films');setFilm(null);}
 function downloadRecord(){
  const record={app:'FindSG',story:EP.title,episodeId:state.episodeId,mode,arrivalVerification:'manual-self-report',photoVerification:'not-connected',progress:state,places:EP.places.map(p=>({name:p.name,address:p.address})),sources:EP.sources,storyFiction:EP.distinction};
  const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='findsg-gold-under-glass-progress.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
 }

 const earned=shortCount(state),checked=second?state.arrival2:state.arrival1,inspected=second?state.band:state.arch;
 const phase=second?(state.bottle?'complete':!checked?'arrival':!state.band?'observe':!state.parcel?'parcel':'place'):(!checked?'arrival':!state.arch?'observe':state.book?'complete':'book');
 const isCover=position==='cover',isEnding=position==='ending';
 const overlays=<>
  {toast&&<div className="short-toast" role="status"><span>✦</span>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss">×</button></div>}

  <dialog ref={dialog} className={'short-dialog'+(sheet==='book'?' is-book':'')} aria-label={sheet==='films'?'Story films':sheet==='book'?'Proof book':sheet==='parcel'?'Open the glass sample parcel':sheet==='play'?'Paper study':sheet==='letter'?'Commission letter':'Story archive'} onCancel={()=>setSheet(null)} onClick={e=>{if(e.target===dialog.current&&!compact)setSheet(null);}}>
   <div className="short-dialog-bar"><span>{({letter:'The commission',book:'The street proof book',parcel:'A parcel for the dome',films:'Story films',play:'Paper study',route:'Route and sources',restart:'Start over'}[sheet]||'Your objects')}</span><button onClick={()=>setSheet(null)} aria-label="Close">×</button></div><div className="short-dialog-content">
   {sheet==='letter'&&<><PaperObject kind="envelope" title="A letter from Ah Ning" subtitle="A neighbourhood commission from today" folio="KG / LETTER 01" reducedMotion={reducedMotion} initialOpen={state.letter} onOpen={()=>act('letter')}><div className="short-letter-text">{EP.letter.split('\n').map((line,i)=>line?<p key={i}>{line}</p>:null)}</div></PaperObject></>}
   {sheet==='book'&&state.arch&&<><FieldBook title="The street proof book" subtitle="THE PEOPLE IN SMALL TYPE / THE LAST LINE" folio="KG / FOLIO 01" pages={EP.pages} reducedMotion={reducedMotion} initialOpen={state.book} onFinish={()=>act('book')}/><div className="short-dialog-actions"><button className="short-outline-button" onClick={()=>setSheet(null)}>Put the proof book away</button><button className="short-button" disabled={!state.book} onClick={travel}>{state.book?'Take the proof book to the second stop':'Turn to the last page to find the next stop'} <span>→</span></button></div></>}
   {sheet==='parcel'&&state.band&&<><PaperObject kind="parcel" title="Please take this to the dome" subtitle="DIGITAL GLASS SAMPLE / HANDLE WITH CARE" folio="KG / OBJECT 02" reducedMotion={reducedMotion} initialOpen={state.parcel} onOpen={()=>act('parcel')}><div className="short-parcel-content"><Bottle/><div><span>GLASS STUDY / 02</span><h3>An ordinary piece of glass</h3><p>Its worth is not only in what it is made of. Take it to the building model and see which part it can become.</p></div></div></PaperObject><div className="short-dialog-actions"><button className="short-button" disabled={!state.parcel} onClick={()=>setSheet(null)}>{state.parcel?'Take the sample back to the model':'Pull the band, then unfold the wrapping'} <span>→</span></button></div></>}
   {sheet==='play'&&<><h2>Each paper object feels different.</h2><PaperPlay reducedMotion={reducedMotion}/></>}
   {sheet==='films'&&<><h2>Watch your finds again.</h2><div className="short-film-archive">{Object.values(SHORT_FILMS).map((item,i)=><button key={item.id} disabled={!filmUnlocked[item.id]} onClick={()=>replayFilm(item.id)}><div className="short-film-archive-frame">{filmUnlocked[item.id]?<img src={assetFor(item.poster)} alt="" loading="lazy"/>:<span className="short-film-locked">REEL {zeroPad(i+1)}<b>Locked</b></span>}<span className="short-film-archive-number">{zeroPad(i+1)}</span>{filmUnlocked[item.id]&&<span className="short-film-play" aria-hidden="true">▶</span>}</div><div className="short-film-archive-copy"><strong>{filmUnlocked[item.id]?item.title:['A story about to begin','The next part, for the road','The ending, for your find'][i]}</strong><span>{filmUnlocked[item.id]?'Replay ▶':['Unlocks when the ticket is torn','Unlocks on the way to stop two','Unlocks when the glass is placed'][i]}</span></div></button>)}</div><p className="short-muted">Films are visual interpretations, not archival footage. Replaying never adds finds.</p></>}
   {sheet==='route'&&<><span className="short-eyebrow">THE GLASS BENEATH THE GOLD / 2 BUILDINGS</span><h2>One street, two ways of being remembered.</h2><p>{EP.premise}</p><RouteSlip state={state} onVisit={next=>{if(state.ticket)go(next);}}/><div className="short-location-details">{EP.places.map(p=><section key={p.id}><h3>{p.name}</h3><address>{p.address}</address><p>{p.view}</p><a href={shortMap(p)} target="_blank" rel="noreferrer">Map ↗︎</a><a href={p.website} target="_blank" rel="noreferrer">Official website ↗︎</a><a href={`tel:${p.phone.replaceAll(' ','')}`}>{p.phone}</a></section>)}</div><Facts/><button className="short-text-button" onClick={()=>setSheet('restart')}>Reset {modeIsManual?'on-site':'remote play'} progress ↶</button></>}
   {sheet==='restart'&&<><h2>Start this story over?</h2><p>This only resets your {modeIsManual?'on-site':'remote play'} record for this story. The other mode and the four original routes are kept.</p><div className="short-dialog-actions"><button className="short-outline-button" onClick={()=>setSheet(null)}>Keep playing</button><button className="short-button" onClick={restart}>Start again from the ticket</button></div></>}
   </div>
  </dialog>
  {film&&<StoryFilm filmId={film.id} replay={film.replay} reducedMotion={reducedMotion} continueLabel={film.replay?'Back to the archive':({opening:'Start observing the first stop',passage:'See the second stop task',reward:'Return and unfold the page'}[film.id])} onContinue={closeFilm} onClose={closeFilm}/>}
 </>;
 if(compact)return <section className="short-story is-compact" data-short-story="gold-under-glass" data-mode={mode} data-phase={isCover?'cover':isEnding?'ending':phase}>
  <ShortCompact {...{state,mode,position,phase,place,placeIndex,second,checked,inspected,reducedMotion,sceneVersion,setSceneVersion,ticket,ticketHost,ticketWidth,heading,photos,choosePhoto,PhotoNote,Facts,SceneBoundary,onExit,act,openTicket,inspect,travel,placeBottle,go,switchMode,setSheet,downloadRecord,restart}}/>
  {overlays}
 </section>;
 return <section className={'short-story'+(isCover?' is-cover':'')+(isEnding?' is-ending':'')} data-short-story="gold-under-glass" data-mode={mode} data-phase={isCover?'cover':isEnding?'ending':phase}>
  <div className="short-topbar"><button className="short-text-button" onClick={onExit}>← Story box</button><span>FINDSG SHORT STORIES / VOL. 01</span><div><button onClick={()=>setSheet('films')}>Films</button><button onClick={()=>setSheet('play')}>Paper study</button><button onClick={()=>setSheet('route')}>Route and sources</button></div></div>
  <div className="short-mode-row"><div className="short-mode-tabs" role="group" aria-label="Choose a play mode"><button aria-pressed={!modeIsManual} onClick={()=>switchMode('preview')}>Remote play</button><button aria-pressed={modeIsManual} onClick={()=>switchMode('manual')}>On site</button></div><p>{modeIsManual?'Check in yourself on arrival · location not verified':'Separate remote progress · does not count as a visit'}</p></div>
  {storageNotice&&<p className="short-storage-notice" role="status">This browser could not save your progress. You can keep playing on this page.</p>}

  {isCover?<>
   <div className="short-cover-grid"><div className="short-cover-copy"><span className="short-eyebrow">KAMPONG GELAM / A TWO-STOP STORY</span><p className="short-edition">Two buildings · one commission</p><h1 ref={heading} tabIndex={-1}>Beneath the <span>Golden Dome<i aria-hidden="true">.</i></span></h1><p className="short-cover-english">THE GLASS BENEATH THE GOLD</p><p className="short-cover-lead">An ordinary thing,<br/>worth a city remembering.</p><p className="short-cover-body">{EP.premise}</p><div className="short-cover-tags"><span>2 building check-ins</span><span>Turn pages · unwrap · 3D assembly</span><span>3 story films</span><span>About 20–30 minutes</span></div></div>
    <div className="short-cover-book"><StoryBoard/></div>
   </div>
   <div className="short-cover-bottom"><div ref={ticketHost} className="short-ticket-host"><TearTicket ref={ticket} width={ticketWidth} height={184} stubSize={Math.max(76,Math.min(108,ticketWidth*.25))} radius={6} holes={13} holeSize={4} roughness={1.8} tearAngle={28} stretch={28} resistance={.45} rotate={-.8} tiltMax={4} background="#eee0bf" color="#2a3d31" stubBackground="#cf804a" borderColor="#ad9369" reducedMotion={reducedMotion} onTear={openTicket} ariaLabel="Tear the entry ticket to open the 3D street view" stub={<div className="short-ticket-stub"><small>ADMIT ONE</small><b>Tear to<br/>enter</b><span>↘︎</span></div>}><div className="short-ticket-copy"><span>FINDSG / FIELD PASS 001</span><h3>Beneath the Golden Dome</h3><p>101 Jalan Sultan → 3 Muscat Street</p><div><b>02 BUILDINGS</b><span>{modeIsManual?'On-site pass':'Remote play pass'}</span></div></div></TearTicket><button className="short-ticket-button" onClick={()=>ticket.current?.tear()}>Tear the ticket to open the 3D street view <span>↗︎</span></button><small>Tearing the ticket only opens the story. Visits are recorded with the check-in button at each place.</small></div>
    <div className="short-cover-route"><span className="short-eyebrow">TWO PLACES. ONE MISSING LINE.</span>{EP.places.map((p,i)=><div key={p.id}><b>{zeroPad(i+1)}</b><section><h3>{p.name}</h3><p>{i===0?'Find the people named in the small type at the back of a magazine.':'Look below the golden dome for another kind of contribution.'}</p><small>{p.address}</small></section></div>)}</div>
   </div><Facts/>
  </>:isEnding?<>
   <div className="short-ending-head"><span className="short-eyebrow">THE LAST LINE IS NOW COMPLETE</span><h1 ref={heading} tabIndex={-1}>This line is for ordinary people.</h1><p>The small print remembers the printers; the glass remembers the givers.</p><span className="short-complete-label">✓ {modeIsManual?'Both stops explored on site':'Both stops played remotely'} · 2 / 2</span></div>
   <article className="short-final-folio"><header><span>FINDSG / KAMPONG GELAM</span><b>Beneath the Golden Dome</b><small>YOUR FIELD EDITION · 001</small></header><div className="short-folio-spread"><section><span>01 / THE PEOPLE IN PRINT</span><h2>Names hidden in small print</h2><div className="short-folio-arch" aria-hidden="true"><i/><i/><i/></div><p>{EP.places[0].fact}</p><small>101 Jalan Sultan</small></section><section><span>02 / THE PEOPLE IN GLASS</span><h2>Gifts left beneath the dome</h2><div className="short-folio-discs" aria-hidden="true">{Array.from({length:11},(_,i)=><i key={i}/>)}</div><p>{EP.places[1].fact}</p><small>3 Muscat Street</small></section></div><footer><span>The editor’s reply · contemporary fiction</span><p>“Thank you for filling in this line. Next time you see a building, perhaps you will look a little longer: beyond its brightest part, who else left something of themselves here?”</p><b>{modeIsManual?'FIELD NOTES / SELF-REPORTED':'PREVIEW EDITION / NO SITE VISIT'}</b></footer><span className="sgc-stamp" aria-label="Case closed">Case<br/>closed</span></article>
   <div className="short-ending-actions"><button className="short-button" onClick={()=>go('second')}>Look at the glass band again <span>↗︎</span></button><button className="short-outline-button" onClick={downloadRecord}>Save this exploration record ↓</button><button className="short-text-button" onClick={()=>setSheet('restart')}>Play this story again ↶</button></div><Facts/>
  </>:<>
   <div className="short-field-heading"><div><span className="short-eyebrow">THE GLASS BENEATH THE GOLD / CHAPTER {zeroPad(placeIndex+1)}</span><h1 ref={heading} tabIndex={-1}>{place.name}</h1><p>{place.english}</p></div><div className="short-field-count"><b>{zeroPad(earned)}</b><span>/ 02<br/>pieces filed</span></div></div>
   <div className="short-field-grid"><div className="short-world-column"><div className={'short-world-frame'+(checked?' is-awake':'')}><div className="short-world-top"><span>FIELD MODEL / {zeroPad(placeIndex+1)}</span><b>{checked?'Your observation is lighting up the details':'Study the building, then check in on site'}</b></div><SceneBoundary key={`${place.id}:${mode}:${sceneVersion}`} onRetry={()=>setSceneVersion(v=>v+1)}><ShortScene kind={place.id} enabled={checked} inspected={inspected} canPlace={second&&state.parcel} placed={second&&state.bottle} reducedMotion={reducedMotion} onInspect={inspect} onPlace={placeBottle}/></SceneBoundary><div className="short-world-bottom"><span>{place.today}</span><small>Illustrative model · drag to turn, zoom to look closer</small></div></div>
    <div className="short-task-track" aria-label="Steps at this stop"><span className={checked?'done':'active'}><b>{checked?'✓':'1'}</b>Check in</span><i/><span className={inspected?'done':checked?'active':''}><b>{inspected?'✓':'2'}</b>Observe</span><i/><span className={(second?state.bottle:state.book)?'done':inspected?'active':''}><b>{(second?state.bottle:state.book)?'✓':'3'}</b>{second?'Place the glass':'Find the way'}</span></div>
    <div className="short-object-belt" aria-label="Your objects"><button onClick={()=>setSheet('letter')}><span className="short-object-icon is-letter"/><section><strong>Commission letter</strong><small>Read any time</small></section><b>↗︎</b></button><button disabled={!state.arch} onClick={()=>setSheet('book')}><span className="short-object-icon is-book"/><section><strong>Proof book</strong><small>{state.book?'Next clue read':state.arch?'Found · open it':'Unlocks after the first stop'}</small></section><b>{state.arch?'↗︎':'·'}</b></button><button disabled={!state.band} onClick={()=>setSheet('parcel')}><span className="short-object-icon is-parcel"/><section><strong>{state.parcel?'Glass sample':'Paper parcel'}</strong><small>{state.parcel?'Opened · use it on the model':state.band?'Ready to use':'Take it to the second stop'}</small></section><b>{state.band?'↗︎':'·'}</b></button></div>
   </div>
   <aside className="short-mission-panel"><div className="short-panel-heading"><span>Your next step</span><small>{phase==='arrival'?'ARRIVE':phase==='observe'?'LOOK CLOSER':phase==='complete'?'ONE MORE LINE':'OPEN & DISCOVER'}</small></div>
    {phase==='arrival'?<><h2>{second?'The next place in the letter<br/>is right here.'.split('<br/>').map((t,i)=><React.Fragment key={t}>{i>0&&<br/>}{t}</React.Fragment>):<>First, stand in front of<br/>this building.</>}</h2><p>{place.prompt}</p><address>{place.address}</address><a className="short-map-link" href={shortMap(place)} target="_blank" rel="noreferrer">View on the map ↗︎</a><button className="short-button is-wide" onClick={()=>act(second?'checkin2':'checkin1')}>{modeIsManual?'I am here, check in':'Simulate arrival and start'} <span>→</span></button><small className="short-mode-note">{modeIsManual?'You confirm your own arrival; GPS is not used to verify it.':'This only records remote play, not a visit.'}</small></>
    :phase==='observe'?<><h2>{second?<>What lies<br/>below the gold?</>:<>Add this curve<br/>to the proof book.</>}</h2><p>{place.prompt}</p><div className="short-instruction"><span>Try it on the model</span><p>{second?'Compare where the golden dome meets the building below, then point out the ring you saw on the model.':'Compare the long window you just saw, then find the same top outline on the model.'}</p></div><details className="short-hint"><summary>{modeIsManual?'Need a hint?':'See the remote play hint'}</summary><p>{place.hint}</p><p>{place.view}</p></details><PhotoNote index={placeIndex} photo={photos[placeIndex]} onChoose={choosePhoto}/></>
    :phase==='book'?<><span className="short-success-note">✓ Window arch recorded</span><h2>Names live on<br/>in the small type.</h2><p>Open the proof book. The last page has the next building’s address and where the parcel goes.</p><button className="short-button is-wide" onClick={()=>setSheet('book')}>Open the proof book <span>↗︎</span></button><small className="short-mode-note">Turn to the last page for the next clue.</small></>
    :phase==='parcel'?<><span className="short-success-note">✓ Dark band found</span><h2>Now,<br/>open the parcel.</h2><p>You have carried it all the way here. Pull out the band, unfold the wrapping, and see how what is inside relates to the detail in front of you.</p><button className="short-button is-wide" onClick={()=>setSheet('parcel')}>Unwrap the parcel <span>↗︎</span></button></>
    :phase==='place'?<><span className="short-success-note">✓ Parcel opened</span><h2>Help ordinary glass<br/>find its place.</h2><p>Pick up the glass sample beside the model and drag it to the band below the dome, or select the sample and tap the band.</p><div className="short-glass-note"><Bottle small/><p>This is a digital material sample. You are recreating how an ordinary object became part of a building.</p></div><button className="short-text-button" onClick={()=>setSheet('parcel')}>Look at the parcel again ↗︎</button></>
    :second?<><span className="short-success-note">✓ Both finds are linked</span><h2>The last line<br/>has its answer.</h2><p>The small type keeps the printers, the glass keeps the donors. Now gather both stops into the finished folded page.</p><button className="short-button is-wide" onClick={()=>{act('ending');go('ending');}}>Unfold the finished page <span>→</span></button></>
    :<><span className="short-success-note">✓ First stop filed</span><h2>Look for the next line<br/>below the golden dome.</h2><p>The proof book gives the address 3 Muscat Street. Take the parcel and go on to Sultan Mosque.</p><a className="short-map-link" href={shortDirections()} target="_blank" rel="noreferrer">Open walking directions ↗︎</a><button className="short-button is-wide" onClick={travel}>Take the proof book to the second stop <span>→</span></button></>}
    <div className="short-panel-foot"><span className="short-small-dot"/> {modeIsManual?'On site · self-reported':'Remote play · separate progress'}</div>
   </aside></div>
   <div className="short-after-scene"><RouteSlip state={state} onVisit={go}/><Facts place={place}/></div>
  </>}
  <p className="short-bottom-note">{EP.access}</p>
  {overlays}
 </section>;
}
