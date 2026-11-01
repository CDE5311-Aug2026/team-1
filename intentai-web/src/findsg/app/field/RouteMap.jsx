import React from 'react';
import './route-map.css';

function placeFor(story,stop){return story?.stops?.find(place=>place.id===stop?.id)||stop||{};}
function queryFor(place){return [place.english_name||place.name||place.title,place.address].filter(Boolean).join(' ');}
export function stopMapUrl(place){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryFor(place))}`;}
export function walkingMapUrl(from,to){return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(queryFor(from))}&destination=${encodeURIComponent(queryFor(to))}&travelmode=walking`;}

/** An ordered journey strip, never a geographic projection or GPS map. */
export default function RouteMap({story,stops=[],selectedIndex=0,progress,onSelect}){
 const index=Math.max(0,Math.min(stops.length-1,selectedIndex));
 const current=stops[index],place=placeFor(story,current),next=stops[index+1];
 const completed=stops.filter(stop=>progress?.stops?.[stop.id]?.solved).length;
 return <section className="field-route-map" aria-label="街区路线与地点导航">
  <div className="field-route-map-head"><div><span className="eyebrow">THE STORY IS OUTSIDE</span><h2>线索，在下一处街角。</h2></div><span className="field-route-count"><b>{String(completed).padStart(2,'0')}</b> / {String(stops.length).padStart(2,'0')} 站完成</span></div>
  <p className="field-route-map-note">路线顺序示意 · 实际步行以地图为准</p>
  <ol className="field-route-strip" style={{'--route-stops':Math.max(1,stops.length)}}>
   {stops.map((stop,i)=>{
    const item=placeFor(story,stop),entry=progress?.stops?.[stop.id];
    const available=i===0||progress?.stops?.[stops[i-1].id]?.solved;
    const label=entry?.solved?'已完成':entry?.observed?'待解线索':entry?.arrived?'待观察':available?'下一处探索':'待前站线索';
    return <li key={stop.id} className={`${i===index?'is-current ':''}${entry?.solved?'is-solved ':''}${!available?'is-later':''}`}>
     <button type="button" onClick={()=>onSelect?.(i)} aria-current={i===index?'step':undefined} aria-label={`查看第${i+1}站 ${item.name||stop.title}，${label}`}>
      <span className="field-route-pin" aria-hidden="true">{entry?.solved?'✓':String(i+1).padStart(2,'0')}</span>
      <span className="field-route-place">{item.name||stop.title}</span><small>{label}</small>
     </button>
    </li>;
   })}
  </ol>
  {current&&<div className="field-route-nav">
   <div className="field-route-destination"><small>当前查看 · 第 {index+1} 站</small><strong>{place.name||current.title}</strong><span>{place.address||current.spot}</span></div>
   <div className="field-route-map-actions"><a className="button outline" href={stopMapUrl(place)} target="_blank" rel="noreferrer">在地图查看地点 ↗︎</a>{next&&<a className="button bronze" href={walkingMapUrl(place,placeFor(story,next))} target="_blank" rel="noreferrer">步行前往下一站 →</a>}</div>
  </div>}
 </section>;
}
