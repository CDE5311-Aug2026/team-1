import React,{useEffect,useRef,useState} from 'react';
import {ROUTES,findStory,imageFor,assetFor,gameSceneImageFor} from '../data.js';
import {FIELD_ROUTES} from '../field/field-content.js';
import {GAME_STORIES} from './game-content.js';
import {beginGame,advanceGame,inspectGame,setGameAnswer,submitGame,blankGame} from './game-state.js';
import {readGame,saveGame,notifyStoryEvent} from './game-storage.js';
import StoryArtifact from './StoryArtifact.jsx';
import './story-game.css';

const STEP_LABELS={prologue:'A commission',scene:'Something happens',inspect:'Find a clue',challenge:'Make a choice',reward:'A new find',ending:'Story complete'};
export const stageName=stage=>STEP_LABELS[stage]||'Carry on';

function Guide({name,children}){
 return <div className="sg-guide"><img src={assetFor('./assets/cinematic/lion-guide.png')} alt=""/><div><span>{name||'Little Lion'} <i>Story guide</i></span><div>{children}</div></div></div>;
}
function Poster({routeId,children,place,chapter}){
 return <div className="sg-poster"><img src={place?gameSceneImageFor(routeId):imageFor(routeId)} alt={`${ROUTES[routeId].area} story concept art`}/><div className="sg-poster-grain"/><div className="sg-poster-top"><span>FINDSG ORIGINAL</span><span>{ROUTES[routeId].no} / {chapter||'STORY'}</span></div><span className="sg-art-caption">Story concept image</span>{children&&<div className="sg-poster-copy">{children}</div>}{place&&<div className="sg-poster-location"><span>The real place on this card</span><strong>{place.name}</strong><small>{place.english_name}</small></div>}</div>;
}

function GameSession({routeId,reducedMotion,onExit,onOpen,onProgress}){
 const content=GAME_STORIES[routeId],field=FIELD_ROUTES[routeId],base=findStory(routeId),meta=ROUTES[routeId];
 const [state,setState]=useState(()=>readGame(routeId,field.stops)),[saveFailed,setSaveFailed]=useState(false),[showEvidence,setShowEvidence]=useState(false);
 const stateRef=useRef(state),headingRef=useRef(null),hasMounted=useRef(false);stateRef.current=state;
 const stopIndex=Math.min(state.stopIndex,field.stops.length-1),stop=field.stops[stopIndex],scene=content.stops[stopIndex],place=base.stops[stopIndex],complete=state.completed.length;
 useEffect(()=>{setSaveFailed(!saveGame(state));onProgress?.(state);},[state,onProgress]);
 useEffect(()=>{setShowEvidence(false);if(hasMounted.current)headingRef.current?.focus({preventScroll:true});hasMounted.current=true;},[state.stage,stopIndex]);
 const commit=(next,event)=>{stateRef.current=next;setState(next);if(event)notifyStoryEvent(event,next,stop?.id);};
 const begin=()=>commit(beginGame(stateRef.current,field.stops),'story-started');
 const advance=()=>commit(advanceGame(stateRef.current,field.stops),state.stage==='reward'?(stopIndex===field.stops.length-1?'story-completed':'next-place-ready'):'card-advanced');
 const inspect=()=>commit(inspectGame(stateRef.current,field.stops),'clue-revealed');
 const answer=value=>commit(setGameAnswer(stateRef.current,value,field.stops));
 const submit=value=>{
  const draft=value===undefined?stateRef.current:setGameAnswer(stateRef.current,value,field.stops);
  const result=submitGame(draft,field.stops);commit(result.state,result.ok?'place-story-completed':'choice-reconsidered');
 };
 const reset=()=>{commit(blankGame(routeId),'story-restarted');onOpen(null);};
 const openInfo=()=>onOpen({type:'place',routeId,index:stopIndex});
 const openJournal=()=>onOpen({type:'journal',routeId,state});
 const openRestart=()=>onOpen({type:'restart',routeId,onConfirm:reset});
 const stage=state.stage;
 const cardTitle=stage==='prologue'?content.title:stage==='scene'?scene.chapterTitle:stage==='inspect'?scene.inspectTitle:stage==='challenge'?stop.task.prompt:stage==='reward'?scene.discovery.title:content.ending.title;
 const challengeValue=typeof state.answer==='number'?state.answer:50;
 const sequence=Array.isArray(state.answer)?state.answer:[];
 return <section className="sg-player" aria-label={`${content.title}: interactive story`}>
  <div className="sg-play-toolbar"><button className="sg-back" onClick={onExit}>← Story box</button><div className="sg-playing"><span>{meta.area}</span><strong>{content.title}</strong></div><div className="sg-play-tools"><button onClick={()=>onOpen({type:'route',routeId,state})}>Route</button><button className="sg-pocket-button" onClick={openJournal}>Clue bag <b>{complete}</b></button></div></div>
  <div className="sg-journey"><div><span>{stage==='prologue'?'Prologue':stage==='ending'?'Finale':`Stop ${String(stopIndex+1).padStart(2,'0')}`}</span><strong>{stage==='prologue'?content.mission:stage==='ending'?'Put the clues from the whole walk together into one answer.':place.name}</strong></div><ol aria-label="Story progress by place">{field.stops.map((s,i)=><li key={s.id} className={state.completed.includes(s.id)?'done':i===stopIndex&&stage!=='prologue'?'current':''} aria-label={`Stop ${i+1}: ${state.completed.includes(s.id)?'done':i===stopIndex?'current place':'not yet done'}`}><span>{state.completed.includes(s.id)?'✓':i+1}</span></li>)}</ol></div>
  <div className="sg-card-stack"><div className="sg-stack-sheet one"/><div className="sg-stack-sheet two"/>
   <article key={`${routeId}-${stopIndex}-${stage}`} className={`sg-game-card sg-stage-${stage}`}>
    {stage==='prologue'&&<>
     <Poster routeId={routeId}><span className="sg-film-caption">{content.kicker}</span><h2>{content.title}</h2><p>{content.logline}</p></Poster>
     <div className="sg-card-body"><div className="sg-card-label"><span>01 / OPEN THE STORY</span><b>Story preview</b></div><p className="sg-small-kicker">This time, you are</p><h1 ref={headingRef} tabIndex={-1}>{content.playerRole.replace(/\s*[(\uFF08][^)\uFF09]*[)\uFF09]/,'')}</h1><Guide name={content.guideName}>{content.prologue.map((line,i)=><p key={i}>{line.text}</p>)}</Guide><div className="sg-mission"><span>Your task</span><strong>{content.mission}</strong><small>Collect {field.stops.length} clues across {field.stops.length} real places.</small></div><button className="sg-primary" onClick={begin}>Take the commission and turn the first card <span>→</span></button><p className="sg-bottom-note">Fictional commission · real places and history</p></div>
    </>}
    {stage==='scene'&&<>
     <Poster routeId={routeId} place={place} chapter={String(stopIndex+1).padStart(2,'0')}><span className="sg-film-caption">{stopIndex===0?'The story starts here':'The clues led you here'}</span><p className="sg-scene-objective">{scene.objective}</p></Poster>
     <div className="sg-card-body"><div className="sg-card-label"><span>{String(stopIndex+1).padStart(2,'0')} / STORY CARD</span><b>Story</b></div><h1 ref={headingRef} tabIndex={-1}>{scene.chapterTitle}</h1>{stopIndex>0&&<div className="sg-previous"><span>Following the last clue</span><p>{content.stops[stopIndex-1].transition.text}</p></div>}<Guide name={scene.scene.speaker||content.guideName}><p>{scene.scene.text}</p></Guide><div className="sg-mission"><span>What to do now</span><strong>{scene.objective}</strong></div><button className="sg-primary" onClick={advance}>Look at the clue in front of you <span>→</span></button><button className="sg-text-button" onClick={openInfo}>About this place ↗︎</button></div>
    </>}
    {stage==='inspect'&&<div className="sg-inspect-body"><div className="sg-card-label"><span>{String(stopIndex+1).padStart(2,'0')} / OBJECT CARD</span><b>Examine the object</b></div><h1 ref={headingRef} tabIndex={-1}>{scene.inspectTitle}</h1><p className="sg-inspect-lead">{scene.objective}</p><StoryArtifact routeId={routeId} stopId={stop.id} modelKind={stop.modelKind} label={stop.propName} title={stop.evidenceTitle} clueText={scene.inspectText} revealAction={scene.inspectAction} revealed={state.inspected} onReveal={inspect} reducedMotion={reducedMotion}/><div className="sg-inspect-footer"><button className="sg-text-button" onClick={openInfo}>Place and history sources ↗︎</button><button className="sg-primary" disabled={!state.inspected} onClick={advance}>{state.inspected?'Found it, carry on':'Open the object in front of you first'} <span>→</span></button></div></div>}
    {stage==='challenge'&&<>
     <div className="sg-clue-side"><div className="sg-clue-ornament" aria-hidden="true">{String(stopIndex+1).padStart(2,'0')}</div><span className="sg-small-kicker">The clue in your hand</span><h2>{stop.propName}</h2><p>{scene.objective}</p><button className="sg-clue-toggle" aria-expanded={showEvidence} onClick={()=>setShowEvidence(!showEvidence)}>{showEvidence?'Put the clue away ↑':'Look at the clue again ↗︎'}</button>{showEvidence&&<div className="sg-mini-evidence"><strong>{stop.evidenceTitle}</strong><p>{scene.inspectText}</p></div>}<div className="sg-clue-location"><span>This card comes from</span><strong>{place.name}</strong><button onClick={openInfo}>Place file ↗︎</button></div></div>
     <div className="sg-card-body sg-choice-body"><div className="sg-card-label"><span>{String(stopIndex+1).padStart(2,'0')} / YOUR CHOICE</span><b>{stop.task.kind==='sequence'?'Order the cards':stop.task.kind==='align'?'Set the number':'Make a choice'}</b></div><h1 ref={headingRef} tabIndex={-1}>{stop.task.prompt}</h1>
      {stop.task.kind==='choice'&&<><p className="sg-choice-hint">Tap a choice card to carry on the story.</p><div className="sg-options" role="group" aria-label="Choose your answer">{stop.task.options.map((option,i)=><button key={option.id} className={state.answer===option.id?'selected':''} onClick={()=>submit(option.id)}><span>{String.fromCharCode(65+i)}</span><strong>{option.label}</strong><i>↗︎</i></button>)}</div></>}
      {stop.task.kind==='sequence'&&<><p className="sg-choice-hint">Tap them in order. You can undo a wrong tap.</p><ol className="sg-sequence-tray" aria-label="Cards chosen, in order">{stop.task.options.map((_,i)=><li key={i} className={sequence[i]?'filled':''}><span>{i+1}</span><strong>{stop.task.options.find(o=>o.id===sequence[i])?.label||'Waiting for a card'}</strong></li>)}</ol><div className="sg-sequence-options">{stop.task.options.map(o=><button key={o.id} disabled={sequence.includes(o.id)} onClick={()=>answer([...sequence,o.id])}>＋ {o.label}</button>)}</div><button className="sg-text-button" disabled={!sequence.length} onClick={()=>answer(sequence.slice(0,-1))}>Undo last ↶</button><button className="sg-primary" disabled={sequence.length!==stop.task.options.length} onClick={()=>submit()}>Confirm this order <span>→</span></button></>}
      {stop.task.kind==='align'&&<><div className="sg-ruler"><label htmlFor="sg-number">Your answer</label><div><button aria-label="Decrease by one" onClick={()=>answer(Math.max(0,challengeValue-1))}>−</button><input id="sg-number" type="number" min="0" max="100" step="1" value={challengeValue} onChange={e=>answer(Math.max(0,Math.min(100,Number(e.target.value)||0)))}/><button aria-label="Increase by one" onClick={()=>answer(Math.min(100,challengeValue+1))}>＋</button></div><input type="range" aria-label="Adjust the answer slider" min="0" max="100" step="1" value={challengeValue} onChange={e=>answer(Number(e.target.value))}/><small>Slide the ruler or type a number.</small></div><button className="sg-primary" onClick={()=>submit(challengeValue)}>Confirm this number <span>→</span></button></>}
      {state.feedback&&<p className="sg-feedback" role="status"><b>Think again</b>{state.feedback}</p>}
     </div>
    </>}
    {stage==='reward'&&<>
     <div className="sg-reward-display"><span className="sg-small-kicker">You earned a clue card</span><div className="sg-earned-card"><div><span>FINDSG / {meta.en}</span><b>{String(stopIndex+1).padStart(2,'0')}</b></div><span className="sg-earned-star" aria-hidden="true">✦</span><h2>{stop.reward.title}</h2><p>{stop.reward.text}</p><footer><span>{place.name}</span><b>COLLECTED ✓</b></footer></div><p>{content.goalLabel} <strong>{complete} / {field.stops.length}</strong></p></div>
     <div className="sg-card-body"><div className="sg-card-label"><span>{String(stopIndex+1).padStart(2,'0')} / A NEW DISCOVERY</span><b>In the clue bag ✓</b></div><h1 ref={headingRef} tabIndex={-1}>{scene.discovery.title}</h1><Guide name={content.guideName}><p>{scene.discovery.text}</p></Guide><div className="sg-next-reason"><span>{stopIndex===field.stops.length-1?'The story is about to unfold':'Next stop: why go there?'}</span><p>{scene.transition.text}</p></div><button className="sg-primary" onClick={advance}>{stopIndex===field.stops.length-1?'Piece the clues together and see the ending':scene.transition.cta||'Take the clue to the next stop'} <span>→</span></button><button className="sg-text-button" onClick={openJournal}>Open the clue bag · {complete}</button></div>
    </>}
    {stage==='ending'&&<>
     <div className="sg-ending-display"><span className="sg-film-caption">STORY COMPLETED</span><h2>{content.goalLabel}</h2><div className="sg-ending-cards">{field.stops.map((s,i)=><button key={s.id} onClick={()=>onOpen({type:'collected',routeId,index:i})}><small>{String(i+1).padStart(2,'0')}</small><strong>{s.reward.title}</strong><span>✓</span></button>)}</div><p>{field.stops.length} places · {field.stops.length} finds</p></div>
     <div className="sg-card-body"><div className="sg-card-label"><span>THE END</span><b>Story complete</b></div><h1 ref={headingRef} tabIndex={-1}>{content.ending.title}</h1><Guide name={content.guideName}><p>{content.ending.text}</p></Guide><blockquote>{content.ending.reflection}</blockquote><button className="sg-primary" onClick={onExit}>Choose another street story <span>→</span></button><button className="sg-text-button" onClick={openJournal}>Look back over the clues</button></div>
    </>}
   </article>
  </div>
  <div className="sg-player-bottom"><span><i/> {stageName(stage)} <em>·</em> Story preview, not counted as a site visit</span><div><span>{saveFailed?'Progress is temporary and may be lost on refresh':'Progress saves automatically'}</span><button onClick={openRestart}>Start over</button></div></div>
  <p className="sg-stage-announcement sr-only" aria-live="polite">{stageName(stage)}：{cardTitle}</p>
 </section>;
}
export default function StoryGame(props){return <GameSession key={props.routeId} {...props}/>;}

export function StoryShelf({onPlay,progressVersion=0}){
 return <section className="sg-shelf"><div className="sg-shelf-heading"><span className="sg-eyebrow">FINDSG / A CITY OF STORIES</span><h1>Pick a story,<br/><em>step into Singapore.</em></h1><p>Turn story cards, examine objects, make choices.<br/>Every clue takes you to the next street corner.</p><div className="sg-how"><span><b>01</b> Take the commission</span><i>→</i><span><b>02</b> Find the clues</span><i>→</i><span><b>03</b> Piece the ending</span></div></div><div className="sg-shelf-grid">{Object.entries(GAME_STORIES).map(([id,story])=>{const state=readGame(id,FIELD_ROUTES[id].stops),total=story.stops.length;return <button className="sg-story-cover" key={id} onClick={()=>onPlay(id)}><div className="sg-cover-art"><img src={imageFor(id)} alt={`${ROUTES[id].area} story concept art`}/><span className="sg-cover-number">{ROUTES[id].no}</span><span className="sg-cover-badge">{total} places</span><div><small>{ROUTES[id].en}</small><h2>{story.title}</h2></div></div><div className="sg-cover-bottom"><span>{story.logline}</span><div><small>{state.started?`${state.completed.length}/${total} collected`:'A complete street story'}</small><strong>{state.stage==='ending'?'Revisit the story':state.started?'Carry on':'Open the story'} ↗︎</strong></div></div></button>;})}</div><p className="sg-shelf-footnote">Fictional story and characters · history keeps its sources · story preview</p></section>;
}
