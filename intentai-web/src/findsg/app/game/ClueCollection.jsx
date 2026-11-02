import React,{useMemo,useState} from 'react';
import HoloCard from './HoloCard.jsx';
import ArchiveStack from './ArchiveStack.jsx';
import {ROUTES,gameSceneImageFor,findStory} from '../data.js';
import './clue-collection.css';
import './clue-archive.css';

export const CARD_MATERIALS={'only-one-missing':'brass','telok-ayer':'letter','kampong-gelam':'newspaper',balestier:'film','civic-f1':'brass'};
const two=n=>String(n).padStart(2,'0');

export function DiscoveryCard({routeId,stop,index=0,reducedMotion=false,selected=false,className=''}){
 return <HoloCard image={gameSceneImageFor(routeId)} imageCrop="triptych-left" alt={`Story concept art, ${ROUTES[routeId].en}`} preset="bursts" variant={CARD_MATERIALS[routeId]} title={stop.reward.title} subtitle={`${ROUTES[routeId].en} / FIELD DISCOVERY`} serial={`FS-${ROUTES[routeId].no}-${two(index+1)}`} backTitle="How does this find fit the story?" backText={stop.reward.text+'\n\n'+stop.transition.text} reducedMotion={reducedMotion} selected={selected} className={className}>{stop.quest.foundText||stop.transition.text}</HoloCard>;
}

/** The case's evidence slots: one wax seal per stop. A found clue is a pressed seal you can pick; a missing one is
 * an empty ring with its stop number, so the bag always shows how much of the case is still out on the street. */
export function EvidenceStrip({stops=[],completed=[],active=-1,onPick}){
 return <ol className="cb-strip" aria-label={`${completed.length} of ${stops.length} clues found`}>
  {stops.map((stop,i)=>{const found=completed.includes(stop.id);
   return <li key={stop.id} className={(found?'is-found':'is-missing')+(i===active?' is-active':'')}>
    {found&&onPick?<button type="button" aria-pressed={i===active} aria-label={`Clue ${i+1}: ${stop.reward.title}`} onClick={()=>onPick(i)}><span aria-hidden="true">{two(i+1)}</span></button>
    :<span aria-label={found?`Clue ${i+1} found`:`Clue ${i+1} not found yet`}><span aria-hidden="true">{two(i+1)}</span></span>}
   </li>;})}
 </ol>;
}

/** The clue bag: the found clue cards as a stack you swipe through, the evidence seals as its index. */
export default function ClueCollection({routeId,stops,completed,reducedMotion,onOpenCard}){
 const unlocked=useMemo(()=>stops.map((stop,index)=>({stop,index})).filter(item=>completed.includes(item.stop.id)),[stops,completed]);
 const [selection,setSelection]=useState(()=>unlocked.at(-1)?.stop.id||'');
 const match=unlocked.findIndex(item=>item.stop.id===selection);
 const actual=match<0?unlocked.length-1:match,active=unlocked[actual];
 const cards=useMemo(()=>{
  const places=findStory(routeId).stops;
  return unlocked.map(({stop,index})=>({id:stop.id,eyebrow:`Clue ${two(index+1)}`,title:stop.reward.title,subtitle:(places[index]?.name||ROUTES[routeId].area).replace(/ · .*/,''),image:gameSceneImageFor(routeId),imageAlt:`Story concept art, ${ROUTES[routeId].en}. Not a historical photo`,imageCrop:'triptych-left',excerpt:stop.quest.foundText||stop.reward.text,tag:`FS-${ROUTES[routeId].no}-${two(index+1)}`,material:CARD_MATERIALS[routeId]}));
 },[routeId,unlocked]);
 function select(next){if(unlocked[next])setSelection(unlocked[next].stop.id);}
 function open(next=actual){if(unlocked[next])onOpenCard?.(unlocked[next].index);}
 if(!active)return null;
 return <div className="clue-collection cb-bag">
  <EvidenceStrip stops={stops} completed={completed} active={active.index} onPick={i=>setSelection(stops[i].id)}/>
  <div className="cb-bag-grid">
   <ArchiveStack items={cards} selectedIndex={actual} onChange={select} onOpen={open} reducedMotion={reducedMotion} className="cb-bag-stack" ariaLabel="Collected clue cards" fill/>
   <section className="cb-bag-note" aria-live="polite">
    <small>Clue {two(active.index+1)} · found</small>
    <h3>{active.stop.reward.title}</h3>
    <p>{active.stop.quest.foundText||active.stop.reward.text}</p>
    <button className="cb-primary" onClick={()=>open()}>Open this clue <span aria-hidden="true">→</span></button>
   </section>
  </div>
 </div>;
}
