import React,{useId,useState} from 'react';
import ArchivePaper from './ArchivePaper.jsx';
import {DiscoveryCard,CARD_MATERIALS} from './ClueCollection.jsx';
import {ROUTES} from '../data.js';
import './discovery-packet.css';

/** Earned clues are immediately readable; opening gestures belong to story objects. */
export default function DiscoveryPacket({routeId,stop,index=0,reducedMotion=false,selected=false,className='',initialView='paper',framed=true}){
 const [paperView,setPaperView]=useState(initialView==='card'?'card':'paper'),id=useId();
 if(!stop?.reward)return null;
 const meta=ROUTES[routeId]||{no:'00'},material=CARD_MATERIALS[routeId]||'letter';
 const folio=`FS-${meta.no}-${String(Math.max(0,index)+1).padStart(2,'0')}`;
 return <section className={`discovery-packet dp-material-${material} dp-is-open${className?` ${className}`:''}`} aria-labelledby={`${id}-title`} data-opened="true" data-reduced-motion={reducedMotion?'true':'false'}>
  {framed&&<header className="dp-header"><span className="dp-earned"><i aria-hidden="true">✓</i> Clue collected</span><span className="dp-folio">{folio}</span></header>}
  <h3 id={`${id}-title`} className="dp-sr-only">Clue collected: {stop.reward.title}</h3>
  <div className="dp-view-switch" role="group" aria-label="Clue view"><button type="button" aria-pressed={paperView==='paper'} onClick={()=>setPaperView('paper')}>Paper</button><button type="button" aria-pressed={paperView==='card'} onClick={()=>setPaperView('card')}>Card</button></div>
  {paperView==='paper'?<ArchivePaper routeId={routeId} stop={stop} index={index} reducedMotion={reducedMotion}/>:<><div className="dp-discovery"><DiscoveryCard routeId={routeId} stop={stop} index={index} reducedMotion={reducedMotion} selected={selected}/></div>{framed?<p className="dp-art-note">The card shows story concept art, not a historical photo. Tap the card to flip it.</p>:<p className="dp-art-note">Tap the card to turn it over.</p>}</>}
  {framed&&<p className="dp-local-note">Filed in your clue bag. Open or flip it any time.</p>}
 </section>;
}
