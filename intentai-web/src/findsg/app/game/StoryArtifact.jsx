import React,{lazy,Suspense,useEffect,useId,useRef,useState} from 'react';
import {assetFor} from '../data.js';
import './story-artifact.css';

const FieldViewport=lazy(()=>import('../field/FieldViewport.jsx'));
class OptionalModelBoundary extends React.Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="artifact-model-preparing" role="status">The model could not open just now; you can carry on with the clue card.</div>:this.props.children;}
}
const FALLBACK_ACTION={letter:'Open this letter',film:'Unroll this film',print:'Unfold this newspaper',bronze:'Turn over this medal'};
function materialFor(routeId,modelKind){
 if(routeId==='balestier'||modelKind==='film')return 'film';
 if(routeId==='kampong-gelam'||modelKind==='press')return 'print';
 if(routeId==='civic-f1'||['elephant','bridge','obelisk','clock','fountain'].includes(modelKind))return 'bronze';
 return 'letter';
}

function ArtifactCover({material,title}){
 return <div className={'story-artifact-object object-'+material} aria-hidden="true">
  <span className="artifact-object-shadow"/>
  {material==='letter'&&<div className="artifact-envelope"><div className="artifact-letter-leaf"><span>FINDSG</span><i/><i/><i/><i/></div><div className="artifact-envelope-body"/><div className="artifact-envelope-left"/><div className="artifact-envelope-right"/><div className="artifact-envelope-flap"/><span className="artifact-wax-seal">F</span><span className="artifact-postmark">SG<br/>CITY STORIES</span></div>}
  {material==='film'&&<><div className="artifact-film-note"><span>The other side of the credits</span><i/><i/><i/></div><div className="artifact-film-strip"><span className="artifact-film-edge"/><div className="artifact-film-frame"><img src={assetFor('./assets/cinematic/balestier.png')} alt=""/><span>FINDSG / MEMORY</span></div><div className="artifact-film-frame artifact-film-frame-small"><img src={assetFor('./assets/cinematic/projector-detail.png')} alt=""/></div><span className="artifact-film-edge bottom"/></div><span className="artifact-art-credit">Concept image</span></>}
  {material==='print'&&<><div className="artifact-news-under"/><div className="artifact-news-page"><div className="artifact-news-masthead">THE CITY<br/><b>CHRONICLE</b></div><div className="artifact-news-rule"><span>FINDSG</span><span>STORY EDITION</span></div><strong>{title||'Voices the street kept'}</strong><div className="artifact-news-columns"><div><i/><i/><i/><i/><i/></div><div><i/><i/><i/><i/><i/></div></div><span className="artifact-news-stamp">A page of clues</span></div></>}
  {material==='bronze'&&<><div className="artifact-bronze-card"><span>THE CITY<br/>REMEMBERS</span><i/><i/></div><div className="artifact-medal"><span className="artifact-medal-ring"/><small>FINDSG · CITY MEMORY</small><b>F</b><span className="artifact-medal-line"/><em>Turn it over</em></div></>}
 </div>;
}

/** A controlled story-card reveal. Inspecting the optional model never grants
 * a clue or changes progress: the parent owns the reveal and game state. */
export default function StoryArtifact({routeId,stopId,modelKind='shophouse',label='This stop’s clue',title='An object waiting to be opened',clueText='',revealAction,revealed=false,onReveal,reducedMotion=false}){
 const material=materialFor(routeId,modelKind),action=revealAction||FALLBACK_ACTION[material];
 const [modelOpen,setModelOpen]=useState(false);
 const id=useId(),clueId=id+'-clue',titleId=id+'-title',modelId=id+'-model';
 const requested=useRef(false),revealHeading=useRef(null),previousStop=useRef(stopId);
 useEffect(()=>{
  if(previousStop.current!==stopId){previousStop.current=stopId;requested.current=false;setModelOpen(false);return;}
  if(revealed&&requested.current){revealHeading.current?.focus({preventScroll:true});requested.current=false;}
  if(!revealed)requested.current=false;
 },[stopId,revealed]);
 function reveal(){if(revealed||requested.current)return;requested.current=true;try{onReveal?.();}catch(error){requested.current=false;throw error;}}
 return <article className={'story-artifact artifact-material-'+material+(revealed?' is-revealed':'')} data-reduced-motion={reducedMotion?'true':'false'}>
  <div className="story-artifact-stack">
   <span className="story-artifact-underleaf" aria-hidden="true"/>
   <div className="story-artifact-faces">
    <button type="button" className="story-artifact-front" onClick={reveal} disabled={revealed} tabIndex={revealed?-1:0} aria-label={action} aria-expanded={revealed} aria-controls={clueId} aria-hidden={revealed}>
     <span className="artifact-card-topline"><span>{label}</span><i>FINDSG / STORY OBJECT</i></span>
     <ArtifactCover material={material} title={title}/>
     <span className="artifact-cover-title">{title}</span>
     <span className="artifact-open-cta"><span>{action}</span><b aria-hidden="true">↗︎</b></span>
    </button>
    <section id={clueId} className="story-artifact-back" aria-hidden={!revealed} aria-labelledby={titleId}>
     <div className="artifact-card-topline"><span>{label}</span><i>Opened</i></div>
     <span className="artifact-reveal-mark" aria-hidden="true">{material==='film'?'01 / FRAME':material==='print'?'A page of finds':material==='bronze'?'The other side':'A letter'}</span>
     <h3 id={titleId} ref={revealHeading} tabIndex={-1}>{title}</h3>
     <p className="artifact-clue-copy">{clueText}</p>
     <div className="artifact-reveal-footer" aria-hidden="true"><span>One detail leads into the next part of the story.</span><b>F<span>.</span></b></div>
    </section>
   </div>
  </div>
  <div className="story-artifact-model">
   <button type="button" className="artifact-model-toggle" aria-expanded={modelOpen} aria-controls={modelId} onClick={()=>setModelOpen(value=>!value)}><span>{modelOpen?'Hide building model':'View building model'}</span><b aria-hidden="true">{modelOpen?'−':'＋'}</b></button>
   {modelOpen&&<div id={modelId} className="artifact-model-panel"><OptionalModelBoundary key={routeId+':'+stopId}><Suspense fallback={<div className="artifact-model-preparing" role="status">Opening the model…</div>}><FieldViewport routeId={routeId} stopId={stopId} modelKind={modelKind} reducedMotion={reducedMotion} progress={revealed?100:0} highlight={revealed}/></Suspense></OptionalModelBoundary><p>Drag to turn · concept model; trust what you see on site</p></div>}
  </div>
 </article>;
}
