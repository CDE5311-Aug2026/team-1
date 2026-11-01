import React,{useEffect,useId,useMemo,useRef,useState} from 'react';
import ArchiveStack from './ArchiveStack.jsx';
import {ROUTES,gameSceneImageFor,sourceName} from '../data.js';
import {mapSearch} from '../field/field-storage.js';
import './archive-dossier.css';

/* A place file is a folder with four sheets. On a phone the tabs are the folder's index and one sheet fills the
   page; on a wide screen the sheets also lie in a stack beside it, and picking one turns to it. */
const SECTIONS=[
 {id:'place',label:'Place'},
 {id:'architecture',label:'Look'},
 {id:'history',label:'History'},
 {id:'story',label:'Story'}
];
const MATERIALS={'telok-ayer':'letter','kampong-gelam':'newspaper',balestier:'film','civic-f1':'brass'};
const text=value=>typeof value==='string'?value:'';
const excerpt=(value,length=78)=>{const letters=Array.from(text(value));return letters.length>length?letters.slice(0,length).join('')+'…':letters.join('');};
const number=value=>String(value).padStart(2,'0');
const cardIndex=id=>Math.max(0,SECTIONS.findIndex(section=>section.id===(id==='visit'?'place':id)));
const safeIndex=value=>Number.isInteger(value)?Math.min(SECTIONS.length-1,Math.max(0,value)):0;
const urls=value=>Array.isArray(value)?[...new Set(value.filter(url=>{try{return typeof url==='string'&&/^https?:$/.test(new URL(url).protocol);}catch{return false;}}))]:[];
const cleanPlace=name=>name.replace(/ · .*/,'').replace(/（.*?）/g,'');

/** sources as a short row of ink links; more than three fold into "+n" which opens the rest */
function SourceLinks({links:raw}){
 const [all,setAll]=useState(false);
 // one link per site: two pages of the same site read as a duplicate on a phone-width sheet
 const links=raw.filter((url,i)=>raw.findIndex(other=>sourceName(other)===sourceName(url))===i);
 if(!links.length)return null;
 const shown=all?links:links.slice(0,3);
 return <p className="ad-sources"><span>Sources</span>{shown.map(url=><a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${sourceName(url)} (opens in a new tab)`}>{sourceName(url)}<i aria-hidden="true">↗</i></a>)}{!all&&links.length>3&&<button type="button" onClick={()=>setAll(true)}>+{links.length-3}</button>}</p>;
}

/** A read-only place folder. Card selection never records a visit or solves a
 * mechanism; fictional rewards and onward clues only enter an unlocked folder. */
export default function ArchiveDossier({
 routeId,place={},stop={},index=0,unlocked=false,mode='preview',reducedMotion=false,
 initialCardId='place',onOpenClue
}){
 const uid=useId(),tabRefs=useRef([]);
 const [selected,setSelected]=useState(()=>cardIndex(initialCardId));
 const meta=ROUTES[routeId]||{area:'Singapore',en:'SINGAPORE',no:'00'};
 const name=cleanPlace(text(place.name))||'Place file',english=text(place.english_name),address=text(place.address);
 const observation=stop.observation||{},historicalFact=text(place.historical_fact),sceneLine=text(stop.sceneLine),objective=text(stop.objective);
 const placeSources=useMemo(()=>urls(place.source_urls),[place.source_urls]);
 const observationSources=useMemo(()=>urls(observation.sourceUrls),[observation.sourceUrls]);
 const years=useMemo(()=>[...new Set([...historicalFact.matchAll(/\b(1\d{3}|20\d{2})\b/g)].map(match=>match[1]))],[historicalFact]);
 const image=gameSceneImageFor(routeId),imageAlt='Story concept art, not a photo of the place or a historical image';
 const folio=`${meta.no}.${number(Math.max(0,index)+1)}`,material=MATERIALS[routeId]||'letter';
 const items=useMemo(()=>[
  {id:'place',eyebrow:'Place',title:name,subtitle:meta.area,image,imageAlt,imageCrop:'triptych-left',excerpt:excerpt(address),tag:`Folio ${folio}`,material:'letter'},
  {id:'architecture',eyebrow:'Look',title:text(observation.title)||'Look at the building details',subtitle:'On the real street',image,imageAlt,imageCrop:'triptych-left',excerpt:excerpt(observation.detailToFind||observation.instruction),tag:'Observation',material:'brass'},
  {id:'history',eyebrow:'History',title:'History notes',subtitle:years.length?years.join(' / '):'From the records',image,imageAlt,imageCrop:'triptych-left',excerpt:excerpt(historicalFact),tag:'Sourced history',material:'newspaper'},
  {id:'story',eyebrow:'Story',title:unlocked?(text(stop.reward?.title)||'Clue solved'):'An unfinished story',subtitle:unlocked?'Clue found':'Clue still out there',image,imageAlt,imageCrop:'triptych-left',excerpt:excerpt(unlocked?stop.reward?.text:sceneLine),tag:unlocked?'Found':'Sealed',material}
 ],[name,meta.area,folio,image,imageAlt,address,observation.title,observation.detailToFind,observation.instruction,years,historicalFact,unlocked,stop.reward?.title,stop.reward?.text,sceneLine,material]);
 const current=SECTIONS[selected],panelId=uid+'-reader',canMap=Boolean(address||text(place.name)||english);
 const location={...place,name,english_name:english||name,address};

 useEffect(()=>{setSelected(cardIndex(initialCardId));},[routeId,place.id,stop.id,initialCardId]);

 function selectCard(next){setSelected(safeIndex(next));}
 function navigateTabs(event){
  let next=selected;
  if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(selected+1)%SECTIONS.length;
  else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(selected+SECTIONS.length-1)%SECTIONS.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=SECTIONS.length-1;
  else return;
  event.preventDefault();selectCard(next);tabRefs.current[next]?.focus({preventScroll:true});
 }

 const heading=current.id==='place'?'Find it in the neighbourhood':current.id==='architecture'?(text(observation.title)||'Start with the building details'):current.id==='history'?'What has this place kept?':(unlocked?(text(stop.reward?.title)||'This stop’s clue'):'The story starts here');

 return <section className={`archive-dossier ad-material-${material}`} aria-label={`Place file: ${name}`} data-reduced-motion={reducedMotion?'true':'false'}>
  <header className="ad-header">
   <h2>{name}</h2>
   <p className="ad-sub">{meta.area} · Stop {number(index+1)}</p>
   {unlocked&&<span className="ad-stamp" aria-label="Clue found">Clue<br/>found</span>}
  </header>

  <div className="ad-folder">
   <nav className="ad-tabs" role="tablist" aria-label="Choose a sheet" onKeyDown={navigateTabs}>
    {SECTIONS.map((section,position)=><button key={section.id} ref={node=>{tabRefs.current[position]=node;}} id={`${uid}-tab-${section.id}`} type="button" role="tab" aria-selected={position===selected} aria-controls={panelId} tabIndex={position===selected?0:-1} onClick={()=>selectCard(position)}>{section.label}</button>)}
   </nav>
   <div className="ad-folder-body">
    <div className="ad-stack-column">
     <ArchiveStack items={items} selectedIndex={selected} onChange={selectCard} reducedMotion={reducedMotion} className="ad-card-stack" ariaLabel={`Index cards for ${name}`}/>
    </div>

    <article id={panelId} role="tabpanel" aria-labelledby={`${uid}-tab-${current.id}`} className={`ad-reader ad-reader-${current.id}`} key={current.id}>
     <h3>{heading}</h3>

     {current.id==='place'&&<div className="ad-document">
      {address&&<p className="ad-address">{address}</p>}
      {canMap&&<a className="ad-map-link" href={mapSearch(location)} target="_blank" rel="noopener noreferrer">Open in Maps <b aria-hidden="true">↗</b></a>}
      {text(place.access_note)&&<section className="ad-note"><h4>Before you go</h4><p>{place.access_note}</p></section>}
      {place.field_verified===false&&<p className="ad-fine">Not yet checked on site; hours and access may differ.</p>}
      <SourceLinks links={placeSources}/>
     </div>}

     {current.id==='architecture'&&<div className="ad-document">
      {text(observation.instruction)&&<p className="ad-lead">{observation.instruction}</p>}
      {text(observation.detailToFind)&&<section className="ad-look-for"><span>Look for</span><p>{observation.detailToFind}</p></section>}
      {text(observation.referenceNote)&&<details className="ad-hint"><summary>Stuck? Read the hint</summary><p>{observation.referenceNote}</p></details>}
      <SourceLinks links={observationSources}/>
     </div>}

     {current.id==='history'&&<div className="ad-document">
      {years.length>0&&<p className="ad-years">{years.map(year=><b key={year}>{year}</b>)}</p>}
      {historicalFact?<p className="ad-history-copy">{historicalFact}</p>:<p>No history entry for this place yet.</p>}
      <SourceLinks links={placeSources}/>
     </div>}

     {current.id==='story'&&<div className="ad-document">
      {sceneLine&&<blockquote className="ad-scene">{sceneLine}</blockquote>}
      <figure className="ad-art"><span><img src={image} alt={imageAlt} loading="lazy" decoding="async" draggable="false"/></span><figcaption>Story art</figcaption></figure>
      {unlocked?<>
       {text(stop.reward?.text)&&<p className="ad-found">{stop.reward.text}</p>}
       {onOpenClue&&<button type="button" className="ad-open-clue" onClick={onOpenClue}>See the clue card <b aria-hidden="true">→</b></button>}
      </>:<>
       {objective&&<p className="ad-objective">{objective}</p>}
       <p className="ad-sealed"><span aria-hidden="true">✦</span>Sealed until you solve this stop.</p>
      </>}
      <p className="ad-fine">The story and its characters are fiction; the place is real.</p>
     </div>}
    </article>
   </div>
  </div>
 </section>;
}
