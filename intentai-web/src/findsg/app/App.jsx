import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ROUTES,findStory} from './data.js';
import {ONSITE_ROUTES} from './game/onsite-content.js';
import {GAME_STORIES} from './game/game-content.js';
import {readOnsite} from './game/onsite-storage.js';
import OnsiteGame,{OnsiteShelf} from './game/OnsiteGame.jsx';
import ClueCollection,{EvidenceStrip} from './game/ClueCollection.jsx';
import DiscoveryPacket from './game/DiscoveryPacket.jsx';
import ArchiveDossier from './game/ArchiveDossier.jsx';
import ArchivePaper from './game/ArchivePaper.jsx';
import {readShort} from './short/short-state.js';
import BrandMark from './components/BrandMark.jsx';
import {PaperPages} from '../../components/Notebook/PaperPages';
import './case-book.css';

function Brand({onClick}){return <button className="sg-brand" aria-label="FindSG story box" onClick={onClick}><span className="sg-brand-mark"><BrandMark/></span><span>FindSG<em>.</em><small>PLAY THE CITY</small></span></button>;}
function initialNav(){
 let saved={};try{saved=JSON.parse(localStorage.getItem('findsg-card-navigation-v1')||'{}')||{};}catch{}
 const [hashView,hashRoute]=location.hash.slice(1).split('/');
 const routeId=ROUTES[hashRoute]?hashRoute:ROUTES[saved.routeId]?saved.routeId:'kampong-gelam';
 const view=hashView?(['story','field','rooms'].includes(hashView)?'story':'home'):saved.view==='story'?'story':'home';
 return {view,routeId};
}
const two=n=>String(n).padStart(2,'0');
const cleanPlace=name=>String(name||'').replace(/ · .*/,'').replace(/（.*?）/g,'');

/* The case book's pages. Each dialog is one page of the detective's book: a bar (back, what this page is, close)
   and one screen of content. A page opened from another page remembers it, so "back" turns the page back. */
const PAGE_LABEL={how:'How to play',route:'Map',place:'Place file',collected:'Clue',journal:'Clues',restart:'Start over',paper:'Paper study'};
const BACK_LABEL={journal:'Clues',route:'Map',collected:'Clue',place:'Place file'};

/* the three moves of every stop, drawn in ink */
const STEP_ICONS={
 go:<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 43s-13-13.6-13-23a13 13 0 0 1 26 0c0 9.4-13 23-13 23z"/><circle cx="24" cy="20" r="5"/><path d="M6 45h36" strokeDasharray="3 4"/></svg>,
 look:<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 40V18l10-7 10 7v22"/><path d="M11 40V27h10v13M10 19h12"/><circle cx="31" cy="27" r="9"/><path d="m38 34 7 7"/></svg>,
 keep:<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 17h30l-3 26H12z"/><path d="M15 17c0-7 4-11 9-11s9 4 9 11"/><path d="m24 24 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"/></svg>
};
const STEPS=[
 ['go','Go there','Walk to the real place and check in, or play remotely from anywhere.'],
 ['look','Look, then solve','Spot the detail on the building. Work the 3D model with it.'],
 ['keep','Keep the clue','The find joins your clues. The story moves on.']
];

export default function App({top=null,clues=null}={}){
 const [nav,setNav]=useState(initialNav),[modal,setModal]=useState(null),[library,setLibrary]=useState(null),[progressVersion,setProgressVersion]=useState(0);
 const [reducedMotion,setReducedMotion]=useState(()=>document.documentElement.classList.contains('reduce-motion')||window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const dialog=useRef(null),returnFocus=useRef(null),lastProgress=useRef(null);
 const onProgress=useCallback(state=>{lastProgress.current=state;},[]);
 const {view,routeId}=nav;
 useEffect(()=>{const hash=view==='story'?`#story/${routeId}`:'#home';if(location.hash!==hash)history.replaceState(history.state,'',hash);window.dispatchEvent(new Event('findsg:view'));try{localStorage.setItem('findsg-card-navigation-v1',JSON.stringify(nav));}catch{}},[nav]);
 useEffect(()=>{const change=()=>setNav(initialNav());window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
 useEffect(()=>{const how=()=>setModal({type:'how'});window.addEventListener('findsg:how',how);return()=>window.removeEventListener('findsg:how',how);},[]);
 useEffect(()=>{document.documentElement.dataset.motion=reducedMotion?'reduced':'full';},[reducedMotion]);
 useEffect(()=>{if(modal){if(!dialog.current?.open){returnFocus.current=document.activeElement;dialog.current?.showModal();}}else if(dialog.current?.open){dialog.current.close();returnFocus.current?.focus?.();}},[modal]);
 useEffect(()=>{if(modal&&dialog.current)dialog.current.scrollTop=0;},[modal?.type,modal?.routeId,modal?.index]);
 /* a story keeps its clues in one place: the host's clue cards (its book's) open over the game */
 const open=next=>{if(next?.type==='journal'&&clues)setLibrary(next.routeId||routeId);else setModal(next);};
 function home(){setModal(null);setLibrary(null);setNav(q=>({...q,view:'home'}));setProgressVersion(n=>n+1);window.scrollTo({top:0,behavior:'instant'});}
 function play(id){setModal(null);setNav({view:'story',routeId:id});window.scrollTo({top:0,behavior:'instant'});}
 function exportProgress(){
  const records=Object.keys(GAME_STORIES).flatMap(id=>['manual','preview'].map(mode=>({routeId:id,mode,state:readOnsite(id,ONSITE_ROUTES[id].stops,mode)})));
  const blob=new Blob([JSON.stringify({app:'FindSG',format:'onsite-3d-v1',arrivalVerification:'manual-self-report',photoVerification:'not-connected',records,shortStoryRecords:['manual','preview'].map(mode=>readShort(mode))},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='findsg-story-progress.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const modalRoute=modal?.routeId||routeId,story=GAME_STORIES[modalRoute],base=findStory(modalRoute),field=ONSITE_ROUTES[modalRoute],meta=ROUTES[modalRoute];
 const progress=modal?.state||readOnsite(modalRoute,field.stops,modal?.mode),index=modal?.index||0,place=base.stops[index],clue=field.stops[index];
 const modalContext={routeId:modalRoute,state:progress,mode:progress.mode};
 const type=modal?.type,close=()=>setModal(null);
 /** turn to another page of the book; "back" returns here */
 const turn=next=>setModal({...modalContext,...next,back:{...modal}});
 const back=modal?.back?()=>setModal(modal.back):null;
 const found=progress.completed.length,total=field.stops.length,manual=progress.mode==='manual';
 const label=type==='place'?<>{PAGE_LABEL.place} <b>{meta.no}.{two(index+1)}</b></>:type==='collected'?<>{PAGE_LABEL.collected} <b>{two(index+1)}</b></>:type==='journal'||type==='route'?<>{PAGE_LABEL[type]} <b>{found}</b>/{total}</>:PAGE_LABEL[type]||'';
 const page=modal?`${type}:${modalRoute}:${index}`:'none';
 // a place file and an evidence card are pages you turn like paper: right to left for the next stop (or the next clue
 // found), left to right for the one before
 const placePage=i=><ArchiveDossier key={`${modalRoute}:${i}:${progress.mode}`} routeId={modalRoute} place={base.stops[i]} stop={field.stops[i]} index={i} unlocked={progress.completed.includes(field.stops[i].id)} mode={progress.mode} reducedMotion={reducedMotion} initialCardId={i===index?modal.card||'place':'place'} onOpenClue={()=>turn({type:'collected',index:i})}/>;
 const collectedPage=i=><div className="cb-evidence">
  <h2 className="cb-sr">{field.stops[i].reward.title}</h2>
  <p className="cb-where"><span>Stop {two(i+1)} · {cleanPlace(base.stops[i].name)}</span><button onClick={()=>turn({type:'place',index:i,card:'story'})}>Place file <b aria-hidden="true">›</b></button></p>
  <DiscoveryPacket key={`${modalRoute}:${i}`} routeId={modalRoute} stop={field.stops[i]} index={i} reducedMotion={reducedMotion} selected initialView="card" framed={false} className="cb-packet"/>
  {found>1&&<EvidenceStrip stops={field.stops} completed={progress.completed} active={i} onPick={j=>setModal({...modal,index:j})}/>}
 </div>;
 const paged=type==='place'||type==='collected';
 const foundAt=paged?field.stops.map((s,i)=>progress.completed.includes(s.id)?i:-1).filter(i=>i>=0):[];
 const besideIndex=dir=>{
  if(type==='place'){const j=index+dir;return j>=0&&j<base.stops.length?j:null;}
  if(type==='collected'){const list=dir===1?foundAt.filter(i=>i>index):foundAt.filter(i=>i<index).reverse();return list.length?list[0]:null;}
  return null;
 };
 const pageAt=i=>type==='place'?placePage(i):collectedPage(i);

 return <div className="sg-app">
  <a className="skip-link" href="#main-content">Skip to the story</a>
  <header className="sg-header"><Brand onClick={home}/><div className="sg-header-tools"><button onClick={()=>setModal({type:'how'})}>How to play</button><button aria-pressed={reducedMotion} onClick={()=>setReducedMotion(!reducedMotion)}>{reducedMotion?'Motion reduced':'Reduce motion'}</button><span className="sg-preview-pill"><i/> On-site prototype</span></div></header>
  {top}<main id="main-content">{view==='home'?<><OnsiteShelf onPlay={play} onOpenArchive={id=>setModal({type:'place',routeId:id,index:0})} onOpenPaper={id=>setModal({type:'paper',routeId:id})} progressVersion={progressVersion} reducedMotion={reducedMotion}/></>:<><OnsiteGame routeId={routeId} reducedMotion={reducedMotion} onExit={home} onOpen={open} onProgress={onProgress}/></>}</main>
  {library&&clues(library,()=>setLibrary(null))}
  {view==='home'&&<footer className="sg-footer"><span>FindSG. Discover Singapore, understand each other.</span><small>City history, turned into a story in your hands.</small></footer>}
  <dialog ref={dialog} className={'cb'+(type?' cb--'+type:'')+(type==='restart'?' cb--card':'')} data-material={meta?.no} aria-label={PAGE_LABEL[type]||'Story notes'} onCancel={close} onClick={e=>{if(e.target===dialog.current)close();}}>
   {modal&&<>
    {type!=='restart'&&<header className="cb-bar">
     {back?<button className="cb-back" onClick={back}><span aria-hidden="true">‹</span> {BACK_LABEL[modal.back.type]||'Back'}</button>:<span className="cb-bar-gap" aria-hidden="true"/>}
     <span className="cb-label">{label}</span>
     <button className="cb-close" aria-label="Close" onClick={close}><span aria-hidden="true">✕</span></button>
    </header>}
    {paged?<PaperPages className="cb-pages" pageKey={page} neighbour={dir=>{const j=besideIndex(dir);return j==null?null:<div className="cb-page">{pageAt(j)}</div>;}} onTurn={dir=>{const j=besideIndex(dir);if(j!=null)setModal({...modal,index:j,card:undefined});}}>
     <div className="cb-page" key={page} tabIndex={-1} autoFocus>{pageAt(index)}</div>
    </PaperPages>:<div className="cb-page" key={page} tabIndex={-1} autoFocus>

     {type==='how'&&<>
      <h2 className="cb-title">Every stop, three moves.</h2>
      <ol className="cb-steps">{STEPS.map(([id,title,text],i)=><li key={id} className={'cb-step cb-step--'+id}>
       <span className="cb-step-icon">{STEP_ICONS[id]}</span>
       <div><b>{i+1}</b><h3>{title}</h3><p>{text}</p></div>
      </li>)}</ol>
      <p className="cb-fine">Real places and history; the story and its characters are fiction.</p>
      <button className="cb-primary" onClick={close}>Start looking <span aria-hidden="true">→</span></button>
     </>}

     {type==='route'&&<>
      <div className="cb-head"><h2 className="cb-title">{story.title}</h2><span className={'cb-mode is-'+progress.mode}>{manual?'On site':'Remote'}</span></div>
      <ol className="cb-route">{base.stops.map((p,i)=>{const done=progress.completed.includes(p.id),here=!done&&i===progress.stopIndex;
       return <li key={p.id} className={done?'is-done':here?'is-here':''}>
        <button onClick={()=>turn({type:'place',index:i})} aria-label={`${cleanPlace(p.name)}${done?', clue found':here?', you are here':''}. Open the place file`}>
         <span className="cb-seal" aria-hidden="true">{done?'✓':two(i+1)}</span>
         <span className="cb-route-text"><strong>{cleanPlace(p.name)}</strong><small>{here?'You are here':field.stops[i].quest.title}</small></span>
         <i aria-hidden="true">›</i>
        </button>
       </li>;})}</ol>
     </>}

     {type==='journal'&&<>
      <div className="cb-head"><h2 className="cb-title">{story.title}</h2></div>
      {found?<ClueCollection key={`${modalRoute}:${progress.mode}`} routeId={modalRoute} stops={field.stops} completed={progress.completed} reducedMotion={reducedMotion} onOpenCard={i=>turn({type:'collected',index:i})}/>
      :<div className="cb-empty">
        <EvidenceStrip stops={field.stops} completed={progress.completed}/>
        <div className="cb-empty-folder" aria-hidden="true"><span>Case file</span><b>{meta.no}</b><i>Empty</i></div>
        <h3>No clues yet.</h3>
        <p>Solve the puzzle at a stop and its clue card lands here.</p>
        <button className="cb-primary" onClick={close}>Back to the street <span aria-hidden="true">→</span></button>
      </div>}
      <footer className="cb-foot"><span>Saved on this device</span><button onClick={exportProgress}>Download <span aria-hidden="true">↓</span></button></footer>
     </>}

     {type==='restart'&&<>
      <h2 className="cb-title">Start this street again?</h2>
      <p>Your {manual?'on-site':'remote'} progress and clues for <em>{story.title}</em> will be cleared. Other stories are kept.</p>
      <div className="cb-actions"><button className="cb-secondary" onClick={close}>Keep playing</button><button className="cb-primary" onClick={modal.onConfirm}>Start over</button></div>
     </>}

     {type==='paper'&&<ArchivePaper key={`sample:${modalRoute}`} routeId={modalRoute} reducedMotion={reducedMotion} sample className="cb-paper"/>}
    </div>}
   </>}
  </dialog>
 </div>;
}
