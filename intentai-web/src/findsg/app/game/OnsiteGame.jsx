import React,{lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {ROUTES,findStory,assetFor,gameSceneImageFor,sourceName} from '../data.js';
import {mapSearch} from '../field/field-storage.js';
import {GAME_STORIES} from './game-content.js';
import {ONSITE_ROUTES} from './onsite-content.js';
import HoloCard from './HoloCard.jsx';
import OptionWheel from './OptionWheel.jsx';
import {CARD_MATERIALS} from './ClueCollection.jsx';
import DiscoveryPacket from './DiscoveryPacket.jsx';
import MissionTicket from './MissionTicket.jsx';
import {normalizeOnsite,beginOnsite,checkInOnsite,observeOnsite,addOnsitePhoto,operateOnsite,advanceOnsite,onsiteStatus} from './onsite-state.js';
import {readOnsite,saveOnsite,emitOnsiteEvent} from './onsite-storage.js';
import './story-game.css';
import './onsite-game.css';
import OnsiteCompact from './OnsiteCompact.jsx';
import {canRace,readCards,writeCards,decodeStop} from './race-boost.js';
import {publishStop} from './stop-bridge.js';
import {clearFinish} from './case-record.js';
import {questStage} from './quest-logic.js';
const QuestViewport=lazy(()=>import('./QuestViewport.jsx'));
const RaceSheet=lazy(()=>import('./RaceSheet.jsx'));
const ArrivalCamera=lazy(()=>import('./ArrivalCamera.jsx'));
const KIND_NAMES={'rotate-find':'Rotate and find','sequence':'Tap in order','align':'Turn to align','slide':'Slide to reveal','assemble':'Piece it together','lock':'Combination lock','jigsaw':'Torn page','prop':'Handle it',
 bag:'Look around',compare:'Spot the difference',band:'Fit the edge',catalogue:'Turn the cards',pinmap:'Pin it',door:'Slide the bolt',ring:'Hardcore · read the ring',batik:'Match the cut',lamprow:'Carry the lamp',overlay:'Hardcore · lay it over',letters:'Password',facade:'Match the photo',pack:'Untie the pack',lanelamps:'Hold to light',envelope:'Seal it'};
const STEPS=[['arrival','Check in'],['observe','Observe'],['puzzle','Solve'],['reward','Collect']];
function Guide({name,children}){return <div className="og-guide"><img src={assetFor('./assets/cinematic/lion-guide.png')} alt=""/><div><span>{name}<small>Your guide · fictional character</small></span><p>{children}</p></div></div>;}
function cleanPlace(name){return name.replace(/ · .*/, '').replace(/（.*?）/g,'');}
function PhotoClue({target,onPhoto,onReview,preview}){
 const input=useRef(null),fileRef=useRef(null),blobRef=useRef(null),requestRef=useRef(0),[url,setUrl]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[fileName,setFileName]=useState('');
 useEffect(()=>()=>{requestRef.current++;if(blobRef.current)URL.revokeObjectURL(blobRef.current);},[]);
 const pick=()=>input.current?.click();
 function receive(e){const f=e.target.files?.[0];e.target.value='';if(!f)return;if(!/^image\//.test(f.type)){setStatus('Choose a photo.');return;}if(f.size>20*1024*1024){setStatus('This photo is too large. Choose one under 20 MB.');return;}requestRef.current++;setBusy(false);if(blobRef.current)URL.revokeObjectURL(blobRef.current);blobRef.current=URL.createObjectURL(f);fileRef.current=f;setUrl(blobRef.current);setFileName(f.name);setStatus('Photo added to this observation. Not checked by AI yet.');onPhoto({id:'photo-'+Date.now(),name:f.name,type:f.type,size:f.size,lastModified:f.lastModified,addedAt:new Date().toISOString()});}
 async function review(){
  if(!fileRef.current||busy)return;
  const recognizer=window.FindSGHost?.recognizeObservationPhoto;
  if(typeof recognizer!=='function'){setStatus('Automatic recognition is not available yet. Compare with the features below, then confirm to continue.');return;}
  const request=++requestRef.current,file=fileRef.current;setBusy(true);setStatus('Checking the building details in your photo…');
  try{const result=await recognizer({routeId:target.routeId,stopId:target.stopId,expectedFeature:target.photoTarget,file});
   if(request!==requestRef.current||file!==fileRef.current)return;
   if(result?.decision==='match'&&Number.isFinite(result.confidence)&&result.confidence>=.8){setStatus('The recognition service found the feature. Check it against the site once more, then confirm.');onReview?.(result);}
   else setStatus(result?.decision==='no-match'?'The detail was not found. Try another shot, or confirm by looking at the site.':'The photo could not be confirmed. Compare with the features on site to continue.');
  }catch{if(request===requestRef.current)setStatus('Recognition is unavailable. Your photo stays with this observation; compare with the site to continue.');}finally{if(request===requestRef.current)setBusy(false);}
 }
 return <div className={'og-photo '+(url?'has-photo':'')}><input ref={input} type="file" accept="image/*" capture="environment" aria-label="Take or upload a photo of the detail" onChange={receive} hidden/>{url?<><button className="og-photo-preview" onClick={pick} aria-label="Replace observation photo"><img src={url} alt={'Observation photo: '+fileName}/><span>Replace photo ↗︎</span></button><button className="og-photo-review" onClick={review} disabled={busy}>{busy?'Checking…':'Check photo with AI'}<small>Needs a recognition service</small></button></>:<button className="og-camera-button" onClick={pick}><span className="og-camera-icon" aria-hidden="true"><i/></span><span><strong>{preview?'Upload a photo of the detail':'Photograph the detail here'}</strong><small>{target.photoTarget}</small></span><b>＋</b></button>}{status&&<p className="og-photo-status" role="status">{status}</p>}<small className="og-photo-local">Your photo is only previewed on this page. If you ask for a check, only a connected service will process it.</small></div>;
}
class SceneBoundary extends React.Component{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="og-scene-error"><strong>The 3D scene did not load</strong><p>Your progress is saved. You can reload this stop.</p><button className="sg-primary" onClick={this.props.onRetry}>Reload the scene ↻</button></div>:this.props.children;}}
/** Hunt: a phone gets the one-screen stop (OnsiteCompact.jsx); wider screens keep the prototype's two columns. */
function useCompact(){const q='(max-width: 760px)';const [m,setM]=useState(()=>window.matchMedia(q).matches);useEffect(()=>{const mm=window.matchMedia(q),on=()=>setM(mm.matches);mm.addEventListener('change',on);return()=>mm.removeEventListener('change',on);},[]);return m;}
function OnsiteSession({routeId,reducedMotion,onExit,onOpen,onProgress}){
 const config=ONSITE_ROUTES[routeId],story=GAME_STORIES[routeId],base=findStory(routeId),meta=ROUTES[routeId];
 const [game,setGame]=useState(()=>readOnsite(routeId,config.stops)),[saved,setSaved]=useState(true),[showReference,setShowReference]=useState(false),[celebrated,setCelebrated]=useState(false),[sceneKey,setSceneKey]=useState(0),[uiFeedback,setUiFeedback]=useState('');
 const current=useRef(game);current.current=game;
 const compact=useCompact(),[sheet,setSheet]=useState(false),[raceOpen,setRaceOpen]=useState(false),[cards,setCards]=useState(()=>readCards(routeId,game.mode));
 const stop=config.stops[Math.min(game.stopIndex,config.stops.length-1)],place=base.stops[game.stopIndex]||base.stops.at(-1),record=game.stops[stop.id],mode=game.mode;
 // Hunt: a stop can have layers; the page names the one that is open now
 const layer=questStage(stop.quest,record?.puzzle).quest;
 const phase=onsiteStatus(game,stop.id,config.stops),intro=!game.started,ending=phase==='ending'||game.endingSeen;
 const stageIndex=STEPS.findIndex(([id])=>id===phase),isDone=game.completed.includes(stop.id),sceneRef=useRef(null);
 useEffect(()=>{setSaved(saveOnsite(game));onProgress?.(game);},[game,onProgress]);
 useEffect(()=>{setShowReference(false);setUiFeedback('');setCelebrated(false);setSheet(false);setRaceOpen(false);},[routeId,stop.id,mode]);
 useEffect(()=>{setCards(readCards(routeId,mode));},[routeId,mode]);
 // Hunt: the find replaces the model once its unlock has played; a stop reopened already solved shows it straight away
 useEffect(()=>{if(phase!=='reward'||celebrated)return;const t=setTimeout(()=>setCelebrated(true),2600);return()=>clearTimeout(t);},[phase,celebrated]);
 const commit=useCallback((next,event)=>{current.current=next;setGame(next);if(event)emitOnsiteEvent(event,next,config.stops[next.stopIndex]?.id||stop.id);},[config.stops,stop.id]);
 const act=useCallback(action=>{const result=operateOnsite(current.current,stop.id,action,config.stops);commit(result.state,result.ok?'puzzle-action':'puzzle-retry');setUiFeedback(result.message||'');return result;},[commit,config.stops,stop.id]);
 const completed=useCallback(()=>setCelebrated(true),[]);
 const begin=()=>commit(beginOnsite(current.current),'story-started');
 // Hunt (3 Nov 2026, owner): the night race wins a decode card; a card completes the stop (check-in, look, mechanism)
 // through the same moves a player would make, and its check-in is never counted as a visit
 const raceWon=useCallback(()=>{const n=readCards(routeId,mode)+1;writeCards(routeId,mode,n);setCards(n);},[routeId,mode]);
 const decodeOpen=!intro&&!ending&&['arrival','observe','puzzle'].includes(phase);
 const decode=()=>{const have=readCards(routeId,mode);if(!decodeOpen||have<1)return;const q=decodeStop(current.current,stop,config.stops);if(q===current.current)return;commit(q,'decode-card');writeCards(routeId,mode,have-1);setCards(have-1);setUiFeedback('');};
 const puzzleOpen=!intro&&!ending&&phase==='puzzle';
 const race=puzzleOpen&&canRace(stop)?()=>setRaceOpen(true):null;
 const boostHere=puzzleOpen&&cards>0?decode:null;
 const [cameraOpen,setCameraOpen]=useState(false);
 const raceLayer=<>{raceOpen&&<Suspense fallback={null}><RaceSheet reducedMotion={reducedMotion} onWin={raceWon} onClose={()=>setRaceOpen(false)}/></Suspense>}
  {cameraOpen&&!intro&&!ending&&phase==='arrival'&&<Suspense fallback={null}><ArrivalCamera place={{name:stop.name||cleanPlace(place.name),address:place.address,look:[stop.observation?.title,stop.observation?.detailToFind].filter(Boolean).join('. ')}} reducedMotion={reducedMotion} onClose={()=>setCameraOpen(false)} onArrive={method=>{setCameraOpen(false);arrive('manual',false,method);}}/></Suspense>}</>;
 function changeMode(next){commit(readOnsite(routeId,config.stops,next),'mode-changed');}
 // Hunt: remote play has no street to stand on, so the phone page starts it with one tap (check-in and observation together)
 function arrive(nextMode,andObserve=false,method){let q=nextMode===current.current.mode?current.current:readOnsite(routeId,config.stops,nextMode);q=beginOnsite(q);const id=config.stops[q.stopIndex].id,at=new Date().toISOString();q=checkInOnsite(q,id,config.stops,{mode:nextMode,confirmedAt:at,method});if(andObserve)q=observeOnsite(q,id,config.stops,{confirmedAt:at});commit(q,andObserve?'observation-confirmed':'checkin');}
 function observe(){commit(observeOnsite(current.current,stop.id,config.stops,{confirmedAt:new Date().toISOString()}),'observation-confirmed');setUiFeedback('The mechanism is awake. Try it in the model.');}
 function photo(metadata){commit(addOnsitePhoto(current.current,stop.id,metadata,config.stops),'observation-photo-added');}
 function next(){commit(advanceOnsite(current.current,config.stops),'next-place');setCelebrated(false);setUiFeedback('');}
 // the book's side tabs: say where the stop stands, and take their commands
 const view=intro?'intro':ending?'ending':phase;
 useEffect(()=>{publishStop({routeId,mode,phase:view,stopName:stop.name||cleanPlace(place.name),cards,canDecode:decodeOpen&&cards>0});},[routeId,mode,view,stop,place,cards,decodeOpen]);
 useEffect(()=>()=>publishStop(null),[]);
 const command=useRef(null);
 command.current={race:()=>{if(!ending)setRaceOpen(true);},decode,mode:()=>changeMode(mode==='manual'?'preview':'manual'),checkin:()=>{if(view!=='arrival')return;if(mode==='manual')setCameraOpen(true);else arrive(mode,true);}};
 useEffect(()=>{const on=e=>command.current[e.detail?.type]?.();window.addEventListener('findsg:command',on);return()=>window.removeEventListener('findsg:command',on);},[]);
 const journal=()=>onOpen({type:'journal',routeId,state:current.current,mode});
 const placeInfo=()=>onOpen({type:'place',routeId,index:game.stopIndex,state:current.current,mode});
 const restart=()=>onOpen({type:'restart',routeId,state:current.current,mode,onConfirm:()=>{commit(normalizeOnsite(null,routeId,config.stops,mode),'restart');writeCards(routeId,mode,0);setCards(0);clearFinish(routeId,mode);onOpen(null);}});
 const scene=<SceneBoundary key={`${routeId}:${stop.id}:${mode}:${sceneKey}`} onRetry={()=>setSceneKey(v=>v+1)}><Suspense fallback={<div className="og-scene-loading"><span/><strong>Turning the street corner into a mechanism…</strong></div>}><QuestViewport routeId={routeId} stopId={stop.id} modelKind={stop.modelKind} quest={stop.quest} progress={record.puzzle} enabled={!intro&&Boolean(record.checkin&&record.observation.confirmed)&&!ending} reducedMotion={reducedMotion} onAction={act} onComplete={completed}/></Suspense></SceneBoundary>;
 if(compact)return <OnsiteCompact {...{routeId,config,story,meta,place,stop,layer,record,game,mode,phase,intro,ending,celebrated,saved,reducedMotion,scene,sheet,setSheet,raceLayer,onExit,onOpen,begin,arrive,observe,photo,next,journal,placeInfo,restart,changeMode,Guide,PhotoClue,cleanPlace,mapSearch,sourceName,KIND_NAMES}}/>;
 return <section className="og-player" aria-label={`On-site 3D exploration: ${story.title}`}>
  <div className="og-topbar"><button className="sg-back" onClick={onExit}>← Book</button><div className="og-route-name"><small>{meta.en}</small><strong>{story.title}</strong></div><div className="og-top-actions"><button onClick={()=>onOpen({type:'route',routeId,state:current.current,mode})}>Map ↗︎</button><button onClick={journal}>Clues <b>{game.completed.length}</b></button></div></div>
  <div className="og-title-row"><div><span className="og-eyebrow">{ending?'FINAL CHAPTER':`CHAPTER ${String(game.stopIndex+1).padStart(2,'0')} / ${String(config.stops.length).padStart(2,'0')}`}<i/> {ending?'Story complete':KIND_NAMES[layer.type]}</span><h1>{ending?story.ending.title:cleanPlace(place.name)}</h1>{/* Hunt: the English name only when it adds to the title */}{(ending||place.english_name!==cleanPlace(place.name))&&<p>{ending?story.ending.reflection:place.english_name}</p>}</div><div className="og-mode"><span>{mode==='manual'?'On site':'Remote play'}</span><button onClick={()=>changeMode(mode==='manual'?'preview':'manual')}>{mode==='manual'?'Switch to remote':'Switch to on site'}</button><small>{mode==='manual'?'Manual check-in · no location check':'Separate progress · not a site visit'}</small></div></div>
  <div className="og-layout">
   <div className="og-world-column"><div ref={sceneRef} className={'og-viewport-shell '+(record.checkin?'is-awake':'is-sleeping')}>
    <div className="og-world-label"><span>THE CITY IS YOUR PLAYGROUND</span><b>{intro?'A new assignment':ending?'All clues found':!record.checkin?'Waiting for check-in':!record.observation.confirmed?'Observe the site to wake the model':isDone?'Mechanism unlocked':layer.title}</b></div>
    <SceneBoundary key={`${routeId}:${stop.id}:${mode}:${sceneKey}`} onRetry={()=>setSceneKey(v=>v+1)}><Suspense fallback={<div className="og-scene-loading"><span/><strong>Turning the street corner into a mechanism…</strong></div>}><QuestViewport routeId={routeId} stopId={stop.id} modelKind={stop.modelKind} quest={stop.quest} progress={record.puzzle} enabled={!intro&&Boolean(record.checkin&&record.observation.confirmed)&&!ending} reducedMotion={reducedMotion} onAction={act} onComplete={completed}/></Suspense></SceneBoundary>
    {!record.checkin&&!intro&&<div className="og-scene-locked"><span>01</span><strong>Check in here to wake the building.</strong><p>Check in first. The model is keeping something for you.</p></div>}
    {intro&&<div className="og-intro-seal" aria-hidden="true"><span>{meta.no}</span><b>One street<br/>one unfinished story</b><small>FINDSG / FIELD STORIES</small></div>}
    <div className="og-model-note">Concept model · mechanisms and hidden items exist only on your phone</div>
   </div><div className="og-step-track" aria-label="Progress at this stop">{STEPS.map(([id,label],i)=><div key={id} className={(i<stageIndex||ending?'done ':'')+(id===phase?'active':'')}><span>{i<stageIndex||ending?'✓':String(i+1).padStart(2,'0')}</span><strong>{label}</strong></div>)}</div></div>
   <aside className={'og-panel og-panel-'+(intro?'intro':phase)}>
    <div className="og-panel-top"><span>{intro?'THE MISSION':ending?'THE STORY IS YOURS':`FIELD NOTE / ${String(game.stopIndex+1).padStart(2,'0')}`}</span><b>{intro?'Opening':ending?'Final chapter':STEPS[stageIndex]?.[1]}</b></div>
    {intro?<><h2>The clues are on the street.<br/>You have to find them.</h2><Guide name={story.guideName}>{story.prologue.map(x=>x.text).join(' ')}</Guide><div className="og-mission-box"><span>Your assignment</span><p>{story.mission}</p></div><div className="og-how-icons"><span>◉ Check in</span><i>→</i><span>⌕ Observe</span><i>→</i><span>✦ Solve</span></div><button className="sg-primary" onClick={begin}>Accept and go to the first stop <span>→</span></button><p className="og-fine-print">{config.stops.length} real places · play on site or remotely</p></>
    :ending?<><h2>{story.ending.title}</h2><Guide name={story.guideName}>{story.ending.text}</Guide><div className="og-ending-stamps">{config.stops.map((s,i)=><button key={s.id} onClick={()=>onOpen({type:'collected',routeId,index:i,state:game,mode})}><span>{String(i+1).padStart(2,'0')}</span><strong>{s.reward.title}</strong><b>✓</b></button>)}</div><button className="sg-primary" onClick={onExit}>Choose another street <span>→</span></button><button className="sg-text-button" onClick={journal}>Open the full clue bag ↗︎</button></>
    :phase==='arrival'?<><h2>Start this stop<br/>right here.</h2><Guide name={story.guideName}>{stop.sceneLine}</Guide><div className="og-destination"><span>Real place</span><strong>{place.name}</strong><p>{place.address}</p><a href={mapSearch(place)} target="_blank" rel="noreferrer">View on map ↗︎</a></div><button className="sg-primary" onClick={()=>arrive(mode)}>{mode==='manual'?'I am here · check in':'Play this stop remotely'} <span>{mode==='manual'?'✓':'↗︎'}</span></button><button className="og-preview-button" onClick={()=>mode==='manual'?arrive('preview'):changeMode('manual')}>{mode==='manual'?'Switch to remote play':'Back to on-site progress'} <span>↗︎</span></button><p className="og-fine-print">You confirm check-in yourself. Remote play keeps separate progress.</p></>
    :phase==='observe'?<><h2>{stop.observation.title}</h2><div className="og-stamped"><span>✓</span><div><strong>{mode==='manual'?'Checked in':'Remote play started'}</strong><small>{mode==='manual'?'Now look up and find the clue in the building.':'Use the reference to try the same mechanism.'}</small></div></div><p className="og-observe-copy">{stop.observation.instruction}</p><PhotoClue key={`${stop.id}:${mode}`} target={{...stop.observation,routeId,stopId:stop.id}} onPhoto={photo} preview={mode==='preview'}/><button className="og-reference-toggle" aria-expanded={showReference} onClick={()=>setShowReference(v=>!v)}>{showReference?'Hide the hint −':'Show what to look for ＋'}</button>{showReference&&<div className="og-reference"><strong>{stop.observation.detailToFind}</strong><p>{stop.observation.referenceNote}</p><div>{(stop.observation.sourceUrls||[]).slice(0,2).map(url=><a key={url} href={url} target="_blank" rel="noreferrer">{sourceName(url)} ↗︎</a>)}</div></div>}<button className="sg-primary" onClick={observe}>{mode==='manual'?'I have looked · wake the mechanism':'I have read it · start the mechanism'} <span>✦</span></button><p className="og-fine-print">{mode==='manual'?'Observe from public space only. Do not touch the building.':'Remote confirmation is not a site observation or an AI check.'}</p></>
    :phase==='puzzle'?<><h2>{layer.title}</h2><div className="og-active-task"><span>Current goal</span><p>{layer.instruction}</p></div><div className="og-real-connection"><span>Clue from the site</span><strong>{stop.observation.detailToFind}</strong><button onClick={()=>setShowReference(v=>!v)}>{showReference?'Hide the hint ↑':'Show the observation hint ↗︎'}</button>{showReference&&<p>{stop.observation.referenceNote}</p>}</div>{race&&<button className="sg-primary" onClick={race}>Race for the clues →</button>}{boostHere&&<button className="sg-primary" onClick={boostHere}>Use a decode card →</button>}{uiFeedback&&<div className="og-action-feedback" role="status">{uiFeedback}</div>}<button className="sg-text-button" onClick={placeInfo}>Open the place file ↗︎</button></>
    :<><div className={'og-reward-seal '+(celebrated?'animate':'')} aria-hidden="true">✦</div><h2>You found<br/>{stop.reward.title}</h2><p className="og-found-copy">{stop.quest.foundText||stop.reward.text}</p><DiscoveryPacket key={`${routeId}:${stop.id}:${mode}`} routeId={routeId} stop={stop} index={game.stopIndex} reducedMotion={reducedMotion} selected={celebrated} className="og-reward-packet"/><div className="og-next-place"><span>{game.stopIndex===config.stops.length-1?'Put the whole route together':'Why does this clue lead to the next stop?'}</span><p>{stop.transition.text}</p></div><button className="sg-primary" onClick={next}>{game.stopIndex===config.stops.length-1?'Read the full story':stop.transition.cta} <span>→</span></button><button className="sg-text-button" onClick={journal}>Clues · {game.completed.length} found</button></>}
   </aside>
  </div>
  <div className="og-bottom-line"><button onClick={placeInfo}>Place file · {place.english_name||cleanPlace(place.name)} ↗︎</button><span>{saved?'Progress saved':'Progress not saved · a refresh may lose it'}<i>·</i><button onClick={restart}>Start over</button></span></div>
  {raceLayer}
 </section>;
}
export default function OnsiteGame(props){return <OnsiteSession key={props.routeId} {...props}/>;}
const SHELF_IDS=Object.keys(GAME_STORIES);
const SHELF_LABELS=SHELF_IDS.map(id=>GAME_STORIES[id].title);
export function OnsiteShelf({onPlay,onOpenArchive,onOpenPaper,reducedMotion=false}){
 const [selection,setSelection]=useState(0);
 const id=SHELF_IDS[selection],story=GAME_STORIES[id],field=ONSITE_ROUTES[id],meta=ROUTES[id],progress=readOnsite(id,field.stops);
 return <section className="og-holo-shelf"><div className="og-route-picker"><div className="og-route-choice"><span className="sg-eyebrow">FINDSG / PLAY THE REAL CITY</span><h1>Look up for clues,<br/><em>solve the city by hand.</em></h1><p>Check in on site to wake the mechanism in each building.<br/>Recover letters, restore details and collect the story of a street.</p><div className="og-story-wheel"><OptionWheel items={SHELF_LABELS} selectedIndex={selection} onChange={index=>setSelection(index)} onConfirm={()=>onPlay(id)} fontSize={1.55} spacing={1.85} curve={1.3} tilt={10} blur={1.25} fade={.28} inset={25} textColor="#73876c" activeColor="#ead4aa" reducedMotion={reducedMotion} ariaLabel="Choose a street story"/></div><p className="og-wheel-help">Scroll to choose a story · tap the card to flip it · confirm to set off</p><MissionTicket key={id} routeId={id} reducedMotion={reducedMotion} started={progress.started} completed={progress.completed.length} total={field.stops.length} onOpen={()=>onPlay(id)}/>{onOpenArchive&&<button className="og-archive-entry" onClick={()=>onOpenArchive(id)}><span aria-hidden="true"/>Browse this street's file first<b aria-hidden="true">↗︎</b></button>}{onOpenPaper&&<button className="og-paper-entry" onClick={()=>onOpenPaper(id)}><span className="og-paper-entry-mark" aria-hidden="true">↶</span><span><strong>Smooth out a crumpled page</strong><small>Crumple · flip · find the writing on the back</small></span><b aria-hidden="true">↗︎</b></button>}</div><div className="og-shelf-card-stage"><HoloCard key={id} image={gameSceneImageFor(id)} imageCrop="triptych-left" alt={`Street concept art, ${meta.en}`} preset="bursts" variant={CARD_MATERIALS[id]} title={story.title} subtitle={`${meta.en} / ${field.stops.length} REAL PLACES`} serial={`FINDSG / STORY ${meta.no}`} backTitle={story.playerRole} backText={story.mission+'\n\n'+story.prologue.map(x=>x.text).join(' ')} reducedMotion={reducedMotion} className="og-shelf-holo"><p>{story.logline}</p><span>Street story · {field.stops.length} 3D mechanisms</span></HoloCard><div className="og-card-caption"><b>COLLECT A STORY</b><span>Move your finger to see the shine · tap to flip</span></div></div></div><div className="og-route-chips" aria-label="Four street routes">{SHELF_IDS.map((route,index)=>{const q=ONSITE_ROUTES[route],saved=readOnsite(route,q.stops);return <button key={route} aria-pressed={selection===index} onClick={()=>setSelection(index)}><small><span>STORY {ROUTES[route].no}</span><span>{q.stops.length} STOPS</span></small><strong>{ROUTES[route].area}</strong><p>{saved.started?`${saved.mode==='manual'?'On site':'Remote'} · ${saved.completed.length} of ${q.stops.length} collected`:GAME_STORIES[route].title}</p></button>;})}</div><p className="sg-shelf-footnote">On-site visits and remote play are saved separately · automatic photo recognition is not connected yet · models, letters and stories are fiction</p></section>;
}
